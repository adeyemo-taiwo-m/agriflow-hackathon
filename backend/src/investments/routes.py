from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.utils.dependencies import get_current_investor
from src.investments.services import InvestmentServices
from src.investments.schemas import (
    InvestmentInitiateInput, 
    InvestmentVerifyInput, 
    InvestmentOut,
    CheckoutParamsOut
)
import uuid

investment_router = APIRouter()

def get_investment_services() -> InvestmentServices:
    return InvestmentServices()

@investment_router.post("/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_investment(
    user_input: InvestmentInitiateInput,
    investor = Depends(get_current_investor),
    session: AsyncSession = Depends(get_session),
    investment_services: InvestmentServices = Depends(get_investment_services)
):
    """Initiates an investment and returns Interswitch checkout parameters."""
    result = await investment_services.initiate_investment(user_input, investor, session)
    return {
        "success": True,
        "message": "Investment initiated successfully",
        "data": result
    }

@investment_router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_investment(
    user_input: InvestmentVerifyInput,
    investor = Depends(get_current_investor),
    session: AsyncSession = Depends(get_session),
    investment_services: InvestmentServices = Depends(get_investment_services)
):
    """Verifies an investment payment with Interswitch."""
    result = await investment_services.verify_investment(user_input, session)
    return {
        "success": True,
        "message": "Verification completed",
        "data": result
    }

@investment_router.get("/", status_code=status.HTTP_200_OK)
async def list_investments(
    investor = Depends(get_current_investor),
    session: AsyncSession = Depends(get_session),
    investment_services: InvestmentServices = Depends(get_investment_services)
):
    """Lists all investments for the current investor."""
    result = await investment_services.list_investments(investor, session)
    return {
        "success": True,
        "message": "Investments retrieved successfully",
        "data": result
    }
@investment_router.get("/payouts/expected", status_code=status.HTTP_200_OK)
async def list_expected_payouts(
    investor = Depends(get_current_investor),
    session: AsyncSession = Depends(get_session),
    investment_services: InvestmentServices = Depends(get_investment_services)
):
    """Lists all expected payouts for the current investor with progress steps."""
    result = await investment_services.get_expected_payouts(investor, session)
    return {
        "success": True,
        "message": "Expected payouts retrieved successfully",
        "data": result
    }
