# app/api/predict.py
from fastapi import APIRouter, HTTPException
from app.models.schemas import LandmarkPayload, PredictionResponse
from app.services.normalizer import normalize_landmarks
from app.services.classifier import ClassifierService
from app.core.config import settings

router = APIRouter()

# Module-level singleton — loaded once at startup
try:
    classifier_service = ClassifierService()
except FileNotFoundError as e:
    classifier_service = None  # type: ignore
    _startup_error = str(e)
else:
    _startup_error = None


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: LandmarkPayload) -> PredictionResponse:
    if classifier_service is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. {_startup_error}",
        )

    landmarks = [(lm.x, lm.y, lm.z) for lm in payload.landmarks]
    features = normalize_landmarks(landmarks)
    return classifier_service.predict(features)
