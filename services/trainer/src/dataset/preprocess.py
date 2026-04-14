# src/dataset/preprocess.py
"""
Process raw images → extract landmarks → save as numpy arrays ready for training.
Run once: python src/dataset/preprocess.py
Output: data/processed/X.npy (features), data/processed/y.npy (labels)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

import numpy as np
from tqdm import tqdm
from collections import defaultdict
from dataset.load import load_dataset
from features.extract import extract_landmarks
from features.normalize import normalize_landmarks

PROCESSED_DIR = Path(__file__).parents[4] / "data" / "processed"


def preprocess_dataset(max_per_class: int = 1000) -> tuple[np.ndarray, np.ndarray]:
    """
    Extract and normalize landmarks for up to max_per_class images per letter.

    Args:
        max_per_class: Cap per letter to keep training fast (full dataset has 3000/class).

    Returns:
        X: np.ndarray of shape (n_samples, 42)
        y: np.ndarray of shape (n_samples,) with letter labels
    """
    samples = load_dataset()

    # Cap per class
    counts: dict[str, int] = defaultdict(int)
    capped = []
    for path, letter in samples:
        if counts[letter] < max_per_class:
            capped.append((path, letter))
            counts[letter] += 1

    X_list, y_list = [], []
    skipped = 0

    for path, letter in tqdm(capped, desc="Extracting landmarks"):
        landmarks = extract_landmarks(path)
        if landmarks is None:
            skipped += 1
            continue
        features = normalize_landmarks(landmarks)
        X_list.append(features)
        y_list.append(letter)

    print(f"Processed {len(X_list)} images. Skipped {skipped} (no hand detected).")

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    np.save(PROCESSED_DIR / "X.npy", X)
    np.save(PROCESSED_DIR / "y.npy", y)
    print(f"Saved to {PROCESSED_DIR}/")

    return X, y


if __name__ == "__main__":
    preprocess_dataset()
