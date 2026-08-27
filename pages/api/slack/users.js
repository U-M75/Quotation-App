import { getSlackUsers } from '../../../lib/slack';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const users = await getSlackUsers();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('Slack users error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
