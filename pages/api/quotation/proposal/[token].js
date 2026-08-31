import { IncomingForm } from 'formidable';
import { verifyProposalToken } from '../../../../lib/token';
import {
  findSlackUser,
  getSlackMention,
  postToSlack,
} from '../../../../lib/slack';

import {
  addFileToColumn,
  buildColumnValues,
  ensureBoardAndColumns,
  getProjectItem,
  hasProposalBeenSubmitted,
  markProposalSubmitted,
  updateProjectColumns,
} from '../../../../lib/monday';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

function firstValue(value) {
  return Array.isArray(value)
    ? value[0] || ''
    : value || '';
}

function getProposalPdf(value) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0]
    : value;
}

export default async function handler(req, res) {
  const tokenPayload =
    verifyProposalToken(req.query.token);

  if (!tokenPayload) {
    return res.status(401).json({
      success: false,
      error:
        'This proposal link is invalid or expired',
    });
  }

  try {
    if (
      await hasProposalBeenSubmitted(
        tokenPayload.itemId
      )
    ) {
      return res.status(410).json({
        success: false,
        error:
          'This proposal link has already been used',
      });
    }
  } catch (error) {
    console.error(
      'Proposal link check failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to verify this proposal link',
    });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      project: {
        id: tokenPayload.itemId,
        name: tokenPayload.projectName,
        description:
          tokenPayload.description || '',
        assignedTo:
          tokenPayload.assignedToName,
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const {
      fields,
      files,
    } = await parseMultipartForm(req);

    const estimatedHours =
      firstValue(
        fields.estimatedHours
      ).trim();

    const quotation =
      firstValue(
        fields.quotation
      ).trim();

    const deadlineDate =
      firstValue(
        fields.deadlineDate
      ).trim();

    const proposalPdf =
      getProposalPdf(
        files.proposalPdf
      );

    if (
      !estimatedHours ||
      !deadlineDate
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Estimated hours and deadline date are required',
      });
    }

    const board =
      await ensureBoardAndColumns();

    if (
      String(board.boardId) !==
      String(tokenPayload.boardId)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'The proposal link belongs to another board',
      });
    }

    // Save only estimated hours and deadline to Monday.
    // Quotation is intentionally not saved to Monday.
    await updateProjectColumns(
      board.boardId,
      tokenPayload.itemId,
      buildColumnValues(
        board.columns,
        {
          estimated_hours:
            estimatedHours,

          deadline_date: {
            date: deadlineDate,
          },
        }
      )
    );

    // Keep the complete PDF in the Monday file column.
    if (proposalPdf) {
      await addFileToColumn({
        itemId:
          tokenPayload.itemId,

        columnId:
          board.columns.proposal_pdf.id,

        filepath:
          proposalPdf.filepath,

        filename:
          proposalPdf.originalFilename ||
          'proposal.pdf',

        mimetype:
          proposalPdf.mimetype ||
          'application/pdf',
      });
    }

    const item =
      await getProjectItem(
        tokenPayload.itemId
      );

    const notifyName =
      process.env
        .QUOTATION_RESPONSE_NOTIFY_USER_NAME
        ?.trim() || 'Uma';

    const notifyUser =
      process.env
        .QUOTATION_RESPONSE_NOTIFY_USER_ID
        ?.trim()
        ? {
            userId:
              process.env
                .QUOTATION_RESPONSE_NOTIFY_USER_ID
                .trim(),
          }
        : await findSlackUser(
            notifyName
          );

    const notifyMention =
      getSlackMention(
        notifyUser?.userId
      ) || notifyName;

    const mondayLink =
      item?.url || '';

    const mondayLinkText =
      mondayLink
        ? `<${mondayLink}|Open Monday Item>`
        : 'Monday item unavailable';

    // Professional message design matching New Project Request.
    // Only quotation data is sent to Slack.
    const slackMessage = `:bell: *Quotation Response Received*
:pinkline::pinkline::pinkline::pinkline::pinkline:

${notifyMention}, a quotation response has been submitted for your request.

:clipboard: *Quotation Details*

*Project:* ${tokenPayload.projectName}
*Project ID:* ${tokenPayload.itemId}

*Quotation:*
${quotation || 'Not provided'}

:pinkline::pinkline::pinkline::pinkline::pinkline:

:link: *Monday Item*

${mondayLinkText}

:pinkline::pinkline::pinkline::pinkline::pinkline:`;

    await postToSlack(
      slackMessage
    );

    // Permanently invalidate the link after submission.
    await markProposalSubmitted(
      tokenPayload.itemId
    );

    return res.status(200).json({
      success: true,
      projectId: String(
        item?.id ||
        tokenPayload.itemId
      ),
      message:
        'Proposal submitted successfully',
    });
  } catch (error) {
    console.error(
      'Submit proposal error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
