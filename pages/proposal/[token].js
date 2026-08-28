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
  ensureBoardWebhook,
  getProjectItem,
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
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  const tokenPayload = verifyProposalToken(req.query.token);

  if (!tokenPayload) {
    return res.status(401).json({
      success: false,
      error: 'This proposal link is invalid or expired',
    });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      project: {
        id: tokenPayload.itemId,
        name: tokenPayload.projectName,
        assignedTo: tokenPayload.assignedToName,
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
    const { fields, files } = await parseMultipartForm(req);

    const estimatedHours = firstValue(fields.estimatedHours).trim();
    const deadlineDate = firstValue(fields.deadlineDate).trim();
    const decisionStatus = firstValue(fields.decisionStatus).trim();
    const decisionDate = firstValue(fields.decisionDate).trim();
    const projectStatus = firstValue(fields.projectStatus).trim();
    const proposalPdf = getProposalPdf(files.proposalPdf);

    if (
      !estimatedHours ||
      !deadlineDate ||
      !decisionStatus ||
      !decisionDate ||
      !projectStatus
    ) {
      return res.status(400).json({
        success: false,
        error: 'Estimated hours, deadline, decision, decision date, and project status are required',
      });
    }

    const board = await ensureBoardAndColumns();

    if (String(board.boardId) !== String(tokenPayload.boardId)) {
      return res.status(400).json({
        success: false,
        error: 'The proposal link belongs to another board',
      });
    }

    await updateProjectColumns(
      board.boardId,
      tokenPayload.itemId,
      buildColumnValues(board.columns, {
        estimated_hours: estimatedHours,
        deadline_date: {
          date: deadlineDate,
        },
        decision_status: {
          label: decisionStatus,
        },
        decision_date: {
          date: decisionDate,
        },
        project_status: {
          label: projectStatus,
        },
      })
    );

    if (proposalPdf) {
      await addFileToColumn({
        itemId: tokenPayload.itemId,
        columnId: board.columns.proposal_pdf.id,
        filepath: proposalPdf.filepath,
        filename: proposalPdf.originalFilename || 'proposal.pdf',
        mimetype: proposalPdf.mimetype || 'application/pdf',
      });
    }

    try {
      await ensureBoardWebhook(board.boardId);
    } catch (error) {
      console.warn(
        'Monday webhook registration skipped:',
        error.message
      );
    }

    const item = await getProjectItem(tokenPayload.itemId);

    const notifyName =
      process.env.QUOTATION_RESPONSE_NOTIFY_USER_NAME?.trim() || 'Uma';

    const notifyUser = process.env.QUOTATION_RESPONSE_NOTIFY_USER_ID?.trim()
      ? {
          userId: process.env.QUOTATION_RESPONSE_NOTIFY_USER_ID.trim(),
        }
      : await findSlackUser(notifyName);

    const notifyMention =
      getSlackMention(notifyUser?.userId) || notifyName;

    const mondayLink =
      `https://monday.com/boards/${tokenPayload.boardId}/pulses/${tokenPayload.itemId}`;

    await postToSlack(`✅ *Quotation Response Received*

${notifyMention}, a quotation response has been submitted for your request.

*Project Name:* ${tokenPayload.projectName}
*Project ID:* ${tokenPayload.itemId}
*Monday Item:* ${mondayLink}`);

    return res.status(200).json({
      success: true,
      projectId: String(item?.id || tokenPayload.itemId),
      message: 'Proposal submitted successfully',
    });
  } catch (error) {
    console.error('Submit proposal error:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
