import uuid
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.farms.models import Farm

def utc_now():
    return datetime.now(timezone.utc)

class MilestoneStatus(str, Enum):
    LOCKED = "locked"
    PENDING_PROOF = "pending_proof"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    DISBURSED = "disbursed"
    REJECTED = "rejected"

class Milestone(SQLModel, table=True):
    __tablename__ = "milestones"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farm_id: uuid.UUID = Field(foreign_key="farms.id", index=True)

    name: str
    description: Optional[str] = Field(default=None)
    order_number: int # 1, 2, 3, 4
    expected_week: int
    amount: int # in naira
    
    status: MilestoneStatus = Field(default=MilestoneStatus.LOCKED)
    rejection_reason: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, onupdate=utc_now)
    )

    #relationships
    farm: "Farm" = Relationship(back_populates="milestones")