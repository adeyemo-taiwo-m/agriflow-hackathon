import uuid
import math
from typing import List, Optional
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status, UploadFile
from src.milestones.models import Milestone, MilestoneStatus
from src.proofs.models import Proof, ProofStatus, GPSFlag
from src.farms.models import Farm
from src.auth.models import User
from src.file_upload.services import FileUploadServices, ImageCategory
from src.milestones.schemas import ProofSubmitInput
from src.utils.logger import logger

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two points on Earth in kilometers."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon/2)**2)
    
    c = 2 * math.asin(math.sqrt(a))
    return R * c

class MilestoneServices:
    def __init__(self):
        self.file_upload_services = FileUploadServices()

    async def submit_proof(
        self,
        milestone_id: uuid.UUID,
        input_data: ProofSubmitInput,
        photo: UploadFile,
        current_farmer: User,
        session: AsyncSession
    ) -> dict:
        """Handles milestone proof submission with GPS verification."""
        
        # Fetch milestone with farm data
        statement = select(Milestone).where(Milestone.id == milestone_id)
        result = await session.exec(statement)
        milestone = result.first()

        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
        
        #Validate ownership and status
        farm = await session.get(Farm, milestone.farm_id)
        if farm.farmer_id != current_farmer.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You do not have permission to submit proof for this milestone"
            )
        
        if milestone.status not in [MilestoneStatus.PENDING_PROOF, MilestoneStatus.REJECTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Milestone is in {milestone.status} state and cannot accept proof"
            )

        # Calculate GPS distance
        distance_km = calculate_haversine_distance(
            farm.latitude, farm.longitude, 
            input_data.gps_latitude, input_data.gps_longitude
        )

        #Determine GPS Flag
        gps_flag = GPSFlag.PASS
        gps_flag_message = "Location verified"
        
        if distance_km > 5.0:
            gps_flag = GPSFlag.FAIL
            gps_flag_message = f"Distance too far ({distance_km:.2f}km). Please submit from the farm location."
        elif distance_km > 1.0:
            gps_flag = GPSFlag.WARNING
            gps_flag_message = f"Distance slightly far ({distance_km:.2f}km). Requires manual review."

        # Smart Guard Logic: If accuracy is very low (high value), downgrade FAIL to WARNING
        if gps_flag == GPSFlag.FAIL and input_data.gps_accuracy_m and input_data.gps_accuracy_m > 500:
            gps_flag = GPSFlag.WARNING
            gps_flag_message += " (Accuracy warning: weak GPS signal detected)"

        #Upload photo to Cloudinary
        upload_result = await self.file_upload_services.upload_image(
            photo, farm.id, ImageCategory.MILESTONE_PHOTO
        )

        #Create Proof record
        new_proof = Proof(
            milestone_id=milestone.id,
            farmer_id=current_farmer.uid,
            photo_public_id=upload_result["public_id"],
            note=input_data.note,
            gps_latitude=input_data.gps_latitude,
            gps_longitude=input_data.gps_longitude,
            gps_accuracy_m=input_data.gps_accuracy_m,
            gps_distance_km=distance_km,
            gps_flag=gps_flag,
            gps_flag_message=gps_flag_message,
            status=ProofStatus.SUBMITTED
        )
        
        session.add(new_proof)
        
        # Update milestone status
        milestone.status = MilestoneStatus.UNDER_REVIEW
        session.add(milestone)
        
        await session.commit()
        await session.refresh(new_proof)
        
        logger.info(f"Proof submitted for milestone {milestone.id} by farmer {current_farmer.uid}. GPS Flag: {gps_flag}")
        
        return {
            **new_proof.model_dump(),
            "status": new_proof.status,
            "gps_flag": new_proof.gps_flag
        }
