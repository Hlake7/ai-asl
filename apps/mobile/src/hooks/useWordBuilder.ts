import { useCallback, useEffect, useRef, useState } from 'react';
import { WORD_BREAK_MS } from '../constants/thresholds';

interface UseWordBuilderOptions {
  onRecordLockIn: (letter: string) => void;
}

interface UseWordBuilderReturn {
  currentWord: string;
  history: string[];
  onLockIn: (letter: string) => void;
  clearCurrentWord: () => void;
}

export function useWordBuilder({ onRecordLockIn }: UseWordBuilderOptions): UseWordBuilderReturn {
  const [currentWord, setCurrentWord] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  // Ref mirrors currentWord so the idle timer callback sees the latest value
  // without needing currentWord as a closure dependency.
  const currentWordRef = useRef('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRecordLockInRef = useRef(onRecordLockIn);
  onRecordLockInRef.current = onRecordLockIn;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const pushWord = useCallback(() => {
    const word = currentWordRef.current;
    if (word.length === 0) return;
    setHistory((prev) => [word, ...prev].slice(0, 5));
    currentWordRef.current = '';
    setCurrentWord('');
  }, []);

  const onLockIn = useCallback(
    (letter: string) => {
      onRecordLockInRef.current(letter);
      const next = currentWordRef.current + letter;
      currentWordRef.current = next;
      setCurrentWord(next);
      clearIdleTimer();
      idleTimerRef.current = setTimeout(pushWord, WORD_BREAK_MS);
    },
    [clearIdleTimer, pushWord],
  );

  const clearCurrentWord = useCallback(() => {
    clearIdleTimer();
    currentWordRef.current = '';
    setCurrentWord('');
  }, [clearIdleTimer]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  return { currentWord, history, onLockIn, clearCurrentWord };
}
