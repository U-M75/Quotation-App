import fs from 'node:fs/promises';

export const BOARD_NAME = 'KSC Quotation Requests';

export const COLUMN_SPECS = [
  { id: 'assigned_to', title: 'Assigned To', type: 'text' },
  { id: 'project_description', title: 'Project Description', type: 'long_text' },
  {
    id: 'proposal_request',
    title: 'Proposal Request Status',
    type: 'status',
    labels: ['Requested', 'In Review', 'Submitted'],
  },
  {
    id: 'proposal_date_requested',
    title: 'Proposal Date Requested',
    type: 'date',
  },
  { id: 'estimated_hours', title: 'Estimated Hours', type: 'numbers' },
  { id: 'deadline_date', title: 'Deadline Date', type: 'date' },
  { id: 'proposal_pdf', title: 'Proposal PDF', type: 'file' },
  {
    id: 'decision_status',
    title: 'Decision Status',
    type: 'status',
    labels: ['Pending', 'Approved', 'Rejected'],
  },
  { id: 'decision_date', title: 'Decision Date', type: 'date' },
  {
    id: 'project_status',
    title: 'Project Status',
    type: 'status',
    labels: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
  },
];

function getToken() {
  const token = process.env.MONDAY_API_TOKEN?.trim();

  if (!token) {
    throw new Error('MONDAY_API_TOKEN is not configured');
  }

  return token;
}

export async function mondayRequest(query, variables = {}) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: getToken(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.map(error => error.message).join('; ') ||
      response.statusText;

    throw new Error(`Monday API error: ${message}`);
  }

  return payload.data;
}

function normaliseTitle(title) {
  return String(title || '').trim().toLowerCase();
}

function statusDefaults(spec) {
  if (spec.id === 'proposal_request') {
    return `defaults: { labels: [
      { color: bright_blue, label: "Requested", index: 0 },
      { color: working_orange, label: "In Review", index: 1 },
      { color: done_green, label: "Submitted", index: 2, is_done: true }
    ] }`;
  }

  if (spec.id === 'decision_status') {
    return `defaults: { labels: [
      { color: bright_blue, label: "Pending", index: 0 },
      { color: done_green, label: "Approved", index: 1, is_done: true },
      { color: stuck_red, label: "Rejected", index: 2 }
    ] }`;
  }

  return `defaults: { labels: [
    { color: bright_blue, label: "Not Started", index: 0 },
    { color: working_orange, label: "In Progress", index: 1 },
    { color: done_green, label: "Completed", index: 2, is_done: true },
    { color: stuck_red, label: "On Hold", index: 3 }
  ] }`;
}

async function createColumn(boardId, spec) {
  const boardNumber = Number(boardId);

  const boardArgument = Number.isFinite(boardNumber)
    ? String(boardNumber)
    : JSON.stringify(String(boardId));

  const mutation =
    spec.type === 'status'
      ? `mutation {
          create_status_column(
            board_id: ${boardArgument}
            id: ${JSON.stringify(spec.id)}
            title: ${JSON.stringify(spec.title)}
            ${statusDefaults(spec)}
          ) {
            id
            title
            type
          }
        }`
      : `mutation {
          create_column(
            board_id: ${boardArgument}
            id: ${JSON.stringify(spec.id)}
            title: ${JSON.stringify(spec.title)}
            column_type: ${spec.type}
          ) {
            id
            title
            type
          }
        }`;

  const data = await mondayRequest(mutation);

  return spec.type === 'status'
    ? data.create_status_column
    : data.create_column;
}

async function readBoard(boardId) {
  const data = await mondayRequest(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        id
        name
        columns {
          id
          title
          type
        }
      }
    }`,
    {
      boardId: [String(boardId)],
    }
  );

  if (!data.boards?.[0]) {
    throw new Error(`Monday board ${boardId} was not found`);
  }

  return data.boards[0];
}

async function findBoardByName() {
  const data = await mondayRequest(
    `query {
      boards(limit: 100) {
        id
        name
        columns {
          id
          title
          type
        }
      }
    }`
  );

  return (
    data.boards?.find(
      board =>
        normaliseTitle(board.name) === normaliseTitle(BOARD_NAME)
    ) || null
  );
}

async function createBoard() {
  const workspaceId = process.env.MONDAY_WORKSPACE_ID?.trim();

  if (!workspaceId) {
    throw new Error(
      'MONDAY_WORKSPACE_ID is not configured; it is required to create the board'
    );
  }

  const data = await mondayRequest(
    `mutation ($name: String!, $workspaceId: ID!) {
      create_board(
        board_name: $name,
        board_kind: public,
        workspace_id: $workspaceId
      ) {
        id
        name
      }
    }`,
    {
      name: BOARD_NAME,
      workspaceId: String(workspaceId),
    }
  );

  return readBoard(data.create_board.id);
}

export async function ensureBoardAndColumns() {
  const configuredBoardId =
    process.env.MONDAY_BOARD_ID?.trim();

  let board = configuredBoardId
    ? await readBoard(configuredBoardId)
    : await findBoardByName();

  if (!board) {
    board = await createBoard();
  }

  const columns = {};

  const existingByTitle = new Map(
    (board.columns || []).map(column => [
      normaliseTitle(column.title),
      column,
    ])
  );

  for (const spec of COLUMN_SPECS) {
    const existing = existingByTitle.get(
      normaliseTitle(spec.title)
    );

    const column =
      existing || (await createColumn(board.id, spec));

    columns[spec.id] = column;
  }

  return {
    boardId: String(board.id),
    columns,
  };
}

export function buildColumnValues(columns, values) {
  const result = {};

  for (const [key, value] of Object.entries(values)) {
    if (
      value === undefined ||
      value === null ||
      !columns[key]
    ) {
      continue;
    }

    result[columns[key].id] = value;
  }

  return result;
}

export async function createProjectItem({
  projectName,
  assignedTo,
  description,
  proposalDate,
}) {
  const board = await ensureBoardAndColumns();

  const columnValues = buildColumnValues(board.columns, {
    assigned_to: assignedTo,
    project_description: {
      text: description,
    },
    proposal_request: {
      label: 'Requested',
    },
    proposal_date_requested: {
      date: proposalDate,
    },
    decision_status: {
      label: 'Pending',
    },
    project_status: {
      label: 'Not Started',
    },
  });

  const itemData = await mondayRequest(
    `mutation (
      $boardId: ID!,
      $itemName: String!,
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
        name
        url
      }
    }`,
    {
      boardId: board.boardId,
      itemName: projectName,
      columnValues: JSON.stringify(columnValues),
    }
  );

  const item = itemData.create_item;

  return {
    ...board,
    item,
  };
}

export async function updateProjectColumns(
  boardId,
  itemId,
  columnValues
) {
  const data = await mondayRequest(
    `mutation (
      $boardId: ID!,
      $itemId: ID!,
      $columnValues: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) {
        id
      }
    }`,
    {
      boardId: String(boardId),
      itemId: String(itemId),
      columnValues:
        typeof columnValues === 'string'
          ? columnValues
          : JSON.stringify(columnValues),
    }
  );

  return data.change_multiple_column_values;
}

export async function getProjectItem(itemId) {
  const data = await mondayRequest(
    `query ($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        name
        url
        board {
          id
          name
        }
        column_values {
          id
          text
          value
          column {
            title
            type
          }
        }
      }
    }`,
    {
      itemIds: [String(itemId)],
    }
  );

  return data.items?.[0] || null;
}

export async function addFileToColumn({
  itemId,
  columnId,
  filepath,
  filename,
  mimetype,
}) {
  const bytes = await fs.readFile(filepath);

  const query = `mutation ($file: File!) {
    add_file_to_column(
      item_id: ${String(itemId)},
      column_id: ${JSON.stringify(columnId)},
      file: $file
    ) {
      id
    }
  }`;

  const form = new FormData();

  form.append('query', query);

  form.append(
    'map',
    JSON.stringify({
      image: 'variables.file',
    })
  );

  form.append(
    'image',
    new Blob(
      [bytes],
      {
        type: mimetype || 'application/pdf',
      }
    ),
    filename || 'proposal.pdf'
  );

  const response = await fetch(
    'https://api.monday.com/v2/file',
    {
      method: 'POST',
      headers: {
        Authorization: getToken(),
      },
      body: form,
    }
  );

  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.map(error => error.message).join('; ') ||
      response.statusText;

    throw new Error(
      `Monday file upload error: ${message}`
    );
  }

  return payload.data?.add_file_to_column;
}

export async function ensureBoardWebhook(boardId) {
  const baseUrl = process.env.APP_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  const webhookUrl =
    `${baseUrl.replace(/\/$/, '')}/api/monday/webhook`;

  try {
    const existing = await mondayRequest(
      `query ($boardId: ID!) {
        webhooks(board_id: $boardId) {
          id
          url
          event
        }
      }`,
      {
        boardId: String(boardId),
      }
    );

    if (
      existing.webhooks?.some(
        webhook => webhook.url === webhookUrl
      )
    ) {
      return null;
    }
  } catch (error) {
    console.warn(
      'Could not read Monday webhooks:',
      error.message
    );
  }

  const data = await mondayRequest(
    `mutation (
      $boardId: ID!,
      $url: String!
    ) {
      create_webhook(
        board_id: $boardId,
        url: $url,
        event: change_column_value
      ) {
        id
        board_id
      }
    }`,
    {
      boardId: String(boardId),
      url: webhookUrl,
    }
  );

  return data.create_webhook;
}
