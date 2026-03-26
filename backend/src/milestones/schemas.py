from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class ProofSubmitInput(BaseModel):
    """Schema for multipart/form-data proof submission."""
    note: Optional[str] = None
    gps_latitude: float 
    gps_longitude: float
    gps_accuracy_m: Optional[float] = None

class ProofOut(BaseModel):
    id: uuid.UUID
    photo_url: str
    note: Optional[str]
    gps_latitude: float
    gps_longitude: float
    gps_accuracy_m: Optional[float]
    gps_distance_km: float
    gps_flag: str
    gps_flag_message: Optional[str]
    status: str
    submitted_at: datetime

    model_config = {"from_attributes": True}

class ProofResponse(BaseModel):
    success: bool
    message: str
    data: ProofOut

class ProofListResponse(BaseModel):
    success: bool
    message: str
    data: List[ProofOut]
