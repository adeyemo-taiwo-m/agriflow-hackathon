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

        # --- HACKATHON SMART SCALING LOGIC ---
        # 100,000 Naira = 10,000,000 Kobo
        INTERSWITCH_LIMIT_KOBO = 10_000_000 
        MINIMUM_PAYMENT_KOBO = 10_000 # 100 Naira
        
        is_test_mode_scaled = False
        scale_factor = 1
        interswitch_checkout_amount = amount_kobo

        # Only scale if the amount hits or exceeds our 100k limit
        if amount_kobo >= INTERSWITCH_LIMIT_KOBO:
            is_test_mode_scaled = True
            scale_factor = 1000
            interswitch_checkout_amount = amount_kobo // scale_factor
            
            # Failsafe: Ensure the scaled amount never drops below 100 Naira
            if interswitch_checkout_amount < MINIMUM_PAYMENT_KOBO:
                interswitch_checkout_amount = MINIMUM_PAYMENT_KOBO

        # Step 6 — Return checkout params
        return {
            "txn_ref": txn_ref,
            "amount_kobo": interswitch_checkout_amount, # What gateway sees
            "actual_amount_kobo": amount_kobo,          # What frontend sees
            "is_test_mode_scaled": is_test_mode_scaled,
            "scale_factor": scale_factor,
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

        # --- REVERSE SMART SCALING LOGIC ---
        INTERSWITCH_LIMIT_KOBO = 10_000_000
        expected_interswitch_amount = investment.amount_kobo
        
        if investment.amount_kobo >= INTERSWITCH_LIMIT_KOBO:
            expected_interswitch_amount = investment.amount_kobo // 1000
            if expected_interswitch_amount < 10_000:
                expected_interswitch_amount = 10_000

        # Step 3 — Call Interswitch
        result = await interswitch_svc.check_interswitch_transaction(
            txn_ref=user_input.txn_ref.upper(),
            expected_amount=expected_interswitch_amount, # Checks against the dynamically scaled amount
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
            # Fetch milestone stats
            ms_result = await session.exec(select(Milestone).where(Milestone.farm_id == farm.id))
            milestones = ms_result.all()
            total_ms = len(milestones)
            done_ms = len([m for m in milestones if m.status in [MilestoneStatus.VERIFIED, MilestoneStatus.DISBURSED]])
            
            investments.append({
                "id": str(inv.id),
                "farmId": str(inv.farm_id),
                "farmName": farm.name,
                "crop": farm.crop_name,
                "amount": inv.amount_kobo / 100,
                "status": inv.status,
                "farm_status": farm.farm_status,
                "expected_return": (inv.amount_kobo * (1 + farm.return_rate)) / 100,
                "return_rate_pct": farm.return_rate * 100,
                "milestonesTotal": total_ms,
                "milestonesCurrent": done_ms,
                "dividendType": "Fixed ROI", # Static for now
                "created_at": inv.created_at
            })
            
        return investments

    async def get_expected_payouts(self, investor, session: AsyncSession):
        from src.harvest.models import HarvestReport, HarvestReportStatus
        from src.payouts.models import Payout, PayoutStatus
        
        result = await session.exec(
            select(Investment, Farm)
            .join(Farm, Farm.id == Investment.farm_id)
            .where(Investment.investor_id == investor.uid)
            .where(Investment.status == InvestmentStatus.CONFIRMED)
        )
        rows = result.all()
        
        payouts = []
        for inv, farm in rows:
            # Calculate status step (1-5)
            # 1: Invested (Confirmed) - default
            # 2: Milestones Done
            # 3: Harvest Collected
            # 4: Proceeds In (Proceeds confirmed by admin)
            # 5: Payout Sent
            
            step = 1
            
            # Check Milestones
            ms_result = await session.exec(select(Milestone).where(Milestone.farm_id == farm.id))
            milestones = ms_result.all()
            all_done = len(milestones) > 0 and all(m.status in [MilestoneStatus.VERIFIED, MilestoneStatus.DISBURSED] for m in milestones)
            if all_done:
                step = 2
            
            # Check Harvest
            hr_result = await session.exec(select(HarvestReport).where(HarvestReport.farm_id == farm.id))
            report = hr_result.first()
            if report and report.status == HarvestReportStatus.VERIFIED:
                step = 3
            
            # Check Proceeds In (Farm Status COMPLETED or PAID_OUT)
            if farm.farm_status in [FarmStatus.COMPLETED, FarmStatus.PAID_OUT]:
                step = 4
            
            # Check Payout Sent
            p_result = await session.exec(
                select(Payout)
                .where(Payout.investment_id == inv.id)
                .where(Payout.status == PayoutStatus.COMPLETED)
            )
            payout_rec = p_result.first()
            if payout_rec:
                step = 5
            
            payouts.append({
                "id": str(inv.id),
                "farmId": str(farm.id),
                "farmName": farm.name,
                "crop": farm.crop_name,
                "invested_amount": inv.amount_kobo / 100,
                "expected": farm.return_rate,
                "expectedDate": farm.harvest_date,
                "statusStep": step,
                "status": "successful" if step == 5 else "processing",
                "dateStatus": "imminent" if farm.farm_status == FarmStatus.FUNDED else "normal"
            })
            
        return payouts
