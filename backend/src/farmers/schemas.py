from pydantic import BaseModel, Field, field_validator
from typing import Optional

class VerifyBVNInput(BaseModel):
    bvn: str
    manual_name: Optional[str] = None
    manual_account: Optional[str] = None
    manual_bank_code: Optional[str] = None

    @field_validator('bvn')
    @classmethod
    def validate_bvn_or_magic(cls, value: str) -> str:
        if value == '10000000000':
            return value
        if len(value) == 11 and value.isdigit():
            return value
        raise ValueError('BVN must be 11 digits (or 10000000000 for test mode)')

class AddBankAccountInput(BaseModel):
    bank_code: str
    account_num: str = Field(min_length=10, max_length=10, pattern=r'^\d{10}$')