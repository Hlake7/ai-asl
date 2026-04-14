import pickle
from pathlib import Path
import numpy as np
from app.models.schemas import PredictionResponse, PredictionAlternative
from app.core.config import settings


class ClassifierService:
    def __init__(self, model_path: Path | None = None):
        path = model_path or settings.model_path
        if not path.exists():
            raise FileNotFoundError(
                f"Model not found at {path}. "
                "Run the trainer first: cd services/trainer && python src/train.py"
            )
        with open(path, "rb") as f:
            self._model = pickle.load(f)

    def predict(self, features: np.ndarray) -> PredictionResponse:
        """
        Run classifier on a 42-element normalized landmark feature vector.

        Returns letter=None when top confidence is below the configured threshold.
        """
        probabilities = self._model.predict_proba([features])[0]
        labels = self._model.classes_

        top_indices = np.argsort(probabilities)[::-1]

        top_letter = labels[top_indices[0]]
        top_confidence = float(probabilities[top_indices[0]])

        letter = top_letter if top_confidence >= settings.confidence_threshold else None

        alternatives = [
            PredictionAlternative(
                letter=labels[i],
                confidence=float(probabilities[i]),
            )
            for i in top_indices[1:3]
        ]

        return PredictionResponse(
            letter=letter,
            confidence=top_confidence,
            alternatives=alternatives,
        )
