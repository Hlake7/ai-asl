# src/dataset/load.py
"""
Scan the asl_alphabet dataset directory and return a list of (image_path, letter) pairs.
"""
from pathlib import Path


DATASET_ROOT = Path(__file__).parents[4] / "data" / "raw" / "asl_alphabet" / "asl_alphabet_train"

# Letters only — skip 'del', 'nothing', 'space' classes
VALID_LETTERS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def load_dataset(root: Path = DATASET_ROOT) -> list[tuple[Path, str]]:
    """
    Returns list of (image_path, letter) for all images in the dataset.
    Only includes A–Z classes (skips del/nothing/space).
    """
    if not root.exists():
        raise FileNotFoundError(
            f"Dataset not found at {root}\n"
            "Download from https://www.kaggle.com/datasets/grassknoted/asl-alphabet "
            "and unzip to data/raw/asl_alphabet/"
        )

    samples = []
    for class_dir in sorted(root.iterdir()):
        letter = class_dir.name.upper()
        if letter not in VALID_LETTERS:
            continue
        for image_path in class_dir.glob("*.jpg"):
            samples.append((image_path, letter))

    return samples
