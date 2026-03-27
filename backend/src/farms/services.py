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
from src.harvest.models import HarvestReport, HarvestReportStatus
from sqlalchemy.exc import DatabaseError
from src.utils.logger import logger
from typing import List
from sqlalchemy.orm import selectinload
from src.auth.models import User
from src.harvest.models import HarvestReport

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

        
        # Budget validation (crop reference stores kobo)
        max_budget_kobo = crop.cost_per_hectare_max_kobo * user_input.farm_size_ha * (1 + crop.max_budget_deviation)
        user_budget_kobo = int(user_input.total_budget * 100)
        
        if user_budget_kobo > max_budget_kobo:
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
        
        # Convert Naira inputs to Kobo for storage
        total_budget_kobo = int(user_input.total_budget * 100)
        sale_price_kobo = int(user_input.sale_price_per_unit * 100)
        
        farm_data.pop("total_budget", None)
        farm_data.pop("sale_price_per_unit", None)
        
        new_farm = Farm(
            **farm_data,
            total_budget_kobo=total_budget_kobo,
            sale_price_per_unit_kobo=sale_price_kobo,
            farmer_id=farmer.uid,
            crop_reference_id=crop.id,
            crop_name=crop.name,
            farm_status=FarmStatus.DRAFT
        )
        
        try:
            session.add(new_farm)
            await session.commit()
            await session.refresh(new_farm)
            logger.info(f"Step 1: Created farm record {new_farm.id} for farmer {farmer.uid}")
            
            # Reload with relationships so the response can be fully serialized
            stmt = select(Farm).where(Farm.id == new_farm.id).options(
                selectinload(Farm.owner),
                selectinload(Farm.milestones)
            )
            result = await session.exec(stmt)
            return result.one()
        
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

        if farm.farm_status != FarmStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft farms can be submitted for review"
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
        farm.location_verified = True
        farm.farm_status = FarmStatus.PENDING

        try:
            session.add(farm)
            await session.flush() 
            crop = await session.get(CropReference, farm.crop_reference_id)
            
            milestones = []
            for index, template in enumerate(crop.default_milestones):
                amount_kobo = int(template["percentage"] * farm.total_budget_kobo)
                milestone = Milestone(
                    farm_id=farm.id,
                    name=template["name"],
                    order_number=index + 1,
                    expected_week=template["week"],
                    amount_kobo=amount_kobo,
                    status=MilestoneStatus.LOCKED
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
            selectinload(Farm.milestones).selectinload(Milestone.proofs),
            selectinload(Farm.owner).selectinload(User.farms),
            selectinload(Farm.harvest_reports),
            selectinload(Farm.repayment)
        )
        result = await session.exec(statement)
        farm = result.first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="farm not found"
            )
            
        # Self-healing logic for milestone unlocking
        updated = False
        if farm.milestones:
            # Always sort to ensure order is correct
            sorted_ms = sorted(farm.milestones, key=lambda m: m.order_number)
            
            is_fully_funded = farm.amount_raised_kobo >= farm.total_budget_kobo
            
            # Milestone 1: Unlock only if FULLY FUNDED, otherwise ensure it's LOCKED
            if is_fully_funded:
                if sorted_ms[0].status == MilestoneStatus.LOCKED:
                    sorted_ms[0].status = MilestoneStatus.PENDING_PROOF
                    session.add(sorted_ms[0])
                    updated = True
            else:
                # If NOT fully funded, ensure Stage 1 is LOCKED (unless it's already under review/verified, which shouldn't happen)
                if sorted_ms[0].status == MilestoneStatus.PENDING_PROOF:
                    sorted_ms[0].status = MilestoneStatus.LOCKED
                    session.add(sorted_ms[0])
                    updated = True
            
            # Subsequent Milestones: Unlock only if PREVIOUS is DISBURSED
            for i in range(len(sorted_ms) - 1):
                prev_m = sorted_ms[i]
                next_m = sorted_ms[i+1]
                
                if prev_m.status == MilestoneStatus.DISBURSED and next_m.status == MilestoneStatus.LOCKED:
                    next_m.status = MilestoneStatus.PENDING_PROOF
                    session.add(next_m)
                    updated = True
            
            # CRITICAL: Reassign sorted list to the relationship so the response is ordered
            farm.milestones = sorted_ms
                    
        if updated:
            await session.commit()
            await session.refresh(farm)
            # Re-sort after refresh just in case
            farm.milestones.sort(key=lambda m: m.order_number)
            
        return farm
    
    async def get_farms(self, session: AsyncSession, crop_name: str = None, state: str = None, farm_status: str = "active"):
        statement = select(Farm).where(Farm.farm_status == farm_status).options(
            selectinload(Farm.owner).selectinload(User.farms)
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
            selectinload(Farm.owner).selectinload(User.farms),
            selectinload(Farm.milestones).selectinload(Milestone.proofs),
            selectinload(Farm.harvest_reports),
            selectinload(Farm.repayment)
        )
        result = await session.exec(statement)
        farms = result.all()

        # Sort milestones by order_number for all farms
        for farm in farms:
            if farm.milestones:
                farm.milestones.sort(key=lambda m: m.order_number)
        
        # Self-healing logic: Ensure milestones progress correctly
        updated = False
        for farm in farms:
            if farm.farm_status in [FarmStatus.ACTIVE, FarmStatus.FUNDED] and farm.milestones:
                # Sort milestones by order to iterate sequentially
                sorted_ms = sorted(farm.milestones, key=lambda m: m.order_number)
                
                is_fully_funded = farm.amount_raised_kobo >= farm.total_budget_kobo
                
                # Rule 1: First milestone of ACTIVE/FUNDED farm should be unlocked only if fully funded
                if is_fully_funded:
                    if sorted_ms[0].status == MilestoneStatus.LOCKED:
                        sorted_ms[0].status = MilestoneStatus.PENDING_PROOF
                        session.add(sorted_ms[0])
                        updated = True
                else:
                    # Explicitly RE-LOCK if it was prematurely unlocked
                    if sorted_ms[0].status == MilestoneStatus.PENDING_PROOF:
                        sorted_ms[0].status = MilestoneStatus.LOCKED
                        session.add(sorted_ms[0])
                        updated = True
                
                # Rule 2: If milestone i is DISBURSED, milestone i+1 should be unblocked (if locked)
                for i in range(len(sorted_ms) - 1):
                    if sorted_ms[i].status == MilestoneStatus.DISBURSED and sorted_ms[i+1].status == MilestoneStatus.LOCKED:
                        sorted_ms[i+1].status = MilestoneStatus.PENDING_PROOF
                        session.add(sorted_ms[i+1])
                        updated = True
                
                # Reassign sorted list
                farm.milestones = sorted_ms
        
        if updated:
            await session.commit()

        # Compute and persist is_harvest_ready on each farm
        reports_stmt = select(HarvestReport.farm_id).where(HarvestReport.farmer_id == farmer_id)
        reports_res = await session.exec(reports_stmt)
        reported_ids = set(reports_res.all())

        ready_updated = False
        for farm in farms:
            already_reported = farm.id in reported_ids
            eligible_status = farm.farm_status in [FarmStatus.ACTIVE, FarmStatus.FUNDED]
            has_milestones = bool(farm.milestones)
            all_disbursed = has_milestones and all(
                m.status == MilestoneStatus.DISBURSED for m in farm.milestones
            )
            new_ready = (not already_reported) and eligible_status and all_disbursed
            if farm.is_harvest_ready != new_ready:
                farm.is_harvest_ready = new_ready
                session.add(farm)
                ready_updated = True

        if ready_updated:
            await session.commit()

        return farms
    
    async def get_all_farms(self, session: AsyncSession):
        statement = select(Farm)
        result = await session.exec(statement)
        farms = result.all()
        return farms

    async def get_roi_breakdown(self, farm_id: uuid.UUID, investment_amount_naira: float, session: AsyncSession):
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
            
        crop = await session.get(CropReference, farm.crop_reference_id)
        if not crop:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="crop reference not found")
        
        # Calculate Base Revenues in Kobo (Yield * Size * Price_Kobo)
        size = farm.farm_size_ha
        
        price_min_kobo = crop.market_price_min_kobo
        price_max_kobo = crop.market_price_max_kobo
        price_avg_kobo = (price_min_kobo + price_max_kobo) / 2

        yield_min = crop.yield_per_hectare_min
        yield_max = crop.yield_per_hectare_max
        yield_avg = (yield_min + yield_max) / 2

        rev_con_kobo = yield_min * size * price_min_kobo
        rev_exp_kobo = yield_avg * size * price_avg_kobo
        rev_opt_kobo = yield_max * size * price_max_kobo

        # Apply 95% investor pool
        pool_con_kobo = rev_con_kobo * 0.95
        pool_exp_kobo = rev_exp_kobo * 0.95
        pool_opt_kobo = rev_opt_kobo * 0.95

        # Calculate user's stake
        inv_amount_kobo = investment_amount_naira * 100
        budget_kobo = farm.total_budget_kobo
        target_denominator = budget_kobo if budget_kobo > 0 else 1
        stake = inv_amount_kobo / target_denominator

        return {
            "investment_amount": investment_amount_naira,
            "stake_percentage": round(stake * 100, 2),
            "projections": {
                "conservative": {"revenue": int(rev_con_kobo / 100), "payout": int(pool_con_kobo * stake / 100)},
                "expected": {"revenue": int(rev_exp_kobo / 100), "payout": int(pool_exp_kobo * stake / 100)},
                "optimistic": {"revenue": int(rev_opt_kobo / 100), "payout": int(pool_opt_kobo * stake / 100)}
            }
        }

    async def get_harvest_ready_farms(self, farmer_id: uuid.UUID, session: AsyncSession):
        statement = select(Farm).where(
            Farm.farmer_id == farmer_id,
            Farm.is_harvest_ready == True
        ).options(
            selectinload(Farm.owner).selectinload(User.farms),
            selectinload(Farm.milestones).selectinload(Milestone.proofs),
            selectinload(Farm.harvest_reports),
            selectinload(Farm.repayment)
        )
        result = await session.exec(statement)
        return result.all()

    async def delete_farm(self, farm_id: uuid.UUID, farmer_id: uuid.UUID, session: AsyncSession):
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
        
        if farm.farmer_id != farmer_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this farm")
        
        if farm.farm_status not in [FarmStatus.DRAFT, FarmStatus.REJECTED, FarmStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Cannot delete farm in {farm.farm_status} status"
            )

        # Avoid circular import by importing in method
        from src.investments.models import Investment
        inv_stmt = select(Investment).where(Investment.farm_id == farm_id)
        inv_res = await session.exec(inv_stmt)
        if inv_res.first():
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Cannot delete farm with existing investments"
            )

        await session.delete(farm)
        await session.commit()
        logger.info(f"Farmer {farmer_id} deleted farm {farm_id}")
        return True

