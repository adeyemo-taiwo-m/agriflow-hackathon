from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status, UploadFile
from src.harvest.models import HarvestReport, HarvestReportStatus, Repayment, RepaymentStatus
from src.farms.models import Farm, FarmStatus
from src.file_upload.services import FileUploadServices, ImageCategory
from datetime import date, datetime
import uuid
from src.utils.logger import logger
from src.interswitch.services import InterswitchPaymentServices
from src.interswitch.payment_status import PaymentStatus
from src.payouts.services import PayoutServices

class HarvestServices:
    def __init__(self):
        self.file_svc = FileUploadServices()
        self.interswitch_svc = InterswitchPaymentServices()

    async def submit_report(
        self, farm_id, actual_yield: float, total_sales: int, 
        harvest_date: date, buyer_name: str, evidence: list[UploadFile], 
        farmer, session: AsyncSession
    ):
        # 1. Fetch Farm & Validate Ownership
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
            
        if farm.farmer_id != farmer.uid:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="you do not have permission to perform this action")
            
        if not farm.is_harvest_ready: 
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="farm is not in a state to be harvested")

        # 2. Check if report already exists
        statement = select(HarvestReport).where(HarvestReport.farm_id == farm_id)
        result = await session.exec(statement)
        existing = result.first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="harvest report already submitted")

        # 3. Upload Files
        public_ids = []
        for file in evidence:
            upload_result = await self.file_svc.upload_image(file, farm.id, ImageCategory.PAYMENT_PHOTO)
            public_ids.append(upload_result["public_id"])

        if not public_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="at least one payment evidence image is required")

        # 4. Save Report (Store in Kobo)
        report = HarvestReport(
            farm_id=farm.id,
            farmer_id=farmer.uid,
            actual_yield=actual_yield,
            total_sales_declared_kobo=int(total_sales * 100),
            harvest_date=harvest_date,
            buyer_name=buyer_name,
        )
        
        try:
            session.add(report)
            await session.commit()
            await session.refresh(report)
            logger.info(f"Harvest report submitted for farm {farm_id} by farmer {farmer.uid}")
            return report
        except Exception as e:
            logger.error(f"Failed to submit harvest report: {str(e)}")
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="failed to submit harvest report"
            )

    async def get_report(self, farm_id, session: AsyncSession):
        statement = select(HarvestReport).where(HarvestReport.farm_id == farm_id)
        result = await session.exec(statement)
        report = result.first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="harvest report not found")
        return report

    async def get_repayment_details(self, farm_id: uuid.UUID, session: AsyncSession):
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
        
        principal = farm.amount_raised_kobo / 100
        roi_rate = farm.return_rate
        gain = principal * roi_rate
        total = principal + gain
        
        # --- SMART SCALING (GET DETAILS) ---
        INTERSWITCH_LIMIT_KOBO = 10_000_000
        MINIMUM_PAYMENT_KOBO = 10_000
        total_kobo = farm.amount_raised_kobo + int(farm.amount_raised_kobo * farm.return_rate)
        
        is_test_mode_scaled = False
        scale_factor = 1
        scaled_amount = None

        if total_kobo >= INTERSWITCH_LIMIT_KOBO:
            is_test_mode_scaled = True
            scale_factor = 1000
            scaled_amount_kobo = total_kobo // scale_factor
            if scaled_amount_kobo < MINIMUM_PAYMENT_KOBO:
                scaled_amount_kobo = MINIMUM_PAYMENT_KOBO
            scaled_amount = scaled_amount_kobo / 100

        return {
            "principal": principal,
            "roi_rate": roi_rate,
            "gain": gain,
            "total_repayment": total,
            "is_test_mode_scaled": is_test_mode_scaled,
            "scale_factor": scale_factor,
            "scaled_repayment": scaled_amount
        }

    async def initiate_repayment(self, farm_id: uuid.UUID, farmer, session: AsyncSession):
        farm = await session.get(Farm, farm_id)
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="farm not found")
        
        if farm.farmer_id != farmer.uid:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="unauthorized")

        # Calculate exact amount in Kobo
        # Math: Raised * (1 + ROI)
        # To avoid floating point issues in Kobo, we do: Principal_Kobo + (Principal_Kobo * ROI)
        principal_kobo = farm.amount_raised_kobo
        gain_kobo = int(principal_kobo * farm.return_rate)
        total_kobo = principal_kobo + gain_kobo

        # Check for existing pending repayment to reuse txn_ref if possible
        stmt = select(Repayment).where(Repayment.farm_id == farm_id, Repayment.status == RepaymentStatus.PENDING)
        existing = (await session.exec(stmt)).first()
        
        if existing:
            txn_ref = existing.txn_ref
        else:
            txn_ref = f"REP-{uuid.uuid4().hex[:10].upper()}"
            repayment = Repayment(
                farm_id=farm.id,
                farmer_id=farmer.uid,
                amount_kobo=total_kobo,
                txn_ref=txn_ref,
                status=RepaymentStatus.PENDING
            )
            session.add(repayment)
            await session.commit()

        from src.config import Config
        # --- HACKATHON SMART SCALING LOGIC ---
        # 100,000 Naira = 10,000,000 Kobo
        INTERSWITCH_LIMIT_KOBO = 10_000_000 
        MINIMUM_PAYMENT_KOBO = 10_000 # 100 Naira
        
        is_test_mode_scaled = False
        scale_factor = 1
        interswitch_checkout_amount = total_kobo

        # Only scale if the amount hits or exceeds our 100k limit
        if total_kobo >= INTERSWITCH_LIMIT_KOBO:
            is_test_mode_scaled = True
            scale_factor = 1000
            interswitch_checkout_amount = total_kobo // scale_factor
            
            # Failsafe: Ensure the scaled amount never drops below 100 Naira
            if interswitch_checkout_amount < MINIMUM_PAYMENT_KOBO:
                interswitch_checkout_amount = MINIMUM_PAYMENT_KOBO

        # Step 6 — Return checkout params
        return {
            "txn_ref": txn_ref,
            "amount_kobo": interswitch_checkout_amount, # What gateway sees
            "actual_amount_kobo": total_kobo,            # What frontend sees
            "is_test_mode_scaled": is_test_mode_scaled,
            "scale_factor": scale_factor,
            "merchant_code": Config.INTERSWITCH_PAYMENT_MERCHANT_CODE,
            "payment_item_id": Config.INTERSWITCH_PAYMENT_PAY_ITEM_ID,
            "customer_email": farmer.email,
            "customer_name": farmer.full_name,
        }

    async def verify_repayment(self, txn_ref: str, session: AsyncSession):
        stmt = select(Repayment).where(Repayment.txn_ref == txn_ref.upper())
        repayment = (await session.exec(stmt)).first()
        
        if not repayment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="repayment record not found")

        if repayment.status == RepaymentStatus.CONFIRMED:
            return {"status": "confirmed", "message": "repayment already verified"}

        # --- REVERSE SMART SCALING LOGIC ---
        INTERSWITCH_LIMIT_KOBO = 10_000_000
        expected_interswitch_amount = repayment.amount_kobo
        
        if repayment.amount_kobo >= INTERSWITCH_LIMIT_KOBO:
            expected_interswitch_amount = repayment.amount_kobo // 1000
            if expected_interswitch_amount < 10_000:
                expected_interswitch_amount = 10_000

        # Call Interswitch
        result = await self.interswitch_svc.check_interswitch_transaction(
            txn_ref=txn_ref.upper(),
            expected_amount=expected_interswitch_amount  # Checks against the dynamically scaled amount
        )
        if result["status"] == PaymentStatus.CONFIRMED:
            repayment.status = RepaymentStatus.CONFIRMED
            repayment.interswitch_ref = result["raw"].get("PaymentReference")
            repayment.confirmed_at = datetime.utcnow()
            session.add(repayment)

            # Update Farm Status
            farm = await session.get(Farm, repayment.farm_id)
            farm.farm_status = FarmStatus.COMPLETED
            session.add(farm)

            # AUTOMATED PAYOUT GENERATION
            await PayoutServices.generate_payouts_for_farm(session, farm, repayment.amount_kobo)

            await session.commit()
            return {"status": "confirmed", "message": "repayment successful and payouts generated"}
        
        elif result["status"] == PaymentStatus.PENDING:
            return {"status": "pending", "message": "payment still processing"}
        else:
            repayment.status = RepaymentStatus.FAILED
            session.add(repayment)
            await session.commit()
            return {"status": "failed", "message": result.get("message", "payment failed")}
