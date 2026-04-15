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
