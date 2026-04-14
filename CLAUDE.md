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
