# Lessons & Translate Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add onboarding, Unit 1 lessons (8 total), translate mode, and lesson progress tracking to the mobile app.

**Architecture:** A Zustand store (persisted via AsyncStorage) tracks onboarding state, lesson completion, and per-letter progress. A `useLessonSession` hook expands lesson definitions into a flat step sequence (intro → reference+signing per letter → review → complete). The lesson screen keeps the camera always mounted; non-signing steps render full-screen overlays on top. Translate mode uses a new `useWordBuilder` hook that accumulates locked-in letters into words, breaking on 1.5s idle.

**Tech Stack:** Zustand v5 + `zustand/middleware` persist, `@react-native-async-storage/async-storage`, Expo Router, `@testing-library/react-native` `renderHook`, `jest.useFakeTimers`

---

## File Map

**New files:**
- `apps/mobile/src/store/useAppStore.ts` — Zustand store: onboarding, lesson completion, letter progress
- `apps/mobile/src/store/__tests__/useAppStore.test.ts`
- `apps/mobile/src/data/lessons.ts` — `LessonDefinition` interface + `UNIT_1` array
- `apps/mobile/src/data/handShapeHints.ts` — hint text for A–Z
- `apps/mobile/src/hooks/useLessonSession.ts` — lesson step state machine
- `apps/mobile/src/hooks/__tests__/useLessonSession.test.ts`
- `apps/mobile/src/hooks/useWordBuilder.ts` — translate word accumulation
- `apps/mobile/src/hooks/__tests__/useWordBuilder.test.ts`
- `apps/mobile/src/components/ReferenceCard.tsx` — letter + hint + image placeholder
- `apps/mobile/src/components/__tests__/ReferenceCard.test.tsx`
- `apps/mobile/src/components/LessonStepIntro.tsx`
- `apps/mobile/src/components/LessonStepReviewIntro.tsx`
- `apps/mobile/src/components/LessonStepComplete.tsx`
- `apps/mobile/__mocks__/@react-native-async-storage/async-storage.ts`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/app/learn/index.tsx`
- `apps/mobile/app/learn/[lessonId].tsx`
- `apps/mobile/app/translate.tsx`

**Modified files:**
- `apps/mobile/src/constants/thresholds.ts` — add `WORD_BREAK_MS`
- `apps/mobile/jest.config.js` — add AsyncStorage mock + module mapper
- `apps/mobile/app/_layout.tsx` — add new screens + onboarding gate
- `apps/mobile/app/(tabs)/index.tsx` — home dashboard

---

## Task 1: Install AsyncStorage + create Zustand store

**Files:**
- Create: `apps/mobile/src/store/useAppStore.ts`
- Create: `apps/mobile/__mocks__/@react-native-async-storage/async-storage.ts`
- Modify: `apps/mobile/jest.config.js`
- Test: `apps/mobile/src/store/__tests__/useAppStore.test.ts`

- [ ] **Step 1: Install AsyncStorage**

```bash
cd apps/mobile && pnpm add @react-native-async-storage/async-storage
```

Expected: package added to `apps/mobile/package.json` dependencies.

- [ ] **Step 2: Write the failing store tests**

Create `apps/mobile/src/store/__tests__/useAppStore.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../useAppStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('../../__mocks__/@react-native-async-storage/async-storage'),
);

const RESET = {
  userName: null,
  hasOnboarded: false,
  _hasHydrated: false,
  completedLessons: {},
  letterProgress: {},
};

beforeEach(() => useAppStore.setState(RESET));

describe('completeOnboarding', () => {
  it('sets userName and hasOnboarded', () => {
    const { result } = renderHook(() => useAppStore());
    act(() => result.current.completeOnboarding('Alex'));
    expect(result.current.userName).toBe('Alex');
    expect(result.current.hasOnboarded).toBe(true);
  });
});

describe('completeLesson', () => {
  it('records completion with a timestamp', () => {
    const { result } = renderHook(() => useAppStore());
    const before = Date.now();
    act(() => result.current.completeLesson('u1l1'));
    expect(result.current.completedLessons['u1l1']?.completedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('isLessonUnlocked', () => {
  it('lesson 1 is always unlocked', () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.isLessonUnlocked('u1l1')).toBe(true);
  });

  it('lesson 2 is locked until lesson 1 is complete', () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.isLessonUnlocked('u1l2')).toBe(false);
    act(() => result.current.completeLesson('u1l1'));
    expect(result.current.isLessonUnlocked('u1l2')).toBe(true);
  });

  it('lesson 5 unlocks after lesson 4 completes', () => {
    const { result } = renderHook(() => useAppStore());
    act(() => result.current.completeLesson('u1l4'));
    expect(result.current.isLessonUnlocked('u1l5')).toBe(true);
  });
});

describe('recordLockIn', () => {
  it('increments locks and attempts, sets lastPracticed', () => {
    const { result } = renderHook(() => useAppStore());
    const before = Date.now();
    act(() => result.current.recordLockIn('A'));
    act(() => result.current.recordLockIn('A'));
    const p = result.current.letterProgress['A']!;
    expect(p.locks).toBe(2);
    expect(p.attempts).toBe(2);
    expect(p.lastPracticed).toBeGreaterThanOrEqual(before);
  });

  it('tracks different letters independently', () => {
    const { result } = renderHook(() => useAppStore());
    act(() => result.current.recordLockIn('A'));
    act(() => result.current.recordLockIn('B'));
    expect(result.current.letterProgress['A']!.locks).toBe(1);
    expect(result.current.letterProgress['B']!.locks).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL (module not found)**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useAppStore"
```

Expected: FAIL — `Cannot find module '../useAppStore'`

- [ ] **Step 4: Create the AsyncStorage mock**

Create `apps/mobile/__mocks__/@react-native-async-storage/async-storage.ts`:

```typescript
export default {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  mergeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
};
```

- [ ] **Step 5: Add AsyncStorage to jest.config.js transformIgnorePatterns**

In `apps/mobile/jest.config.js`, update the `transformIgnorePatterns` array entry to include `@react-native-async-storage`:

```javascript
transformIgnorePatterns: [
  '/node_modules/(?!.pnpm)(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-mediapipe|zustand|@tanstack/.*|@testing-library/react-native))',
],
```

- [ ] **Step 6: Create the store**

Create `apps/mobile/src/store/useAppStore.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LetterProgress } from '@asl-app/shared-types';
import { UNIT_1 } from '../data/lessons';

interface AppStore {
  _hasHydrated: boolean;
  userName: string | null;
  hasOnboarded: boolean;
  completedLessons: Record<string, { completedAt: number }>;
  letterProgress: Record<string, LetterProgress>;

  setHasHydrated: (value: boolean) => void;
  completeOnboarding: (name: string) => void;
  completeLesson: (lessonId: string) => void;
  isLessonUnlocked: (lessonId: string) => boolean;
  recordLockIn: (letter: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      userName: null,
      hasOnboarded: false,
      completedLessons: {},
      letterProgress: {},

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      completeOnboarding: (name) => set({ userName: name, hasOnboarded: true }),

      completeLesson: (lessonId) =>
        set((state) => ({
          completedLessons: {
            ...state.completedLessons,
            [lessonId]: { completedAt: Date.now() },
          },
        })),

      isLessonUnlocked: (lessonId) => {
        const lesson = UNIT_1.find((l) => l.id === lessonId);
        if (!lesson) return false;
        if (lesson.order === 1) return true;
        const prev = UNIT_1.find((l) => l.order === lesson.order - 1);
        if (!prev) return false;
        return prev.id in get().completedLessons;
      },

      recordLockIn: (letter) =>
        set((state) => {
          const existing = state.letterProgress[letter] ?? {
            letter,
            attempts: 0,
            locks: 0,
            lastPracticed: 0,
          };
          return {
            letterProgress: {
              ...state.letterProgress,
              [letter]: {
                ...existing,
                attempts: existing.attempts + 1,
                locks: existing.locks + 1,
                lastPracticed: Date.now(),
              },
            },
          };
        }),
    }),
    {
      name: 'asl-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userName: state.userName,
        hasOnboarded: state.hasOnboarded,
        completedLessons: state.completedLessons,
        letterProgress: state.letterProgress,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
```

Note: `UNIT_1` is imported from `../data/lessons` — that file is created in Task 2. The store will fail to compile until Task 2 is done; that is expected.

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useAppStore"
```

Expected: all 7 tests PASS.

- [ ] **Step 8: Commit**

```bash
cd apps/mobile && git add src/store/useAppStore.ts src/store/__tests__/useAppStore.test.ts __mocks__/@react-native-async-storage/async-storage.ts jest.config.js package.json && git commit -m "feat(mobile): add Zustand store — onboarding, lesson completion, letter progress"
```

---

## Task 2: Lesson data files + WORD_BREAK_MS

**Files:**
- Create: `apps/mobile/src/data/lessons.ts`
- Create: `apps/mobile/src/data/handShapeHints.ts`
- Modify: `apps/mobile/src/constants/thresholds.ts`

No tests for pure data files.

- [ ] **Step 1: Create `lessons.ts`**

Create `apps/mobile/src/data/lessons.ts`:

```typescript
export type DynamicLetters = 'dynamic:user-name';

export interface LessonDefinition {
  id: string;
  title: string;
  order: number;
  letters: string[] | DynamicLetters;
}

export const UNIT_1: LessonDefinition[] = [
  { id: 'u1l1', order: 1, title: 'Sign Your Name',             letters: 'dynamic:user-name' },
  { id: 'u1l2', order: 2, title: 'A B C D E',                  letters: ['A','B','C','D','E'] },
  { id: 'u1l3', order: 3, title: 'F G H I J',                  letters: ['F','G','H','I','J'] },
  { id: 'u1l4', order: 4, title: 'K L M N O',                  letters: ['K','L','M','N','O'] },
  { id: 'u1l5', order: 5, title: 'P Q R S T',                  letters: ['P','Q','R','S','T'] },
  { id: 'u1l6', order: 6, title: 'U V W X Y Z',                letters: ['U','V','W','X','Y','Z'] },
  { id: 'u1l7', order: 7, title: 'Spell Short Words',           letters: ['C','A','T','D','O','G'] },
  { id: 'u1l8', order: 8, title: 'Sign Your Name — Full Review', letters: 'dynamic:user-name' },
];
```

- [ ] **Step 2: Create `handShapeHints.ts`**

Create `apps/mobile/src/data/handShapeHints.ts`:

```typescript
export const HAND_SHAPE_HINTS: Record<string, string> = {
  A: 'Make a fist, thumb resting against the side of the index finger',
  B: 'Hold four fingers straight up together, thumb folded across the palm',
  C: 'Curve fingers and thumb into a C shape',
  D: 'Curve three fingers into a C, index finger points straight up touching the thumb',
  E: 'Curl all fingers down toward the palm, thumb tucked under',
  F: 'Connect index finger and thumb in a circle, other three fingers point up',
  G: 'Point index finger to the side, thumb pointing forward — like pointing sideways',
  H: 'Extend index and middle fingers together, pointing to the side',
  I: 'Hold up pinky finger only, fist closed',
  J: 'Hold up pinky, then draw a J shape in the air',
  K: 'Index finger points up, middle finger angled out, thumb between them',
  L: 'Extend index finger up and thumb out to form an L shape',
  M: 'Tuck thumb under the first three fingers (index, middle, ring)',
  N: 'Tuck thumb under the first two fingers (index and middle)',
  O: 'Curve all fingers and thumb to form an O shape',
  P: 'Like a K, but rotated downward — index finger points down, thumb out',
  Q: 'Like a G, but rotated downward — index finger and thumb point down',
  R: 'Cross middle finger over index finger',
  S: 'Make a fist with thumb resting over the fingers',
  T: 'Tuck thumb between index and middle fingers, fist closed',
  U: 'Hold index and middle fingers up together, other fingers down',
  V: 'Hold index and middle fingers up in a V shape',
  W: 'Hold index, middle, and ring fingers up spread in a W shape',
  X: 'Bend the index finger into a hook',
  Y: 'Extend thumb and pinky outward, curl remaining three fingers',
  Z: 'Point index finger and draw a Z shape in the air',
};
```

- [ ] **Step 3: Add `WORD_BREAK_MS` to thresholds**

Edit `apps/mobile/src/constants/thresholds.ts` — add at the bottom:

```typescript
/** How long (ms) with no lock-in before the current word is pushed to history. */
export const WORD_BREAK_MS = 1500;
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile && git add src/data/lessons.ts src/data/handShapeHints.ts src/constants/thresholds.ts && git commit -m "feat(mobile): add lesson definitions, hand shape hints, WORD_BREAK_MS"
```

---

## Task 3: `useLessonSession` hook

**Files:**
- Create: `apps/mobile/src/hooks/useLessonSession.ts`
- Test: `apps/mobile/src/hooks/__tests__/useLessonSession.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/hooks/__tests__/useLessonSession.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useLessonSession } from '../useLessonSession';
import type { LessonDefinition } from '../../data/lessons';

const FIXED: LessonDefinition = {
  id: 'u1l2', order: 2, title: 'A B C', letters: ['A', 'B', 'C'],
};
const DYNAMIC: LessonDefinition = {
  id: 'u1l1', order: 1, title: 'Sign Your Name', letters: 'dynamic:user-name',
};

function makeHook(lesson: LessonDefinition, userName = 'Test') {
  const onComplete = jest.fn();
  const onRecordLockIn = jest.fn();
  const hook = renderHook(() =>
    useLessonSession({ lesson, userName, onComplete, onRecordLockIn }),
  );
  return { ...hook, onComplete, onRecordLockIn };
}

describe('useLessonSession', () => {
  it('starts at intro step with the lesson letters', () => {
    const { result } = makeHook(FIXED);
    expect(result.current.currentStep.type).toBe('intro');
    expect((result.current.currentStep as any).letters).toEqual(['A', 'B', 'C']);
  });

  it('advances intro → reference(A) on advance()', () => {
    const { result } = makeHook(FIXED);
    act(() => result.current.advance());
    expect(result.current.currentStep).toEqual({
      type: 'reference', letter: 'A', hint: expect.any(String),
    });
  });

  it('advances reference(A) → signing(A, isReview=false)', () => {
    const { result } = makeHook(FIXED);
    act(() => result.current.advance()); // → reference(A)
    act(() => result.current.advance()); // → signing(A)
    expect(result.current.currentStep).toEqual({ type: 'signing', letter: 'A', isReview: false });
  });

  it('reaches review_intro after all letters', () => {
    const { result } = makeHook(FIXED);
    // intro + 3*(ref+sign) = 7 advances to reach review_intro
    for (let i = 0; i < 7; i++) act(() => result.current.advance());
    expect(result.current.currentStep.type).toBe('review_intro');
  });

  it('signing steps in review have isReview=true', () => {
    const { result } = makeHook(FIXED);
    for (let i = 0; i < 8; i++) act(() => result.current.advance()); // review_intro → signing(A, review)
    expect(result.current.currentStep).toEqual({ type: 'signing', letter: 'A', isReview: true });
  });

  it('calls onComplete when advancing to complete step', () => {
    const { result, onComplete } = makeHook(FIXED);
    const { totalSteps } = result.current;
    for (let i = 0; i < totalSteps - 1; i++) act(() => result.current.advance());
    expect(result.current.currentStep.type).toBe('complete');
    expect(onComplete).toHaveBeenCalledWith('u1l2');
  });

  it('calls onRecordLockIn when advancing from a signing step', () => {
    const { result, onRecordLockIn } = makeHook(FIXED);
    act(() => result.current.advance()); // → reference(A)
    act(() => result.current.advance()); // → signing(A)
    act(() => result.current.advance()); // → reference(B) — records A
    expect(onRecordLockIn).toHaveBeenCalledWith('A');
    expect(onRecordLockIn).toHaveBeenCalledTimes(1);
  });

  it('resolves dynamic:user-name to unique uppercase letters in order', () => {
    const { result } = makeHook(DYNAMIC, 'Anna');
    expect((result.current.currentStep as any).letters).toEqual(['A', 'N']);
  });

  it('falls back to [A,B,C] when name has no valid letters', () => {
    const { result } = makeHook(DYNAMIC, '123');
    expect((result.current.currentStep as any).letters).toEqual(['A', 'B', 'C']);
  });

  it('progress is 0 at start and 1 at complete', () => {
    const { result } = makeHook(FIXED);
    expect(result.current.progress).toBe(0);
    const { totalSteps } = result.current;
    for (let i = 0; i < totalSteps - 1; i++) act(() => result.current.advance());
    expect(result.current.progress).toBe(1);
  });

  it('totalSteps = 1 + 2n + 1 + n + 1 for n letters', () => {
    // n=3: 1 intro + 6 (ref+sign) + 1 review_intro + 3 review_sign + 1 complete = 12
    const { result } = makeHook(FIXED);
    expect(result.current.totalSteps).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useLessonSession"
```

Expected: FAIL — `Cannot find module '../useLessonSession'`

- [ ] **Step 3: Implement the hook**

Create `apps/mobile/src/hooks/useLessonSession.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import type { LessonDefinition } from '../data/lessons';
import { HAND_SHAPE_HINTS } from '../data/handShapeHints';

export type LessonStep =
  | { type: 'intro'; letters: string[] }
  | { type: 'reference'; letter: string; hint: string }
  | { type: 'signing'; letter: string; isReview: boolean }
  | { type: 'review_intro'; letters: string[] }
  | { type: 'complete' };

interface UseLessonSessionOptions {
  lesson: LessonDefinition;
  userName: string;
  onComplete: (lessonId: string) => void;
  onRecordLockIn: (letter: string) => void;
}

interface UseLessonSessionReturn {
  currentStep: LessonStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  advance: () => void;
}

function resolveLetters(letters: LessonDefinition['letters'], userName: string): string[] {
  if (Array.isArray(letters)) return letters;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const char of userName.toUpperCase()) {
    if (/[A-Z]/.test(char) && !seen.has(char)) {
      seen.add(char);
      result.push(char);
    }
  }
  return result.length > 0 ? result : ['A', 'B', 'C'];
}

function buildSteps(letters: string[]): LessonStep[] {
  const steps: LessonStep[] = [{ type: 'intro', letters }];
  for (const letter of letters) {
    steps.push({ type: 'reference', letter, hint: HAND_SHAPE_HINTS[letter] ?? '' });
    steps.push({ type: 'signing', letter, isReview: false });
  }
  steps.push({ type: 'review_intro', letters });
  for (const letter of letters) {
    steps.push({ type: 'signing', letter, isReview: true });
  }
  steps.push({ type: 'complete' });
  return steps;
}

export function useLessonSession({
  lesson,
  userName,
  onComplete,
  onRecordLockIn,
}: UseLessonSessionOptions): UseLessonSessionReturn {
  const [steps] = useState(() => buildSteps(resolveLetters(lesson.letters, userName)));
  const [stepIndex, setStepIndex] = useState(0);
  const stepIndexRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onRecordLockInRef = useRef(onRecordLockIn);
  onRecordLockInRef.current = onRecordLockIn;

  const advance = useCallback(() => {
    const current = steps[stepIndexRef.current];
    if (current?.type === 'signing') {
      onRecordLockInRef.current(current.letter);
    }
    const next = stepIndexRef.current + 1;
    if (next >= steps.length) return;
    const nextStep = steps[next]!;
    if (nextStep.type === 'complete') {
      onCompleteRef.current(lesson.id);
    }
    stepIndexRef.current = next;
    setStepIndex(next);
  }, [steps, lesson.id]);

  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 1;

  return {
    currentStep: steps[stepIndex] ?? { type: 'complete' },
    stepIndex,
    totalSteps,
    progress,
    advance,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useLessonSession"
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/mobile && git add src/hooks/useLessonSession.ts src/hooks/__tests__/useLessonSession.test.ts && git commit -m "feat(mobile): add useLessonSession state machine hook"
```

---

## Task 4: `useWordBuilder` hook

**Files:**
- Create: `apps/mobile/src/hooks/useWordBuilder.ts`
- Test: `apps/mobile/src/hooks/__tests__/useWordBuilder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/hooks/__tests__/useWordBuilder.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useWordBuilder } from '../useWordBuilder';

describe('useWordBuilder', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appends letters to currentWord on lock-in', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    act(() => result.current.onLockIn('A'));
    act(() => result.current.onLockIn('S'));
    act(() => result.current.onLockIn('L'));
    expect(result.current.currentWord).toBe('ASL');
  });

  it('pushes word to history and clears currentWord after WORD_BREAK_MS', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    act(() => result.current.onLockIn('H'));
    act(() => result.current.onLockIn('I'));
    act(() => jest.advanceTimersByTime(1500));
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['HI']);
  });

  it('resets idle timer on each new lock-in', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    act(() => result.current.onLockIn('H'));
    act(() => jest.advanceTimersByTime(1000)); // not yet
    act(() => result.current.onLockIn('I')); // resets timer
    act(() => jest.advanceTimersByTime(1000)); // not yet (only 1s since last lock-in)
    expect(result.current.currentWord).toBe('HI');
    act(() => jest.advanceTimersByTime(500)); // now 1.5s since last lock-in
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['HI']);
  });

  it('caps history at 5 words', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    for (let i = 0; i < 6; i++) {
      act(() => result.current.onLockIn(String.fromCharCode(65 + i)));
      act(() => jest.advanceTimersByTime(1500));
    }
    expect(result.current.history).toHaveLength(5);
  });

  it('does not push empty word to history', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    act(() => jest.advanceTimersByTime(1500));
    expect(result.current.history).toHaveLength(0);
  });

  it('clearCurrentWord clears word without affecting history', () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    act(() => result.current.onLockIn('H'));
    act(() => jest.advanceTimersByTime(1500)); // push H to history
    act(() => result.current.onLockIn('X'));
    act(() => result.current.clearCurrentWord());
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['H']);
  });

  it('calls onRecordLockIn with each letter', () => {
    const onRecordLockIn = jest.fn();
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn }));
    act(() => result.current.onLockIn('A'));
    act(() => result.current.onLockIn('B'));
    expect(onRecordLockIn).toHaveBeenCalledTimes(2);
    expect(onRecordLockIn).toHaveBeenNthCalledWith(1, 'A');
    expect(onRecordLockIn).toHaveBeenNthCalledWith(2, 'B');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useWordBuilder"
```

Expected: FAIL — `Cannot find module '../useWordBuilder'`

- [ ] **Step 3: Implement the hook**

Create `apps/mobile/src/hooks/useWordBuilder.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { WORD_BREAK_MS } from '../constants/thresholds';

interface UseWordBuilderOptions {
  onRecordLockIn: (letter: string) => void;
}

interface UseWordBuilderReturn {
  currentWord: string;
  history: string[];
  onLockIn: (letter: string) => void;
  clearCurrentWord: () => void;
}

export function useWordBuilder({ onRecordLockIn }: UseWordBuilderOptions): UseWordBuilderReturn {
  const [currentWord, setCurrentWord] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const currentWordRef = useRef('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRecordLockInRef = useRef(onRecordLockIn);
  onRecordLockInRef.current = onRecordLockIn;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const pushWord = useCallback(() => {
    const word = currentWordRef.current;
    if (word.length === 0) return;
    setHistory((prev) => [word, ...prev].slice(0, 5));
    currentWordRef.current = '';
    setCurrentWord('');
  }, []);

  const onLockIn = useCallback(
    (letter: string) => {
      onRecordLockInRef.current(letter);
      const next = currentWordRef.current + letter;
      currentWordRef.current = next;
      setCurrentWord(next);
      clearIdleTimer();
      idleTimerRef.current = setTimeout(pushWord, WORD_BREAK_MS);
    },
    [clearIdleTimer, pushWord],
  );

  const clearCurrentWord = useCallback(() => {
    clearIdleTimer();
    currentWordRef.current = '';
    setCurrentWord('');
  }, [clearIdleTimer]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  return { currentWord, history, onLockIn, clearCurrentWord };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="useWordBuilder"
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/mobile && git add src/hooks/useWordBuilder.ts src/hooks/__tests__/useWordBuilder.test.ts && git commit -m "feat(mobile): add useWordBuilder hook for translate mode"
```

---

## Task 5: `ReferenceCard` component

**Files:**
- Create: `apps/mobile/src/components/ReferenceCard.tsx`
- Test: `apps/mobile/src/components/__tests__/ReferenceCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/components/__tests__/ReferenceCard.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ReferenceCard } from '../ReferenceCard';

describe('ReferenceCard', () => {
  it('renders the letter and hint text', () => {
    const { getByText } = render(
      <ReferenceCard letter="A" hint="Make a fist" onContinue={jest.fn()} />,
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('Make a fist')).toBeTruthy();
  });

  it('shows placeholder when no imageUri', () => {
    const { getByTestId } = render(
      <ReferenceCard letter="A" hint="Make a fist" onContinue={jest.fn()} />,
    );
    expect(getByTestId('image-placeholder')).toBeTruthy();
  });

  it('shows Image and hides placeholder when imageUri is provided', () => {
    const { queryByTestId, getByTestId } = render(
      <ReferenceCard letter="A" hint="Make a fist" imageUri="file://a.jpg" onContinue={jest.fn()} />,
    );
    expect(queryByTestId('image-placeholder')).toBeNull();
    expect(getByTestId('letter-image')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="ReferenceCard"
```

Expected: FAIL — `Cannot find module '../ReferenceCard'`

- [ ] **Step 3: Implement the component**

Create `apps/mobile/src/components/ReferenceCard.tsx`:

```typescript
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ReferenceCardProps {
  letter: string;
  hint: string;
  imageUri?: string;
  onContinue: () => void;
}

export function ReferenceCard({ letter, hint, imageUri, onContinue }: ReferenceCardProps) {
  return (
    <Pressable style={styles.overlay} onPress={onContinue}>
      <View style={styles.card}>
        <Text style={styles.letter}>{letter}</Text>

        <View style={styles.imageArea}>
          {imageUri ? (
            <Image
              testID="letter-image"
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View testID="image-placeholder" style={styles.placeholder}>
              <Text style={styles.placeholderText}>✋</Text>
              <Text style={styles.placeholderLabel}>Image coming soon</Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>{hint}</Text>
        <Text style={styles.tapHint}>Tap to continue</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  letter: {
    color: '#fff',
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 88,
  },
  imageArea: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 48,
  },
  placeholderLabel: {
    color: '#666',
    fontSize: 13,
  },
  hint: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapHint: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/mobile && pnpm test:ci -- --testPathPattern="ReferenceCard"
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/mobile && git add src/components/ReferenceCard.tsx src/components/__tests__/ReferenceCard.test.tsx && git commit -m "feat(mobile): add ReferenceCard component with image placeholder"
```

---

## Task 6: Lesson step sub-components

**Files:**
- Create: `apps/mobile/src/components/LessonStepIntro.tsx`
- Create: `apps/mobile/src/components/LessonStepReviewIntro.tsx`
- Create: `apps/mobile/src/components/LessonStepComplete.tsx`

No tests — these are trivial presentational components with no logic.

- [ ] **Step 1: Create `LessonStepIntro`**

Create `apps/mobile/src/components/LessonStepIntro.tsx`:

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface LessonStepIntroProps {
  letters: string[];
  onStart: () => void;
}

export function LessonStepIntro({ letters, onStart }: LessonStepIntroProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.heading}>In this lesson</Text>
        <Text style={styles.subheading}>You'll practice these letters:</Text>
        <View style={styles.letterRow}>
          {letters.map((l) => (
            <View key={l} style={styles.letterBadge}>
              <Text style={styles.letterText}>{l}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onStart}
        >
          <Text style={styles.buttonText}>Let's go</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  subheading: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  letterBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Create `LessonStepReviewIntro`**

Create `apps/mobile/src/components/LessonStepReviewIntro.tsx`:

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface LessonStepReviewIntroProps {
  letters: string[];
  onContinue: () => void;
}

export function LessonStepReviewIntro({ letters, onContinue }: LessonStepReviewIntroProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.heading}>Time to review!</Text>
        <Text style={styles.subheading}>Sign each letter one more time:</Text>
        <View style={styles.letterRow}>
          {letters.map((l) => (
            <View key={l} style={styles.letterBadge}>
              <Text style={styles.letterText}>{l}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  subheading: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  letterBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Create `LessonStepComplete`**

Create `apps/mobile/src/components/LessonStepComplete.tsx`:

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LessonStepCompleteProps {
  lessonTitle: string;
  onDone: () => void;
}

export function LessonStepComplete({ lessonTitle, onDone }: LessonStepCompleteProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.heading}>Lesson complete!</Text>
        <Text style={styles.title}>{lessonTitle}</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onDone}
        >
          <Text style={styles.buttonText}>Back to Lessons</Text>
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
    gap: 16,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
  },
  heading: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  title: {
    color: '#aaa',
    fontSize: 17,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile && git add src/components/LessonStepIntro.tsx src/components/LessonStepReviewIntro.tsx src/components/LessonStepComplete.tsx && git commit -m "feat(mobile): add lesson step sub-components (intro, review intro, complete)"
```

---

## Task 7: Onboarding screen

**Files:**
- Create: `apps/mobile/app/onboarding.tsx`

- [ ] **Step 1: Create the onboarding screen**

Create `apps/mobile/app/onboarding.tsx`:

```typescript
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const hasValidName = /[A-Za-z]/.test(name);

  function handleStart() {
    if (!hasValidName) return;
    completeOnboarding(name.trim());
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to ASL Vision</Text>
          <Text style={styles.subtitle}>
            Learn American Sign Language one letter at a time. Start by signing your own name.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's your name?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#555"
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !hasValidName && styles.buttonDisabled,
              pressed && hasValidName && styles.buttonPressed,
            ]}
            onPress={handleStart}
            disabled={!hasValidName}
          >
            <Text style={styles.buttonText}>Let's go</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: '#ccc',
    fontSize: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontSize: 18,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 32,
  },
  buttonDisabled: { backgroundColor: '#2a4a6a', opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile && git add app/onboarding.tsx && git commit -m "feat(mobile): add onboarding screen with name entry"
```

---

## Task 8: Root layout — new screens + onboarding gate

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Update `_layout.tsx`**

Replace the entire contents of `apps/mobile/app/_layout.tsx` with:

```typescript
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: 1 } },
});

function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const _hasHydrated = useAppStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!hasOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [_hasHydrated, hasOnboarded, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <OnboardingGate />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="signing"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="learn/index"
            options={{ title: 'Lessons', headerTintColor: '#fff', headerStyle: { backgroundColor: '#111' } }}
          />
          <Stack.Screen name="learn/[lessonId]" options={{ headerShown: false }} />
          <Stack.Screen name="translate" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile && git add app/_layout.tsx && git commit -m "feat(mobile): add onboarding gate and new screen routes to root layout"
```

---

## Task 9: Lesson grid screen

**Files:**
- Create: `apps/mobile/app/learn/index.tsx`

- [ ] **Step 1: Create the lesson grid**

Create `apps/mobile/app/learn/index.tsx`:

```typescript
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { UNIT_1 } from '../../src/data/lessons';

export default function LearnIndexScreen() {
  const router = useRouter();
  const { completedLessons, isLessonUnlocked } = useAppStore();
  const completedCount = Object.keys(completedLessons).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.unit}>Unit 1 — The Alphabet</Text>
          <Text style={styles.progress}>{completedCount} of {UNIT_1.length} lessons complete</Text>
        </View>

        {UNIT_1.map((lesson) => {
          const unlocked = isLessonUnlocked(lesson.id);
          const done = lesson.id in completedLessons;

          return (
            <Pressable
              key={lesson.id}
              style={({ pressed }) => [
                styles.card,
                !unlocked && styles.cardLocked,
                pressed && unlocked && styles.cardPressed,
              ]}
              onPress={() => unlocked && router.push(`/learn/${lesson.id}`)}
              disabled={!unlocked}
            >
              <View style={styles.cardLeft}>
                <Text style={[styles.cardTitle, !unlocked && styles.textMuted]}>
                  {lesson.title}
                </Text>
                {Array.isArray(lesson.letters) && (
                  <Text style={[styles.cardLetters, !unlocked && styles.textMuted]}>
                    {lesson.letters.join(' · ')}
                  </Text>
                )}
              </View>
              <Text style={styles.cardIcon}>
                {done ? '✓' : unlocked ? '›' : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { padding: 20, gap: 12 },
  header: { marginBottom: 8, gap: 4 },
  unit: { color: '#fff', fontSize: 20, fontWeight: '700' },
  progress: { color: '#888', fontSize: 14 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLocked: { opacity: 0.45 },
  cardPressed: { opacity: 0.75 },
  cardLeft: { flex: 1, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardLetters: { color: '#888', fontSize: 13 },
  textMuted: { color: '#666' },
  cardIcon: { color: '#4A90E2', fontSize: 20, fontWeight: '700', marginLeft: 12 },
});
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile && git add app/learn/index.tsx && git commit -m "feat(mobile): add lesson grid screen for Unit 1"
```

---

## Task 10: Lesson screen

**Files:**
- Create: `apps/mobile/app/learn/[lessonId].tsx`

- [ ] **Step 1: Create the lesson screen**

Create `apps/mobile/app/learn/[lessonId].tsx`:

```typescript
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { ConfidenceRing } from '../../src/components/ConfidenceRing';
import { LessonStepComplete } from '../../src/components/LessonStepComplete';
import { LessonStepIntro } from '../../src/components/LessonStepIntro';
import { LessonStepReviewIntro } from '../../src/components/LessonStepReviewIntro';
import { ReferenceCard } from '../../src/components/ReferenceCard';
import { UNIT_1 } from '../../src/data/lessons';
import { useLockIn } from '../../src/hooks/useLockIn';
import { useLessonSession } from '../../src/hooks/useLessonSession';
import { usePrediction } from '../../src/hooks/usePrediction';
import { useAppStore } from '../../src/store/useAppStore';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { userName, completeLesson, recordLockIn } = useAppStore();

  const lesson = UNIT_1.find((l) => l.id === lessonId);

  const { currentStep, progress, advance } = useLessonSession({
    lesson: lesson!,
    userName: userName ?? '',
    onComplete: completeLesson,
    onRecordLockIn: recordLockIn,
  });

  const { prediction, onLandmarks } = usePrediction();

  const isSigningStep = currentStep.type === 'signing';
  const signingLetter =
    currentStep.type === 'signing' ? currentStep.letter : '__NONE__';

  const handleLock = useCallback(
    (letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      advance();
    },
    [advance],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: signingLetter,
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction && isSigningStep) {
      onNewPrediction(prediction);
    }
  }, [prediction, isSigningStep, onNewPrediction]);

  if (!lesson) return null;

  if (currentStep.type === 'complete') {
    return (
      <LessonStepComplete
        lessonTitle={lesson.title}
        onDone={() => router.back()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera always mounted */}
      <HandLandmarkerView
        style={StyleSheet.absoluteFillObject}
        activeCamera="front"
        numHands={1}
        runningMode="LIVE_STREAM"
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        model={require('../../assets/hand_landmarker.task')}
        onHandLandmarkerResults={onLandmarks}
      />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Step overlays — only shown for non-signing steps */}
      {currentStep.type === 'intro' && (
        <LessonStepIntro letters={currentStep.letters} onStart={advance} />
      )}
      {currentStep.type === 'reference' && (
        <ReferenceCard
          letter={currentStep.letter}
          hint={currentStep.hint}
          onContinue={advance}
        />
      )}
      {currentStep.type === 'review_intro' && (
        <LessonStepReviewIntro letters={currentStep.letters} onContinue={advance} />
      )}

      {/* Signing overlays — target letter + confidence ring */}
      {isSigningStep && (
        <>
          <View style={styles.targetLetterContainer}>
            <Text style={styles.targetLetter}>{signingLetter}</Text>
          </View>
          <View style={styles.ringContainer}>
            <ConfidenceRing progress={ringProgress} phase={phase} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  targetLetterContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetLetter: {
    color: '#fff',
    fontSize: 80,
    fontWeight: '700',
  },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile && git add app/learn/[lessonId].tsx && git commit -m "feat(mobile): add lesson screen with camera + step overlays"
```

---

## Task 11: Translate screen

**Files:**
- Create: `apps/mobile/app/translate.tsx`

- [ ] **Step 1: Create the translate screen**

Create `apps/mobile/app/translate.tsx`:

```typescript
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { ConfidenceRing } from '../src/components/ConfidenceRing';
import { useLockIn } from '../src/hooks/useLockIn';
import { usePrediction } from '../src/hooks/usePrediction';
import { useWordBuilder } from '../src/hooks/useWordBuilder';
import { useAppStore } from '../src/store/useAppStore';

export default function TranslateScreen() {
  const navigation = useNavigation();
  const recordLockIn = useAppStore((s) => s.recordLockIn);

  const { prediction, onLandmarks } = usePrediction();
  const { currentWord, history, onLockIn, clearCurrentWord } = useWordBuilder({
    onRecordLockIn: recordLockIn,
  });

  const handleLock = useCallback(
    (letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      onLockIn(letter);
    },
    [onLockIn],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: null, // accept any letter
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction) onNewPrediction(prediction);
  }, [prediction, onNewPrediction]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <HandLandmarkerView
        style={StyleSheet.absoluteFillObject}
        activeCamera="front"
        numHands={1}
        runningMode="LIVE_STREAM"
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        model={require('../assets/hand_landmarker.task')}
        onHandLandmarkerResults={onLandmarks}
      />

      {/* Word history — newest closest to center */}
      <View style={styles.historyContainer}>
        {[...history].reverse().map((word, i) => (
          <Text key={`${word}-${i}`} style={[styles.historyWord, { opacity: 0.3 + i * 0.12 }]}>
            {word}
          </Text>
        ))}
      </View>

      {/* Live predicted letter (dim until locked) */}
      {prediction?.letter && (
        <View style={styles.liveLetter}>
          <Text style={[styles.liveLetterText, phase === 'locked' && styles.liveLetterLocked]}>
            {prediction.letter}
          </Text>
        </View>
      )}

      {/* Current word */}
      <View style={styles.currentWordContainer}>
        <Text style={styles.currentWord}>
          {currentWord.length > 0 ? currentWord : ' '}
        </Text>
      </View>

      {/* Clear button */}
      <Pressable
        style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
        onPress={clearCurrentWord}
      >
        <Text style={styles.clearText}>clear</Text>
      </Pressable>

      {/* Confidence ring */}
      <View style={styles.ringContainer}>
        <ConfidenceRing progress={ringProgress} phase={phase} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  historyContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  historyWord: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  liveLetter: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  liveLetterText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 36,
    fontWeight: '600',
  },
  liveLetterLocked: {
    color: '#00C851',
  },
  currentWordContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  currentWord: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  clearButton: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  clearButtonPressed: { opacity: 0.6 },
  clearText: { color: '#aaa', fontSize: 14 },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile && git add app/translate.tsx && git commit -m "feat(mobile): add translate screen with word builder and history"
```

---

## Task 12: Home dashboard enhancement

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace home screen**

Replace the entire contents of `apps/mobile/app/(tabs)/index.tsx` with:

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { UNIT_1 } from '../../src/data/lessons';

export default function HomeScreen() {
  const router = useRouter();
  const { userName, completedLessons } = useAppStore();
  const completedCount = Object.keys(completedLessons).length;
  const totalLessons = UNIT_1.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.greeting}>
          <Text style={styles.title}>ASL Vision</Text>
          {userName ? (
            <Text style={styles.subtitle}>Hey {userName}!</Text>
          ) : (
            <Text style={styles.subtitle}>Learn sign language one letter at a time</Text>
          )}
        </View>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardLearn, pressed && styles.cardPressed]}
            onPress={() => router.push('/learn')}
          >
            <Text style={styles.cardEmoji}>📚</Text>
            <Text style={styles.cardTitle}>Learn</Text>
            <Text style={styles.cardSub}>
              {completedCount} / {totalLessons} lessons
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, styles.cardTranslate, pressed && styles.cardPressed]}
            onPress={() => router.push('/translate')}
          >
            <Text style={styles.cardEmoji}>✋</Text>
            <Text style={styles.cardTitle}>Translate</Text>
            <Text style={styles.cardSub}>Free practice</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },
  greeting: { gap: 6 },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    gap: 8,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  cardLearn: { backgroundColor: '#1a2a3a' },
  cardTranslate: { backgroundColor: '#1a2a1a' },
  cardPressed: { opacity: 0.8 },
  cardEmoji: { fontSize: 32 },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSub: {
    color: '#888',
    fontSize: 13,
  },
});
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/mobile && pnpm test:ci
```

Expected: all tests PASS (previous 17 + new 28 = 45 total).

- [ ] **Step 3: Commit**

```bash
cd apps/mobile && git add app/(tabs)/index.tsx && git commit -m "feat(mobile): update home dashboard with Learn and Translate cards"
```

---

## Final verification

- [ ] **Run full test suite one more time**

```bash
cd apps/mobile && pnpm test:ci
```

Expected: all tests PASS, no failures.

- [ ] **Typecheck**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: no TypeScript errors.
