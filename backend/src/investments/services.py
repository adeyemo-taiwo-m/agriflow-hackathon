import uuid
from sqlmodel import select
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.exc import DatabaseError
from datetime import datetime

from src.config import Config
from src.utils.logger import logger
from src.farms.models import Farm, FarmStatus
from src.milestones.models import Milestone, MilestoneStatus
from src.investments.models import Investment, InvestmentStatus
from src.interswitch.services import InterswitchPaymentServices
from src.interswitch.payment_status import PaymentStatus

interswitch_svc = InterswitchPaymentServices()

class InvestmentServices:

    async def initiate_investment(self, user_input, investor, session: AsyncSession):
        # Step 1 — Fetch the farm
        result = await session.exec(select(Farm).where(Farm.id == user_input.farm_id))
        farm = result.first()
        
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

        # Step 2 — Farm status check
        if farm.farm_status != FarmStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Farm is not accepting investments (status: {farm.farm_status})"
            )

        # Step 3 — Overfunding check
        amount_kobo = user_input.amount * 100
        remaining_kobo = farm.total_budget_kobo - farm.amount_raised_kobo

        if amount_kobo > remaining_kobo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Investment exceeds remaining budget. Maximum: ₦{remaining_kobo / 100:,.0f}"
            )

        # Step 4 — Generate txn_ref
        txn_ref = f"AGF-{uuid.uuid4().hex[:10].upper()}"

        # Step 5 — Save PENDING investment
        investment = Investment(
            farm_id=farm.id,
            investor_id=investor.uid,
            amount_kobo=amount_kobo,
            txn_ref=txn_ref,
            status=InvestmentStatus.PENDING,
        )

        try:
            session.add(investment)
            await session.commit()
            await session.refresh(investment)
        except DatabaseError as e:
            logger.error(f"Failed to initiate investment: {str(e)}")
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initiate investment"
            )

        # Step 6 — Return checkout params
        return {
            "txn_ref": txn_ref,
            "amount_kobo": amount_kobo,
            "merchant_code": Config.INTERSWITCH_PAYMENT_MERCHANT_CODE,
            "payment_item_id": Config.INTERSWITCH_PAYMENT_PAY_ITEM_ID,
            "customer_email": investor.email,
            "customer_name": f"{investor.first_name} {investor.last_name}",
        }

    async def verify_investment(self, user_input, session: AsyncSession):
        # Step 1 — Fetch the investment
        result = await session.exec(
            select(Investment).where(Investment.txn_ref == user_input.txn_ref.upper())
        )
        investment = result.first()
        
        if not investment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment record not found")

        # Step 2 — Idempotency check
        if investment.status == InvestmentStatus.CONFIRMED:
            return {
                "status": "confirmed",
                "message": "Payment was already confirmed",
                "amount": investment.amount_kobo / 100
            }

        # Step 3 — Call Interswitch
        result = await interswitch_svc.check_interswitch_transaction(
            txn_ref=user_input.txn_ref.upper(),
            expected_amount=investment.amount_kobo,
        )

        # Step 4 — Fetch the farm
        farm_result = await session.exec(select(Farm).where(Farm.id == investment.farm_id))
        farm = farm_result.first()
        
        if not farm:
            logger.critical(f"Farm {investment.farm_id} missing during investment verification!")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

        # Step 5 — Race condition check
        remaining_kobo = farm.total_budget_kobo - farm.amount_raised_kobo

        if investment.amount_kobo > remaining_kobo:
            investment.status = InvestmentStatus.FAILED
            investment.failure_reason = "Farm has already reached its funding goal"
            session.add(investment)
            await session.commit()

            logger.warning(
                f"Investment rejected at verify — farm fully funded | "
                f"txn_ref: {user_input.txn_ref} | farm: {farm.id}"
            )

            return {
                "status": "failed",
                "message": "This farm has already reached its funding goal. A refund will be processed.",
            }

        # Step 6 — Handle each Interswitch status
        if result["status"] == PaymentStatus.CONFIRMED:
            investment.status = InvestmentStatus.CONFIRMED
            investment.interswitch_ref = result["raw"].get("PaymentReference")
            
            farm.amount_raised_kobo += investment.amount_kobo
            
            # Check if fully funded
            if farm.amount_raised_kobo >= farm.total_budget_kobo:
                farm.farm_status = FarmStatus.FUNDED
                
                # Fetch first milestone
                ms_result = await session.exec(
                    select(Milestone)
                    .where(Milestone.farm_id == farm.id)
                    .where(Milestone.order_number == 1)
                )
                first_milestone = ms_result.first()
                
                if first_milestone and first_milestone.status == MilestoneStatus.LOCKED:
                    first_milestone.status = MilestoneStatus.PENDING_PROOF
                    session.add(first_milestone)

            session.add(farm)
            session.add(investment)
            await session.commit()
            
            return {
                "status": "confirmed", 
                "message": "Payment successful", 
                "amount": investment.amount_kobo / 100
            }

        elif result["status"] == PaymentStatus.PENDING:
            return {
                "status": "pending", 
                "message": "Your payment is still processing. Please try again in a moment.", 
                "retry": True
            }

        else:
            investment.status = InvestmentStatus.FAILED
            investment.failure_reason = result.get("message", "Payment failed")
            session.add(investment)
            await session.commit()
            
            return {
                "status": "failed", 
                "message": investment.failure_reason
            }

    async def list_investments(self, investor, session: AsyncSession):
        result = await session.exec(
            select(Investment, Farm)
            .join(Farm, Farm.id == Investment.farm_id)
            .where(Investment.investor_id == investor.uid)
            .order_by(Investment.created_at.desc())
        )
        rows = result.all()
        
        investments = []
        for inv, farm in rows:
            investments.append({
                "id": inv.id,
                "farm_id": inv.farm_id,
                "farm_name": farm.name,
                "amount": inv.amount_kobo / 100,
                "status": inv.status,
                "created_at": inv.created_at
            })
            
        return investments
