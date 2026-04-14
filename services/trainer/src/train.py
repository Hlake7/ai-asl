# src/train.py
"""
Main training script.
Usage: python src/train.py

Prerequisites:
  1. Dataset downloaded to data/raw/asl_alphabet/
  2. Preprocessing run: python src/dataset/preprocess.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
from models.random_forest import train, export
from evaluate import evaluate

PROCESSED_DIR = Path(__file__).parents[3] / "data" / "processed"
ACCURACY_TARGET = 0.90


def main():
    print("Loading processed dataset...")
    X = np.load(PROCESSED_DIR / "X.npy")
    y = np.load(PROCESSED_DIR / "y.npy")
    print(f"Dataset: {X.shape[0]} samples, {len(set(y))} classes")

    print("\nTraining RandomForest...")
    clf, X_test, y_test = train(X, y)

    accuracy = evaluate(clf, X_test, y_test)

    if accuracy < ACCURACY_TARGET:
        print(f"\nWARNING: Accuracy {accuracy:.1%} is below target {ACCURACY_TARGET:.0%}")
        print("Consider: more data, deeper trees, or switching to MLP classifier.")
    else:
        print(f"\nAccuracy {accuracy:.1%} meets target. Exporting model...")
        export(clf)
        print("Done. Restart the inference API to load the new model.")


if __name__ == "__main__":
    main()
