from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status, UploadFile
from src.harvest.models import HarvestReport, HarvestReportStatus
from src.farms.models import Farm, FarmStatus
from src.file_upload.services import FileUploadServices, ImageCategory
from datetime import date
from src.utils.logger import logger

class HarvestServices:
    def __init__(self):
        self.file_svc = FileUploadServices()

    async def submit_report(
        self, farm_id, actual_yield: float, total_sales: int, 
        harvest_date: date, buyer_name: str, evidence: UploadFile, 
        farmer, session: AsyncSession
    ):
        # 1. Fetch Farm & Validate Ownership
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
            
        if farm.farmer_id != farmer.uid:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="you do not have permission to perform this action")
            
        if farm.farm_status != FarmStatus.FUNDED: 
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="farm is not in a state to be harvested")

        # 2. Check if report already exists
        statement = select(HarvestReport).where(HarvestReport.farm_id == farm_id)
        result = await session.exec(statement)
        existing = result.first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="harvest report already submitted")

        # 3. Upload File
        upload_result = await self.file_svc.upload_image(evidence, farm.id, ImageCategory.PAYMENT_PHOTO)

        # 4. Save Report (Store in Kobo)
        report = HarvestReport(
            farm_id=farm.id,
            farmer_id=farmer.uid,
            actual_yield=actual_yield,
            total_sales_declared_kobo=int(total_sales * 100),
            harvest_date=harvest_date,
            buyer_name=buyer_name,
            payment_evidence_public_id=upload_result["public_id"]
        )
        
        try:
            session.add(report)
            await session.commit()
            await session.refresh(report)
            logger.info(f"Harvest report submitted for farm {farm_id} by farmer {farmer.uid}")
            return report
        except Exception as e:
            logger.error(f"Failed to submit harvest report: {str(e)}")
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="failed to submit harvest report"
            )

    async def get_report(self, farm_id, session: AsyncSession):
        statement = select(HarvestReport).where(HarvestReport.farm_id == farm_id)
        result = await session.exec(statement)
        report = result.first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="harvest report not found")
        return report
