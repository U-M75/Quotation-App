import {
  getDueMondayUpdates,
  removeMondayUpdate,
} from '../../../lib/queue';

import { getProjectItem } from '../../../lib/monday';
import { postToSlack } from '../../../lib/slack';

function extractValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Empty';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return 'Empty';
    }

    return value
      .map(extractValue)
      .join(', ');
  }

  if (typeof value === 'object') {
    if (value.label !== undefined) {
      return extractValue(value.label);
    }

    if (value.text !== undefined) {
      return extractValue(value.text);
    }

    if (value.date !== undefined) {
      return extractValue(value.date);
    }

    if (value.name !== undefined) {
      return extractValue(value.name);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const dateString = String(value);

  // ISO date: 2026-08-29
  const match = dateString.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    const [, year, month, day] = match;

    return `${month}/${day}/${year.slice(-2)}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const year = String(
    date.getFullYear()
  ).slice(-2);

  return `${month}/${day}/${year}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const cronSecret =
    process.env.CRON_SECRET?.trim();

  if (
    cronSecret &&
    req.headers.authorization !==
      `Bearer ${cronSecret}`
  ) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    const {
      redis,
      due,
    } = await getDueMondayUpdates();

    let processed = 0;

    for (const pending of due) {
      try {
        const item =
          await getProjectItem(
            pending.itemId
          );

        if (!item) {
          await removeMondayUpdate(
            redis,
            pending.itemId
          );

          continue;
        }

        const oldValue =
          extractValue(
            pending.previousValue
          );

        const newValue =
          extractValue(
            pending.newValue
          );

        const changedDate =
          formatDate(
            pending.changedAt ||
            pending.receivedAt
          );

        const mondayLink =
          item.url
            ? `<${item.url}|Open Monday Item>`
            : 'Monday item unavailable';

        const message = `🔄 *Monday.com Project Update*

*Project Name:* ${item.name}
*Project ID:* ${item.id}

*Changed Field:* ${pending.columnTitle}

*Old Value:* ${oldValue}
*New Value:* ${newValue}

*Date:* ${changedDate}

*Monday Item:* ${mondayLink}`;

        await postToSlack(message);

        await removeMondayUpdate(
          redis,
          pending.itemId
        );

        processed += 1;
      } catch (error) {
        console.error(
          `Monday update ${pending.itemId} failed:`,
          error.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      queued:
        due.length - processed,
    });
  } catch (error) {
    console.error(
      'Monday cron error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
