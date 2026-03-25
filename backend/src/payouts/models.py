import uuid
from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field

class PayoutStatus(str, Enum):
    WAITING = "waiting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class RecipientType(str, Enum):
    INVESTOR = "investor"
    FARMER = "farmer"

class Payout(SQLModel, table=True):
    __tablename__ = "payouts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", index=True)
    recipient_id: uuid.UUID = Field(foreign_key="users.uid")
    recipient_type: RecipientType
    investment_id: Optional[uuid.UUID] = Field(default=None, foreign_key="investments.id")
    
    principal_naira: int = 0  
    profit_naira: int = 0     
    total_amount_naira: int   
    
    interswitch_ref: Optional[str] = None
    status: PayoutStatus = Field(default=PayoutStatus.WAITING)
    failure_reason: Optional[str] = None
    
    initiated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
