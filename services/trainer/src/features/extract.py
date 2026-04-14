# src/features/extract.py
"""
Run MediaPipe Hands on a single image and return 21 landmark points.
Returns None if no hand is detected.
"""
import cv2
import mediapipe as mp
from pathlib import Path

_hands = mp.solutions.hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5,
)


def extract_landmarks(image_path: Path) -> list[tuple[float, float, float]] | None:
    """
    Extract 21 hand landmarks from an image file.

    Args:
        image_path: Path to a JPEG or PNG image.

    Returns:
        List of 21 (x, y, z) tuples in normalized image coordinates,
        or None if no hand was detected.
    """
    image = cv2.imread(str(image_path))
    if image is None:
        return None

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = _hands.process(rgb)

    if not result.multi_hand_landmarks:
        return None

    hand = result.multi_hand_landmarks[0]
    return [(lm.x, lm.y, lm.z) for lm in hand.landmark]
