from fastapi import APIRouter, Depends, status
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

@admin_router.get("/milestones/pending", response_model=AdminMilestoneListResponse, status_code=status.HTTP_200_OK)
async def get_pending_milestones(
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestones_data = await admin_services.get_pending_milestones(session)
    return {
        "success": True,
        "message": "Pending milestones retrieved successfully",
        "data": milestones_data
    }

@admin_router.post("/milestones/{id}/approve", response_model=AdminMilestoneResponse, status_code=status.HTTP_200_OK)
async def approve_milestone(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin = Depends(get_current_admin),
    admin_services: AdminServices = Depends(get_admin_services)
):
    milestone_data = await admin_services.approve_milestone(id, session)
    return {
        "success": True,
        "message": "Milestone approved successfully",
        "data": milestone_data
    }

@admin_router.post("/milestones/{id}/reject", response_model=AdminMilestoneResponse, status_code=status.HTTP_200_OK)
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
        "data": milestone_data
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
