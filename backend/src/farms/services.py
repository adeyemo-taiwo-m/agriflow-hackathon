from sqlmodel import select
import uuid
from datetime import date
from sqlmodel.ext.asyncio.session import AsyncSession
from src.farms.models import Farm, FarmStatus
from src.crops.models import CropReference
from src.farms.schemas import FarmCreate, UploadFarmLocations
from src.milestones.models import Milestone, MilestoneStatus
from fastapi import HTTPException, status, UploadFile
from src.file_upload.services import FileUploadServices, ImageCategory
from sqlalchemy.exc import DatabaseError
from src.utils.logger import logger
from typing import List
from sqlalchemy.orm import selectinload

class FarmServices:

    def __init__(self):
        self.file_upload_services = FileUploadServices()

    async def create_farm(self, user_input: FarmCreate, farmer, session: AsyncSession):
        
        if not farmer.bvn_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Complete BVN verification before listing a farm"
            )
        
        
        if not farmer.bank_verified:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Add a bank account before listing a farm"
            )

        
        crop_statement = select(CropReference).where(CropReference.id == user_input.crop_reference_id, CropReference.is_active == True)
        result = await session.exec(crop_statement)
        crop = result.first()

        if not crop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop not found or not active"
            )
        
        
        if crop.suitable_states and user_input.state not in crop.suitable_states:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{crop.name} is not suitable for {user_input.state}"
            )

        
        max_budget = crop.cost_per_hectare_max * user_input.farm_size_ha * (1 + crop.max_budget_deviation)
        if user_input.total_budget > max_budget:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Budget exceeds maximum allowed for this crop and farm size"
            )

        
        max_yield = crop.yield_per_hectare_max * user_input.farm_size_ha * (1 + crop.max_yield_deviation)
        if user_input.expected_yield > max_yield:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expected yield exceeds maximum for this crop and farm size"
            )

        
        if user_input.return_rate > crop.max_return_rate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return rate cannot exceed {int(crop.max_return_rate * 100)}% for {crop.name}"
            )

        
        start_date = user_input.start_date
        harvest_date = user_input.harvest_date
        duration_months = (harvest_date.year - start_date.year) * 12 + (harvest_date.month - start_date.month)
        
        if duration_months < crop.growing_months_min or duration_months > crop.growing_months_max:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Harvest date must be {crop.growing_months_min}–{crop.growing_months_max} months from start date"
            )

        
        if user_input.harvest_date <= date.today():
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Harvest date must be in the future"
            )

        farm_data = user_input.model_dump()
        farm_data.pop("crop_reference_id", None)
        new_farm = Farm(
            farm_data,
            farmer_id=farmer.uid,
            crop_reference_id=crop.id,
            crop_name=crop.name,
            funding_goal=user_input.total_budget,
            farm_status=FarmStatus.PENDING
        )
        
        try:
            session.add(new_farm)
            await session.commit()
            await session.refresh(new_farm)
            logger.info(f"Step 1: Created farm record {new_farm.id} for farmer {farmer.uid}")
            return new_farm
        
        except DatabaseError as e:
            logger.error(f"Database error during creation for {farmer.uid}: {str(e)}", exc_info=True)
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="farm creation failed, try again"
            )
        
    async def upload_farm_photos_and_setup(self, farm_id: uuid.UUID, location_data: UploadFarmLocations, location_photo: UploadFile, display_photos: List[UploadFile], farmer, session: AsyncSession):
        farm = await self.get_farm_by_id(farm_id, session)

        
        if farm.farmer_id != farmer.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this farm"
            )

        
        location_upload = await self.file_upload_services.upload_image(location_photo, farm_id, ImageCategory.LOCATION_PHOTO)
        location_public_id = location_upload["public_id"]

        
        display_public_ids = []
        for photo in display_photos:
            upload_res = await self.file_upload_services.upload_image(photo, farm_id, ImageCategory.DISPLAY_PHOTO)
            display_public_ids.append(upload_res["public_id"])

        
        farm.latitude = location_data.latitude
        farm.longitude = location_data.longitude
        farm.location_photo_public_id = location_public_id
        farm.display_photos_public_id = display_public_ids

        try:
            session.add(farm)
            await session.flush() 
            crop = await session.get(CropReference, farm.crop_reference_id)
            
            milestones = []
            for index, template in enumerate(crop.default_milestones):
                amount = int(template["percentage"] * farm.total_budget)
                milestone = Milestone(
                    farm_id=farm.id,
                    name=template["name"],
                    order_number=index + 1,
                    expected_week=template["week"],
                    amount=amount,
                    farm_status=MilestoneStatus.LOCKED
                )
                milestones.append(milestone)
            
            session.add_all(milestones)
            await session.commit()
            await session.refresh(farm)
            
            logger.info(f"Step 2: Successfully setup photos, coordinates and milestones for farm {farm.id}")
            return farm

        except Exception as e:
            logger.error(f"Error during photo setup for farm {farm_id}: {str(e)}", exc_info=True)
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Setup failed: {str(e)}"
            )
        
    async def get_farm_by_id(self, farm_id: uuid.UUID, session: AsyncSession):
        
        
        statement = select(Farm).where(Farm.id == farm_id).options(
            selectinload(Farm.milestones),
            selectinload(Farm.owner)
        )
        result = await session.exec(statement)
        farm = result.first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="farm not found"
            )
        return farm
    
    async def get_farms(self, session: AsyncSession, crop_name: str = None, state: str = None, status: str = "active"):
        statement = select(Farm).where(Farm.status == status).options(
            selectinload(Farm.owner)
        )
        if crop_name:
            statement = statement.where(Farm.crop_name == crop_name)
        if state:
            statement = statement.where(Farm.state == state)
        
        statement = statement.order_by(Farm.created_at.desc())
        result = await session.exec(statement)
        return result.all()

    async def get_farmer_farms(self, farmer_id: uuid.UUID, session: AsyncSession):
        statement = select(Farm).where(Farm.farmer_id == farmer_id).order_by(Farm.created_at.desc()).options(
            selectinload(Farm.owner),
            selectinload(Farm.milestones)
        )
        result = await session.exec(statement)
        return result.all()
    
    async def get_all_farms(self, session: AsyncSession):
        statement = select(Farm)
        result = await session.exec(statement)
        farms = result.all()
        return farms
