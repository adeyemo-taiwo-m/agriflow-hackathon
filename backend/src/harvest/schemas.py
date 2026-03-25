from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid

class HarvestReportOut(BaseModel):
    id: uuid.UUID
    farm_id: uuid.UUID
    actual_yield: float
    total_sales_declared: int
    harvest_date: date
    buyer_name: Optional[str]
    payment_evidence_url: str
    admin_confirmed_sales: Optional[int]
    status: str
    submitted_at: datetime

    class Config:
        from_attributes = True
