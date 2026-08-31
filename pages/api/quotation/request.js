import { createProposalToken } from '../../../lib/token';

import {
  getSlackMention,
  postToSlack,
} from '../../../lib/slack';

import {
  createProjectItem,
} from '../../../lib/monday';

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export default async function handler(
  req,
  res
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const {
    projectName,
    assignedToId,
    assignedToName,
    description,
  } = req.body || {};

  if (
    !projectName?.trim() ||
    !assignedToId ||
    !description?.trim()
  ) {
    return res.status(400).json({
      success: false,
      error:
        'Project name, assignee, and project description are required',
    });
  }

  const appBaseUrl =
    process.env.APP_BASE_URL?.trim();

  if (!appBaseUrl) {
    return res.status(500).json({
      success: false,
      error:
        'APP_BASE_URL is not configured in Vercel',
    });
  }

  try {
    /*
     * Create the project on Monday.
     */
    const created =
      await createProjectItem({
        projectName:
          projectName.trim(),

        assignedTo:
          assignedToName ||
          assignedToId,

        description:
          description.trim(),

        proposalDate:
          today(),
      });

    /*
     * Create a secure proposal link.
     *
     * The description is included in the signed
     * token so the contractor can see it on the
     * Proposal Request Form.
     */
    const token =
      createProposalToken({
        boardId:
          created.boardId,

        itemId:
          String(
            created.item.id
          ),

        projectName:
          projectName.trim(),

        assignedToId,

        assignedToName:
          assignedToName ||
          assignedToId,

        description:
          description.trim(),

        expiresAt:
          Date.now() +
          30 *
            24 *
            60 *
            60 *
            1000,
      });

    const proposalLink =
      `${appBaseUrl.replace(
        /\/$/,
        ''
      )}/proposal/${token}`;

    /*
     * This keeps the long URL hidden in Slack.
     *
     * Slack will display only:
     *
     * Proposal Request Form
     */
    const proposalLinkText =
      `<${proposalLink}|Proposal Request Form>`;

    const mention =
      getSlackMention(
        assignedToId
      ) ||
      assignedToName ||
      'the assigned contractor';

    /*
     * Slack notification.
     *
     * Project description is included here as well.
     */
    await postToSlack(
      `📝 *New Project Request*

*Project:* ${projectName.trim()}
*Project ID:* ${created.item.id}
*Assigned To:* ${mention}

*Project Description:*
${description.trim()}

*Proposal Request:* Requested
*Date Requested:* ${today()}

${mention}, please complete the proposal form here:
${proposalLinkText}`
    );

    return res.status(200).json({
      success: true,

      projectId:
        String(
          created.item.id
        ),

      proposalLink,

      message:
        'Project request created successfully',
    });
  } catch (error) {
    console.error(
      'Create project request error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
