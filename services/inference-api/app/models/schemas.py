from typing import Annotated
from pydantic import BaseModel, Field


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float


class LandmarkPayload(BaseModel):
    landmarks: Annotated[list[LandmarkPoint], Field(min_length=21, max_length=21)]
    handedness: str  # "left" | "right"
    timestamp: int


class PredictionAlternative(BaseModel):
    letter: str
    confidence: float


class PredictionResponse(BaseModel):
    letter: str | None
    confidence: float
    alternatives: list[PredictionAlternative]
