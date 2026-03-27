from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.utils.dependencies import get_current_admin
from src.admin.services import AdminServices
from src.admin.schemas import (
    AdminFarmResponse,
    AdminFarmListResponse,
    AdminMilestoneResponse,
    AdminMilestoneListResponse,
    AdminStatsResponse,
    AdminUserListResponse,
    FarmRejectInput, 
    MilestoneRejectInput
)
import uuid

admin_router = APIRouter()

def get_admin_services() -> AdminServices:
    return AdminServices()

@admin_router.get("/farms/pending", response_model=AdminFarmListResponse, status_code=status.HTTP_200_OK)
async def get_pending_farms(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    farms_data = await admin_services.get_pending_farms(session)
    return {
        "success": True,
        "message": "Pending farms retrieved successfully",
        "data": farms_data
    }

@admin_router.post("/farms/{id}/approve", response_model=AdminFarmResponse, status_code=status.HTTP_200_OK)
async def approve_farm(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    farm_data = await admin_services.approve_farm(id, session)
    return {
        "success": True,
        "message": "Farm approved successfully",
        "data": farm_data
    }

@admin_router.post("/farms/{id}/reject", response_model=AdminFarmResponse, status_code=status.HTTP_200_OK)
async def reject_farm(
    id: uuid.UUID,
    reject_input: FarmRejectInput,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    farm_data = await admin_services.reject_farm(id, reject_input.reason, session)
    return {
        "success": True,
        "message": "Farm rejected successfully",
        "data": farm_data
    }

@admin_router.get("/milestones/pending", status_code=status.HTTP_200_OK)
async def get_pending_milestones(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestones_data = await admin_services.get_pending_milestones(session)
    return {
        "success": True,
        "message": "Pending milestones retrieved successfully",
        "data": jsonable_encoder(milestones_data)
    }

@admin_router.post("/milestones/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_milestone(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestone_data = await admin_services.approve_milestone(id, session)
    return {
        "success": True,
        "message": "Milestone verified successfully",
        "data": jsonable_encoder(milestone_data)
    }

@admin_router.post("/milestones/{id}/disburse", status_code=status.HTTP_200_OK)
async def disburse_milestone(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestone_data = await admin_services.disburse_milestone(id, session)
    return {
        "success": True,
        "message": "Milestone disbursed and next stage unlocked",
        "data": jsonable_encoder(milestone_data)
    }

@admin_router.post("/milestones/{id}/reject", status_code=status.HTTP_200_OK)
async def reject_milestone(
    id: uuid.UUID,
    reject_input: MilestoneRejectInput,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestone_data = await admin_services.reject_milestone(id, reject_input.reason, session)
    return {
        "success": True,
        "message": "Milestone rejected successfully",
        "data": jsonable_encoder(milestone_data)
    }

@admin_router.get("/stats", response_model=AdminStatsResponse, status_code=status.HTTP_200_OK)
async def get_stats(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    stats = await admin_services.get_stats(session)
    return {
        "success": True,
        "message": "Platform statistics retrieved successfully",
        "data": stats
    }

@admin_router.get("/users", response_model=AdminUserListResponse, status_code=status.HTTP_200_OK)
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    users = await admin_services.get_all_users(session)
    return {
        "success": True,
        "message": "Users retrieved successfully",
        "data": users
    }

from pydantic import BaseModel
from src.admin.services import AdminFinancialServices

admin_fin_svc = AdminFinancialServices()

class ConfirmSalesInput(BaseModel):
    confirmed_amount_naira: int

@admin_router.post("/farms/{id}/confirm-sales")
async def admin_confirm_sales(
    id: uuid.UUID,
    input_data: ConfirmSalesInput,
    admin = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    result = await admin_fin_svc.confirm_sales(id, input_data.confirmed_amount_naira, session)
    return {
        "success": True, 
        "message": "sales confirmed successfully", 
        "data": result
    }

@admin_router.post("/farms/{id}/initiate-payouts")
async def admin_initiate_payouts(
    id: uuid.UUID,
    admin = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    result = await admin_fin_svc.initiate_payouts(id, session)
    return {
        "success": True, 
        "message": "payouts initiated successfully", 
        "data": result
    }

@admin_router.get("/farms", status_code=status.HTTP_200_OK)
async def get_all_farms(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    farms_data = await admin_services.get_all_farms(session)
    return {
        "success": True,
        "message": "All farms retrieved successfully",
        "data": jsonable_encoder(farms_data)
    }

@admin_router.get("/harvest-reports")
async def get_harvest_reports(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    data = await admin_services.get_harvest_reports(session)
    return {"success": True, "message": "Harvest reports retrieved", "data": data}

@admin_router.post("/harvest-reports/{report_id}/verify")
async def verify_harvest_report(
    report_id: uuid.UUID,
    confirmed_sales: float,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    result = await admin_services.verify_harvest_report(report_id, confirmed_sales, session)
    return {"success": True, "message": result["message"]}

@admin_router.get("/repayments")
async def get_repayments(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    data = await admin_services.get_repayments(session)
    return {
        "success": True,
        "message": "Repayments retrieved successfully",
        "data": data
    }

@admin_router.get("/payouts/{farm_id}")
async def get_farm_payouts(
    farm_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    payouts = await admin_services.get_farm_payouts(farm_id, session)
    return {
        "success": True, 
        "message": "payouts retrieved successfully", 
        "data": payouts
    }

@admin_router.delete("/farms/{id}", status_code=status.HTTP_200_OK)
async def delete_farm(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    await admin_services.delete_farm(id, session)
    return {
        "success": True,
        "message": "Farm and all associated data deleted successfully"
    }
