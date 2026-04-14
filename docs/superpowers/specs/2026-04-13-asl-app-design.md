# ASL Vision App — Design Spec
**Date:** 2026-04-13
**Status:** Approved

---

## What We're Building

A mobile app for learning and practicing American Sign Language — Duolingo for ASL. The user props their phone up, signs into the camera, and the app recognizes their signs in real time. No tapping, no scoring — just hold your sign until it locks in.

Two modes:
- **Learn** — structured lessons, Unit/Lesson progression like Duolingo
- **Translate** — free practice, signs build into words live on screen

---

## Architecture

### Inference Pipeline (Hybrid)

Mobile never sends images to the backend. Instead:

1. **On-device** — MediaPipe runs on the phone, extracts 21 hand landmark points (x, y, z) per frame (~15–30 fps)
2. **Backend** — the 21-point array is sent to the FastAPI service, which normalizes the landmarks and runs the classifier
3. **Response** — `{ letter: "A", confidence: 0.94 }` comes back, updates the live confidence ring

This keeps payloads tiny, latency low (~50–150ms), and images off the server entirely.

### Monorepo Structure

```
asl-vision-app/
├── apps/
│   └── mobile/          # Expo / React Native app
├── services/
│   ├── inference-api/   # Python FastAPI — landmark normalization + classifier
│   └── trainer/         # Separate training service — never touches production
├── packages/
│   └── shared-types/    # TypeScript types shared between mobile and backend contract
├── docs/
├── data/
├── scripts/
└── infra/
```

### Key Boundaries

- Training code never lives in the inference API
- Mobile only imports from `shared-types`, never from backend source
- Labels (A–Z and future signs) live in `labels.yaml` — adding new signs doesn't require app code changes
- Model artifacts are exported from trainer → loaded by inference API at startup

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | Expo + React Native + TypeScript |
| Navigation | Expo Router |
| State | Zustand |
| API calls | TanStack Query |
| On-device ML | MediaPipe (via vision tasks) |
| Backend | Python + FastAPI + Pydantic |
| Classifier (MVP) | Random Forest on landmark features |
| Classifier (v2) | Small MLP if RF accuracy is insufficient |
| Training | scikit-learn, eventually PyTorch |
| Monorepo | pnpm workspaces |

---

## Core UX

### The Feedback Loop

The signing screen has two zones:
- **Camera feed** — full screen, shows the user's hand
- **Confidence ring** — bottom-right overlay, fills continuously as the model's confidence rises

When confidence crosses the threshold (default 85%, configurable in `thresholds.ts`) and holds for ~300ms:
- Screen flashes green
- Haptic feedback
- Short success sound
- Auto-advances to next letter

No score. No button. Just the ring locking in — like a satisfying click.

### Learn Mode — Lesson Structure

```
Unit 1: The Alphabet
  └── Lesson 1: Sign Your Name        ← personalized to user's name on onboarding
  └── Lesson 2: A B C D E
  └── Lesson 3: F G H I J
  └── Lesson 4: K L M N O
  └── Lesson 5: P Q R S T
  └── Lesson 6: U V W X Y Z
  └── Lesson 7: Spell short words
  └── Lesson 8: Spell your name (full review)
```

**Lesson 1 — Sign Your Name:**
- During onboarding the user enters their name
- The app isolates which letters they need (e.g. "ALEX" → A, L, E, X)
- Lesson 1 teaches only those letters, deduplicated and in order (e.g. "ANNA" → A, N)
- Personal and immediately motivating — they can sign their own name by the end of lesson 1

**Lesson flow:**
1. Intro card — shows which letters they'll learn
2. Reference card — show the hand shape for the letter, with a diagram
3. Signing screen — live camera, confidence ring, auto-advance on lock-in
4. Repeat for each letter in the lesson
5. Mini review at end — cycle through all lesson letters once more

### Translate Mode

Free practice, no lesson structure.

- Camera feed is live
- Current predicted letter shown large, center screen
- As user holds each sign and it locks in, the letter is appended to a word on screen
- A short pause (1.5s of no confident sign) acts as a word break
- User can clear the word with a tap
- Good for: spelling anything, showing someone a word, free exploration

---

## Data Model

### Landmark payload (mobile → backend)
```typescript
interface LandmarkPayload {
  landmarks: Array<{ x: number; y: number; z: number }>; // 21 points
  handedness: 'left' | 'right';
  timestamp: number;
}
```

### Prediction response (backend → mobile)
```typescript
interface PredictionResponse {
  letter: string | null; // "A"–"Z", or null when no hand detected
  confidence: number;    // 0.0–1.0
  alternatives: Array<{ letter: string; confidence: number }>; // top 3
}
```

### Progress (local, stored in Zustand + AsyncStorage)
```typescript
interface LetterProgress {
  letter: string;
  attempts: number;
  locks: number;         // times confidence threshold was hit
  lastPracticed: number; // timestamp
}
```

---

## Extensibility

The label system is designed to grow beyond A–Z:

- `labels.yaml` defines all recognizable signs — the classifier is trained against this file
- Adding a new sign (e.g. "hello" word-level) means: collect data → add label → retrain → redeploy API
- Mobile app has no hardcoded letter list — it fetches available labels from the API on startup
- Lesson content is data-driven (JSON lesson files), not hardcoded in components

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No hand detected | Ring stays empty, subtle "show your hand" hint after 3s |
| Backend unreachable | Toast: "Can't reach server" — lesson pauses gracefully |
| Low confidence (stuck) | After 10s with no lock-in, show hint: reference image of correct hand shape |
| Wrong letter detected | Ring fills for wrong letter but won't lock in for the target — user self-corrects |

---

## Testing

- **Trainer:** unit tests on landmark normalization and feature extraction
- **Inference API:** pytest — `/predict` endpoint with fixture landmark arrays, one per letter
- **Mobile:** component tests for the confidence ring state machine; E2E for lesson flow with mocked API
- **Model evaluation:** per-letter accuracy matrix run on held-out test split before any model deploy

---

## Build Order (Milestones)

| Milestone | Goal |
|---|---|
| 1 | Monorepo scaffolded, trainer + inference API running locally, landmark extraction proven |
| 2 | Classifier working for A–Z with >90% accuracy on test set |
| 3 | Mobile app: camera + live confidence ring + lock-in mechanic working against real backend |
| 4 | Full lesson system: Unit 1, Lesson 1 (sign your name) through all alphabet lessons |
| 5 | Translate mode: live letter → word builder |
| 6 | Progress tracking, streaks, onboarding |

---

## Out of Scope (for now)

- On-device inference (migrate later once model is proven)
- Word/phrase-level signs beyond alphabet spelling
- User accounts / cloud sync
- Social features
- Android/iOS store submission
