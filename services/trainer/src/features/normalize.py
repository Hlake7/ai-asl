# src/features/normalize.py
import numpy as np


def normalize_landmarks(landmarks: list[tuple[float, float, float]]) -> np.ndarray:
    """
    Normalize 21 hand landmarks to be translation- and scale-invariant.
    Uses only x, y (z is unreliable from MediaPipe in 2D camera feeds).

    IMPORTANT: Must stay identical to:
      services/inference-api/app/services/normalizer.py

    Steps:
      1. Extract x, y → shape (21, 2)
      2. Subtract wrist (landmark 0) → translation invariant
      3. Scale by distance wrist→middle finger MCP (landmark 9)
      4. Flatten → 42-element feature vector
    """
    xy = np.array([[lm[0], lm[1]] for lm in landmarks], dtype=np.float32)
    xy -= xy[0]
    scale = float(np.linalg.norm(xy[9]))
    if scale < 1e-8:
        scale = 1.0
    xy /= scale
    return xy.flatten()
