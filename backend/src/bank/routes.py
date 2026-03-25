from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession
from src.bank.schemas import BankListResponse, BankOut
from src.bank.services import BankServices
from src.db.main import get_session


bank_router = APIRouter()


def get_bank_services() -> BankServices:
    return BankServices()


@bank_router.get('', response_model=BankListResponse, status_code=status.HTTP_200_OK)
async def get_all_banks(
    session: AsyncSession = Depends(get_session),
    bank_services: BankServices = Depends(get_bank_services)
):
    banks = await bank_services.get_all_banks(session)
    
    return {
        "success":True,
        "message": "Banks retrieved successfully",
        "data": banks
    }
