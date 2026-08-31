const SLACK_API = 'https://slack.com/api';

function getBotToken() {
  const token = process.env.SLACK_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }

  return token;
}

export async function getSlackUsers() {
  const botToken = getBotToken();
  const members = [];
  let cursor = '';

  do {
    const url = new URL(`${SLACK_API}/users.list`);
    url.searchParams.set('limit', '200');

    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${botToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || 'Unable to load Slack users'
      );
    }

    members.push(...(data.members || []));
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);

  return members
    .filter(user => (
      !user.deleted &&
      !user.is_bot &&
      !user.is_app_user &&
      user.id !== 'USLACKBOT'
    ))
    .map(user => ({
      name:
        user.profile?.display_name?.trim() ||
        user.real_name?.trim() ||
        user.name,
      username: user.name,
      userId: user.id,
      email: user.profile?.email || '',
    }))
    .filter(user => user.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSlackMention(userId) {
  return userId ? `<@${userId}>` : '';
}

export async function findSlackUser(searchTerm) {
  const search = String(searchTerm || '').trim().toLowerCase();

  if (!search) {
    return null;
  }

  const users = await getSlackUsers();

  return users.find(user => (
    user.name.toLowerCase() === search ||
    user.username.toLowerCase() === search
  )) || users.find(user => (
    user.name.toLowerCase().includes(search) ||
    user.username.toLowerCase().includes(search)
  )) || null;
}

export async function postToSlack(text) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error(
      'SLACK_WEBHOOK_URL is not configured'
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const responseText = await response.text();

  if (!response.ok || responseText !== 'ok') {
    throw new Error(
      `Unable to send the Slack notification: ${responseText}`
    );
  }

  return {
    success: true,
  };
}
