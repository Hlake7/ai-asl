import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LetterProgress } from '@asl-app/shared-types';
import { UNIT_1 } from '../data/lessons';

interface AppStore {
  _hasHydrated: boolean;
  userName: string | null;
  hasOnboarded: boolean;
  completedLessons: Record<string, { completedAt: number }>;
  letterProgress: Record<string, LetterProgress>;

  setHasHydrated: (value: boolean) => void;
  completeOnboarding: (name: string) => void;
  completeLesson: (lessonId: string) => void;
  isLessonUnlocked: (lessonId: string) => boolean;
  recordLockIn: (letter: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      userName: null,
      hasOnboarded: false,
      completedLessons: {},
      letterProgress: {},

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      completeOnboarding: (name) => set({ userName: name, hasOnboarded: true }),

      completeLesson: (lessonId) =>
        set((state) => ({
          completedLessons: {
            ...state.completedLessons,
            [lessonId]: { completedAt: Date.now() },
          },
        })),

      isLessonUnlocked: (lessonId) => {
        const lesson = UNIT_1.find((l) => l.id === lessonId);
        if (!lesson) return false;
        if (lesson.order === 1) return true;
        const prev = UNIT_1.find((l) => l.order === lesson.order - 1);
        if (!prev) return false;
        return prev.id in get().completedLessons;
      },

      recordLockIn: (letter) =>
        set((state) => {
          const existing = state.letterProgress[letter] ?? {
            letter,
            attempts: 0,
            locks: 0,
            lastPracticed: 0,
          };
          return {
            letterProgress: {
              ...state.letterProgress,
              [letter]: {
                ...existing,
                attempts: existing.attempts + 1,
                locks: existing.locks + 1,
                lastPracticed: Date.now(),
              },
            },
          };
        }),
    }),
    {
      name: 'asl-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userName: state.userName,
        hasOnboarded: state.hasOnboarded,
        completedLessons: state.completedLessons,
        letterProgress: state.letterProgress,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
