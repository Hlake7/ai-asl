import pytest
from pydantic import ValidationError
from app.models.schemas import LandmarkPayload, PredictionResponse


def test_landmark_payload_validates_21_points():
    data = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    payload = LandmarkPayload(**data)
    assert len(payload.landmarks) == 21


def test_landmark_payload_rejects_wrong_count():
    data = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(5)],
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    with pytest.raises(ValidationError):
        LandmarkPayload(**data)


def test_prediction_response_allows_null_letter():
    resp = PredictionResponse(letter=None, confidence=0.1, alternatives=[])
    assert resp.letter is None
