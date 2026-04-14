# ASL Vision App — Foundation + ML Pipeline (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo scaffold, shared TypeScript types, Python inference API, and training pipeline — proving landmark extraction and A–Z classification work end-to-end before any mobile work begins.

**Architecture:** pnpm monorepo with separate apps/, services/, and packages/ directories. The trainer extracts MediaPipe landmarks from ASL image datasets, trains a RandomForest classifier, and exports a pickle artifact. The inference API loads that artifact and serves POST /predict — accepting 21 normalized hand landmark points, returning a letter + confidence. No mobile code in this plan.

**Tech Stack:** pnpm workspaces, TypeScript 5, Python 3.11+, FastAPI 0.111, Pydantic v2, MediaPipe 0.10, scikit-learn 1.5, pytest, Docker Compose

---

## File Map

```
(repo root: ai-asl/)
│
├── package.json                              # pnpm workspace root
├── pnpm-workspace.yaml                       # workspace globs
├── .gitignore
├── .env.example
├── CLAUDE.md                                 # repo rules for coding agents
│
├── packages/
│   └── shared-types/
│       ├── src/
│       │   ├── prediction.ts                 # LandmarkPoint, LandmarkPayload, PredictionResponse
│       │   ├── progress.ts                   # LetterProgress
│       │   └── index.ts                      # re-exports
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── inference-api/
│   │   ├── app/
│   │   │   ├── main.py                       # FastAPI app factory
│   │   │   ├── api/
│   │   │   │   ├── health.py                 # GET /health
│   │   │   │   └── predict.py                # POST /predict
│   │   │   ├── core/
│   │   │   │   └── config.py                 # Settings (model path, confidence threshold)
│   │   │   ├── models/
│   │   │   │   └── schemas.py                # Pydantic schemas (mirrors shared-types)
│   │   │   └── services/
│   │   │       ├── normalizer.py             # normalize_landmarks() — 21 pts → 42 features
│   │   │       └── classifier.py             # ClassifierService — load pkl, predict
│   │   ├── tests/
│   │   │   ├── conftest.py                   # fixtures: sample landmark arrays per letter
│   │   │   ├── test_normalizer.py
│   │   │   ├── test_classifier.py
│   │   │   └── test_predict.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── trainer/
│       ├── src/
│       │   ├── features/
│       │   │   ├── extract.py                # run MediaPipe on image → 21 landmarks
│       │   │   └── normalize.py              # same normalize_landmarks() as inference API
│       │   ├── dataset/
│       │   │   ├── load.py                   # scan data/raw/asl_alphabet/, build DataFrame
│       │   │   └── preprocess.py             # extract landmarks for entire dataset
│       │   ├── models/
│       │   │   └── random_forest.py          # train(), evaluate(), export()
│       │   ├── train.py                      # main entry point
│       │   └── evaluate.py                   # confusion matrix, per-letter accuracy
│       ├── artifacts/
│       │   └── models/                       # classifier.pkl lives here after training
│       ├── config/
│       │   └── labels.yaml                   # canonical A–Z label definitions
│       ├── tests/
│       │   ├── test_extract.py
│       │   └── test_normalize.py
│       └── requirements.txt
│
├── data/
│   └── raw/
│       └── asl_alphabet/                     # Kaggle dataset images go here (gitignored)
│
└── infra/
    └── local/
        └── docker-compose.yml
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `CLAUDE.md`
- Create: `data/raw/asl_alphabet/.gitkeep`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "asl-vision-app",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create .gitignore**

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo

# Python
__pycache__/
*.py[cod]
*.pyo
.venv/
venv/
*.egg-info/
.pytest_cache/
.mypy_cache/

# ML artifacts
services/trainer/artifacts/models/*.pkl
services/trainer/artifacts/metrics/
data/raw/
data/processed/
data/interim/
!data/raw/asl_alphabet/.gitkeep

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Superpowers
.superpowers/
```

- [ ] **Step 4: Create .env.example**

```bash
# Inference API
MODEL_PATH=services/trainer/artifacts/models/classifier.pkl
CONFIDENCE_THRESHOLD=0.85
PORT=8000

# Trainer
DATASET_PATH=data/raw/asl_alphabet
ARTIFACTS_PATH=services/trainer/artifacts
```

- [ ] **Step 5: Create CLAUDE.md**

```markdown
# ASL Vision App — Coding Agent Guide

## Architecture Overview
Monorepo: Expo mobile app + Python FastAPI inference service + separate Python trainer.
Mobile never sends images to the backend — only 21-point landmark arrays.
Trainer is completely separate from the inference API — no training code in production.

## Key Rules
- Never add training code to `services/inference-api/`
- Never hardcode the A–Z label list in mobile or API — use `labels.yaml` and the model's `classes_` attribute
- `packages/shared-types` defines the mobile↔API contract — keep it in sync
- Normalization logic must be identical in `services/inference-api/app/services/normalizer.py` and `services/trainer/src/features/normalize.py` — test both against the same fixture inputs

## Adding New Signs
1. Collect image data → `data/raw/<sign-name>/`
2. Add entry to `services/trainer/config/labels.yaml`
3. Re-run trainer: `python services/trainer/src/train.py`
4. Copy artifact to `services/trainer/artifacts/models/classifier.pkl`
5. Restart inference API

## Commands
- Start inference API: `docker compose -f infra/local/docker-compose.yml up`
- Run API tests: `cd services/inference-api && pytest -v`
- Run trainer tests: `cd services/trainer && pytest -v`
- Train model: `cd services/trainer && python src/train.py`
- Typecheck shared types: `pnpm typecheck`

## File Conventions
- Python: snake_case, type hints everywhere, Pydantic v2 models
- TypeScript: camelCase, strict mode, no `any`
- Prefer small focused files over large ones
```

- [ ] **Step 6: Create data placeholder and verify structure**

```bash
mkdir -p data/raw/asl_alphabet
touch data/raw/asl_alphabet/.gitkeep
ls -la data/raw/asl_alphabet/
```

Expected: `.gitkeep` file present.

- [ ] **Step 7: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml .gitignore .env.example CLAUDE.md data/raw/asl_alphabet/.gitkeep
git commit -m "chore: monorepo scaffold"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `packages/shared-types/src/prediction.ts`
- Create: `packages/shared-types/src/progress.ts`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`

- [ ] **Step 1: Create package.json for shared-types**

```json
{
  "name": "@asl-app/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create prediction.ts**

```typescript
export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface LandmarkPayload {
  landmarks: LandmarkPoint[]; // exactly 21 points
  handedness: 'left' | 'right';
  timestamp: number;
}

export interface PredictionAlternative {
  letter: string;
  confidence: number;
}

export interface PredictionResponse {
  letter: string | null; // "A"–"Z", or null when no hand detected or confidence too low
  confidence: number;    // 0.0–1.0
  alternatives: PredictionAlternative[]; // top 3 runner-up predictions
}
```

- [ ] **Step 4: Create progress.ts**

```typescript
export interface LetterProgress {
  letter: string;
  attempts: number;
  locks: number;         // times the confidence threshold was hit
  lastPracticed: number; // Unix timestamp ms
}

export interface SessionProgress {
  userId: string | null;
  letterProgress: Record<string, LetterProgress>;
  streakDays: number;
  lastActiveDate: string; // ISO date string "YYYY-MM-DD"
}
```

- [ ] **Step 5: Create index.ts**

```typescript
export * from './prediction';
export * from './progress';
```

- [ ] **Step 6: Install deps and build**

```bash
cd packages/shared-types
pnpm install
pnpm build
```

Expected: `dist/` folder created with `.js` and `.d.ts` files.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/shared-types/
git commit -m "feat: add shared-types package with prediction and progress interfaces"
```

---

## Task 3: Inference API Skeleton

**Files:**
- Create: `services/inference-api/app/main.py`
- Create: `services/inference-api/app/api/health.py`
- Create: `services/inference-api/app/core/config.py`
- Create: `services/inference-api/requirements.txt`
- Create: `services/inference-api/tests/conftest.py`
- Create: `services/inference-api/tests/test_health.py`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.2.1
numpy==1.26.4
scikit-learn==1.5.0
mediapipe==0.10.14
pytest==8.2.0
httpx==0.27.0
```

- [ ] **Step 2: Create virtual environment and install**

```bash
cd services/inference-api
python -m venv .venv
source .venv/Scripts/activate   # Windows
pip install -r requirements.txt
```

Expected: All packages install without error.

- [ ] **Step 3: Create config.py**

```python
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    model_path: Path = Path("artifacts/models/classifier.pkl")
    confidence_threshold: float = 0.85
    hold_duration_ms: int = 300
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Write failing health test**

```python
# tests/test_health.py
from fastapi.testclient import TestClient


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 5: Create conftest.py with client fixture**

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd services/inference-api
source .venv/Scripts/activate
pytest tests/test_health.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 7: Create health.py router**

```python
# app/api/health.py
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 8: Create main.py**

```python
# app/main.py
from fastapi import FastAPI
from app.api.health import router as health_router

app = FastAPI(title="ASL Inference API", version="0.1.0")

app.include_router(health_router)
```

- [ ] **Step 9: Run test to verify it passes**

```bash
pytest tests/test_health.py -v
```

Expected: PASS

- [ ] **Step 10: Verify server starts**

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/health` — expect `{"status":"ok"}`. Stop with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
cd ../..
git add services/inference-api/
git commit -m "feat: inference API skeleton with health endpoint"
```

---

## Task 4: Pydantic Schemas

**Files:**
- Create: `services/inference-api/app/models/schemas.py`
- Create: `services/inference-api/tests/test_schemas.py`

- [ ] **Step 1: Write failing schema test**

```python
# tests/test_schemas.py
from app.models.schemas import LandmarkPayload, PredictionResponse


def test_landmark_payload_validates_21_points():
    data = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    payload = LandmarkPayload(**data)
    assert len(payload.landmarks) == 21


def test_landmark_payload_rejects_wrong_count():
    from pydantic import ValidationError
    import pytest
    data = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(5)],
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    with pytest.raises(ValidationError):
        LandmarkPayload(**data)


def test_prediction_response_allows_null_letter():
    resp = PredictionResponse(letter=None, confidence=0.1, alternatives=[])
    assert resp.letter is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_schemas.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`

- [ ] **Step 3: Create schemas.py**

```python
# app/models/schemas.py
from typing import Annotated
from pydantic import BaseModel, Field


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float


class LandmarkPayload(BaseModel):
    landmarks: Annotated[list[LandmarkPoint], Field(min_length=21, max_length=21)]
    handedness: str  # "left" | "right"
    timestamp: int


class PredictionAlternative(BaseModel):
    letter: str
    confidence: float


class PredictionResponse(BaseModel):
    letter: str | None
    confidence: float
    alternatives: list[PredictionAlternative]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_schemas.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ../..
git add services/inference-api/app/models/ services/inference-api/tests/test_schemas.py
git commit -m "feat: Pydantic schemas for landmark payload and prediction response"
```

---

## Task 5: Landmark Normalization

**Files:**
- Create: `services/inference-api/app/services/normalizer.py`
- Create: `services/inference-api/tests/test_normalizer.py`

The normalization must be identical to what the trainer uses. It converts 21 (x,y) pairs into 42 scale- and translation-invariant features.

- [ ] **Step 1: Write failing normalizer tests**

```python
# tests/test_normalizer.py
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
    base = _make_landmarks([(float(i) * 0.05, float(i) * 0.03) for i in range(21)])
    shifted = _make_landmarks([(x + 100.0, y + 200.0, 0.0)[0:2] for x, y, _ in base])

    # Reformat: base and shifted as list of (x,y,z)
    base_lms = [(float(i) * 0.05, float(i) * 0.03, 0.0) for i in range(21)]
    shifted_lms = [(x + 100.0, y + 200.0, 0.0) for x, y, z in base_lms]

    assert np.allclose(normalize_landmarks(base_lms), normalize_landmarks(shifted_lms), atol=1e-6)


def test_scale_invariance():
    """Scaling all landmarks by a constant should not change output."""
    base_lms = [(float(i) * 0.05, float(i) * 0.03, 0.0) for i in range(21)]
    scaled_lms = [(x * 3.0, y * 3.0, 0.0) for x, y, z in base_lms]
    assert np.allclose(normalize_landmarks(base_lms), normalize_landmarks(scaled_lms), atol=1e-6)


def test_wrist_at_origin_after_normalization():
    """After normalization, the wrist (index 0) should be at (0, 0)."""
    lms = [(float(i) * 0.05 + 0.3, float(i) * 0.03 + 0.1, 0.0) for i in range(21)]
    result = normalize_landmarks(lms)
    # First two values are wrist x, y
    assert abs(result[0]) < 1e-6
    assert abs(result[1]) < 1e-6
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_normalizer.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services'`

- [ ] **Step 3: Create normalizer.py**

```python
# app/services/normalizer.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_normalizer.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ../..
git add services/inference-api/app/services/normalizer.py services/inference-api/tests/test_normalizer.py
git commit -m "feat: landmark normalization — translation and scale invariant 42-feature vector"
```

---

## Task 6: Classifier Service

**Files:**
- Create: `services/inference-api/app/services/classifier.py`
- Create: `services/inference-api/tests/test_classifier.py`

The classifier service loads a pickled sklearn model and returns a `PredictionResponse`. For this task we use a dummy model so the API can be tested before training.

- [ ] **Step 1: Write failing classifier tests**

```python
# tests/test_classifier.py
import pickle
import numpy as np
import pytest
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from app.services.classifier import ClassifierService
from app.models.schemas import PredictionResponse


@pytest.fixture
def dummy_model_path(tmp_path) -> Path:
    """Creates a minimal trained RandomForest with labels A–C."""
    clf = RandomForestClassifier(n_estimators=10, random_state=42)
    # 9 samples, 42 features, 3 classes
    X = np.random.rand(9, 42)
    y = ["A", "A", "A", "B", "B", "B", "C", "C", "C"]
    clf.fit(X, y)
    model_path = tmp_path / "test_classifier.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)
    return model_path


def test_predict_returns_prediction_response(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert isinstance(result, PredictionResponse)


def test_predict_letter_is_one_of_known_labels(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert result.letter in ("A", "B", "C", None)


def test_predict_confidence_in_range(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert 0.0 <= result.confidence <= 1.0


def test_predict_alternatives_has_at_most_two(dummy_model_path):
    service = ClassifierService(dummy_model_path)
    features = np.random.rand(42)
    result = service.predict(features)
    assert len(result.alternatives) <= 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_classifier.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.classifier'`

- [ ] **Step 3: Create classifier.py**

```python
# app/services/classifier.py
import pickle
from pathlib import Path
import numpy as np
from app.models.schemas import PredictionResponse, PredictionAlternative
from app.core.config import settings


class ClassifierService:
    def __init__(self, model_path: Path | None = None):
        path = model_path or settings.model_path
        if not path.exists():
            raise FileNotFoundError(
                f"Model not found at {path}. "
                "Run the trainer first: cd services/trainer && python src/train.py"
            )
        with open(path, "rb") as f:
            self._model = pickle.load(f)

    def predict(self, features: np.ndarray) -> PredictionResponse:
        """
        Run classifier on a 42-element normalized landmark feature vector.

        Returns letter=None when top confidence is below the configured threshold.
        """
        probabilities = self._model.predict_proba([features])[0]
        labels = self._model.classes_

        top_indices = np.argsort(probabilities)[::-1]

        top_letter = labels[top_indices[0]]
        top_confidence = float(probabilities[top_indices[0]])

        letter = top_letter if top_confidence >= settings.confidence_threshold else None

        alternatives = [
            PredictionAlternative(
                letter=labels[i],
                confidence=float(probabilities[i]),
            )
            for i in top_indices[1:3]
        ]

        return PredictionResponse(
            letter=letter,
            confidence=top_confidence,
            alternatives=alternatives,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_classifier.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ../..
git add services/inference-api/app/services/classifier.py services/inference-api/tests/test_classifier.py
git commit -m "feat: ClassifierService — load sklearn model, return PredictionResponse"
```

---

## Task 7: Predict Endpoint

**Files:**
- Create: `services/inference-api/app/api/predict.py`
- Modify: `services/inference-api/app/main.py`
- Create: `services/inference-api/tests/test_predict.py`

- [ ] **Step 1: Write failing predict endpoint tests**

```python
# tests/test_predict.py
import pickle
import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch
from sklearn.ensemble import RandomForestClassifier
from fastapi.testclient import TestClient


def make_a_landmarks() -> list[dict]:
    """21 synthetic landmarks for letter A (fist shape approximation)."""
    # These are normalized-scale coordinates — not real MediaPipe output.
    # Landmark 0 = wrist at origin, landmark 9 = middle finger MCP at (0, -1)
    points = [
        (0.00, 0.00), (0.03, -0.30), (0.06, -0.55), (0.08, -0.75), (0.09, -0.90),
        (-0.04, -0.80), (-0.05, -0.95), (-0.05, -1.05), (-0.04, -1.12),
        (-0.01, -0.82), (0.00, -1.00), (0.00, -1.10), (0.01, -1.18),
        (0.04, -0.80), (0.05, -0.95), (0.05, -1.05), (0.05, -1.12),
        (0.08, -0.75), (0.09, -0.88), (0.10, -0.97), (0.10, -1.05),
    ]
    return [{"x": x, "y": y, "z": 0.0} for x, y in points]


@pytest.fixture
def mock_classifier(tmp_path):
    """Patch ClassifierService to use a tiny dummy model."""
    clf = RandomForestClassifier(n_estimators=5, random_state=0)
    X = np.random.rand(52, 42)
    y = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") * 2
    clf.fit(X, y)
    model_path = tmp_path / "clf.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    with patch("app.api.predict.classifier_service") as mock_svc:
        from app.services.classifier import ClassifierService
        real_svc = ClassifierService(model_path)
        mock_svc.predict = real_svc.predict
        yield mock_svc


def test_predict_returns_200(client, mock_classifier):
    payload = {
        "landmarks": make_a_landmarks(),
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200


def test_predict_response_shape(client, mock_classifier):
    payload = {
        "landmarks": make_a_landmarks(),
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    body = response.json()
    assert "letter" in body
    assert "confidence" in body
    assert "alternatives" in body
    assert isinstance(body["alternatives"], list)


def test_predict_rejects_wrong_landmark_count(client):
    payload = {
        "landmarks": [{"x": 0.1, "y": 0.2, "z": 0.0}] * 5,
        "handedness": "right",
        "timestamp": 1706000000000,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_predict.py -v
```

Expected: FAIL — `404 Not Found` on `/predict`

- [ ] **Step 3: Create predict.py router**

```python
# app/api/predict.py
from fastapi import APIRouter, HTTPException
from app.models.schemas import LandmarkPayload, PredictionResponse
from app.services.normalizer import normalize_landmarks
from app.services.classifier import ClassifierService
from app.core.config import settings

router = APIRouter()

# Module-level singleton — loaded once at startup
try:
    classifier_service = ClassifierService()
except FileNotFoundError as e:
    classifier_service = None  # type: ignore
    _startup_error = str(e)
else:
    _startup_error = None


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: LandmarkPayload) -> PredictionResponse:
    if classifier_service is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded. {_startup_error}",
        )

    landmarks = [(lm.x, lm.y, lm.z) for lm in payload.landmarks]
    features = normalize_landmarks(landmarks)
    return classifier_service.predict(features)
```

- [ ] **Step 4: Register router in main.py**

```python
# app/main.py
from fastapi import FastAPI
from app.api.health import router as health_router
from app.api.predict import router as predict_router

app = FastAPI(title="ASL Inference API", version="0.1.0")

app.include_router(health_router)
app.include_router(predict_router)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_predict.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 6: Run full test suite**

```bash
pytest -v
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
cd ../..
git add services/inference-api/app/api/predict.py services/inference-api/app/main.py services/inference-api/tests/test_predict.py
git commit -m "feat: POST /predict endpoint — normalize landmarks, classify, return prediction"
```

---

## Task 8: Docker Compose

**Files:**
- Create: `infra/local/docker-compose.yml`
- Create: `services/inference-api/Dockerfile`

- [ ] **Step 1: Create Dockerfile for inference API**

```dockerfile
# services/inference-api/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
# infra/local/docker-compose.yml
version: "3.9"

services:
  inference-api:
    build:
      context: ../../services/inference-api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      # Mount trained model artifact read-only into the container
      - ../../services/trainer/artifacts/models:/app/artifacts/models:ro
    environment:
      - MODEL_PATH=artifacts/models/classifier.pkl
      - CONFIDENCE_THRESHOLD=0.85
    restart: unless-stopped
```

- [ ] **Step 3: Verify Docker builds**

```bash
docker compose -f infra/local/docker-compose.yml build
```

Expected: Build completes successfully. The API will return 503 on /predict until a model is trained — that's expected.

- [ ] **Step 4: Commit**

```bash
cd ../..
git add infra/ services/inference-api/Dockerfile
git commit -m "chore: Docker Compose for local inference API dev"
```

---

## Task 9: Trainer — Landmark Extraction

**Files:**
- Create: `services/trainer/src/features/extract.py`
- Create: `services/trainer/src/features/normalize.py`
- Create: `services/trainer/tests/test_normalize.py`
- Create: `services/trainer/requirements.txt`
- Create: `services/trainer/config/labels.yaml`

- [ ] **Step 1: Create trainer requirements.txt**

```
mediapipe==0.10.14
numpy==1.26.4
scikit-learn==1.5.0
opencv-python==4.9.0.80
pandas==2.2.2
matplotlib==3.8.4
seaborn==0.13.2
tqdm==4.66.2
pyyaml==6.0.1
pytest==8.2.0
```

- [ ] **Step 2: Set up trainer virtualenv**

```bash
cd services/trainer
python -m venv .venv
source .venv/Scripts/activate   # Windows
pip install -r requirements.txt
```

- [ ] **Step 3: Create labels.yaml**

```yaml
# services/trainer/config/labels.yaml
# Canonical label definitions for the ASL classifier.
# Each entry maps a numeric class ID to a letter.
# Add new signs here and retrain.
labels:
  - id: 0
    letter: A
  - id: 1
    letter: B
  - id: 2
    letter: C
  - id: 3
    letter: D
  - id: 4
    letter: E
  - id: 5
    letter: F
  - id: 6
    letter: G
  - id: 7
    letter: H
  - id: 8
    letter: I
  - id: 9
    letter: J
  - id: 10
    letter: K
  - id: 11
    letter: L
  - id: 12
    letter: M
  - id: 13
    letter: N
  - id: 14
    letter: O
  - id: 15
    letter: P
  - id: 16
    letter: Q
  - id: 17
    letter: R
  - id: 18
    letter: S
  - id: 19
    letter: T
  - id: 20
    letter: U
  - id: 21
    letter: V
  - id: 22
    letter: W
  - id: 23
    letter: X
  - id: 24
    letter: Y
  - id: 25
    letter: Z
```

- [ ] **Step 4: Write failing normalize test (must match inference API output)**

```python
# tests/test_normalize.py
"""
CRITICAL: This normalization must produce IDENTICAL output to
services/inference-api/app/services/normalizer.py for the same input.
Any divergence means the model trains on different features than it classifies.
"""
import numpy as np
import sys
import os

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
        atol=1e-6,
    )


def test_scale_invariance():
    scaled = [(x * 4.0, y * 4.0, z) for x, y, z in FIXED_LANDMARKS]
    assert np.allclose(
        normalize_landmarks(FIXED_LANDMARKS),
        normalize_landmarks(scaled),
        atol=1e-6,
    )


def test_matches_inference_api_normalizer():
    """
    Import BOTH normalizers and verify they produce identical output.
    If this test fails, the training/inference normalization has drifted — fix it immediately.
    """
    import importlib.util, pathlib
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
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd services/trainer
source .venv/Scripts/activate
pytest tests/test_normalize.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 6: Create normalize.py (identical logic to inference API)**

```python
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
```

- [ ] **Step 7: Create extract.py**

```python
# src/features/extract.py
"""
Run MediaPipe Hands on a single image and return 21 landmark points.
Returns None if no hand is detected.
"""
import cv2
import numpy as np
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
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pytest tests/test_normalize.py -v
```

Expected: All 5 tests PASS, including `test_matches_inference_api_normalizer`

- [ ] **Step 9: Commit**

```bash
cd ../..
git add services/trainer/
git commit -m "feat: trainer landmark extraction and normalization (verified identical to inference API)"
```

---

## Task 10: Dataset Preparation

**Files:**
- Create: `services/trainer/src/dataset/load.py`
- Create: `services/trainer/src/dataset/preprocess.py`

Before running this task, download the ASL Alphabet dataset:
1. Go to: https://www.kaggle.com/datasets/grassknoted/asl-alphabet
2. Download and unzip into `data/raw/asl_alphabet/`
3. Structure should be: `data/raw/asl_alphabet/asl_alphabet_train/A/`, `B/`, etc.

- [ ] **Step 1: Create load.py**

```python
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
```

- [ ] **Step 2: Create preprocess.py**

```python
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
    from collections import defaultdict
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
```

- [ ] **Step 3: Run preprocessing (requires dataset downloaded)**

```bash
cd services/trainer
source .venv/Scripts/activate
python src/dataset/preprocess.py
```

Expected output:
```
Extracting landmarks: 100%|████| 26000/26000 [~10 min]
Processed 25XXX images. Skipped XXX (no hand detected).
Saved to data/processed/
```

Note: This takes ~10 minutes. Grab a coffee.

- [ ] **Step 4: Verify output**

```bash
python -c "
import numpy as np
X = np.load('../../data/processed/X.npy')
y = np.load('../../data/processed/y.npy')
print(f'X shape: {X.shape}')
print(f'y shape: {y.shape}')
print(f'Classes: {sorted(set(y))}')
"
```

Expected: `X shape: (25000+, 42)`, all 26 letters present.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add services/trainer/src/dataset/ services/trainer/src/features/extract.py
git commit -m "feat: trainer dataset loading and landmark preprocessing pipeline"
```

---

## Task 11: Train, Evaluate, and Export Model

**Files:**
- Create: `services/trainer/src/models/random_forest.py`
- Create: `services/trainer/src/train.py`
- Create: `services/trainer/src/evaluate.py`

- [ ] **Step 1: Create random_forest.py**

```python
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
```

- [ ] **Step 2: Create evaluate.py**

```python
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
```

- [ ] **Step 3: Create train.py (main entry point)**

```python
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
```

- [ ] **Step 4: Train the model**

```bash
cd services/trainer
source .venv/Scripts/activate
python src/train.py
```

Expected output (after ~5 minutes):
```
Dataset: 25000+ samples, 26 classes
Training RandomForest...
[...]
Overall accuracy: 0.9XXX (9X.X%)
Per-letter report:
             precision  recall  f1-score ...
           A      0.95    0.94      0.94
           ...
Model exported to services/trainer/artifacts/models/classifier.pkl
```

Target: overall accuracy > 90%. If below 90%, increase `n_estimators` to 500 and retrain.

- [ ] **Step 5: Integration test — load model into inference API**

```bash
# Start inference API with the real model
docker compose -f infra/local/docker-compose.yml up -d

# Wait for startup
sleep 5

# Test /health
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Test /predict with synthetic A landmarks
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "landmarks": [
      {"x":0.0,"y":0.0,"z":0.0},{"x":0.03,"y":-0.30,"z":0.0},{"x":0.06,"y":-0.55,"z":0.0},
      {"x":0.08,"y":-0.75,"z":0.0},{"x":0.09,"y":-0.90,"z":0.0},{"x":-0.04,"y":-0.80,"z":0.0},
      {"x":-0.05,"y":-0.95,"z":0.0},{"x":-0.05,"y":-1.05,"z":0.0},{"x":-0.04,"y":-1.12,"z":0.0},
      {"x":-0.01,"y":-0.82,"z":0.0},{"x":0.0,"y":-1.00,"z":0.0},{"x":0.0,"y":-1.10,"z":0.0},
      {"x":0.01,"y":-1.18,"z":0.0},{"x":0.04,"y":-0.80,"z":0.0},{"x":0.05,"y":-0.95,"z":0.0},
      {"x":0.05,"y":-1.05,"z":0.0},{"x":0.05,"y":-1.12,"z":0.0},{"x":0.08,"y":-0.75,"z":0.0},
      {"x":0.09,"y":-0.88,"z":0.0},{"x":0.10,"y":-0.97,"z":0.0},{"x":0.10,"y":-1.05,"z":0.0}
    ],
    "handedness": "right",
    "timestamp": 1706000000000
  }'
```

Expected: `{"letter":"A","confidence":0.8+,"alternatives":[...]}`

- [ ] **Step 6: Commit**

```bash
docker compose -f infra/local/docker-compose.yml down
cd ../..
mkdir -p services/trainer/artifacts/models && touch services/trainer/artifacts/models/.gitkeep
git add services/trainer/src/models/ services/trainer/src/train.py services/trainer/src/evaluate.py
git add services/trainer/artifacts/models/.gitkeep
git commit -m "feat: RandomForest trainer — train, evaluate, export classifier.pkl"
```

---

## Milestone 1 + 2 Complete

At this point you have:
- Monorepo scaffold with shared TypeScript types
- Inference API running in Docker, serving `POST /predict`
- Trainer pipeline: dataset → landmarks → RandomForest → exported model
- End-to-end proven: real landmarks → API → letter prediction

**Next:** Plan 2 — Mobile Core (Expo app, MediaPipe on-device, camera feed, confidence ring, lock-in mechanic).
