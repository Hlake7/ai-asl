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
