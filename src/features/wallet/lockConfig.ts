// Two minutes is short enough for a shared test device but not annoying during normal form entry.
export const INACTIVITY_LOCK_MS = 2 * 60 * 1000; // 2 minutes

// Backgrounding is riskier, so ask for auth again sooner when the app comes back.
export const BACKGROUND_LOCK_MS = 30 * 1000; // 30 seconds
