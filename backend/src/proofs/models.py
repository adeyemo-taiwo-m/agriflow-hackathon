import uuid
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from pydantic import computed_field
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
import cloudinary
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.milestones.models import Milestone
    from src.auth.models import User

def utc_now():
    return datetime.now(timezone.utc)

class GPSFlag(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"

class ProofStatus(str, Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"

class Proof(SQLModel, table=True):
    __tablename__ = "proofs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    milestone_id: uuid.UUID = Field(foreign_key="milestones.id", index=True)
    farmer_id: uuid.UUID = Field(foreign_key="users.uid")

    photo_public_id: str = Field(exclude=True)
    note: Optional[str] = Field(default=None)
    
    gps_latitude: float
    gps_longitude: float
    gps_accuracy_m: Optional[float] = Field(default=None)
    gps_distance_km: float
    gps_flag: GPSFlag = Field(default=GPSFlag.PASS)
    gps_flag_message: Optional[str] = Field(default=None)
    
    status: ProofStatus = Field(default=ProofStatus.SUBMITTED)
    rejection_reason: Optional[str] = Field(default=None)
    
    submitted_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False)
    )

    # Relationships
    milestone: "Milestone" = Relationship(back_populates="proofs")
    farmer: "User" = Relationship()

    @computed_field
    @property
    def photo_url(self) -> str:
        url, options = cloudinary.utils.cloudinary_url(
            self.photo_public_id,
            width=800,
            height=800,
            crop="fill",
            gravity="auto",
            quality="auto:best",
            fetch_format="auto",
            dpr="auto"
        )
        return url
