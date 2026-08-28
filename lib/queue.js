// In-memory pending updates storage
// Replaces Redis - no external dependencies needed
const pendingUpdates = new Map();

// 2 minutes for testing - change to 15 * 60 * 1000 for production
const WAIT_MS = 2 * 60 * 1000;

function itemKey(itemId) {
  return `ksc:quotation:pending-update:${itemId}`;
}

export async function queueMondayUpdate(update) {
  const key = itemKey(update.itemId);
  
  const existing = pendingUpdates.get(key) || {};
  
  const pending = {
    ...existing,
    ...update,
    notBefore: Date.now() + WAIT_MS,
    scheduledAt: new Date().toISOString(),
  };

  console.log(`📌 Queued update for item ${update.itemId}, will process after ${WAIT_MS / 1000} seconds`);

  pendingUpdates.set(key, pending);

  // Auto-cleanup after 24 hours
  setTimeout(() => {
    pendingUpdates.delete(key);
  }, 24 * 60 * 60 * 1000);
}

export async function getDueMondayUpdates() {
  const due = [];
  const now = Date.now();

  for (const [key, pending] of pendingUpdates.entries()) {
    const timeUntilDue = pending.notBefore - now;
    
    if (timeUntilDue <= 0) {
      console.log(`✅ Item ${pending.itemId} is now due for processing`);
      due.push(pending);
    } else {
      console.log(`⏳ Item ${pending.itemId} due in ${Math.ceil(timeUntilDue / 1000)} seconds`);
    }
  }

  return { due };
}

export async function removeMondayUpdate(itemId) {
  const key = itemKey(itemId);
  pendingUpdates.delete(key);
  console.log(`🗑️ Removed update for item ${itemId} from queue`);
}
