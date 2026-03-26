import uuid
from datetime import datetime, date
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from pydantic import computed_field

class HarvestReportStatus(str, Enum):
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"

class HarvestReport(SQLModel, table=True):
    __tablename__ = "harvest_reports"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", unique=True)
    farmer_id: uuid.UUID = Field(foreign_key="users.uid")
    
    actual_yield: float
    total_sales_declared_kobo: int  # Farmer's self-reported revenue in Kobo
    harvest_date: date
    buyer_name: Optional[str] = None
    payment_evidence_public_id: str = Field(exclude=True)
    
    admin_confirmed_sales_kobo: Optional[int] = None # In Kobo
    status: HarvestReportStatus = Field(default=HarvestReportStatus.SUBMITTED)
    rejection_reason: Optional[str] = None
    
    @computed_field
    @property
    def total_sales_declared(self) -> float:
        return self.total_sales_declared_kobo / 100

    @computed_field
    @property
    def admin_confirmed_sales(self) -> Optional[float]:
        if self.admin_confirmed_sales_kobo is None:
            return None
        return self.admin_confirmed_sales_kobo / 100

    @computed_field
    @property
    def payment_evidence_url(self) -> str:
        import cloudinary
        url, options = cloudinary.utils.cloudinary_url(
            self.payment_evidence_public_id,
            width=800,
            height=800,
            crop="fill",
            gravity="auto",
            quality="auto:best",
            fetch_format="auto",
            dpr="auto"
        )
        return url
