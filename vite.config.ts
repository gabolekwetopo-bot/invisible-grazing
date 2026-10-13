import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getCdseToken } from './api/_cdseAuth.ts';

/**
 * Dev-only proxy so `npm run dev` behaves like production.
 * In production Vercel serves /api/cdse/statistics from api/cdse/statistics.ts.
 */
function cdseDevProxy(clientId: string, clientSecret: string): Plugin {
  return {
    name: 'cdse-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        '/api/cdse/statistics',
        async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const body = Buffer.concat(chunks).toString('utf8');

            const token = await getCdseToken(clientId, clientSecret);
            const upstream = await fetch(
              'https://sh.dataspace.copernicus.eu/api/v1/statistics',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body,
              },
            );
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(text);
          } catch (err) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err) }));
          }
        },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clientId = env.VITE_CDSE_CLIENT_ID ?? '';
  const clientSecret = env.VITE_CDSE_CLIENT_SECRET ?? '';

  if (!clientId || !clientSecret) {
    console.warn(
      '[invisible-grazing] VITE_CDSE_CLIENT_ID / VITE_CDSE_CLIENT_SECRET not found in .env — Sentinel-2 will be unavailable in dev.',
    );
  }

  return {
    plugins: [react(), cdseDevProxy(clientId, clientSecret)],
  };
});
