from sqlmodel.ext.asyncio.session import AsyncSession
from src.auth.models import User, Admin
from sqlmodel import select
from src.auth.schemas import (
    UserCreateInput,
    LoginInput,
    AdminLoginInput
    )
from fastapi import HTTPException, status, Response
from sqlalchemy.exc import DatabaseError
from src.utils.auth import generate_password_hash, verify_password_hash,  create_token, decode_token, TokenType

from src.auth.models import Role, FarmerTier
import uuid
from datetime import datetime, timezone
from src.db.redis import redis_client

from src.config import Config
from src.utils.logger import logger

class AuthServices():
    async def get_user(self, email:str, session:AsyncSession, role: Role, return_data: bool):
        
        statement = select(User).where(User.email == email.lower())
        result = await session.exec(statement)
        user = result.first()
        
        
        if user:
            if return_data:
                return user
            logger.warning(f"Conflict: Account with email {email} already exists")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail = f"An account with these details already exists"
            )
        return None
    
    async def create_user(self,user_input: UserCreateInput, session: 
        AsyncSession ):
        logger.info(f"Attempting to register new {user_input.role} with email {user_input.email}")
        await self.get_user(user_input.email.lower(), session, user_input.role, return_data=False)

        password_hash = generate_password_hash(user_input.password)

        new_user = User(
            first_name = user_input.first_name,
            last_name = user_input.last_name,
            email = user_input.email.lower(),
            business_name = user_input.business_name,
            role= user_input.role,
            password_hash = password_hash,
            trust_tier = FarmerTier.UNRATED if user_input.role == Role.FARMER else None,
            trust_score = 0 if user_input.role == Role.FARMER else None
        )

        
        try:
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            logger.info(f"Successfully registered {user_input.role} with email {new_user.email}")

            user_dict = new_user.model_dump(mode="json")
            access_token = create_token(
                user_data= user_dict, token_type=TokenType.ACCESS
                )
            refresh_token = create_token(
                user_data= user_dict, token_type=TokenType.REFRESH
                )
            
            
            return {
                **new_user.model_dump(),
                "access_token": access_token,
                "refresh_token": refresh_token
            }
        
        except DatabaseError as e:
            logger.error(f"Database error during registration for {user_input.email}: {str(e)}", exc_info=True)
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="account creation failed, try again"
            )
        
    async def login(self, login_input: LoginInput, session: AsyncSession):
        logger.info(f"Login attempt for email {login_input.email}")
        user = await self.get_user(login_input.email,session, login_input.role, return_data= True)
        
        # Reusable exception for invalid credentials
        INVALID_CREDENTIALS = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Credentials"
        )

        
        if not user:
            logger.warning(f"Failed login attempt for {login_input.email}: User not found")
            raise INVALID_CREDENTIALS
        
        
        
        verified_password = verify_password_hash(login_input.password, user.password_hash)

        if not verified_password:
            logger.warning(f"Failed login attempt for {login_input.email}: Incorrect password")
            raise INVALID_CREDENTIALS

        
        user_dict = user.model_dump()
        user_dict_json = user.model_dump(mode="json")
        access_token = create_token(
            user_data=user_dict_json, 
            token_type=TokenType.ACCESS)
        
        refresh_token = create_token(
            user_data=user_dict_json, 
            token_type=TokenType.REFRESH)
        
       
        user_details = {
            **user_dict, 
            'access_token': access_token,
            'refresh_token': refresh_token,
        }
        
        logger.info(f"Successful login for {login_input.email}")
        return user_details
    
    async def renewAccessToken(self, old_refresh_token_str: str,  session: AsyncSession):
        logger.info("Attempting to renew access token")
        # Decode and validate refresh token
        old_refresh_token_decode = decode_token(old_refresh_token_str)

        # Ensure this is a refresh token, not access/reset
        if old_refresh_token_decode.get('type') != "refresh":
            logger.warning("Token renewal failed: Invalid token type provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token type"
            )
        
        # Detect refresh token reuse (security: rotation attack)
        jti = old_refresh_token_decode.get('jti')
        if await self.is_token_blacklisted(jti):
            logger.warning(f"SECURITY ALERT: Attempted reuse of blocklisted refresh token (jti: {jti})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Refresh token reused. Login required."
            )

        # Retrieve user from token subject and role
        user_id = old_refresh_token_decode.get("sub")
        role = old_refresh_token_decode.get("role")
        
        if role == "admin":
            statement = select(Admin).where(Admin.uid == uuid.UUID(user_id))
            result = await session.exec(statement)
            user = result.first()
        else:
            statement = select(User).where(User.uid == uuid.UUID(user_id))
            result = await session.exec(statement)
            user = result.first()

        if not user:
            logger.warning(f"Token renewal failed: User {user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")

        
        user_dict_json = user.model_dump(mode="json")
        new_access_token = create_token(
            user_data=user_dict_json if role != "admin" else {**user_dict_json, "role": "admin"},
            token_type=TokenType.ACCESS)

        # Blocklist old refresh token (rotation: prevents reuse)
        await self.add_token_to_blocklist(old_refresh_token_str)

        # Generate new refresh token (rotation)
        new_refresh_token = create_token(
            user_data=user_dict_json if role != "admin" else {**user_dict_json, "role": "admin"},
            token_type=TokenType.REFRESH)
        
        logger.info(f"Successfully renewed access token for user {user_id}")
        return {
            "access_token" : new_access_token,
            "refresh_token": new_refresh_token
        }
    
    async def add_token_to_blocklist(self, token):
        
        token_decoded = decode_token(token)
        token_id = token_decoded.get('jti')  # Unique token identifier
        exp_timestamp = token_decoded.get('exp')

        # Calculate TTL: Only blocklist until natural expiry
        current_time = datetime.now(timezone.utc).timestamp()
        time_to_live = int(exp_timestamp - current_time)

        # Only blocklist if token hasn't expired yet
        if time_to_live > 0:
            await redis_client.setex(name=token_id, time=time_to_live, value="true")
        
    async def is_token_blacklisted(self, jti: str) -> bool:
        """Checks if token is revoked.
        
        Args:
            jti: JWT ID (unique token identi,
                    refresh_token: str | None
        Returns:
            True if token is blocklisted, False otherwise.
        """
        result = await redis_client.get(jti)
        return result is not None
    

    async def logout(self, 
                    response: Response, 
                    access_token: str | None,
                    refresh_token: str | None
):
        logger.info("Logout attempt")
        
        if not access_token and not refresh_token:
            logger.info("Logout failed: No tokens provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="You are not logged in."
            )

        
        if access_token:
            await self.add_token_to_blocklist(access_token)
        if refresh_token:
            await self.add_token_to_blocklist(refresh_token)

        
        response.delete_cookie(
            key="access_token",
            samesite="none" if Config.IS_PRODUCTION else "lax", 
            secure=Config.IS_PRODUCTION,     
            httponly=True    
        )
        response.delete_cookie(
            key="refresh_token",
            samesite="none" if Config.IS_PRODUCTION else "lax",
            secure=Config.IS_PRODUCTION,
            httponly=True
        )
            
        logger.info("Successfully logged out")
        return {
            "success": True,
            "message": "Logged out successfully",
            "data": {}
        }
    
    async def admin_login(self, login_input: AdminLoginInput, session: AsyncSession):
        logger.info(f"Admin login attempt for email {login_input.email}")
        statement = select(Admin).where(Admin.email == login_input.email.lower())
        result = await session.exec(statement)
        admin = result.first()
        
        # Reusable exception for invalid credentials
        INVALID_CREDENTIALS = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Credentials"
        )

        
        if not admin:
            logger.warning(f"Failed admin login attempt for {login_input.email}: Admin not found")
            raise INVALID_CREDENTIALS
            
        verified_password = verify_password_hash(login_input.password, admin.password_hash)

        if not verified_password:
            logger.warning(f"Failed admin login attempt for {login_input.email}: Incorrect password")
            raise INVALID_CREDENTIALS

        admin_dict = admin.model_dump()
        admin_dict_json = admin.model_dump(mode="json")
        
        access_token = create_token(
            user_data={**admin_dict_json, "role": "admin"}, 
            token_type=TokenType.ACCESS)
        
        refresh_token = create_token(
            user_data={**admin_dict_json, "role": "admin"},
            token_type=TokenType.REFRESH)
        
       
        admin_details = {
            **admin_dict,
            "role": "admin",
            'access_token': access_token,
            'refresh_token': refresh_token,
        }
        
        logger.info(f"Successful admin login for {login_input.email}")
        return admin_details
    
    async def get_me(self, current_user):
        if isinstance(current_user, Admin):
            return {
                "success": True,
                "message": "Profile fetched successfully",
                "data": {
                    "uid":        current_user.uid,
                    "first_name": current_user.first_name,
                    "last_name":  current_user.last_name,
                    "name":       f"{current_user.first_name} {current_user.last_name}",
                    "email":      current_user.email,
                    "role":       "admin",
                    "is_active":  current_user.is_active,
                    "created_at": current_user.created_at
                }
            }
        
        # User — farmer or investor
        return {
            "success": True,
            "message": "Profile fetched successfully",
            "data": {
                "uid":            current_user.uid,
                "first_name":     current_user.first_name,
                "last_name":      current_user.last_name,
                "name":           f"{current_user.first_name} {current_user.last_name}",
                "email":          current_user.email,
                "business_name":  current_user.business_name,
                "role":           current_user.role,
                "bvn_verified":   current_user.bvn_verified,
                "bank_verified":  current_user.bank_verified,
                "trust_score":    current_user.trust_score,
                "trust_tier":     current_user.trust_tier,
                "is_active":      current_user.is_active,
                "created_at":     current_user.created_at,
                "bank_account_number": current_user.account_number,
                "bank_code":           current_user.bank_code,
                "bank_account_name":   current_user.account_name
            }
        }

    async def update_payout_settings(self, user_input, user_uid: uuid.UUID, session: AsyncSession):
        statement = select(User).where(User.uid == user_uid)
        result = await session.exec(statement)
        user = result.first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.account_name = user_input.accountName
        user.bank_code = user_input.bankCode
        user.account_number = user_input.accountNumber
        user.bank_verified = False # Require re-verification if details change
        
        session.add(user)
        try:
            await session.commit()
            await session.refresh(user)
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to update payout settings: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update settings")
            
        return {
            "success": True,
            "message": "Payout settings updated",
            "data": {
                "account_name": user.account_name,
                "bank_code": user.bank_code,
                "account_number": user.account_number
            }
        }
