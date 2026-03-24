from sqlmodel import SQLModel, Column, Field, Relationship
import uuid
from pydantic import EmailStr, computed_field
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone
import sqlalchemy.dialects.postgresql as pg


def utc_now():
    return datetime.now(timezone.utc)


class Role(str, Enum):
    FARMER = "farmer"
    INVESTOR = "investor"

class FarmerTier(str, Enum):
    VERIFIED = "verified"
    EMERGING = "emerging"
    UNRATED = "unrated"

class User(SQLModel, table=True):
    __tablename__ = "users"
    uid: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    first_name: str
    last_name: str
    email: EmailStr = Field(unique=True, index=True)
    business_name: Optional[str] = Field(default=None)
    password_hash: str = Field(exclude=True)
    role: Role

    # BVN — populated in Phase 2 (farmers) and Phase 3 (investors)
    bvn: Optional[str] = Field(default=None)
    bvn_verified: bool = Field(default=False)
    bvn_name: Optional[str] = Field(default=None)
    

    # Trust score — populated in Phase 2 (farmers only)
    #trust tier
    #75 – 100  →  Verified Farmer
    #50 – 74   →  Emerging Farmer
    #0  – 49   →  Unrated

    trust_score: Optional[int] = Field(default=None)

    # Bank account — populated in Phase 2 and 3
    account_number: Optional[str] = Field(default=None)
    bank_code: Optional[str] = Field(default=None)
    account_name: Optional[str] = Field(default=None)
    bank_verified: Optional[bool] = Field(default=False)
    

    #for suspension of account
    is_active: bool = Field(default=True)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False)
    )

    #relationship

    farms : List['Farm'] = Relationship(
        back_populates="owner"

    )

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    @computed_field
    @property
    def trust_tier(self) -> str | None:
        if self.trust_score is None:
            return None
        elif int(self.trust_score) >= 75:
            return FarmerTier.VERIFIED
        elif int(self.trust_score) >= 50:
            return FarmerTier.EMERGING
        else:
            return FarmerTier.UNRATED
        
    

class Admin(SQLModel, table=True):
    __tablename__ = "admins"

    uid: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    first_name: str
    last_name: str
    email: EmailStr = Field(unique=True, index=True)
    password_hash: str = Field(exclude=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            pg.TIMESTAMP(timezone=True),
            nullable=False
        )
    )

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    