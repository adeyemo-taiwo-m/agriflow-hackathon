from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form
from fastapi.encoders import jsonable_encoder
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
import uuid

from src.db.main import get_session
from src.farms.services import FarmServices
from src.farms.schemas import (
    FarmCreate,
    UploadFarmLocations,
    FarmOut,
    FarmOutResponse,
    FarmDetailResponse,
    FarmOutListResponse,
    FarmListResponse,
)
from src.utils.dependencies import get_current_farmer
from src.utils.logger import logger

farm_router = APIRouter()

def get_farm_services() -> FarmServices:
    return FarmServices()

@farm_router.post('/', status_code=status.HTTP_201_CREATED)
async def create_farm(
    farm_input: FarmCreate,
    current_farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    logger.info(f"Initiating farm creation for farmer {current_farmer.uid}")
    farm = await farm_services.create_farm(farm_input, current_farmer, session)
    
    return {
        "success": True,
        "message": "Farm record created successfully. Please proceed to upload photos and location details.",
        "data": jsonable_encoder(farm)
    }

@farm_router.post('/{farm_id}/uploads', status_code=status.HTTP_200_OK)
async def upload_farm_details(
    farm_id: uuid.UUID,
    latitude: float = Form(..., ge=4.0, le=14.0),
    longitude: float = Form(..., ge=2.5, le=15.0),
    location_photo: UploadFile = File(...),
    display_photos: List[UploadFile] = File(default=[]),
    current_farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    # Construct the schema from form data
    location_data = UploadFarmLocations(latitude=latitude, longitude=longitude)
    
    logger.info(f"Initiating photo and location upload for farm {farm_id}")
    farm = await farm_services.upload_farm_photos_and_setup(
        farm_id=farm_id,
        location_data=location_data,
        location_photo=location_photo,
        display_photos=display_photos,
        farmer=current_farmer,
        session=session
    )
    
    return {
        "success": True,
        "message": "Farm photos and milestones setup successfully.",
        "data": jsonable_encoder(farm)
    }

@farm_router.get('/my-farms', status_code=status.HTTP_200_OK)
async def get_my_farms(
    current_farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    farms = await farm_services.get_farmer_farms(current_farmer.uid, session)
    # Use FarmOut for explicit serialization of list
    farms_data = [FarmOut.model_validate(f).model_dump() for f in farms]
    return {
        "success": True,
        "message": "Farms retrieved successfully",
        "data": jsonable_encoder(farms_data)
    }

@farm_router.get('/my-farms/ready-for-harvest', status_code=status.HTTP_200_OK)
async def get_ready_for_harvest_farms(
    current_farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    farms = await farm_services.get_harvest_ready_farms(current_farmer.uid, session)
    # Use FarmOut for explicit serialization of list
    farms_data = [FarmOut.model_validate(f).model_dump() for f in farms]
    return {
        "success": True,
        "message": "Ready farms retrieved successfully",
        "data": jsonable_encoder(farms_data)
    }

@farm_router.get('/', status_code=status.HTTP_200_OK)
async def get_farms(
    crop_name: Optional[str] = None,
    state: Optional[str] = None,
    farm_status: str = "active",
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    farms = await farm_services.get_farms(session, crop_name, state, farm_status)
    return {
        "success": True,
        "message": "Farms retrieved successfully",
        "data": jsonable_encoder(farms)
    }

@farm_router.get('/{farm_id}', status_code=status.HTTP_200_OK)
async def get_farm(
    farm_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    farm = await farm_services.get_farm_by_id(farm_id, session)
    # Use FarmOut for explicit serialization
    farm_data = FarmOut.model_validate(farm).model_dump()
    return {
        "success": True,
        "message": "Farm retrieved successfully",
        "data": jsonable_encoder(farm_data)
    }

@farm_router.get("/{id}/roi-breakdown")
async def get_roi_breakdown(
    id: uuid.UUID,
    investment_amount: int, # query param
    session: AsyncSession = Depends(get_session),
    farm_service: FarmServices = Depends(get_farm_services)
):
    result = await farm_service.get_roi_breakdown(id, investment_amount, session)
    return {
        "success": True, 
        "message": "ROI projections generated successfully", 
        "data": result
    }
@farm_router.delete('/{farm_id}', status_code=status.HTTP_200_OK)
async def delete_farm(
    farm_id: uuid.UUID,
    current_farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session),
    farm_services: FarmServices = Depends(get_farm_services)
):
    await farm_services.delete_farm(farm_id, current_farmer.uid, session)
    return {"success": True, "message": "Farm deleted successfully"}
