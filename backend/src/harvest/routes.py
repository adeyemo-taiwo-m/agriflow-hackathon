from fastapi import APIRouter, Depends, Form, File, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.utils.dependencies import get_current_farmer
from src.harvest.services import HarvestServices
from src.harvest.schemas import HarvestReportOut
import uuid
from datetime import date

harvest_router = APIRouter()
harvest_svc = HarvestServices()

@harvest_router.post("/farms/{id}/harvest-report", status_code=status.HTTP_201_CREATED)
async def submit_harvest_report(
    id: uuid.UUID,
    actual_yield: float = Form(...),
    total_sales_declared: int = Form(...),
    harvest_date: date = Form(...),
    buyer_name: str = Form(None),
    payment_evidence: UploadFile = File(...),
    farmer = Depends(get_current_farmer),
    session: AsyncSession = Depends(get_session)
):
    result = await harvest_svc.submit_report(
        id, actual_yield, total_sales_declared, harvest_date, 
        buyer_name, payment_evidence, farmer, session
    )
    return {
        "success": True, 
        "message": "harvest report submitted successfully", 
        "data": result
    }

@harvest_router.get("/farms/{id}/harvest-report")
async def get_harvest_report(
    id: uuid.UUID, 
    session: AsyncSession = Depends(get_session)
):
    result = await harvest_svc.get_report(id, session)
    return {
        "success": True, 
        "message": "harvest report retrieved successfully", 
        "data": result
    }
