import uuid
from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from pydantic import computed_field

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
    
    principal_kobo: int = 0  
    profit_kobo: int = 0     
    total_amount_kobo: int   
    
    @computed_field
    @property
    def principal(self) -> float:
        return self.principal_kobo / 100

    @computed_field
    @property
    def profit(self) -> float:
        return self.profit_kobo / 100

    @computed_field
    @property
    def total_amount(self) -> float:
        return self.total_amount_kobo / 100

    interswitch_ref: Optional[str] = None
    status: PayoutStatus = Field(default=PayoutStatus.WAITING)
    failure_reason: Optional[str] = None
    
    initiated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
