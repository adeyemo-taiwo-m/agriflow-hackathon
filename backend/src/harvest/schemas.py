from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid

class HarvestReportOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    farm_id: uuid.UUID
    actual_yield: float
    total_sales_declared: float
    harvest_date: date
    buyer_name: Optional[str]
    payment_evidence_urls: list[str]
    admin_confirmed_sales: Optional[float]
    status: str
    submitted_at: datetime


class RepaymentDetailOut(BaseModel):
    principal: float
    roi_rate: float
    gain: float
    total_repayment: float
    is_test_mode_scaled: bool = False
    scale_factor: int = 1
    scaled_repayment: Optional[float] = None

class RepaymentVerifyInput(BaseModel):
    txn_ref: str

class RepaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    
    id: uuid.UUID
    farm_id: uuid.UUID
    amount: float
    status: str
    txn_ref: str
    created_at: datetime
    confirmed_at: Optional[datetime]

