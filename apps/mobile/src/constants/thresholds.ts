/** Minimum model confidence (0–1) required to begin filling the ring. */
export const CONFIDENCE_THRESHOLD = 0.85;

/** How long (ms) the sign must be held above threshold before locking in. */
export const HOLD_DURATION_MS = 300;

/** How long (ms) the ring stays locked/green before resetting to idle. */
export const LOCK_RESET_MS = 600;

/** Minimum ms between consecutive /predict API calls (throttle). */
export const PREDICT_THROTTLE_MS = 100;
