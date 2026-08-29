import { mondayRequest } from './monday';

const QUEUE_MARKER = '[KSC_QUOTATION_PENDING_UPDATE]';
const WAIT_MS = 2 * 60 * 1000;

function readQueuePayload(update) {
  const body = String(update.body || '');
  const markerIndex = body.indexOf(QUEUE_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  try {
    return JSON.parse(
      body.slice(markerIndex + QUEUE_MARKER.length).trim()
    );
  } catch {
    return null;
  }
}

export async function queueMondayUpdate(update) {
  const pending = {
    ...update,
    notBefore: Date.now() + WAIT_MS,
    scheduledAt: new Date().toISOString(),
  };

  const data = await mondayRequest(
    `mutation ($itemId: ID!, $body: String!) {
      create_update(
        item_id: $itemId,
        body: $body
      ) {
        id
      }
    }`,
    {
      itemId: String(update.itemId),
      body: `${QUEUE_MARKER}${JSON.stringify(pending)}`,
    }
  );

  console.log(
    `Queued Monday update ${data.create_update.id} for item ${update.itemId}`
  );
}

export async function getDueMondayUpdates() {
  const fromDate = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const toDate = new Date()
    .toISOString()
    .slice(0, 10);

  const data = await mondayRequest(`
    query {
      updates(
        limit: 100,
        from_date: "${fromDate}",
        to_date: "${toDate}"
      ) {
        id
        body
        item_id
        created_at
      }
    }
  `);

  const latestByItem = new Map();
  const staleQueueUpdateIds = [];

  for (const update of data.updates || []) {
    const pending = readQueuePayload(update);

    if (!pending) {
      continue;
    }

    const itemId = String(
      pending.itemId ||
      update.item_id ||
      ''
    );

    if (!itemId) {
      continue;
    }

    const createdAt =
      Date.parse(update.created_at || '') || 0;

    const candidate = {
      ...pending,
      queueUpdateId: String(update.id),
      itemId,
      createdAt,
    };

    const previous = latestByItem.get(itemId);

    if (
      !previous ||
      candidate.createdAt >= previous.createdAt
    ) {
      if (previous) {
        staleQueueUpdateIds.push(
          previous.queueUpdateId
        );
      }

      latestByItem.set(itemId, candidate);
    } else {
      staleQueueUpdateIds.push(
        candidate.queueUpdateId
      );
    }
  }

  const due = [
    ...latestByItem.values(),
  ].filter(update => (
    Number(update.notBefore) <= Date.now()
  ));

  return {
    due,
    staleQueueUpdateIds,
  };
}

export async function removeMondayUpdate(queueUpdateId) {
  if (!queueUpdateId) {
    return;
  }

  await mondayRequest(
    `mutation ($updateId: ID!) {
      delete_update(id: $updateId) {
        id
      }
    }`,
    {
      updateId: String(queueUpdateId),
    }
  );

  console.log(
    `Removed temporary Monday queue update ${queueUpdateId}`
  );
}
