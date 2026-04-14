import pickle
import numpy as np
import pytest
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from app.services.classifier import ClassifierService
from app.models.schemas import PredictionResponse


@pytest.fixture
def dummy_model_path(tmp_path) -> Path:
    """Creates a minimal trained RandomForest with labels A–C."""
    clf = RandomForestClassifier(n_estimators=10, random_state=42)
    # 9 samples, 42 features, 3 classes
    X = np.random.rand(9, 42)
    y = ["A", "A", "A", "B", "B", "B", "C", "C", "C"]
    clf.fit(X, y)
    model_path = tmp_path / "test_classifier.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)
    return model_path


def test_predict_returns_prediction_response(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert isinstance(result, PredictionResponse)


def test_predict_letter_is_one_of_known_labels(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert result.letter in ("A", "B", "C", None)


def test_predict_confidence_in_range(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert 0.0 <= result.confidence <= 1.0


def test_predict_alternatives_has_at_most_two(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert len(result.alternatives) <= 2
