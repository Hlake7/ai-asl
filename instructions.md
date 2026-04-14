# Instructions

Recommended architecture

Start as a monorepo with 3 parts:

mobile/ → Expo / React Native app
backend/ → Python API + ML inference services
shared/ → shared types, constants, prompts, docs

That gives you:

fast frontend iteration in Cursor
Python where vision work is easiest
clean separation between app UX and model experimentation

Repo structure
asl-vision-app/
│
├── README.md
├── .gitignore
├── .env.example
├── CLAUDE.md
├── cursor-rules.md
├── package.json
├── pnpm-workspace.yaml
│
├── docs/
│   ├── product/
│   │   ├── vision.md
│   │   ├── mvp-scope.md
│   │   ├── roadmap.md
│   │   └── user-stories.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   ├── api-contracts.md
│   │   ├── model-pipeline.md
│   │   └── deployment.md
│   ├── ml/
│   │   ├── datasets.md
│   │   ├── labeling-guide.md
│   │   ├── training-notes.md
│   │   └── eval-metrics.md
│   └── decisions/
│       ├── 0001-monorepo.md
│       ├── 0002-mediapipe-landmarks.md
│       └── 0003-on-device-vs-server.md
│
├── apps/
│   └── mobile/
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx
│       │   │   ├── practice.tsx
│       │   │   ├── translate.tsx
│       │   │   └── settings.tsx
│       │   ├── lesson/
│       │   │   └── [letter].tsx
│       │   ├── session/
│       │   │   └── [id].tsx
│       │   ├── _layout.tsx
│       │   └── onboarding.tsx
│       │
│       ├── src/
│       │   ├── components/
│       │   │   ├── CameraPreview.tsx
│       │   │   ├── PredictionCard.tsx
│       │   │   ├── LetterGuide.tsx
│       │   │   ├── ConfidenceMeter.tsx
│       │   │   ├── WordBuilder.tsx
│       │   │   └── FeedbackBanner.tsx
│       │   ├── features/
│       │   │   ├── camera/
│       │   │   ├── practice/
│       │   │   ├── translation/
│       │   │   ├── lessons/
│       │   │   └── progress/
│       │   ├── hooks/
│       │   │   ├── useCameraPermissions.ts
│       │   │   ├── usePredictionStream.ts
│       │   │   └── useSpeech.ts
│       │   ├── services/
│       │   │   ├── api.ts
│       │   │   ├── inference.ts
│       │   │   ├── sessions.ts
│       │   │   └── analytics.ts
│       │   ├── store/
│       │   │   ├── sessionStore.ts
│       │   │   ├── settingsStore.ts
│       │   │   └── progressStore.ts
│       │   ├── types/
│       │   │   ├── prediction.ts
│       │   │   ├── lesson.ts
│       │   │   └── session.ts
│       │   ├── utils/
│       │   │   ├── debounce.ts
│       │   │   ├── smoothing.ts
│       │   │   └── formatting.ts
│       │   └── constants/
│       │       ├── alphabet.ts
│       │       ├── thresholds.ts
│       │       └── config.ts
│       │
│       ├── assets/
│       │   ├── images/
│       │   ├── icons/
│       │   └── sounds/
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── inference-api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   ├── health.py
│   │   │   │   ├── predict.py
│   │   │   │   └── sessions.py
│   │   │   ├── core/
│   │   │   │   ├── config.py
│   │   │   │   ├── logging.py
│   │   │   │   └── security.py
│   │   │   ├── models/
│   │   │   │   ├── schemas.py
│   │   │   │   └── prediction.py
│   │   │   ├── services/
│   │   │   │   ├── mediapipe_service.py
│   │   │   │   ├── classifier_service.py
│   │   │   │   ├── smoothing_service.py
│   │   │   │   └── feedback_service.py
│   │   │   └── utils/
│   │   │       ├── image.py
│   │   │       └── landmarks.py
│   │   ├── tests/
│   │   │   ├── test_health.py
│   │   │   ├── test_predict.py
│   │   │   └── fixtures/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── trainer/
│       ├── src/
│       │   ├── train.py
│       │   ├── evaluate.py
│       │   ├── export_model.py
│       │   ├── dataset/
│       │   │   ├── load_dataset.py
│       │   │   ├── preprocess.py
│       │   │   ├── augment.py
│       │   │   └── split.py
│       │   ├── features/
│       │   │   ├── extract_landmarks.py
│       │   │   └── normalize_landmarks.py
│       │   ├── models/
│       │   │   ├── random_forest.py
│       │   │   ├── mlp.py
│       │   │   └── inference_wrapper.py
│       │   ├── metrics/
│       │   │   ├── classification_report.py
│       │   │   ├── confusion_matrix.py
│       │   │   └── latency.py
│       │   └── config/
│       │       ├── train_config.yaml
│       │       └── labels.yaml
│       ├── artifacts/
│       │   ├── models/
│       │   ├── metrics/
│       │   └── exports/
│       ├── notebooks/
│       │   ├── 01_dataset_exploration.ipynb
│       │   ├── 02_landmark_validation.ipynb
│       │   └── 03_error_analysis.ipynb
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/
│   │   ├── src/
│   │   │   ├── prediction.ts
│   │   │   ├── api.ts
│   │   │   └── session.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── prettier/
│
├── data/
│   ├── raw/
│   │   ├── asl_alphabet/
│   │   └── custom_captures/
│   ├── processed/
│   ├── interim/
│   └── README.md
│
├── scripts/
│   ├── bootstrap.sh
│   ├── run-mobile.sh
│   ├── run-backend.sh
│   ├── run-training.sh
│   ├── export-labels.py
│   └── validate-env.sh
│
├── infra/
│   ├── local/
│   │   ├── docker-compose.yml
│   │   └── dev.env
│   ├── azure/
│   │   ├── function-app/
│   │   ├── container-apps/
│   │   ├── storage/
│   │   └── key-vault/
│   └── terraform/
│
└── .github/
    └── workflows/
        ├── mobile-ci.yml
        ├── backend-ci.yml
        └── trainer-ci.yml

What each major folder is for
apps/mobile

Your actual product.

Use this for:

camera UI
lessons
live predictions
practice history
text-to-speech
settings

I’d use Expo Router here because it keeps navigation simple.

services/inference-api

This is the Python service that:

accepts image frames or landmark arrays
runs MediaPipe
runs classifier
returns prediction + confidence + maybe feedback

Good for:

local dev
early production backend
future Azure deployment
services/trainer

Keep training separate from inference.

This avoids turning your API into a messy ML sandbox.

Use this for:

dataset prep
training
evaluation
exporting model artifacts
packages/shared-types

Important if mobile talks to backend.

This avoids drifting contracts like:

what a prediction object looks like
confidence format
session schemas
docs

This matters more than people think, especially with Claude Code.

Claude works better when the repo has:

clear scope
architecture docs
decisions written down
roadmap
API contracts
Best tech choices for this repo
Mobile
Expo
React Native
TypeScript
Expo Router
Zustand for state
react-query / tanstack query for API calls
Backend
Python
FastAPI
Pydantic
OpenCV
MediaPipe
scikit-learn or PyTorch
ML

For MVP, I would start with:

MediaPipe hand landmarks
simple classifier:
RandomForest first, or
small MLP second

Not YOLO first.

Suggested build order inside this repo
Step 1

Stand up just this:

services/trainer
services/inference-api
a tiny temporary webcam script

Goal:

prove landmark extraction works
classify a few letters
Step 2

Build apps/mobile

Goal:

camera feed
call backend
display live letter output
Step 3

Add practice UX

Goal:

“Show me letter A”
user signs A
app scores it
Step 4

Add local persistence + progress tracking

Goal:

streaks
completed letters
accuracy per sign
Claude Code / Cursor planning files you should include

These will help the coding agent stay aligned.

CLAUDE.md

Put repo rules here:

architecture overview
coding conventions
where to add new features
do not mix training code into inference code
keep mobile UI logic separate from API clients
prefer small files and typed interfaces
cursor-rules.md

Put working norms here:

always update docs when adding endpoints
do not introduce hidden env vars
write tests for API changes
keep feature folders organized
avoid premature abstraction
My recommendation for the first practical version

To avoid overbuilding, I would actually start with this reduced version:

asl-vision-app/
├── apps/
│   └── mobile/
├── services/
│   ├── inference-api/
│   └── trainer/
├── docs/
├── data/
└── scripts/

Skip packages/ui and infra/terraform until the app proves itself.

That keeps the repo lean.

Suggested branch strategy
main → stable
dev → integration branch
feature branches:
feat/mobile-camera
feat/landmark-classifier
feat/practice-mode
feat/text-to-speech
Milestone map
Milestone 1

Repo + backend + landmark detection

Milestone 2

Alphabet classifier working for 5 letters

Milestone 3

Full A–Z live prediction

Milestone 4

Mobile practice app

Milestone 5

Progress tracking + polish

One important architecture decision

You need to decide early between:

Option A: on-device inference

Better UX, lower latency, harder mobile integration

Option B: backend inference

Much easier for MVP, slightly worse latency

For your style and speed, I’d do:

Start with backend inference
then later move inference on-device if the product proves out.

My recommendation in one sentence

Build this as a lean monorepo with Expo mobile + Python inference API + separate training service, and keep the first version focused entirely on ASL alphabet recognition using MediaPipe landmarks.