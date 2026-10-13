// =============================================================================
// GET /api/state — returns the latest server-side scan state for the client
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readState } from './_scanState.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const state = await readState();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(state);
}
