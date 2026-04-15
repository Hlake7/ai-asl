import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../useAppStore';

const RESET = {
  userName: null,
  hasOnboarded: false,
  _hasHydrated: false,
  completedLessons: {},
  letterProgress: {},
};

beforeEach(() => useAppStore.setState(RESET));

describe('completeOnboarding', () => {
  it('sets userName and hasOnboarded', async () => {
    const { result } = renderHook(() => useAppStore());
    await act(async () => result.current.completeOnboarding('Alex'));
    expect(result.current.userName).toBe('Alex');
    expect(result.current.hasOnboarded).toBe(true);
  });
});

describe('completeLesson', () => {
  it('records completion with a timestamp', async () => {
    const { result } = renderHook(() => useAppStore());
    const before = Date.now();
    await act(async () => result.current.completeLesson('u1l1'));
    expect(result.current.completedLessons['u1l1']?.completedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('isLessonUnlocked', () => {
  it('lesson 1 is always unlocked', () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.isLessonUnlocked('u1l1')).toBe(true);
  });

  it('lesson 2 is locked until lesson 1 is complete', async () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.isLessonUnlocked('u1l2')).toBe(false);
    await act(async () => result.current.completeLesson('u1l1'));
    expect(result.current.isLessonUnlocked('u1l2')).toBe(true);
  });

  it('lesson 5 unlocks after lesson 4 completes', async () => {
    const { result } = renderHook(() => useAppStore());
    await act(async () => result.current.completeLesson('u1l4'));
    expect(result.current.isLessonUnlocked('u1l5')).toBe(true);
  });
});

describe('recordLockIn', () => {
  it('increments locks and attempts, sets lastPracticed', async () => {
    const { result } = renderHook(() => useAppStore());
    const before = Date.now();
    await act(async () => result.current.recordLockIn('A'));
    await act(async () => result.current.recordLockIn('A'));
    const p = result.current.letterProgress['A']!;
    expect(p.locks).toBe(2);
    expect(p.attempts).toBe(2);
    expect(p.lastPracticed).toBeGreaterThanOrEqual(before);
  });

  it('tracks different letters independently', async () => {
    const { result } = renderHook(() => useAppStore());
    await act(async () => result.current.recordLockIn('A'));
    await act(async () => result.current.recordLockIn('B'));
    expect(result.current.letterProgress['A']!.locks).toBe(1);
    expect(result.current.letterProgress['B']!.locks).toBe(1);
  });
});
