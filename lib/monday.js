import { getDueMondayUpdates, removeMondayUpdate } from '../../../lib/queue';
import { getProjectItem } from '../../../lib/monday';
import { postToSlack } from '../../../lib/slack';

function valueForColumn(item, pending) {
  const column = item?.column_values?.find(value => (
    (pending.columnId && value.id === pending.columnId) ||
    (pending.columnTitle && value.column?.title === pending.columnTitle)
  ));
  return column?.text || 'Updated';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { redis, due } = await getDueMondayUpdates();
    let processed = 0;

    for (const pending of due) {
      try {
        const item = await getProjectItem(pending.itemId);
        if (!item) {
          await removeMondayUpdate(redis, pending.itemId);
          continue;
        }

        const changedValue = valueForColumn(item, pending);
        const projectStatus = valueForColumn(item, { columnTitle: 'Project Status' });
        const isStatusChange = (
          pending.columnId === 'project_status' ||
          pending.columnTitle === 'Project Status'
        );
        const status = projectStatus.toLowerCase();

        let message;
        if (isStatusChange && status === 'completed') {
          message = `🏁 *Project Ended*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* Completed`;
        } else if (isStatusChange && status === 'in progress') {
          message = `🚀 *Project Started*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* In Progress`;
        } else {
          message = `🔄 *Monday.com Project Update*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Changed Field:* ${pending.columnTitle}
*New Value:* ${changedValue}`;
        }

        await postToSlack(message);
        await removeMondayUpdate(redis, pending.itemId);
        processed += 1;
      } catch (error) {
        console.error(`Monday update ${pending.itemId} failed:`, error.message);
        // Keep the item queued so the next cron run can retry it.
      }
    }

    return res.status(200).json({ success: true, processed, queued: due.length - processed });
  } catch (error) {
    console.error('Monday cron error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
