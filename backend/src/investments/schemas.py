from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from typing import List

class InvestmentInitiateInput(BaseModel):
    farm_id: uuid.UUID
    amount: float = Field(ge=5000)  # Naira, NOT kobo — minimum ₦5,000

class InvestmentVerifyInput(BaseModel):
    txn_ref: str

class CheckoutParamsOut(BaseModel):
    txn_ref: str
    amount_kobo: int
    actual_amount_kobo: int
    merchant_code: str
    payment_item_id: str
    customer_email: str
    customer_name: str
    is_test_mode_scaled: bool = False
    scale_factor: int = 1

class InvestmentOut(BaseModel):
    id: uuid.UUID
    farm_id: uuid.UUID
    farm_name: str
    amount: float        # Naira — computed from kobo
    status: str
    created_at: datetime
