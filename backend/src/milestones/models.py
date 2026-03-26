import uuid
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
from pydantic import computed_field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.farms.models import Farm
    from src.proofs.models import Proof

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
    amount_kobo: int
    
    @computed_field
    @property
    def amount(self) -> float:
        return self.amount_kobo / 100
    
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
    proofs: list["Proof"] = Relationship(back_populates="milestone")

    @computed_field
    @property
    def proof_photo_url(self) -> Optional[str]:
        if not self.proofs:
            return None
        # Sort proofs by submitted_at descending to get the latest
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.photo_url

    @computed_field
    @property
    def proof_latitude(self) -> Optional[float]:
        if not self.proofs:
            return None
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.gps_latitude

    @computed_field
    @property
    def proof_longitude(self) -> Optional[float]:
        if not self.proofs:
            return None
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.gps_longitude

    @computed_field
    @property
    def gps_distance_km(self) -> Optional[float]:
        if not self.proofs:
            return None
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.gps_distance_km

    @computed_field
    @property
    def gps_flag(self) -> Optional[str]:
        if not self.proofs:
            return None
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.gps_flag

    @computed_field
    @property
    def submitted_at(self) -> Optional[datetime]:
        if not self.proofs:
            return None
        latest_proof = sorted(self.proofs, key=lambda p: p.submitted_at, reverse=True)[0]
        return latest_proof.submitted_at