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
