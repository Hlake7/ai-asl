import numpy as np
from app.services.normalizer import normalize_landmarks


def _make_landmarks(points: list[tuple[float, float]]) -> list[tuple[float, float, float]]:
    return [(x, y, 0.0) for x, y in points]


def test_output_shape():
    landmarks = _make_landmarks([(float(i), float(i)) for i in range(21)])
    result = normalize_landmarks(landmarks)
    assert result.shape == (42,)


def test_translation_invariance():
    """Shifting all landmarks by a constant should not change output."""
    base_lms = [(float(i) * 0.05, float(i) * 0.03, 0.0) for i in range(21)]
    shifted_lms = [(x + 100.0, y + 200.0, 0.0) for x, y, z in base_lms]
    assert np.allclose(normalize_landmarks(base_lms), normalize_landmarks(shifted_lms), atol=1e-4)


def test_scale_invariance():
    """Scaling all landmarks by a constant should not change output."""
    base_lms = [(float(i) * 0.05, float(i) * 0.03, 0.0) for i in range(21)]
    scaled_lms = [(x * 3.0, y * 3.0, 0.0) for x, y, z in base_lms]
    assert np.allclose(normalize_landmarks(base_lms), normalize_landmarks(scaled_lms), atol=1e-4)


def test_wrist_at_origin_after_normalization():
    """After normalization, the wrist (index 0) should be at (0, 0)."""
    lms = [(float(i) * 0.05 + 0.3, float(i) * 0.03 + 0.1, 0.0) for i in range(21)]
    result = normalize_landmarks(lms)
    # First two values are wrist x, y
    assert abs(result[0]) < 1e-6
    assert abs(result[1]) < 1e-6
