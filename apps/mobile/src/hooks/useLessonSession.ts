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
