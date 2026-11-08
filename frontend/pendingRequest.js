// Keep the original payload until the server confirms or rejects the write.
const inMemory = new Map();

export function readPending(key) {
  if (inMemory.has(key)) return inMemory.get(key);
  try { return JSON.parse(sessionStorage.getItem(key)); }
  catch { return null; }
}

export function savePending(key, payload) {
  inMemory.set(key, payload);
  try { sessionStorage.setItem(key, JSON.stringify(payload)); }
  catch { /* The current page can still retry. */ }
}

export function forgetPending(key) {
  inMemory.delete(key);
  try { sessionStorage.removeItem(key); }
  catch { /* Storage may be disabled. */ }
}
