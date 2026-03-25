from enum import Enum

class PaymentStatus(str, Enum):
    CONFIRMED = "Confirmed"
    PARTIAL = "Partial"
    PENDING = "Pending"
    CANCELLED = "Cancelled"
    FAILED = "Failed"
