from fastapi import UploadFile
from typing import List, Optional
from datetime import datetime, date
from pydantic import Field, BaseModel, field_validator, computed_field, ConfigDict
import uuid
from src.milestones.schemas import ProofOut

class FarmCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    crop_reference_id: uuid.UUID

    name: str = Field(..., min_length=3, max_length=100)
    state: str
    lga: str
    farm_size_ha: float = Field(..., gt=0)
    description: str = Field(..., min_length=20)
    total_budget: float = Field(..., gt=0)
    expected_yield: float = Field(..., gt=0)
    sale_price_per_unit: float = Field(..., gt=0)
    return_rate: float = Field(..., gt=0, le=1)
    start_date: date
    harvest_date: date


class HarvestReportMinOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    status: str
    admin_confirmed_sales: Optional[float] = None

class RepaymentMinOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    status: str
    amount: float
    
class MilestoneOut(BaseModel):
    model_config = {"from_attributes": True}
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

class FarmOut(BaseModel):
    model_config = {"from_attributes": True}
    
    id: uuid.UUID
    farmer_id: uuid.UUID
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
    milestones: List[MilestoneOut] = []
    harvest_reports: List[HarvestReportMinOut] = []
    repayment: Optional[RepaymentMinOut] = None
    is_harvest_ready: bool = False
    created_at: datetime

    @computed_field
    @property
    def expected_revenue(self) -> float:
        return self.expected_yield * self.sale_price_per_unit

class FarmDetailOut(FarmOut):
    pass

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

    @computed_field
    @property
    def expected_revenue(self) -> float:
        return self.expected_yield * self.sale_price_per_unit


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