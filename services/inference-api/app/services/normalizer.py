import numpy as np


def normalize_landmarks(landmarks: list[tuple[float, float, float]]) -> np.ndarray:
    """
    Normalize 21 hand landmarks to be translation- and scale-invariant.

    Uses only x, y (z is unreliable from MediaPipe in 2D camera feeds).

    Steps:
      1. Extract x, y from each of the 21 landmarks → shape (21, 2)
      2. Subtract wrist position (landmark 0) → translation invariant
      3. Scale by distance from wrist (0) to middle finger MCP (landmark 9)
      4. Flatten → 42-element feature vector

    Args:
        landmarks: List of 21 (x, y, z) tuples as returned by MediaPipe.

    Returns:
        np.ndarray of shape (42,) — normalized feature vector.
    """
    xy = np.array([[lm[0], lm[1]] for lm in landmarks], dtype=np.float32)  # (21, 2)

    # Translate: move wrist to origin
    xy -= xy[0]

    # Scale: distance from wrist (0) to middle finger MCP (9)
    scale = float(np.linalg.norm(xy[9]))
    if scale < 1e-8:
        scale = 1.0  # degenerate hand shape — avoid division by zero

    xy /= scale

    return xy.flatten()  # (42,)
