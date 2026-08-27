import { postToSlack } from '../../../lib/slack';
import { getProjectItem } from '../../../lib/monday';

function getColumnText(item, title) {
  const value = item?.column_values?.find(column => column.column?.title === title);
  return value?.text || '';
}

function eventValueText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.label?.text || value.text || value.date || value.number || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body || {};

  // monday.com sends this challenge while registering a webhook.
  if (body.challenge) {
    return res.status(200).json({ challenge: body.challenge });
  }

  const event = body.event || {};
  const itemId = event.pulseId || event.itemId;
  if (!itemId) return res.status(200).json({ success: true, ignored: true });

  try {
    const item = await getProjectItem(itemId);
    if (!item) return res.status(200).json({ success: true, ignored: true });

    const changedColumn = event.columnTitle || event.columnId || 'Monday.com';
    const changedValue = eventValueText(event.value) || getColumnText(item, changedColumn) || 'Updated';
    const projectStatus = getColumnText(item, 'Project Status');
    const isProjectStatus = changedColumn.toLowerCase().includes('project status') || event.columnId === 'project_status';
    const status = projectStatus.toLowerCase();

    let message;
    if (isProjectStatus && status === 'completed') {
      message = `🏁 *Project Ended*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* Completed`;
    } else if (isProjectStatus && status === 'in progress') {
      message = `🚀 *Project Started*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Project Status:* In Progress`;
    } else {
      message = `🔄 *Monday.com Project Update*

*Project Name:* ${item.name}
*Project ID:* ${item.id}
*Changed Field:* ${changedColumn}
*New Value:* ${changedValue}`;
    }

    await postToSlack(message);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Monday webhook error:', error.message);
    // Return 200 so monday.com does not repeatedly retry a non-critical notification.
    return res.status(200).json({ success: false, error: error.message });
  }
}
