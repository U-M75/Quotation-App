import crypto from 'node:crypto';

function getSecret() {
  const secret = process.env.QUOTATION_LINK_SECRET || process.env.SLACK_BOT_TOKEN;

  if (!secret) {
    throw new Error('QUOTATION_LINK_SECRET is not configured');
  }

  return secret;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

export function createProposalToken(payload) {
  const encodedPayload = base64Url(JSON.stringify(payload));

  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyProposalToken(token) {
  try {
    const [encodedPayload, signature] = String(token || '').split('.');

    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', getSecret())
      .update(encodedPayload)
      .digest('base64url');

    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
