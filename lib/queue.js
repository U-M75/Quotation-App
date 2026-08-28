// Simple in-memory pending updates storage
// This replaces the Redis queue - no external dependencies needed
const pendingUpdates = new Map();

const WAIT_MS = 15 * 60 * 1000; // 15 minutes

export async function queueMondayUpdate(update) {
  const key = `ksc:quotation:pending-update:${update.itemId}`;
  
  const existing = pendingUpdates.get(key) || {};
  
  const pending = {
    ...existing,
    ...update,
    notBefore: Date.now() + WAIT_MS,
    scheduledAt: new Date().toISOString(),
  };

  pendingUpdates.set(key, pending);

  // Auto-cleanup after 24 hours
  setTimeout(() => {
    pendingUpdates.delete(key);
  }, 24 * 60 * 60 * 1000);
}

export async function getDueMondayUpdates() {
  const due = [];

  for (const [key, pending] of pendingUpdates.entries()) {
    if (Number(pending.notBefore) <= Date.now()) {
      due.push(pending);
    }
  }

  return { due };
}

export async function removeMondayUpdate(itemId) {
  const key = `ksc:quotation:pending-update:${itemId}`;
  pendingUpdates.delete(key);
}
