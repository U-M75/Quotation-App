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
    return value.length
      ? value.map(extractValue).join(', ')
      : 'Empty';
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

function getItemColumn(item, pending) {
  return item?.column_values?.find(column => (
    (pending.columnId &&
      column.id === pending.columnId) ||
    (
      pending.columnTitle &&
      column.column?.title === pending.columnTitle
    )
  ));
}

function getCurrentColumnValue(item, pending) {
  const column = getItemColumn(item, pending);

  if (!column) {
    return 'Empty';
  }

  if (
    column.text !== undefined &&
    column.text !== null &&
    column.text !== ''
  ) {
    return column.text;
  }

  try {
    return extractValue(
      JSON.parse(column.value || '')
    );
  } catch {
    return 'Empty';
  }
}

function getProjectStatus(item) {
  const statusColumn = item?.column_values?.find(column => (
    column.column?.title
      ?.trim()
      .toLowerCase() === 'project status'
  ));

  return statusColumn?.text || '';
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'number') {
    const milliseconds =
      value < 100000000000
        ? value * 1000
        : value;

    const date = new Date(milliseconds);

    if (!Number.isNaN(date.getTime())) {
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
  }

  const dateString = String(value);

  const isoMatch = dateString.match(
    /^(\\d{4})-(\\d{2})-(\\d{2})/
  );

  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1].slice(-2)}`;
  }

  const date = new Date(dateString);

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
  if (
    req.method !== 'GET' &&
    req.method !== 'POST'
  ) {
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
      due,
      staleQueueUpdateIds,
    } = await getDueMondayUpdates();

    // Remove older duplicate queue comments.
    for (
      const queueUpdateId of staleQueueUpdateIds
    ) {
      try {
        await removeMondayUpdate(
          queueUpdateId
        );
      } catch (error) {
        console.error(
          `Could not remove duplicate queue update ${queueUpdateId}:`,
          error.message
        );
      }
    }

    let processed = 0;

    for (const pending of due) {
      try {
        const item = await getProjectItem(
          pending.itemId
        );

        if (!item) {
          await removeMondayUpdate(
            pending.queueUpdateId
          );

          continue;
        }

        const oldValue = extractValue(
          pending.previousValue
        );

        // Read the latest current value from Monday.
        const newValue =
          getCurrentColumnValue(item, pending);

        const projectStatus =
          getProjectStatus(item).toLowerCase();

        const isStatusChange =
          pending.columnTitle
            ?.trim()
            .toLowerCase() === 'project status' ||
          item.column_values?.some(column =>
            column.id === pending.columnId &&
            column.column?.title === 'Project Status'
          );

        const changedDate = formatDate(
          pending.changedAt ||
          pending.receivedAt
        );

        const mondayLink = item.url
          ? `<${item.url}|Open Monday Item>`
          : 'Monday item unavailable';

        let message;

        if (
          isStatusChange &&
          projectStatus === 'completed'
        ) {
          message = `🏁 *Project Ended*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* Completed
*Date:* ${changedDate}
*Monday Item:* ${mondayLink}`;
        } else if (
          isStatusChange &&
          projectStatus === 'in progress'
        ) {
          message = `🚀 *Project Started*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* In Progress
*Date:* ${changedDate}
*Monday Item:* ${mondayLink}`;
        } else {
          message = `🔄 *Monday.com Project Update*

*Project Name:* ${item.name}
*Project ID:* ${item.id}

*Changed Field:* ${pending.columnTitle}
*Old Value:* ${oldValue}
*New Value:* ${newValue}
*Date:* ${changedDate}

*Monday Item:* ${mondayLink}`;
        }

        await postToSlack(message);

        // Delete the temporary queue update,
        // not the project item.
        await removeMondayUpdate(
          pending.queueUpdateId
        );

        processed += 1;
      } catch (error) {
        console.error(
          `Monday update ${pending.itemId} failed:`,
          error.message
        );

        // Keep failed updates for the next cron run.
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      queued: due.length - processed,
      timestamp: new Date().toISOString(),
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
