# tests/test_predict.py
import pickle
import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch
from sklearn.ensemble import RandomForestClassifier
from fastapi.testclient import TestClient


def make_a_landmarks() -> list[dict]:
    """21 synthetic landmarks for letter A (fist shape approximation)."""
    points = [
        (0.00, 0.00), (0.03, -0.30), (0.06, -0.55), (0.08, -0.75), (0.09, -0.90),
        (-0.04, -0.80), (-0.05, -0.95), (-0.05, -1.05), (-0.04, -1.12),
        (-0.01, -0.82), (0.00, -1.00), (0.00, -1.10), (0.01, -1.18),
        (0.04, -0.80), (0.05, -0.95), (0.05, -1.05), (0.05, -1.12),
        (0.08, -0.75), (0.09, -0.88), (0.10, -0.97), (0.10, -1.05),
    ]
    return [{"x": x, "y": y, "z": 0.0} for x, y in points]


@pytest.fixture
def mock_classifier(tmp_path):
    """Patch classifier_service in predict module to use a tiny dummy model."""
    clf = RandomForestClassifier(n_estimators=5, random_state=0)
    X = np.random.rand(52, 42)
    y = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") * 2
    clf.fit(X, y)
    model_path = tmp_path / "clf.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    with patch("app.api.predict.classifier_service") as mock_svc:
        from app.services.classifier import ClassifierService
        real_svc = ClassifierService(model_path)
        mock_svc.predict = real_svc.predict
        yield mock_svc


def test_predict_returns_200(client, mock_classifier):
    payload = {
        "landmarks": make_a_landmarks(),
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200


def test_predict_response_shape(client, mock_classifier):
    payload = {
        "landmarks": make_a_landmarks(),
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    body = response.json()
    assert "letter" in body
    assert "confidence" in body
    assert "alternatives" in body
    assert isinstance(body["alternatives"], list)


def test_predict_rejects_wrong_landmark_count(client):
    payload = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0}] * 5,
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
