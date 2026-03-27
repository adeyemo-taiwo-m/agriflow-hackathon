import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from src.farms.models import Farm
from src.investments.models import Investment, InvestmentStatus
from src.payouts.models import Payout, PayoutStatus, RecipientType
from src.utils.logger import logger

class PayoutServices:
    @staticmethod
    async def generate_payouts_for_farm(session: AsyncSession, farm: Farm, confirmed_amount_kobo: int):
        """
        Calculates and records payout records for all investors based on a confirmed sales or repayment amount.
        Follows the 5% platform fee / 95% investor pool split logic.
        """
        # 0. Idempotency check: If payouts already exist for this farm, don't recreate them unless needed.
        # In a real system, we might want to allow regeneration if amounts change, but for now, we stop duplication.
        existing_stmt = select(Payout).where(Payout.farm_id == farm.id)
        existing_result = await session.exec(existing_stmt)
        if existing_result.first():
            logger.warning(f"PayoutServices: Payouts already exist for farm {farm.id}. Skipping generation.")
            return 0

        # 1. Platform Fee (5%)
        platform_fee_kobo = int(confirmed_amount_kobo * 0.05)
        investor_pool_kobo = int(confirmed_amount_kobo * 0.95)
        
        farm_raised_kobo = farm.amount_raised_kobo
        if farm_raised_kobo == 0:
            logger.warning(f"PayoutServices: Cannot generate payouts for farm {farm.id} - no investments found.")
            return 0

        # 2. Fetch all confirmed investments
        statement = select(Investment).where(
            Investment.farm_id == farm.id,
            Investment.status == InvestmentStatus.CONFIRMED
        )
        result = await session.exec(statement)
        investments = result.all()

        total_investor_payouts_kobo = 0

        # 3. Create investor payout records
        for inv in investments:
            share_ratio = inv.amount_kobo / farm_raised_kobo
            investor_total_share_kobo = int(investor_pool_kobo * share_ratio)
            investor_profit_kobo = investor_total_share_kobo - inv.amount_kobo
            
            payout = Payout(
                farm_id=farm.id,
                recipient_id=inv.investor_id,
                recipient_type=RecipientType.INVESTOR,
                investment_id=inv.id,
                principal_kobo=inv.amount_kobo,
                profit_kobo=investor_profit_kobo,
                total_amount_kobo=investor_total_share_kobo,
                status=PayoutStatus.WAITING
            )
            session.add(payout)
            total_investor_payouts_kobo += investor_total_share_kobo

        # 4. Generate Farmer Payout (Residual)
        farmer_payout_amount_kobo = confirmed_amount_kobo - total_investor_payouts_kobo - platform_fee_kobo
        
        if farmer_payout_amount_kobo > 0:
            farmer_payout = Payout(
                farm_id=farm.id,
                recipient_id=farm.farmer_id,
                recipient_type=RecipientType.FARMER,
                principal_kobo=0,
                profit_kobo=farmer_payout_amount_kobo,
                total_amount_kobo=farmer_payout_amount_kobo,
                status=PayoutStatus.WAITING
            )
            session.add(farmer_payout)
            
        logger.info(f"PayoutServices: Successfully generated {len(investments) + (1 if farmer_payout_amount_kobo > 0 else 0)} payout records.")
        return len(investments) + (1 if farmer_payout_amount_kobo > 0 else 0)
