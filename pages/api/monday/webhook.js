import { queueMondayUpdate } from '../../../lib/queue';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const body = req.body || {};

  if (body.challenge) {
    return res.status(200).json({
      challenge: body.challenge,
    });
  }

  const event = body.event || {};
  const itemId = event.pulseId || event.itemId;

  if (!itemId) {
    return res.status(200).json({
      success: true,
      ignored: true,
    });
  }

  try {
    await queueMondayUpdate({
      itemId: String(itemId),

      boardId: event.boardId
        ? String(event.boardId)
        : '',

      columnId: event.columnId || '',

      columnTitle:
        event.columnTitle ||
        event.columnId ||
        'Monday.com',

      previousValue:
        event.previousValue ?? null,

      newValue:
        event.value ?? null,

      changedAt:
        event.changedAt ||
        event.timestamp ||
        new Date().toISOString(),

      receivedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      queued: true,
      message:
        'Update queued successfully. Slack notification will be sent in 2 minutes.',
    });
  } catch (error) {
    console.error(
      'Monday webhook queue error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      queued: false,
      error: error.message,
    });
  }
}
