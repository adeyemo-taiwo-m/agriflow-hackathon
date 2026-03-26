from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid 
from src.auth.models import Role, FarmerTier
from typing import Optional

class UserOut(BaseModel):
    uid: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    business_name: Optional[str] = None
    role: Role
    bvn_verified: bool
    bank_verified: bool 
    trust_score: Optional[int] = None
    trust_tier: Optional[FarmerTier] = None
    is_active: bool

class AuthUserOut(BaseModel):
    uid: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    business_name: Optional[str] = None
    role: Role
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

class AdminOut(BaseModel):
    uid: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    role: str = "admin"
    is_active: bool

class UserCreateInput(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    business_name: Optional[str] = None
    role: Role
    password: str

class UserCreateResponse(BaseModel):
    success: bool
    message: str
    data: AuthUserOut

class LoginInput(BaseModel):
    email: EmailStr
    password: str
    role: Role

class LoginResponse(BaseModel):
    success: bool
    message: str
    data: AuthUserOut

class AdminLoginInput(BaseModel):
    email: EmailStr
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    message: str
    data: AdminOut

class RenewAccessTokenResponse(BaseModel):
    success: bool
    message: str
    data: dict

class PayoutSettingsInput(BaseModel):
    accountName: str
    bankCode: str
    accountNumber: str

class LogoutResponse(BaseModel):
    success: bool
    message: str
    data: dict
