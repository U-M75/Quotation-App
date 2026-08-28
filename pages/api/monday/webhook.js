import { queueMondayUpdate } from '../../../lib/queue';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const body = req.body || {};

  // Monday webhook verification
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
    // Queue the update with 15-minute delay
    // The queue is now in-memory, so no Redis errors
    await queueMondayUpdate({
      itemId: String(itemId),
      boardId: event.boardId ? String(event.boardId) : '',
      columnId: event.columnId || '',
      columnTitle: event.columnTitle || event.columnId || 'Monday.com',
      previousValue: event.previousValue ?? null,
      newValue: event.value ?? null,
      changedAt: event.changedAt || event.timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    });

    // ✅ Always return 200 so Monday doesn't think automation failed
    return res.status(200).json({
      success: true,
      queued: true,
      message: 'Update queued successfully. Slack notification will be sent in 15 minutes.',
    });
  } catch (error) {
    console.error('Monday webhook queue error:', error.message);

    // Still return 200 to avoid Monday automation failures
    // Log the error for monitoring
    return res.status(200).json({
      success: false,
      queued: false,
      error: error.message,
      note: 'Error occurred but webhook returned 200 to prevent automation failure in Monday',
    });
  }
}
