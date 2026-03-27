import uuid
from datetime import datetime, date
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from pydantic import computed_field
from sqlalchemy.dialects import postgresql

class HarvestReportStatus(str, Enum):
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"

class RepaymentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class HarvestReport(SQLModel, table=True):
    __tablename__ = "harvest_reports"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", unique=True)
    farmer_id: uuid.UUID = Field(foreign_key="users.uid")
    
    actual_yield: float
    total_sales_declared_kobo: int  # Farmer's self-reported revenue in Kobo
    harvest_date: date
    buyer_name: Optional[str] = None
    payment_evidence_public_ids: list[str] = Field(default=[], sa_type=postgresql.JSONB, exclude=True)
    
    admin_confirmed_sales_kobo: Optional[int] = None # In Kobo
    status: HarvestReportStatus = Field(default=HarvestReportStatus.SUBMITTED)
    rejection_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    
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
    def payment_evidence_urls(self) -> list[str]:
        import cloudinary
        urls = []
        for public_id in self.payment_evidence_public_ids:
            url, options = cloudinary.utils.cloudinary_url(
                public_id,
                width=800,
                height=800,
                crop="fill",
                gravity="auto",
                quality="auto:best",
                fetch_format="auto",
                dpr="auto"
            )
            urls.append(url)
        return urls

class Repayment(SQLModel, table=True):
    __tablename__ = "repayments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", unique=True, index=True)
    farmer_id: uuid.UUID = Field(foreign_key="users.uid", index=True)
    
    amount_kobo: int
    txn_ref: str = Field(unique=True, index=True)
    interswitch_ref: Optional[str] = None
    status: RepaymentStatus = Field(default=RepaymentStatus.PENDING)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None

    @computed_field
    @property
    def amount(self) -> float:
        return self.amount_kobo / 100
