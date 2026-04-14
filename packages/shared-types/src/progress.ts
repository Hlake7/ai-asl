export interface LetterProgress {
  letter: string;
  attempts: number;
  locks: number;         // times the confidence threshold was hit
  lastPracticed: number; // Unix timestamp ms
}

export interface SessionProgress {
  userId: string | null;
  letterProgress: Record<string, LetterProgress>;
  streakDays: number;
  lastActiveDate: string; // ISO date string "YYYY-MM-DD"
}
