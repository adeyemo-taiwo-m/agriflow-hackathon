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
    payment_evidence_url: str
    admin_confirmed_sales: Optional[float]
    status: str
    submitted_at: datetime

