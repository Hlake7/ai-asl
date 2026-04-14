"""
CRITICAL: This normalization must produce IDENTICAL output to
services/inference-api/app/services/normalizer.py for the same input.
Any divergence means the model trains on different features than it classifies.
"""
import numpy as np
import sys
import os
import importlib.util
import pathlib

# Allow importing trainer src
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from features.normalize import normalize_landmarks


FIXED_LANDMARKS = [(float(i) * 0.05, float(i) * 0.03, 0.0) for i in range(21)]


def test_output_shape():
    result = normalize_landmarks(FIXED_LANDMARKS)
    assert result.shape == (42,)


def test_wrist_at_origin():
    result = normalize_landmarks(FIXED_LANDMARKS)
    assert abs(result[0]) < 1e-6
    assert abs(result[1]) < 1e-6


def test_translation_invariance():
    shifted = [(x + 50.0, y + 30.0, z) for x, y, z in FIXED_LANDMARKS]
    assert np.allclose(
        normalize_landmarks(FIXED_LANDMARKS),
        normalize_landmarks(shifted),
        atol=1e-4,
    )


def test_scale_invariance():
    scaled = [(x * 4.0, y * 4.0, z) for x, y, z in FIXED_LANDMARKS]
    assert np.allclose(
        normalize_landmarks(FIXED_LANDMARKS),
        normalize_landmarks(scaled),
        atol=1e-4,
    )


def test_matches_inference_api_normalizer():
    """
    Import BOTH normalizers and verify they produce identical output.
    If this test fails, the training/inference normalization has drifted — fix it immediately.
    """
    api_normalizer_path = pathlib.Path(__file__).parents[2] / "inference-api" / "app" / "services" / "normalizer.py"
    spec = importlib.util.spec_from_file_location("api_normalizer", api_normalizer_path)
    api_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api_mod)

    trainer_result = normalize_landmarks(FIXED_LANDMARKS)
    api_result = api_mod.normalize_landmarks(FIXED_LANDMARKS)
    assert np.allclose(trainer_result, api_result, atol=1e-6), (
        "Trainer and inference API normalizers produce different output! "
        "Keep them in sync."
    )
