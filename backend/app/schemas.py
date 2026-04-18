"""Pydantic request / response schemas for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    name: Annotated[str, Field(min_length=1, max_length=255)]
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, Field(min_length=1, max_length=128)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    name: str


class AuthResponse(BaseModel):
    user: UserOut
    expires_at: datetime


# ---------- Goals / scenarios (shared structures) ----------
class GoalIn(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    amount: Annotated[float, Field(ge=0, le=1e12)]
    year: Annotated[int, Field(ge=1900, le=2200)]
    payments: Annotated[int | None, Field(ge=0, le=1200)] = None
    inflation_rate: Annotated[float | None, Field(ge=-1.0, le=1.0, alias="inflationRate")] = None

    model_config = ConfigDict(populate_by_name=True)


class InvestmentIn(BaseModel):
    amount: Annotated[float, Field(ge=0, le=1e12)]
    year: Annotated[int, Field(ge=1900, le=2200)]


class MonthlyInvestmentIn(BaseModel):
    amount: Annotated[float, Field(ge=0, le=1e9)]
    annual_increase: Annotated[float, Field(ge=-1.0, le=1.0, alias="annualIncrease")] = 0.0

    model_config = ConfigDict(populate_by_name=True)


class LoanIn(BaseModel):
    amount: Annotated[float, Field(ge=0, le=1e12)]
    year: Annotated[int, Field(ge=1900, le=2200)]
    duration: Annotated[int, Field(ge=0, le=600)]
    interest_rate: Annotated[float, Field(ge=0.0, le=1.0, alias="interestRate")]

    model_config = ConfigDict(populate_by_name=True)


class ScenarioIn(BaseModel):
    id: str | None = None
    name: Annotated[str, Field(min_length=1, max_length=255)]
    model: str | None = None
    goal_names: list[str] = Field(default_factory=list, alias="goalNames")
    investments: list[InvestmentIn] = Field(default_factory=list)
    monthly_investments: list[MonthlyInvestmentIn] = Field(
        default_factory=list, alias="monthlyInvestments"
    )
    loans: list[LoanIn] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


# ---------- Profile ----------
class ProfileIn(BaseModel):
    """Loose but bounded profile. Unknown keys are rejected to keep shape stable."""

    model_config = ConfigDict(extra="allow")  # allow new fields; size-limited at payload level


# ---------- Client ----------
class ClientIn(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    email: EmailStr
    phone: Annotated[str | None, Field(max_length=64)] = None
    profile: dict = Field(default_factory=dict)
    goals: list[GoalIn] = Field(default_factory=list)
    scenarios: list[ScenarioIn] = Field(default_factory=list)


class ClientPatch(BaseModel):
    name: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    email: EmailStr | None = None
    phone: Annotated[str | None, Field(max_length=64)] = None
    profile: dict | None = None
    goals: list[GoalIn] | None = None
    scenarios: list[ScenarioIn] | None = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_id: str = Field(serialization_alias="clientId")
    name: str
    email: EmailStr
    phone: str | None = None
    profile: dict
    goals: list[dict]
    scenarios: list[dict]
    updated_at: datetime = Field(serialization_alias="lastModified")


# ---------- Simulation ----------
class SimulateRequest(BaseModel):
    duration_years: Annotated[int, Field(ge=1, le=40)]
    initial_investment: Annotated[float, Field(ge=0, le=1e12)]
    monthly_investment: Annotated[float, Field(ge=0, le=1e9)]
    annual_increase_pct: Annotated[float, Field(ge=-1.0, le=1.0)] = 0.0
    importance: Literal["worst", "essential", "medium", "best"] = "essential"
    risk_tolerance: Literal["very_low", "low", "moderate", "high", "very_high"] = "high"
    goal_target_amount: Annotated[float | None, Field(ge=0, le=1e12)] = None
    return_in_real_terms: bool = True


class PortfolioOut(BaseModel):
    variable_pct: float
    percentiles: dict[str, float]


class ProjectionOut(BaseModel):
    years: list[int]
    pessimistic: list[float]
    median: list[float]
    optimistic: list[float]


Attainability = Literal["attainable", "aspirational", "out_of_reach"]


class SimulateResponse(BaseModel):
    recommended: PortfolioOut
    candidates: list[PortfolioOut]
    projection: ProjectionOut
    probability_of_goal: float | None
    probability_of_goal_se: float | None = None
    attainability: Attainability | None = None
