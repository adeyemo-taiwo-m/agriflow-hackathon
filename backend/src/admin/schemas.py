from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import date, datetime
from src.farms.schemas import MilestoneOut

class FarmRejectInput(BaseModel):
    reason: str = Field(..., min_length=10)

class MilestoneRejectInput(BaseModel):
    reason: str = Field(..., min_length=10)

class ConfirmSalesInput(BaseModel):
    confirmed_sales_amount: int = Field(..., gt=0)

class AdminFarmerOut(BaseModel):
    model_config = {"from_attributes": True}
    uid: uuid.UUID
    full_name: str
    email: str
    bvn_verified: Optional[bool] = False
    bank_verified: Optional[bool] = False
    trust_score: Optional[int] = None
    trust_tier: Optional[str] = None
    account_number: Optional[str] = None
    bank_code: Optional[str] = None
    account_name: Optional[str] = None

class AdminFarmOut(BaseModel):
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
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_photo_url: Optional[str] = None
    listing_display_picture_url: List[str]
    full_display_picture_url: List[str]
    rejection_reason: Optional[str]
    farmer: Optional[AdminFarmerOut] = None
    milestones: List[MilestoneOut]
    created_at: datetime

class AdminMilestoneOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    farm_id: uuid.UUID
    farm_name: str
    farmer_name: str
    name: str
    order_number: int
    expected_week: int
    amount: float
    status: str
    proof_photo_url: Optional[str] = None
    proof_latitude: Optional[float] = None
    proof_longitude: Optional[float] = None
    gps_distance_km: Optional[float] = None
    gps_flag: Optional[str] = None # "pass" | "warning" | "fail"
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None

class StatsOut(BaseModel):
    total_farms: int
    active_farms: int
    pending_reviews: int
    total_investors: int
    total_farmers: int
    total_funds_raised: float

class AdminFarmResponse(BaseModel):
    success: bool
    message: str
    data: AdminFarmOut

class AdminFarmListResponse(BaseModel):
    success: bool
    message: str
    data: List[AdminFarmOut]

class AdminMilestoneResponse(BaseModel):
    success: bool
    message: str
    data: AdminMilestoneOut

class AdminMilestoneListResponse(BaseModel):
    success: bool
    message: str
    data: List[AdminMilestoneOut]

class AdminStatsResponse(BaseModel):
    success: bool
    message: str
    data: StatsOut