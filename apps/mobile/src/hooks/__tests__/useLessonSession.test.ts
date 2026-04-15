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

  it('advances intro → reference(A) on advance()', async () => {
    const { result } = makeHook(FIXED);
    await act(async () => result.current.advance());
    expect(result.current.currentStep).toEqual({
      type: 'reference', letter: 'A', hint: expect.any(String),
    });
  });

  it('advances reference(A) → signing(A, isReview=false)', async () => {
    const { result } = makeHook(FIXED);
    await act(async () => result.current.advance()); // → reference(A)
    await act(async () => result.current.advance()); // → signing(A)
    expect(result.current.currentStep).toEqual({ type: 'signing', letter: 'A', isReview: false });
  });

  it('reaches review_intro after all letters', async () => {
    const { result } = makeHook(FIXED);
    // intro + 3*(ref+sign) = 7 advances to reach review_intro
    for (let i = 0; i < 7; i++) await act(async () => result.current.advance());
    expect(result.current.currentStep.type).toBe('review_intro');
  });

  it('signing steps in review have isReview=true', async () => {
    const { result } = makeHook(FIXED);
    for (let i = 0; i < 8; i++) await act(async () => result.current.advance()); // review_intro → signing(A, review)
    expect(result.current.currentStep).toEqual({ type: 'signing', letter: 'A', isReview: true });
  });

  it('calls onComplete when advancing to complete step', async () => {
    const { result, onComplete } = makeHook(FIXED);
    const { totalSteps } = result.current;
    for (let i = 0; i < totalSteps - 1; i++) await act(async () => result.current.advance());
    expect(result.current.currentStep.type).toBe('complete');
    expect(onComplete).toHaveBeenCalledWith('u1l2');
  });

  it('calls onRecordLockIn when advancing from a signing step', async () => {
    const { result, onRecordLockIn } = makeHook(FIXED);
    await act(async () => result.current.advance()); // → reference(A)
    await act(async () => result.current.advance()); // → signing(A)
    await act(async () => result.current.advance()); // → reference(B) — records A
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

  it('progress is 0 at start and 1 at complete', async () => {
    const { result } = makeHook(FIXED);
    expect(result.current.progress).toBe(0);
    const { totalSteps } = result.current;
    for (let i = 0; i < totalSteps - 1; i++) await act(async () => result.current.advance());
    expect(result.current.progress).toBe(1);
  });

  it('totalSteps = 1 + 2n + 1 + n + 1 for n letters', () => {
    // n=3: 1 intro + 6 (ref+sign) + 1 review_intro + 3 review_sign + 1 complete = 12
    const { result } = makeHook(FIXED);
    expect(result.current.totalSteps).toBe(12);
  });
});
