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
