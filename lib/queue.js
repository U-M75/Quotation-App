import { Redis } from '@upstash/redis';

const PENDING_SET = 'ksc:quotation:pending-update-ids';
const WAIT_MS = 15 * 60 * 1000;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for 15-minute updates');
  }
  return new Redis({ url, token });
}

function itemKey(itemId) {
  return `ksc:quotation:pending-update:${itemId}`;
}

export async function queueMondayUpdate(update) {
  const redis = getRedis();
  const key = itemKey(update.itemId);
  const existingValue = await redis.get(key);
  const existing = typeof existingValue === 'string'
    ? JSON.parse(existingValue)
    : (existingValue || {});

  const pending = {
    ...existing,
    ...update,
    notBefore: Date.now() + WAIT_MS,
  };

  await redis.set(key, JSON.stringify(pending), { ex: 24 * 60 * 60 });
  await redis.sadd(PENDING_SET, String(update.itemId));
}

export async function getDueMondayUpdates() {
  const redis = getRedis();
  const ids = await redis.smembers(PENDING_SET);
  const due = [];

  for (const id of ids || []) {
    const key = itemKey(id);
    const raw = await redis.get(key);
    if (!raw) {
      await redis.srem(PENDING_SET, id);
      continue;
    }

    const pending = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Number(pending.notBefore) <= Date.now()) {
      due.push(pending);
    }
  }

  return { redis, due };
}

export async function removeMondayUpdate(redis, itemId) {
  await redis.del(itemKey(itemId));
  await redis.srem(PENDING_SET, String(itemId));
}

