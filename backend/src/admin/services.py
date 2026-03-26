from sqlmodel.ext.asyncio.session import AsyncSession

from typing import List
from src.farms.models import Farm, FarmStatus
from src.milestones.models import Milestone, MilestoneStatus
from src.auth.models import User, Role
from sqlmodel import select, func
from fastapi import HTTPException, status
import uuid
from sqlalchemy.orm import selectinload


class AdminServices:

    async def get_pending_farms(self, session: AsyncSession) -> List[dict]:
        """Retrieves all farms awaiting approval, sorted by oldest first."""
        statement = select(Farm).where(Farm.farm_status == FarmStatus.PENDING).order_by(Farm.created_at.asc()).options(
            selectinload(Farm.owner),
            selectinload(Farm.milestones).selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        farms = result.all()
        
        return [
            {
                **farm.model_dump(),
                "status": farm.farm_status,
                "farmer": farm.owner, 
                "milestones": farm.milestones 
            } for farm in farms
        ]

    async def approve_farm(self, farm_id: uuid.UUID, session: AsyncSession) -> dict:
        """Updates farm status to ACTIVE, allowing it to receive investments."""
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
        
        if farm.farm_status != FarmStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending farms can be approved")
        
        farm.farm_status = FarmStatus.ACTIVE
        session.add(farm)
        await session.commit()
        await session.refresh(farm)
        
        # Re-fetch with relationships
        statement = select(Farm).where(Farm.id == farm.id).options(
            selectinload(Farm.owner),
            selectinload(Farm.milestones).selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        farm = result.one()
        return {
            **farm.model_dump(),
            "status": farm.farm_status,
            "farmer": farm.owner,
            "milestones": farm.milestones
        }

    async def reject_farm(self, farm_id: uuid.UUID, reason: str, session: AsyncSession) -> dict:
        """Rejects a farm with a specified reason."""
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
        
        farm.farm_status = FarmStatus.REJECTED
        farm.rejection_reason = reason
        session.add(farm)
        await session.commit()
        await session.refresh(farm)
        
        # Re-fetch with relationships
        statement = select(Farm).where(Farm.id == farm.id).options(
            selectinload(Farm.owner),
            selectinload(Farm.milestones).selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        farm = result.one()
        return {
            **farm.model_dump(),
            "status": farm.farm_status,
            "farmer": farm.owner,
            "milestones": farm.milestones
        }

    async def get_pending_milestones(self, session: AsyncSession) -> List[dict]:
        """Retrieves all milestones under review."""
        statement = select(Milestone).where(Milestone.status == MilestoneStatus.UNDER_REVIEW).options(
            selectinload(Milestone.farm).selectinload(Farm.owner),
            selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        milestones = result.all()
        return [
            {
                **m.model_dump(),
                "farm_name": m.farm.name if m.farm else "Unknown Farm",
                "farmer_name": m.farm.owner.full_name if m.farm and m.farm.owner else "Unknown Farmer"
            } for m in milestones
        ]

    async def approve_milestone(self, milestone_id: uuid.UUID, session: AsyncSession) -> dict:
        """Verifies a milestone and unlocks the next one in the sequence."""
        milestone = await session.get(Milestone, milestone_id)
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
        
        if milestone.status != MilestoneStatus.UNDER_REVIEW:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only milestones under review can be approved")

        milestone.status = MilestoneStatus.VERIFIED
        session.add(milestone)
        
        farm = await session.get(Farm, milestone.farm_id)
        
        next_order = milestone.order_number + 1
        statement = select(Milestone).where(Milestone.farm_id == farm.id, Milestone.order_number == next_order)
        result = await session.exec(statement)
        next_milestone = result.first()
        
        if next_milestone and next_milestone.status == MilestoneStatus.LOCKED:
            next_milestone.status = MilestoneStatus.PENDING_PROOF
            session.add(next_milestone)
        
        milestone_statement = select(Milestone).where(Milestone.farm_id == farm.id)
        milestones_result = await session.exec(milestone_statement)
        all_milestones = milestones_result.all()
        
        if all(m.status in [MilestoneStatus.VERIFIED, MilestoneStatus.DISBURSED] for m in all_milestones):
            farm.farm_status = FarmStatus.COMPLETED
            session.add(farm)
            
        await session.commit()
        await session.refresh(milestone)
        
        statement = select(Milestone).where(Milestone.id == milestone.id).options(
            selectinload(Milestone.farm).selectinload(Farm.owner),
            selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        milestone = result.one()
        return {
            **milestone.model_dump(),
            "farm_name": milestone.farm.name,
            "farmer_name": milestone.farm.owner.full_name
        }

    async def reject_milestone(self, milestone_id: uuid.UUID, reason: str, session: AsyncSession) -> dict:
        """Rejects a milestone proof."""
        milestone = await session.get(Milestone, milestone_id)
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
        
        milestone.status = MilestoneStatus.REJECTED
        milestone.rejection_reason = reason
        session.add(milestone)
        await session.commit()
        await session.refresh(milestone)
        
        statement = select(Milestone).where(Milestone.id == milestone.id).options(
            selectinload(Milestone.farm).selectinload(Farm.owner),
            selectinload(Milestone.proofs)
        )
        result = await session.exec(statement)
        milestone = result.one()
        return {
            **milestone.model_dump(),
            "farm_name": milestone.farm.name,
            "farmer_name": milestone.farm.owner.full_name
        }

    async def get_stats(self, session: AsyncSession) -> dict:
        """Global platform statistics."""
        # Total farms
        total_farms = await session.exec(select(func.count(Farm.id)))
        # Active farms
        active_farms = await session.exec(select(func.count(Farm.id)).where(Farm.farm_status == FarmStatus.ACTIVE))
        # Pending reviews
        pending_farms = await session.exec(select(func.count(Farm.id)).where(Farm.farm_status == FarmStatus.PENDING))
        under_review_milestones = await session.exec(select(func.count(Milestone.id)).where(Milestone.status == MilestoneStatus.UNDER_REVIEW))
        # Total investors/farmers
        total_investors = await session.exec(select(func.count(User.uid)).where(User.role == Role.INVESTOR))
        total_farmers = await session.exec(select(func.count(User.uid)).where(User.role == Role.FARMER))
        # Total funds raised
        total_funds_raised_kobo = await session.exec(select(func.sum(Farm.amount_raised_kobo)))

        return {
            "total_farms": total_farms.one() or 0,
            "active_farms": active_farms.one() or 0,
            "pending_reviews": (pending_farms.one() or 0) + (under_review_milestones.one() or 0),
            "total_investors": total_investors.one() or 0,
            "total_farmers": total_farmers.one() or 0,
            "total_funds_raised": (total_funds_raised_kobo.one() or 0) / 100
        }

from src.harvest.models import HarvestReport, HarvestReportStatus
from src.payouts.models import Payout, PayoutStatus, RecipientType
from src.investments.models import Investment, InvestmentStatus
from src.utils.logger import logger
from datetime import datetime

class AdminFinancialServices:
    
    async def confirm_sales(self, farm_id: uuid.UUID, confirmed_amount_naira: float, session: AsyncSession):
        # 1. Fetch dependencies
        farm = await session.get(Farm, farm_id)
        report_query = await session.exec(select(HarvestReport).where(HarvestReport.farm_id == farm_id))
        report = report_query.first()
        
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
        
        if not report:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="harvest report not found")

        # 2. Update Report
        confirmed_amount_kobo = int(confirmed_amount_naira * 100)
        report.admin_confirmed_sales_kobo = confirmed_amount_kobo
        report.status = HarvestReportStatus.VERIFIED
        report.verified_at = datetime.utcnow()
        session.add(report)

        # 3. THE REVENUE SPLIT MATH (Everything calculated in Kobo)
        # Platform fee (5%)
        platform_fee_kobo = int(confirmed_amount_kobo * 0.05)
        investor_pool_kobo = int(confirmed_amount_kobo * 0.95)
        
        farm_raised_kobo = farm.amount_raised_kobo

        if farm_raised_kobo == 0:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot confirm sales for farm with no investment")

        # 4. Generate Investor Payouts
        investments_query = await session.exec(
            select(Investment).where(
                Investment.farm_id == farm_id, 
                Investment.status == InvestmentStatus.CONFIRMED
            )
        )
        investments = investments_query.all()

        total_investor_payouts_kobo = 0

        for inv in investments:
            # Investor Payout = Pool * (Investment / Total Raised)
            investor_total_share_kobo = int(investor_pool_kobo * (inv.amount_kobo / farm_raised_kobo))
            investor_profit_kobo = investor_total_share_kobo - inv.amount_kobo
            
            payout = Payout(
                farm_id=farm.id,
                recipient_id=inv.investor_id,
                recipient_type=RecipientType.INVESTOR,
                investment_id=inv.id,
                principal_kobo=inv.amount_kobo,
                profit_kobo=investor_profit_kobo,
                total_amount_kobo=investor_total_share_kobo
            )
            session.add(payout)
            total_investor_payouts_kobo += investor_total_share_kobo

        # 5. Generate Farmer Payout
        farmer_payout_amount_kobo = confirmed_amount_kobo - total_investor_payouts_kobo - platform_fee_kobo
        
        if farmer_payout_amount_kobo > 0:
            farmer_payout = Payout(
                farm_id=farm.id,
                recipient_id=farm.farmer_id,
                recipient_type=RecipientType.FARMER,
                principal_kobo=0,
                profit_kobo=farmer_payout_amount_kobo,
                total_amount_kobo=farmer_payout_amount_kobo
            )
            session.add(farmer_payout)

        # 6. Update Farm Status
        farm.farm_status = FarmStatus.COMPLETED
        session.add(farm)
        
        try:
            await session.commit()
            logger.info(f"Sales confirmed for farm {farm_id}. Payouts generated.")
        except Exception as e:
            logger.error(f"Failed to confirm sales: {str(e)}")
            await session.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="failed to confirm sales")
        
        return {"message": "Sales confirmed and payouts generated"}

    async def initiate_payouts(self, farm_id: uuid.UUID, session: AsyncSession):
        # Fetch waiting payouts
        query = await session.exec(select(Payout).where(Payout.farm_id == farm_id, Payout.status == PayoutStatus.WAITING))
        payouts = query.all()
        
        if not payouts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no waiting payouts found for this farm")

        # Mock payout success for Phase 2
        for p in payouts:
            p.status = PayoutStatus.COMPLETED
            p.completed_at = datetime.utcnow()
            session.add(p)
            
        farm = await session.get(Farm, farm_id)
        if not farm:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
             
        farm.farm_status = FarmStatus.PAID_OUT
        session.add(farm)
        
        try:
            await session.commit()
            logger.info(f"Payouts initiated for farm {farm_id}. {len(payouts)} payouts completed.")
        except Exception as e:
            logger.error(f"Failed to initiate payouts: {str(e)}")
            await session.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="failed to initiate payouts")

        return {"message": f"{len(payouts)} payouts processed successfully"}
