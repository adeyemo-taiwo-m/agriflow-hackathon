import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, computed_field, Field

class CropReferenceOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    local_name: Optional[str] = None
    unit: str
    growing_months_min: int
    growing_months_max: int
    
    # Internal kobo fields (excluded from output)
    cost_per_hectare_min_kobo: int = Field(exclude=True)
    cost_per_hectare_max_kobo: int = Field(exclude=True)
    market_price_min_kobo: int = Field(exclude=True)
    market_price_max_kobo: int = Field(exclude=True)

    yield_per_hectare_min: float
    yield_per_hectare_max: float
    max_return_rate: float
    suitable_states: list
    default_milestones: list

    @computed_field
    @property
    def cost_per_hectare_min(self) -> float:
        return self.cost_per_hectare_min_kobo / 100

    @computed_field
    @property
    def cost_per_hectare_max(self) -> float:
        return self.cost_per_hectare_max_kobo / 100

    @computed_field
    @property
    def market_price_min(self) -> float:
        return self.market_price_min_kobo / 100

    @computed_field
    @property
    def market_price_max(self) -> float:
        return self.market_price_max_kobo / 100

class CropEstimateOut(BaseModel):
    crop_name: str
    farm_size_ha: float
    budget_min: float
    budget_max: float
    yield_min: float
    yield_max: float
    revenue_min: float
    revenue_max: float
    growing_months_min: int
    growing_months_max: int
    max_return_rate: float
    default_milestones: List[Dict[str, Any]]
    suitable_states: List[str]
