from fastapi import UploadFile
from typing import List, Optional
from datetime import datetime, date
from pydantic import Field, BaseModel, field_validator
import uuid

class FarmCreate(BaseModel):
    
    crop_reference_id: uuid.UUID

    name: str = Field(..., min_length=3, max_length=100)
    state: str
    lga: str
    farm_size_ha: float = Field(..., gt=0) 
    description: str = Field(..., min_length=20)

    total_budget: int = Field(..., gt=0)

    expected_yield: float = Field(..., gt=0)
    sale_price_per_unit: int = Field(..., gt=0)
    return_rate: float = Field(..., gt=0, le=0.28) 

    start_date: date
    harvest_date: date

    @field_validator("harvest_date")
    @classmethod
    def harvest_after_start(cls, v, info):
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("Harvest date must be after start date")
        return v
    
class MilestoneOut(BaseModel):
    id: uuid.UUID
    name: str
    order_number: int
    expected_week: int
    amount: int
    status: str

class FarmerPublicOut(BaseModel):
    uid: uuid.UUID
    full_name: str
    trust_score: Optional[int] = None
    trust_tier: Optional[str] = None
    bvn_verified: bool

class FarmOut(BaseModel):
    model_config = {"from_attributes": True}
    
    id: uuid.UUID
    name: str
    crop_name: str
    state: str
    lga: str
    farm_size_ha: float
    description: str
    total_budget: int
    amount_raised: int
    expected_yield: float
    sale_price_per_unit: int
    return_rate: float
    start_date: date
    harvest_date: date
    farm_status: str
    latitude: Optional[float]
    longitude: Optional[float]
    display_photos_public_id: List[str]
    location_photo_public_id: Optional[str]
    
    listing_display_picture_url: List[str] = []
    full_display_picture_url: List[str] = []
    
    farmer: Optional[FarmerPublicOut] = None
    milestones: List[MilestoneOut] = []
    created_at: datetime

class FarmListOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    crop_name: str
    state: str
    lga: str
    farm_size_ha: float
    description: str
    total_budget: int
    amount_raised: int
    expected_yield: float
    sale_price_per_unit: int
    return_rate: float
    start_date: date
    harvest_date: date
    farm_status: str
    latitude: Optional[float]
    longitude: Optional[float]
    display_photos_public_id: List[str]
    location_photo_public_id: Optional[str]
    
    listing_display_picture_url: List[str] = []
    
    farmer: Optional[FarmerPublicOut] = None
    created_at: datetime

class UploadFarmLocations(BaseModel):
    # Latitude for Nigeria is roughly 4.0 to 14.0
    latitude: float = Field(..., ge=4.0, le=14.0)
    
    # Longitude for Nigeria is roughly 2.5 to 15.0
    longitude: float = Field(..., ge=2.5, le=15.0)