from fastapi import UploadFile
from typing import List, Optional
from datetime import datetime, date
from pydantic import Field, BaseModel, field_validator
import uuid
from src.milestones.schemas import ProofOut

class FarmCreate(BaseModel):
    
    crop_reference_id: uuid.UUID

    name: str = Field(..., min_length=3, max_length=100)
    state: str
    lga: str
    farm_size_ha: float = Field(..., gt=0) 
    description: str = Field(..., min_length=20)

    total_budget: float = Field(..., gt=0)

    expected_yield: float = Field(..., gt=0)
    sale_price_per_unit: float = Field(..., gt=0)
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
    amount: float
    status: str
    rejection_reason: Optional[str] = None
    proofs: List[ProofOut] = []

class FarmerPublicOut(BaseModel):
    model_config = {"from_attributes": True}
    uid: uuid.UUID
    full_name: str
    trust_score: Optional[int] = None
    trust_tier: Optional[str] = None
    bvn_verified: bool
    created_at: Optional[datetime] = None
    farm_count: Optional[int] = None

class FarmOut(BaseModel):
    model_config = {"from_attributes": True}
    
    id: uuid.UUID
    name: str
    crop_name: str
    state: str
    lga: str
    farm_size_ha: float
    description: str
    total_budget: float
    amount_raised: float
    expected_yield: float
    sale_price_per_unit: float
    return_rate: float
    start_date: date
    harvest_date: date
    farm_status: str
    latitude: Optional[float]
    longitude: Optional[float]
    
    listing_display_picture_url: List[str] = []
    full_display_picture_url: List[str] = []
    location_photo_url: Optional[str] = None
    
    farmer: Optional[FarmerPublicOut] = None
    created_at: datetime

class FarmDetailOut(FarmOut):
    milestones: List[MilestoneOut] = []

class FarmListOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    crop_name: str
    state: str
    lga: str
    farm_size_ha: float
    description: str
    total_budget: float
    amount_raised: float
    expected_yield: float
    sale_price_per_unit: float
    return_rate: float
    start_date: date
    harvest_date: date
    farm_status: str
    latitude: Optional[float]
    longitude: Optional[float]
    
    listing_display_picture_url: List[str] = []
    location_photo_url: Optional[str] = None
    
    farmer: Optional[FarmerPublicOut] = None
    created_at: datetime


class FarmOutResponse(BaseModel):
    success: bool
    message: str
    data: FarmOut


class FarmDetailResponse(BaseModel):
    success: bool
    message: str
    data: FarmDetailOut


class FarmOutListResponse(BaseModel):
    success: bool
    message: str
    data: List[FarmOut]


class FarmListResponse(BaseModel):
    success: bool
    message: str
    data: List[FarmListOut]

class UploadFarmLocations(BaseModel):
    # Latitude for Nigeria is roughly 4.0 to 14.0
    latitude: float 
    
    # Longitude for Nigeria is roughly 2.5 to 15.0
    longitude: float