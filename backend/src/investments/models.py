import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum

class InvestmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REFUNDED = "refunded"
    FAILED = "failed"

class Investment(SQLModel, table=True):
    __tablename__ = "investments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", index=True)
    investor_id: uuid.UUID = Field(foreign_key="users.uid", index=True)
    amount_kobo: int  # Amount in kobo (Naira * 100)
    txn_ref: str = Field(unique=True, index=True)
    interswitch_ref: Optional[str] = None
    status: InvestmentStatus = Field(default=InvestmentStatus.PENDING)
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
