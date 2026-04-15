# Mobile Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the working end-to-end core of the ASL mobile app — camera feed with on-device hand landmark extraction (react-native-mediapipe), inference API integration, animated confidence ring, and the 300ms lock-in mechanic — proving the full pipeline before lesson structure is added.

**Architecture:** Expo bare-workflow React Native app (required for react-native-mediapipe native modules). `HandLandmarkerView` handles camera + MediaPipe extraction natively on-device, calling back with 21 `{x, y, z}` landmarks per frame. `usePrediction` throttles those results into `POST /predict` calls via TanStack Query. `useLockIn` runs the state machine: `idle → filling → locked → idle`, tracking how long the target letter has been held above 85% confidence and firing `onLock` at 300ms. `ConfidenceRing` is an animated SVG circle that fills as `ringProgress` rises and goes green on lock.

**Tech Stack:** Expo (bare workflow) · React Native · TypeScript · Expo Router v3 · TanStack Query · Zustand · react-native-mediapipe · react-native-svg · react-native-reanimated · expo-haptics · jest-expo

---

## File Map

```
apps/mobile/
├── app/
│   ├── _layout.tsx                   # Root: QueryClientProvider + SafeAreaProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab navigator (one tab for now)
│   │   └── index.tsx                 # Home tab — "Start Signing" button
│   └── signing.tsx                   # Full-screen signing screen (stack route)
├── src/
│   ├── components/
│   │   └── ConfidenceRing.tsx        # Animated SVG ring + green flash
│   ├── hooks/
│   │   ├── useLockIn.ts              # Lock-in state machine
│   │   └── usePrediction.ts          # Throttled landmark → /predict call
│   ├── services/
│   │   └── api.ts                    # Predict mutation + API_BASE_URL
│   └── constants/
│       └── thresholds.ts             # CONFIDENCE_THRESHOLD, HOLD_DURATION_MS, LOCK_RESET_MS
├── assets/
│   └── hand_landmarker.task          # MediaPipe model (downloaded in Task 1)
├── __tests__/
│   ├── services/api.test.ts
│   ├── hooks/useLockIn.test.ts
│   ├── hooks/usePrediction.test.ts
│   └── components/ConfidenceRing.test.tsx
├── app.json
├── babel.config.js
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

### Task 1: Expo Bare Scaffold + Dependencies

**Files:**
- Create: `apps/mobile/` (entire directory via create-expo-app)
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/babel.config.js`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/assets/hand_landmarker.task` (downloaded)

- [ ] **Step 1: Create the Expo app with blank TypeScript template**

Run from the repo root:

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript
```

Expected: `apps/mobile/` created with `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `App.tsx`, and `assets/`.

- [ ] **Step 2: Add Expo Router entry point to package.json**

Open `apps/mobile/package.json`. Change the `"main"` field:

```json
"main": "expo-router/entry",
```

Also add `"@asl-app/shared-types": "workspace:*"` to `"dependencies"`.

Full `apps/mobile/package.json` after edits (merge with whatever create-expo-app generated — keep their deps, change main, add the workspace dep):

```json
{
  "name": "@asl-app/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "test": "jest --watchAll",
    "test:ci": "jest --ci",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@asl-app/shared-types": "workspace:*",
    "@tanstack/react-query": "^5.28.0",
    "expo": "~52.0.0",
    "expo-haptics": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.2",
    "react-native": "0.76.5",
    "react-native-mediapipe": "^0.2.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "15.8.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@testing-library/react-native": "^12.4.0",
    "@types/react": "~18.3.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 3: Update app.json for Expo Router + reanimated**

Replace `apps/mobile/app.json` with:

```json
{
  "expo": {
    "name": "ASL Vision",
    "slug": "asl-vision",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "aslvision",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.aslvision.app",
      "infoPlist": {
        "NSCameraUsageDescription": "ASL Vision uses your camera to detect hand signs."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.aslvision.app",
      "permissions": ["android.permission.CAMERA"]
    },
    "plugins": [
      "expo-router",
      "react-native-reanimated"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Update babel.config.js for reanimated**

Replace `apps/mobile/babel.config.js` with:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Create jest.config.js**

Create `apps/mobile/jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: [],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-mediapipe|zustand|@tanstack))',
  ],
  moduleNameMapper: {
    '^react-native-mediapipe$': '<rootDir>/__mocks__/react-native-mediapipe.ts',
  },
  testPathPattern: '__tests__',
};
```

- [ ] **Step 6: Create the react-native-mediapipe mock**

Create `apps/mobile/__mocks__/react-native-mediapipe.ts`:

```typescript
import React from 'react';
import { View } from 'react-native';

export const HandLandmarkerView = React.forwardRef(
  (props: Record<string, unknown>, ref: React.Ref<unknown>) =>
    React.createElement(View, { ...props, ref } as React.ComponentProps<typeof View>),
);
HandLandmarkerView.displayName = 'HandLandmarkerView';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmarkerResult {
  landmarks: NormalizedLandmark[][];
  worldLandmarks: NormalizedLandmark[][];
  handednesses: Array<{
    categories: Array<{
      score: number;
      index: number;
      categoryName: string;
      displayName: string;
    }>;
    headIndex: number;
    headName: string;
  }>;
  timestampMs: number;
}
```

- [ ] **Step 7: Download the MediaPipe hand landmarker model**

Run from `apps/mobile/`:

```bash
curl -L -o assets/hand_landmarker.task \
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
```

Expected: `assets/hand_landmarker.task` (~24 MB). If curl is unavailable, download manually from that URL.

- [ ] **Step 8: Install dependencies from repo root**

```bash
pnpm install
```

Expected: `apps/mobile/node_modules/` populated, `@asl-app/shared-types` linked as workspace package. No errors.

- [ ] **Step 9: Run prebuild to generate native projects**

```bash
cd apps/mobile && npx expo prebuild --clean
```

Expected: `apps/mobile/ios/` and `apps/mobile/android/` directories created with native project files. Camera permission strings included.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: no errors (the project has almost no source yet — this just validates tsconfig is correct).

- [ ] **Step 11: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/
git commit -m "feat(mobile): scaffold Expo bare app with all deps"
```

---

### Task 2: Constants + API Service

**Files:**
- Create: `apps/mobile/src/constants/thresholds.ts`
- Create: `apps/mobile/src/services/api.ts`
- Create: `apps/mobile/__tests__/services/api.test.ts`

- [ ] **Step 1: Write the failing test for api.ts**

Create `apps/mobile/__tests__/services/api.test.ts`:

```typescript
import { predictSign } from '../../src/services/api';
import type { LandmarkPayload, PredictionResponse } from '@asl-app/shared-types';

const MOCK_LANDMARKS = Array.from({ length: 21 }, (_, i) => ({
  x: i * 0.01,
  y: i * 0.02,
  z: i * 0.005,
}));

const MOCK_PAYLOAD: LandmarkPayload = {
  landmarks: MOCK_LANDMARKS,
  handedness: 'right',
  timestamp: 1000,
};

const MOCK_RESPONSE: PredictionResponse = {
  letter: 'A',
  confidence: 0.94,
  alternatives: [{ letter: 'B', confidence: 0.03 }],
};

describe('predictSign', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('POSTs landmarks to /predict and returns PredictionResponse', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RESPONSE,
    });

    const result = await predictSign(MOCK_PAYLOAD);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predict'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(MOCK_PAYLOAD),
      }),
    );
    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(predictSign(MOCK_PAYLOAD)).rejects.toThrow('503');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=api
```

Expected: FAIL — `Cannot find module '../../src/services/api'`

- [ ] **Step 3: Create thresholds.ts**

Create `apps/mobile/src/constants/thresholds.ts`:

```typescript
/** Minimum model confidence (0–1) required to begin filling the ring. */
export const CONFIDENCE_THRESHOLD = 0.85;

/** How long (ms) the sign must be held above threshold before locking in. */
export const HOLD_DURATION_MS = 300;

/** How long (ms) the ring stays locked/green before resetting to idle. */
export const LOCK_RESET_MS = 600;

/** Minimum ms between consecutive /predict API calls (throttle). */
export const PREDICT_THROTTLE_MS = 100;
```

- [ ] **Step 4: Create api.ts**

Create `apps/mobile/src/services/api.ts`:

```typescript
import type { LandmarkPayload, PredictionResponse } from '@asl-app/shared-types';

/**
 * Base URL for the inference API.
 * In development this points to the local Docker container.
 * Override with EXPO_PUBLIC_API_URL env variable.
 */
export const API_BASE_URL =
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8000';

/**
 * POST 21 landmarks to /predict and return the model's classification.
 * Throws if the response is not 2xx.
 */
export async function predictSign(
  payload: LandmarkPayload,
): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Predict failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PredictionResponse>;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=api
```

Expected: PASS — 2 tests passing

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/src/ apps/mobile/__tests__/
git commit -m "feat(mobile): add thresholds constants and predict API service"
```

---

### Task 3: useLockIn Hook

**Files:**
- Create: `apps/mobile/src/hooks/useLockIn.ts`
- Create: `apps/mobile/__tests__/hooks/useLockIn.test.ts`

The state machine:
- `idle`: no confident matching sign
- `filling`: correct letter held above threshold; `ringProgress` counts up 0→1 over `HOLD_DURATION_MS`
- `locked`: progress reached 1.0; `onLock` fired; ring stays green for `LOCK_RESET_MS` then resets to `idle`

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/__tests__/hooks/useLockIn.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useLockIn } from '../../src/hooks/useLockIn';
import type { PredictionResponse } from '@asl-app/shared-types';

jest.useFakeTimers();

const makePrediction = (
  letter: string | null,
  confidence: number,
): PredictionResponse => ({
  letter,
  confidence,
  alternatives: [],
});

describe('useLockIn', () => {
  it('starts in idle state with zero progress', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );
    expect(result.current.phase).toBe('idle');
    expect(result.current.ringProgress).toBe(0);
  });

  it('moves to filling when letter matches and confidence is above threshold', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('A', 0.9));
    });

    expect(result.current.phase).toBe('filling');
    expect(result.current.ringProgress).toBeGreaterThanOrEqual(0);
  });

  it('stays idle when confidence is below threshold', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('A', 0.5));
    });

    expect(result.current.phase).toBe('idle');
  });

  it('stays idle when letter does not match target', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('B', 0.95));
    });

    expect(result.current.phase).toBe('idle');
  });

  it('fires onLock and moves to locked after HOLD_DURATION_MS', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('A', 0.9));
      jest.advanceTimersByTime(350); // past 300ms HOLD_DURATION_MS
      result.current.onNewPrediction(makePrediction('A', 0.9));
    });

    expect(result.current.phase).toBe('locked');
    expect(onLock).toHaveBeenCalledWith('A');
  });

  it('resets to idle after LOCK_RESET_MS following a lock', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: 'A', onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('A', 0.9));
      jest.advanceTimersByTime(350);
      result.current.onNewPrediction(makePrediction('A', 0.9));
    });

    act(() => {
      jest.advanceTimersByTime(700); // past LOCK_RESET_MS (600ms)
    });

    expect(result.current.phase).toBe('idle');
    expect(result.current.ringProgress).toBe(0);
  });

  it('accepts any letter when targetLetter is null (translate mode)', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: null, onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('Z', 0.9));
    });

    expect(result.current.phase).toBe('filling');
  });

  it('resets to idle when letter changes mid-fill', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useLockIn({ targetLetter: null, onLock }),
    );

    act(() => {
      result.current.onNewPrediction(makePrediction('A', 0.9));
      jest.advanceTimersByTime(150);
      // Switch to a different letter
      result.current.onNewPrediction(makePrediction('B', 0.9));
    });

    // ringProgress should have reset (new letter started fresh)
    expect(result.current.ringProgress).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=useLockIn
```

Expected: FAIL — `Cannot find module '../../src/hooks/useLockIn'`

- [ ] **Step 3: Implement useLockIn**

Create `apps/mobile/src/hooks/useLockIn.ts`:

```typescript
import { useCallback, useRef, useState } from 'react';
import type { PredictionResponse } from '@asl-app/shared-types';
import {
  CONFIDENCE_THRESHOLD,
  HOLD_DURATION_MS,
  LOCK_RESET_MS,
} from '../constants/thresholds';

export type LockPhase = 'idle' | 'filling' | 'locked';

interface UseLockInOptions {
  /** The letter the user should sign. Pass null to accept any letter (translate mode). */
  targetLetter: string | null;
  /** Called once when the sign locks in, with the locked letter. */
  onLock: (letter: string) => void;
}

interface UseLockInResult {
  phase: LockPhase;
  /** 0–1: how far the ring has filled. Drives ConfidenceRing progress prop. */
  ringProgress: number;
  /** Call this with each new prediction from usePrediction. */
  onNewPrediction: (prediction: PredictionResponse) => void;
}

export function useLockIn({
  targetLetter,
  onLock,
}: UseLockInOptions): UseLockInResult {
  const [phase, setPhase] = useState<LockPhase>('idle');
  const [ringProgress, setRingProgress] = useState(0);

  // Refs so callbacks always see current values without re-creating
  const startTimeRef = useRef<number | null>(null);
  const currentLetterRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const reset = useCallback(() => {
    setPhase('idle');
    setRingProgress(0);
    startTimeRef.current = null;
    currentLetterRef.current = null;
  }, []);

  const onNewPrediction = useCallback(
    (prediction: PredictionResponse) => {
      const { letter, confidence } = prediction;

      const isMatch =
        letter !== null &&
        confidence >= CONFIDENCE_THRESHOLD &&
        (targetLetter === null || letter === targetLetter);

      if (!isMatch) {
        if (resetTimerRef.current === null) {
          // Only reset if not already locked (locked phase handles its own reset)
          setPhase((p) => {
            if (p !== 'locked') {
              setRingProgress(0);
              startTimeRef.current = null;
              currentLetterRef.current = null;
              return 'idle';
            }
            return p;
          });
        }
        return;
      }

      // Letter changed — restart timer
      if (letter !== currentLetterRef.current) {
        startTimeRef.current = Date.now();
        currentLetterRef.current = letter;
        setPhase('filling');
        setRingProgress(0);
        return;
      }

      // Same letter, already filling
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setRingProgress(progress);

      if (progress >= 1) {
        setPhase((p) => {
          if (p === 'locked') return p; // already locked, don't re-fire
          // Lock in
          onLockRef.current(letter!);
          // Schedule reset
          resetTimerRef.current = setTimeout(() => {
            resetTimerRef.current = null;
            reset();
          }, LOCK_RESET_MS);
          return 'locked';
        });
      } else {
        setPhase('filling');
      }
    },
    [targetLetter, reset],
  );

  return { phase, ringProgress, onNewPrediction };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=useLockIn
```

Expected: PASS — 8 tests passing

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/src/hooks/useLockIn.ts apps/mobile/__tests__/hooks/useLockIn.test.ts
git commit -m "feat(mobile): add useLockIn state machine hook"
```

---

### Task 4: ConfidenceRing Component

**Files:**
- Create: `apps/mobile/src/components/ConfidenceRing.tsx`
- Create: `apps/mobile/__tests__/components/ConfidenceRing.test.tsx`

The ring is an SVG circle. The stroke is drawn using `strokeDasharray` + `strokeDashoffset` — offset = `CIRCUMFERENCE * (1 - progress)`. Progress animates smoothly via reanimated. Color is blue while filling, green when locked.

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/__tests__/components/ConfidenceRing.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfidenceRing } from '../../src/components/ConfidenceRing';

// react-native-reanimated needs its own mock for tests
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

describe('ConfidenceRing', () => {
  it('renders without crashing at 0 progress', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={0} phase="idle" />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders without crashing at full progress', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={1} phase="filling" />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders without crashing in locked phase', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={1} phase="locked" />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=ConfidenceRing
```

Expected: FAIL — `Cannot find module '../../src/components/ConfidenceRing'`

- [ ] **Step 3: Implement ConfidenceRing**

Create `apps/mobile/src/components/ConfidenceRing.tsx`:

```typescript
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { LockPhase } from '../hooks/useLockIn';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 120;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

const COLOR_IDLE = 'rgba(255,255,255,0.15)';
const COLOR_FILLING = '#4A90E2';
const COLOR_LOCKED = '#00C851';

interface ConfidenceRingProps {
  /** 0–1, drives how much of the ring is filled */
  progress: number;
  phase: LockPhase;
}

export function ConfidenceRing({ progress, phase }: ConfidenceRingProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 80 });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const strokeColor = phase === 'locked' ? COLOR_LOCKED : COLOR_FILLING;
  const showProgress = phase !== 'idle' || progress > 0;

  return (
    <View style={styles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background track */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={COLOR_IDLE}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress arc */}
        {showProgress && (
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CENTER}, ${CENTER}`}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=ConfidenceRing
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/src/components/ConfidenceRing.tsx apps/mobile/__tests__/components/ConfidenceRing.test.tsx
git commit -m "feat(mobile): add animated SVG ConfidenceRing component"
```

---

### Task 5: usePrediction Hook

**Files:**
- Create: `apps/mobile/src/hooks/usePrediction.ts`
- Create: `apps/mobile/__tests__/hooks/usePrediction.test.ts`

`usePrediction` accepts `HandLandmarkerResult` from MediaPipe, extracts the first hand's 21 landmarks, builds a `LandmarkPayload`, throttles calls (max one per `PREDICT_THROTTLE_MS`), calls `predictSign`, and returns the latest `PredictionResponse`.

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/__tests__/hooks/usePrediction.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePrediction } from '../../src/hooks/usePrediction';
import type { HandLandmarkerResult } from '../../__mocks__/react-native-mediapipe';
import * as api from '../../src/services/api';

jest.useFakeTimers();
jest.mock('../../src/services/api');

const mockPredictSign = api.predictSign as jest.MockedFunction<typeof api.predictSign>;

const MOCK_RESULT: HandLandmarkerResult = {
  landmarks: [
    Array.from({ length: 21 }, (_, i) => ({ x: i * 0.01, y: i * 0.02, z: 0 })),
  ],
  worldLandmarks: [],
  handednesses: [
    {
      categories: [{ score: 0.9, index: 0, categoryName: 'Right', displayName: 'Right' }],
      headIndex: 0,
      headName: 'handedness',
    },
  ],
  timestampMs: 1000,
};

const EMPTY_RESULT: HandLandmarkerResult = {
  landmarks: [],
  worldLandmarks: [],
  handednesses: [],
  timestampMs: 2000,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePrediction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredictSign.mockResolvedValue({
      letter: 'A',
      confidence: 0.94,
      alternatives: [],
    });
  });

  it('returns null prediction initially', () => {
    const { result } = renderHook(() => usePrediction(), { wrapper });
    expect(result.current.prediction).toBeNull();
  });

  it('calls predictSign when landmarks are provided', async () => {
    const { result } = renderHook(() => usePrediction(), { wrapper });

    await act(async () => {
      result.current.onLandmarks(MOCK_RESULT);
    });

    expect(mockPredictSign).toHaveBeenCalledWith(
      expect.objectContaining({
        landmarks: MOCK_RESULT.landmarks[0],
        handedness: 'right',
      }),
    );
  });

  it('returns null prediction when no hand is detected', async () => {
    const { result } = renderHook(() => usePrediction(), { wrapper });

    await act(async () => {
      result.current.onLandmarks(EMPTY_RESULT);
    });

    expect(mockPredictSign).not.toHaveBeenCalled();
    expect(result.current.prediction).toBeNull();
  });

  it('throttles calls to at most one per PREDICT_THROTTLE_MS', async () => {
    const { result } = renderHook(() => usePrediction(), { wrapper });

    await act(async () => {
      result.current.onLandmarks(MOCK_RESULT);
      result.current.onLandmarks(MOCK_RESULT); // second call within throttle window
      result.current.onLandmarks(MOCK_RESULT); // third call within throttle window
    });

    expect(mockPredictSign).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=usePrediction
```

Expected: FAIL — `Cannot find module '../../src/hooks/usePrediction'`

- [ ] **Step 3: Implement usePrediction**

Create `apps/mobile/src/hooks/usePrediction.ts`:

```typescript
import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { PredictionResponse } from '@asl-app/shared-types';
import { predictSign } from '../services/api';
import { PREDICT_THROTTLE_MS } from '../constants/thresholds';

// We type the relevant parts of HandLandmarkerResult inline to avoid
// importing from react-native-mediapipe (native module) in this hook.
interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface IncomingHandResult {
  landmarks: Landmark[][];
  handednesses: Array<{
    categories: Array<{ categoryName: string }>;
  }>;
}

interface UsePredictionResult {
  prediction: PredictionResponse | null;
  /** Pass HandLandmarkerResult directly from HandLandmarkerView's onResults callback. */
  onLandmarks: (result: IncomingHandResult) => void;
}

export function usePrediction(): UsePredictionResult {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const lastCallTimeRef = useRef<number>(0);

  const { mutate } = useMutation({
    mutationFn: predictSign,
    onSuccess: (data) => setPrediction(data),
  });

  const onLandmarks = useCallback(
    (result: IncomingHandResult) => {
      if (result.landmarks.length === 0) {
        // No hand detected — leave last prediction visible (let useLockIn handle reset)
        return;
      }

      const now = Date.now();
      if (now - lastCallTimeRef.current < PREDICT_THROTTLE_MS) {
        return; // throttled
      }
      lastCallTimeRef.current = now;

      const landmarks = result.landmarks[0]!;
      const rawHandedness =
        result.handednesses[0]?.categories[0]?.categoryName ?? 'Right';
      const handedness = rawHandedness.toLowerCase() === 'left' ? 'left' : 'right';

      mutate({ landmarks, handedness, timestamp: now });
    },
    [mutate],
  );

  return { prediction, onLandmarks };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern=usePrediction
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/src/hooks/usePrediction.ts apps/mobile/__tests__/hooks/usePrediction.test.ts
git commit -m "feat(mobile): add usePrediction hook with throttled landmark→API calls"
```

---

### Task 6: SigningScreen

**Files:**
- Create: `apps/mobile/app/signing.tsx`

This screen wires together all the pieces: `HandLandmarkerView` (full-screen camera + landmark extraction) → `usePrediction` → `useLockIn` → `ConfidenceRing`. For this plan it runs in translate mode (targetLetter = null) so any held sign locks in — full lesson integration comes in Plan 3.

No unit tests here; the screen requires a real device. Verification is manual (see Step 2).

- [ ] **Step 1: Create signing.tsx**

Create `apps/mobile/app/signing.tsx`:

```typescript
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ConfidenceRing } from '../src/components/ConfidenceRing';
import { useLockIn } from '../src/hooks/useLockIn';
import { usePrediction } from '../src/hooks/usePrediction';

export default function SigningScreen() {
  const navigation = useNavigation();
  // targetLetter can be passed as a route param for lesson mode; null = translate mode
  const { targetLetter } = useLocalSearchParams<{ targetLetter?: string }>();

  const { prediction, onLandmarks } = usePrediction();

  const handleLock = useCallback(
    (letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      console.log('Locked in:', letter);
      // Plan 3 will wire this into lesson progression
    },
    [],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: targetLetter ?? null,
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction) {
      onNewPrediction(prediction);
    }
  }, [prediction, onNewPrediction]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <HandLandmarkerView
        style={StyleSheet.absoluteFill}
        activeCamera="front"
        numHands={1}
        runningMode="LIVE_STREAM"
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        model={require('../assets/hand_landmarker.task')}
        onHandLandmarkerResults={onLandmarks}
      />

      {/* Letter display */}
      <View style={styles.letterContainer}>
        {prediction?.letter ? (
          <Text style={styles.letterText}>{prediction.letter}</Text>
        ) : null}
      </View>

      {/* Confidence ring — bottom-right corner */}
      <View style={styles.ringContainer}>
        <ConfidenceRing progress={ringProgress} phase={phase} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  letterContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '700',
  },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
```

- [ ] **Step 2: Manual verification plan**

To verify the signing screen works end-to-end:

1. Start the inference API:
   ```bash
   docker compose -f infra/local/docker-compose.yml up
   ```
   (The model must be trained first — see project memory for pending human steps.)

2. Start the Metro bundler:
   ```bash
   cd apps/mobile && npx expo start
   ```

3. Run on a physical device (USB) or simulator:
   ```bash
   npx expo run:ios   # or run:android
   ```

4. Navigate to the signing screen (see Task 7).

5. **Expected behavior:** Camera feed fills screen. Hold your hand up and sign the letter A. The predicted letter should appear large at the top. The confidence ring (bottom-right) should fill as confidence rises. After holding for ~300ms the ring goes green and haptics fire.

6. If the ring never fills: verify the API is returning predictions (`curl -s http://localhost:8000/health`).

7. If the camera shows but no predictions arrive: verify `onHandLandmarkerResults` is firing (add `console.log` in `usePrediction.onLandmarks`).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/app/signing.tsx
git commit -m "feat(mobile): add SigningScreen wiring camera + ring + lock-in"
```

---

### Task 7: Home Tab + Navigation + End-to-End Smoke Test

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`

This task sets up Expo Router so the app has a Home tab with a "Start Signing" button that pushes to the signing screen. It also sets up the `QueryClientProvider` so TanStack Query works everywhere.

- [ ] **Step 1: Create root layout**

Create `apps/mobile/app/_layout.tsx`:

```typescript
import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="signing"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create tabs layout**

Create `apps/mobile/app/(tabs)/_layout.tsx`:

```typescript
import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#111' },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create home tab**

Create `apps/mobile/app/(tabs)/index.tsx`:

```typescript
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>ASL Vision</Text>
        <Text style={styles.subtitle}>Learn sign language one letter at a time</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/signing')}
        >
          <Text style={styles.buttonText}>Start Signing</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run the full test suite**

```bash
cd apps/mobile && pnpm test:ci
```

Expected: All tests pass (useLockIn, usePrediction, api, ConfidenceRing — 18 tests total). Zero failures.

- [ ] **Step 5: Run TypeScript check**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit and push**

```bash
cd /c/Users/Owner/Projects/ai-asl
git add apps/mobile/app/
git commit -m "feat(mobile): add home tab + Expo Router navigation structure"
git push
```

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Expo + React Native + TypeScript + Expo Router + Zustand + TanStack Query | Task 1 deps |
| MediaPipe landmark extraction on-device | Task 1 (HandLandmarkerView), Task 6 (SigningScreen) |
| Sends 21-point array to FastAPI | Task 5 (usePrediction → api.ts) |
| Camera feed full screen | Task 6 |
| Confidence ring bottom-right overlay | Task 4 (ConfidenceRing), Task 6 |
| Ring fills continuously as confidence rises | Task 3 (useLockIn.ringProgress 0→1) |
| 85% threshold, 300ms hold | Task 2 (thresholds.ts) |
| Screen flash green on lock | Task 4 (COLOR_LOCKED in ConfidenceRing) |
| Haptic feedback on lock | Task 6 (Haptics.notificationAsync) |
| Auto-advance on lock | Task 6 (handleLock stub, wired in Plan 3) |
| No hand → ring empty | Task 5 (no-op on empty result), Task 3 (idle phase) |
| Backend unreachable → graceful | Task 2 (throws), TanStack Query retry handles it |

**Zustand** is installed as a dep but not used in this plan — it's needed in Plan 3 for lesson progress state. Installing it now avoids a second prebuild.

### Placeholder Scan

None found. All steps contain complete code.

### Type Consistency

- `LockPhase` exported from `useLockIn.ts` and imported in `ConfidenceRing.tsx` — consistent.
- `IncomingHandResult` in `usePrediction.ts` matches the shape of `HandLandmarkerResult` from the mock — consistent.
- `predictSign` signature in `api.ts` matches TanStack Query `mutationFn` in `usePrediction.ts` — consistent.
- `onHandLandmarkerResults` prop name on `HandLandmarkerView` in `signing.tsx` — this is the most likely place to need a tweak if the installed react-native-mediapipe version uses a different prop name (e.g., `onResults`). Check `node_modules/react-native-mediapipe/src/` after `pnpm install` to confirm the exact prop name and adjust `signing.tsx` accordingly.
