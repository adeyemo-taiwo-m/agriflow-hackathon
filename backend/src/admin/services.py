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
            selectinload(Farm.milestones)
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
            selectinload(Farm.milestones)
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
            selectinload(Farm.milestones)
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
            selectinload(Milestone.farm).selectinload(Farm.owner)
        )
        result = await session.exec(statement)
        milestones = result.all()
        return [
            {
                **m.model_dump(),
                "farm_name": m.farm.name,
                "farmer_name": m.farm.owner.full_name
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
        
        # Check if all milestones for this farm are now verified
        farm = await session.get(Farm, milestone.farm_id)
        
        # Verify next milestone if exists
        next_order = milestone.order_number + 1
        statement = select(Milestone).where(Milestone.farm_id == farm.id, Milestone.order_number == next_order)
        result = await session.exec(statement)
        next_milestone = result.first()
        
        if next_milestone and next_milestone.status == MilestoneStatus.LOCKED:
            next_milestone.status = MilestoneStatus.PENDING_PROOF
            session.add(next_milestone)
        
        # Finalize farm if all milestones are verified
        milestone_statement = select(Milestone).where(Milestone.farm_id == farm.id)
        milestones_result = await session.exec(milestone_statement)
        all_milestones = milestones_result.all()
        
        if all(m.status in [MilestoneStatus.VERIFIED, MilestoneStatus.DISBURSED] for m in all_milestones):
            farm.farm_status = FarmStatus.COMPLETED
            session.add(farm)
            
        await session.commit()
        await session.refresh(milestone)
        
        # Re-fetch with relationships
        statement = select(Milestone).where(Milestone.id == milestone.id).options(
            selectinload(Milestone.farm).selectinload(Farm.owner)
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
        
        # Re-fetch with relationships
        statement = select(Milestone).where(Milestone.id == milestone.id).options(
            selectinload(Milestone.farm).selectinload(Farm.owner)
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
        total_funds_raised = await session.exec(select(func.sum(Farm.amount_raised)))

        return {
            "total_farms": total_farms.one() or 0,
            "active_farms": active_farms.one() or 0,
            "pending_reviews": (pending_farms.one() or 0) + (under_review_milestones.one() or 0),
            "total_investors": total_investors.one() or 0,
            "total_farmers": total_farmers.one() or 0,
            "total_funds_raised": total_funds_raised.one() or 0
        }
