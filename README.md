# KSC Quotation App

A branded quotation workflow for Kawaii Slime Company.

## Workflow

1. April submits a project name, selects Alex or Neel, and adds a description.
2. The app creates a project item on the `KSC Quotation Requests` monday.com board.
3. The selected person is mentioned in the existing Slack `#flow-test` channel with a secure proposal-form link.
4. Alex or Neel submits estimated hours, deadline, proposal PDF, decision status, decision date, and project status.
5. The response data and PDF are saved to the same monday.com item. No quotation amount is collected or stored.
6. monday.com board changes trigger instant Slack notifications. Project status changes to `In Progress` and `Completed` send dedicated started/ended notifications with project ID and name.

## Required environment variables

Add these variables in Vercel. Do not commit the values or share tokens in chat.

```text
SLACK_BOT_TOKEN=xoxb-your-existing-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-existing-webhook
MONDAY_API_TOKEN=your-monday-api-token
MONDAY_WORKSPACE_ID=your-monday-workspace-id
APP_BASE_URL=https://your-quotation-app.vercel.app
QUOTATION_LINK_SECRET=use-a-long-random-secret
```

`MONDAY_BOARD_ID` is optional. If it is not set, the app finds or creates a board named `KSC Quotation Requests` in `MONDAY_WORKSPACE_ID` and creates the required columns.

## Required Slack scopes

The existing Slack app should have:

```text
users:read
channels:read
incoming-webhook
```

The bot must be installed in the workspace. `MONDAY_API_TOKEN` must have permission to create/read boards and items, update columns, upload files, and create webhooks.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
