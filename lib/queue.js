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

  const due = [];

  for (const update of data.updates || []) {
    const pending = readQueuePayload(update);

    if (!pending) {
      continue;
    }

    if (Number(pending.notBefore) <= Date.now()) {
      due.push({
        ...pending,
        queueUpdateId: String(update.id),
        itemId: String(
          pending.itemId || update.item_id
        ),
      });
    }
  }

  return {
    due,
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
