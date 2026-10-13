import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: 'invisible-grazing',
    time: new Date().toISOString(),
    hasCdse: Boolean(process.env.VITE_CDSE_CLIENT_ID && process.env.VITE_CDSE_CLIENT_SECRET),
    hasGroq: Boolean(process.env.VITE_GROQ_API_KEY),
  });
}
