# src/evaluate.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
from sklearn.metrics import classification_report, accuracy_score
from sklearn.ensemble import RandomForestClassifier


def evaluate(clf: RandomForestClassifier, X_test: np.ndarray, y_test: np.ndarray) -> float:
    """Print per-letter accuracy report and return overall accuracy."""
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\nOverall accuracy: {accuracy:.4f} ({accuracy * 100:.1f}%)")
    print("\nPer-letter report:")
    print(classification_report(y_test, y_pred))

    return accuracy
