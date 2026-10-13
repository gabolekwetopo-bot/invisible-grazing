import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCdseToken } from '../_cdseAuth.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = process.env.VITE_CDSE_CLIENT_ID;
  const clientSecret = process.env.VITE_CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'CDSE credentials are not configured on the server.' });
    return;
  }

  try {
    const token = await getCdseToken(clientId, clientSecret);

    const upstream = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
