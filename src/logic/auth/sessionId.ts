export const SESSION_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : Math.random().toString(36).substring(2, 11) + Temporal.Now.instant().epochMilliseconds.toString(36);

