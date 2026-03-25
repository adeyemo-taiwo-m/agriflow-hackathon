from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.utils.dependencies import get_current_farmer
from src.milestones.services import MilestoneServices
from src.milestones.schemas import ProofSubmitInput, ProofResponse
from typing import Annotated, Optional
import uuid

milestone_router = APIRouter()

def get_milestone_services() -> MilestoneServices:
    return MilestoneServices()

@milestone_router.post("/{id}/proof", response_model=ProofResponse, status_code=status.HTTP_201_CREATED)
async def submit_milestone_proof(
    id: uuid.UUID,
    gps_latitude: float = Form(..., ge=4.0, le=14.0),
    gps_longitude: float = Form(..., ge=2.5, le=15.0),
    gps_accuracy_m: Optional[float] = Form(None),
    note: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_farmer = Depends(get_current_farmer),
    milestone_services: MilestoneServices = Depends(get_milestone_services)
):
    """
    Submits a photo and GPS proof for a milestone.
    Input data is sent as multipart/form-data.
    """
    # Construct the schema from form data
    input_data = ProofSubmitInput(
        gps_latitude=gps_latitude,
        gps_longitude=gps_longitude,
        gps_accuracy_m=gps_accuracy_m,
        note=note
    )
    
    proof_data = await milestone_services.submit_proof(
        id, input_data, photo, current_farmer, session
    )
    return {
        "success": True,
        "message": "Milestone proof submitted successfully",
        "data": proof_data
    }
