import { createProposalToken } from '../../../lib/token';
import {
  getSlackMention,
  postToSlack,
} from '../../../lib/slack';
import { createProjectItem } from '../../../lib/monday';

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export default async function handler(req, res) {
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
     * Create project in Monday.com
     */
    const created = await createProjectItem({
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
     * Create secure one-time proposal link
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
     * Slack mention
     */
    const mention =
      getSlackMention(
        assignedToId
      ) ||
      assignedToName ||
      'Assigned team member';

    /*
     * Short clickable Slack link
     */
    const proposalLinkText =
      `<${proposalLink}|Proposal Request Form>`;

    /*
     * Professional Slack message
     *
     * :pinkline: is a custom Slack emoji.
     * Repeating it creates the long pink divider.
     */
    const slackMessage = `:bell: *New Project Request*
:pinkline::pinkline::pinkline::pinkline::pinkline:

:clipboard: *Project Details*

*Project:* ${projectName.trim()}
*Project ID:* ${created.item.id}
*Assigned To:* ${mention}

*Project Description:*
${description.trim()}

:pinkline::pinkline::pinkline::pinkline::pinkline:

:link: *Proposal Request*

${mention}, please complete the proposal using the form below:

${proposalLinkText}

:pinkline::pinkline::pinkline::pinkline::pinkline:`;

    await postToSlack(
      slackMessage
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
      error:
        error.message,
    });
  }
}
