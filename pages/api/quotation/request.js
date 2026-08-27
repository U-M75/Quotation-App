import { createProposalToken } from '../../../lib/token';
import { getSlackMention, postToSlack } from '../../../lib/slack';
import {
  buildColumnValues,
  createProjectItem,
  ensureBoardWebhook,
  updateProjectColumns,
} from '../../../lib/monday';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { projectName, assignedToId, assignedToName, description } = req.body || {};
  if (!projectName?.trim() || !assignedToId || !description?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Project name, assignee, and project description are required',
    });
  }

  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (!appBaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'APP_BASE_URL is not configured in Vercel',
    });
  }

  try {
    const created = await createProjectItem({
      projectName: projectName.trim(),
      assignedTo: assignedToName || assignedToId,
      description: description.trim(),
      proposalDate: today(),
    });

    const token = createProposalToken({
      boardId: created.boardId,
      itemId: String(created.item.id),
      projectName: projectName.trim(),
      assignedToId,
      assignedToName: assignedToName || assignedToId,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    });
    const proposalLink = `${appBaseUrl.replace(/\/$/, '')}/proposal/${token}`;

    const linkColumn = created.columns.response_form_link;
    if (linkColumn) {
      await updateProjectColumns(
        created.boardId,
        created.item.id,
        buildColumnValues(created.columns, {
          response_form_link: { url: proposalLink, text: 'Open proposal form' },
        })
      );
    }

    try {
      await ensureBoardWebhook(created.boardId);
    } catch (error) {
      console.warn('Monday webhook registration skipped:', error.message);
    }

    const mention = getSlackMention(assignedToId) || assignedToName || 'the assigned team member';
    const slackMessage = `📝 *New Quotation Request*

*Project:* ${projectName.trim()}
*Project ID:* ${created.item.id}
*Assigned to:* ${mention}
*Description:* ${description.trim()}
*Proposal Request:* Requested
*Proposal Date Requested:* ${today()}

${mention}, please complete the proposal form here:
${proposalLink}`;

    await postToSlack(slackMessage);

    return res.status(200).json({
      success: true,
      projectId: String(created.item.id),
      proposalLink,
      message: 'Quotation request created successfully',
    });
  } catch (error) {
    console.error('Create quotation request error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
