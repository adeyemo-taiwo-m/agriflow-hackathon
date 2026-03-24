import uuid
from enum import Enum
from typing import Optional, List
from datetime import datetime, date, timezone
from pydantic import computed_field
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
from src.auth.models import User
import cloudinary

def utc_now():
    return datetime.now(timezone.utc)


class FarmStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    FUNDED = "funded"
    COMPLETED = "completed"
    PAID_OUT = "paid out"
    REJECTED = "rejected"
    DEADLINE_PASSED = "deadline passed"
    CANCELLED = "cancelled"


class Farm(SQLModel, table=True):
    __tablename__ = "farms"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    farmer_id: uuid.UUID = Field(foreign_key="users.uid", index=True)
    crop_reference_id: uuid.UUID = Field(foreign_key="crop_references.id", index=True)

    name: str
    crop_name: str
    state: str
    lga: str
    farm_size_ha: float
    description: str

    total_budget: int
    amount_raised: int = Field(default=0)

    expected_yield: float
    sale_price_per_unit: int
    return_rate: float

    start_date: date
    harvest_date: date

    status: FarmStatus = Field(default=FarmStatus.PENDING)

    latitude: Optional[float] = Field(default = None)
    longitude: Optional[float] = Field(default = None)

    location_Verified: bool = Field(default=False)

    location_photo_public_id: Optional[str] = Field(default=None)
    display_photos_public_id: Optional[list] = Field(
        default_factory=list,
        sa_column=Column(pg.JSONB)
    )

    rejection_reason: Optional[str] = Field(default=None)

    deadline_passed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True)
    )
    extension_decision_deadline: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True)
    )
    extension_count: int = Field(default=0)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False, onupdate=utc_now)
    )

    #relationship

    owner: User = Relationship(
        back_populates="farms"
    )

    milestones: List["Milestone"] = Relationship(
        back_populates="farm",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    @computed_field
    @property
    def listing_display_picture_url(self) -> List[str]:
        if not self.display_photos_public_id:
            return []
        
        display_picture_urls = []
        for public_id in self.display_photos_public_id:
            url, options = cloudinary.utils.cloudinary_url(
                public_id,
                width=500,
                height=500,
                crop="fill",
                gravity="face",
                quality="auto",
                fetch_format="auto"
            )
            display_picture_urls.append(url)
             
        return display_picture_urls
    
    @computed_field
    @property
    def full_display_picture_url(self) -> List[str]:
        if not self.display_photos_public_id:
            return []
        
        full_display_picture_urls = []
        for public_id in self.display_photos_public_id:
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

            full_display_picture_urls.append(url)
             
        return full_display_picture_urls
            