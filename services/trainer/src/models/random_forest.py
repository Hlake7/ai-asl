# src/models/random_forest.py
import pickle
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


ARTIFACTS_DIR = Path(__file__).parents[4] / "services" / "trainer" / "artifacts" / "models"


def train(X: np.ndarray, y: np.ndarray) -> tuple[RandomForestClassifier, np.ndarray, np.ndarray]:
    """
    Train RandomForest classifier on normalized landmark features.

    Returns:
        (trained model, X_test, y_test) — test split for evaluation.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        n_jobs=-1,
        random_state=42,
        verbose=1,
    )
    clf.fit(X_train, y_train)

    return clf, X_test, y_test


def export(clf: RandomForestClassifier, output_path: Path | None = None) -> Path:
    """Pickle the trained model to artifacts/models/classifier.pkl."""
    path = output_path or (ARTIFACTS_DIR / "classifier.pkl")
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump(clf, f)
    print(f"Model exported to {path}")
    return path
