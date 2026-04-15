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
    mutationFn: (payload: Parameters<typeof predictSign>[0]) => predictSign(payload),
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
