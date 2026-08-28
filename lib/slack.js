export async function postToSlack(text) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error(
      'SLACK_WEBHOOK_URL is not configured'
    );
  }

  try {
    console.log('Sending Slack notification...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const responseText = await response.text();

    console.log(
      `Slack HTTP ${response.status}: ${responseText}`
    );

    if (!response.ok) {
      throw new Error(
        `Slack API returned ${response.status}: ${responseText}`
      );
    }

    if (responseText !== 'ok') {
      throw new Error(
        `Unexpected Slack response: ${responseText}`
      );
    }

    console.log(
      'Slack notification sent successfully'
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      'Failed to send Slack notification:',
      error.message
    );

    throw error;
  }
}
