from fastapi import Cookie, Header, HTTPException, status, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from src.utils.auth import decode_token
from src.db.redis import redis_client
from src.db.main import get_session
from src.auth.models import User, Admin, Role

async def get_current_user(
    access_token: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_session)
) -> User | Admin:
    


    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided"
        )
    
    token_decoded = decode_token(access_token)
    
    jti = token_decoded.get('jti')
    
    if jti and await redis_client.get(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked (User logged out)"
        )
   
    if token_decoded.get('type') != 'access':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token required."
        )

    user_id = token_decoded.get("sub")
    user_role = token_decoded.get("role")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID."
        )

    # Query the database to retrieve the full user object
    if user_role == "admin":
        statement = select(Admin).where(Admin.uid == uuid.UUID(user_id))
        result = await session.exec(statement)
        user = result.first()
    else:
        statement = select(User).where(User.uid == uuid.UUID(user_id))
        result = await session.exec(statement)
        user = result.first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is suspended."
        )
    
    return user

async def get_current_farmer(current_user: User | Admin = Depends(get_current_user)):
    if not isinstance(current_user, User) or current_user.role != Role.FARMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer access required"
        )
    
    return current_user

async def get_current_investor(current_user: User | Admin = Depends(get_current_user)):
    if not isinstance(current_user, User) or current_user.role != Role.INVESTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investor access required"
        )
    
    return current_user
    
async def get_current_admin(current_user: User | Admin = Depends(get_current_user)):
    if not isinstance(current_user, Admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user
