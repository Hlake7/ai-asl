# ASL Vision — Lessons & Translate Mode Design Spec
**Date:** 2026-04-15
**Status:** Approved

---

## What We're Building

Plan 3 adds the two core learning modes to the app:

- **Learn** — structured Unit 1 lessons (8 total), starting with a personalized "Sign Your Name" lesson driven by the user's name collected at onboarding
- **Translate** — free practice mode where locked-in letters build words live on screen, with a simple word history

The home screen becomes a dashboard: entry points to both modes plus a lesson completion summary.

---

## Navigation & Screen Structure

```
app/
  onboarding.tsx              ← name entry, shown once on first launch
  learn/
    index.tsx                 ← Unit 1 grid (8 lessons, sequential unlock)
    [lessonId].tsx            ← single lesson screen (state machine)
  translate.tsx               ← free practice + word history
  (tabs)/
    index.tsx                 ← Home/Dashboard (enhanced)
    _layout.tsx               ← unchanged (single tab)
```

The root `_layout.tsx` checks `hasOnboarded` from the store on startup. If false, it redirects to `/onboarding` before showing the tab bar. After onboarding completes, it navigates to the tab bar home.

The home screen shows:
- **Learn** card → `/learn`
- **Translate** card → `/translate`
- Progress summary: "X of 8 lessons complete"

No new tabs are added. The bottom tab bar stays as a single Home tab.

---

## Onboarding

A single screen shown once on first launch:

1. Short welcome message explaining the app
2. Text input: "What's your name?"
3. "Let's go" button — saves `userName` and sets `hasOnboarded: true` in the store, then navigates to home

Name is stored as entered (preserving case). Used to derive Lesson 1 letters: uppercase the name, split to unique characters in order of first appearance, filter to A–Z only.

Example: "Anna" → `['A', 'N']`, "Alex" → `['A', 'L', 'E', 'X']`

---

## Lesson Data

All lesson definitions live in `apps/mobile/src/data/lessons.ts`:

```typescript
interface LessonDefinition {
  id: string;
  title: string;
  order: number;
  letters: string[] | 'dynamic:user-name';
}
```

Unit 1 definitions:

| ID    | Title                      | Letters                         |
|-------|----------------------------|---------------------------------|
| u1l1  | Sign Your Name             | dynamic:user-name               |
| u1l2  | A B C D E                  | A, B, C, D, E                   |
| u1l3  | F G H I J                  | F, G, H, I, J                   |
| u1l4  | K L M N O                  | K, L, M, N, O                   |
| u1l5  | P Q R S T                  | P, Q, R, S, T                   |
| u1l6  | U V W X Y Z                | U, V, W, X, Y, Z                |
| u1l7  | Spell Short Words          | C, A, T, D, O, G (practice these letters; same flow as other lessons — word-spelling UX is a future enhancement) |
| u1l8  | Sign Your Name (Full Review) | dynamic:user-name             |

Lessons unlock sequentially — lesson N+1 is locked until lesson N is completed. Lesson 1 is always unlocked.

Hand shape hint texts live in `apps/mobile/src/data/handShapeHints.ts` — one string per letter A–Z describing the hand position in plain language. The reference card component accepts an optional `imageUri` prop; when absent it renders a styled placeholder box (ready to accept a real image with no layout changes).

---

## Lesson State Machine (`useLessonSession`)

Takes a `LessonDefinition` and `userName: string`. Resolves `dynamic:user-name` to unique uppercase letters from the name. Expands the letters into a flat step sequence:

```
intro → reference(L1) → signing(L1) → reference(L2) → signing(L2) → ... → review_intro → signing(L1) → signing(L2) → ... → complete
```

Step types:
- `intro` — shows letter list for this lesson; advances on tap
- `reference` — shows letter + hint text + image placeholder; advances on tap
- `signing` — live camera + confidence ring; advances on lock-in
- `review_intro` — brief "Now let's review" card; advances on tap
- `complete` — marks lesson done in store, returns to lesson grid

Hook interface:
```typescript
interface UseLessonSessionReturn {
  currentStep: LessonStep;
  stepIndex: number;
  totalSteps: number;
  advance: () => void;         // tap handler for info steps
  onLockIn: (letter: string) => void;  // called by signing sub-screen on lock-in
  progress: number;            // 0–1 for progress bar
}
```

`LessonScreen` (`app/learn/[lessonId].tsx`) renders the appropriate sub-component for `currentStep.type`. No back navigation mid-lesson.

---

## Progress & Persistence

Single Zustand store (`useAppStore`) persisted via `zustand/middleware` → AsyncStorage.

```typescript
interface AppStore {
  // Onboarding
  userName: string | null;
  hasOnboarded: boolean;
  setUserName: (name: string) => void;
  completeOnboarding: () => void;

  // Lesson completion
  completedLessons: Record<string, { completedAt: number }>;
  completeLesson: (lessonId: string) => void;
  isLessonUnlocked: (lessonId: string) => boolean;

  // Letter progress (updated on every lock-in)
  letterProgress: Record<string, LetterProgress>;
  recordLockIn: (letter: string) => void;
}
```

`isLessonUnlocked` checks whether the lesson with `order - 1` is in `completedLessons` (lesson 1 always returns true).

`recordLockIn` increments `locks` and `attempts` on the matching `LetterProgress` entry, and sets `lastPracticed` to `Date.now()`.

No streaks in this plan.

---

## Translate Mode (`useWordBuilder`)

Reuses `usePrediction` + `useLockIn` from the existing signing infrastructure. A new `useWordBuilder` hook manages word accumulation:

```typescript
interface WordBuilderState {
  currentWord: string;
  history: string[];   // last 5 completed words, newest first
}

interface UseWordBuilderReturn extends WordBuilderState {
  onLockIn: (letter: string) => void;  // called when useLockIn fires
  clearCurrentWord: () => void;
}
```

**Lock-in** → append letter to `currentWord`, reset the idle timer.  
**1.5s idle** (no confident sign after last lock-in) → push `currentWord` to `history` (cap at 5), clear `currentWord`. Empty words are not pushed.  
**`clearCurrentWord`** → clears `currentWord` only; history is unaffected.

The idle timer is a `useRef`-held `setTimeout`, reset on every lock-in and cancelled on unmount.

Translate screen layout:
- Full-screen camera feed (background)
- History words at top: last 5 words, small and faded, newest closest to center
- Current word large in the center
- Live predicted letter shown above the current word (dim until locked in)
- Small "clear" button bottom-left corner

Letter progress is recorded on every lock-in (same `recordLockIn` action as Learn mode).

---

## Reference Card — Image Extensibility

`ReferenceCard` component props:

```typescript
interface ReferenceCardProps {
  letter: string;
  hint: string;
  imageUri?: string;   // optional — placeholder shown when absent
}
```

The placeholder is a rounded rectangle with a hand icon and "Image coming soon" label, matching the card's dimensions exactly. When `imageUri` is provided, an `<Image>` replaces the placeholder with no other layout changes. Adding images in the future requires only populating `imageUri` in the data layer.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Backend unreachable during lesson | Signing step pauses, toast "Can't reach server", retry automatically when reachable |
| No hand detected > 3s | Subtle hint text below ring: "Show your hand to the camera" |
| Stuck on letter > 10s | Reference hint for the current letter shown as an overlay |
| Empty name at onboarding | "Let's go" button disabled until at least 1 alphabetic character entered |
| Name with no valid letters (e.g. "123") | Falls back to letters A, B, C for Lesson 1 |

---

## Testing

- `useLessonSession` — unit tests: step sequence expansion for fixed letters, dynamic name resolution, advance/lock-in progression, completion fires store action
- `useWordBuilder` — unit tests: letter append, idle timer triggers word break, history capping at 5, clear action
- `useAppStore` — unit tests: `isLessonUnlocked` logic, `recordLockIn` updates, `completeLesson` persists
- `ReferenceCard` — renders placeholder when no `imageUri`; renders image when provided
- Lesson grid — locked lessons show locked state; completing lesson N unlocks N+1

---

## Out of Scope (this plan)

- Streaks
- Per-letter accuracy analytics / weak letter suggestions
- Hand shape reference images (placeholder only)
- Word/phrase-level signs
- Cloud sync or user accounts
