/**
 * Type augmentation for react-native-mediapipe.
 * The published v0.2.0 package only exports MediapipeCamera; the HandLandmarkerView
 * API below reflects the version used at runtime (and the project mock).
 */
import type React from 'react';
import type { ViewStyle } from 'react-native';

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

export interface HandLandmarkerViewProps {
  style?: ViewStyle;
  activeCamera?: 'front' | 'back';
  numHands?: number;
  runningMode?: 'IMAGE' | 'VIDEO' | 'LIVE_STREAM';
  model: unknown;
  onHandLandmarkerResults?: (result: HandLandmarkerResult) => void;
}

declare module 'react-native-mediapipe' {
  export const HandLandmarkerView: React.ForwardRefExoticComponent<HandLandmarkerViewProps>;
}
