import { renderHook, act } from '@testing-library/react-native';
import { useWordBuilder } from '../useWordBuilder';

describe('useWordBuilder', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appends letters to currentWord on lock-in', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    await act(async () => result.current.onLockIn('A'));
    await act(async () => result.current.onLockIn('S'));
    await act(async () => result.current.onLockIn('L'));
    expect(result.current.currentWord).toBe('ASL');
  });

  it('pushes word to history and clears currentWord after WORD_BREAK_MS', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    await act(async () => result.current.onLockIn('H'));
    await act(async () => result.current.onLockIn('I'));
    await act(async () => jest.advanceTimersByTime(1500));
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['HI']);
  });

  it('resets idle timer on each new lock-in', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    await act(async () => result.current.onLockIn('H'));
    await act(async () => jest.advanceTimersByTime(1000)); // not yet
    await act(async () => result.current.onLockIn('I')); // resets timer
    await act(async () => jest.advanceTimersByTime(1000)); // not yet (only 1s since last lock-in)
    expect(result.current.currentWord).toBe('HI');
    await act(async () => jest.advanceTimersByTime(500)); // now 1.5s since last lock-in
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['HI']);
  });

  it('caps history at 5 words', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    for (let i = 0; i < 6; i++) {
      await act(async () => result.current.onLockIn(String.fromCharCode(65 + i)));
      await act(async () => jest.advanceTimersByTime(1500));
    }
    expect(result.current.history).toHaveLength(5);
  });

  it('does not push empty word to history', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    await act(async () => jest.advanceTimersByTime(1500));
    expect(result.current.history).toHaveLength(0);
  });

  it('clearCurrentWord clears word without affecting history', async () => {
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn: jest.fn() }));
    await act(async () => result.current.onLockIn('H'));
    await act(async () => jest.advanceTimersByTime(1500)); // push H to history
    await act(async () => result.current.onLockIn('X'));
    await act(async () => result.current.clearCurrentWord());
    expect(result.current.currentWord).toBe('');
    expect(result.current.history).toEqual(['H']);
  });

  it('calls onRecordLockIn with each letter', async () => {
    const onRecordLockIn = jest.fn();
    const { result } = renderHook(() => useWordBuilder({ onRecordLockIn }));
    await act(async () => result.current.onLockIn('A'));
    await act(async () => result.current.onLockIn('B'));
    expect(onRecordLockIn).toHaveBeenCalledTimes(2);
    expect(onRecordLockIn).toHaveBeenNthCalledWith(1, 'A');
    expect(onRecordLockIn).toHaveBeenNthCalledWith(2, 'B');
  });
});
