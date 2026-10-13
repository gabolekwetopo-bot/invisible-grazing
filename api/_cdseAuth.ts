// Shared CDSE OAuth token helper. Used by the Vercel function and by the
// local dev-only Vite proxy. Never imported by the browser bundle.

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getCdseToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CDSE token request failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedToken = json.access_token;
  tokenExpiresAt = now + json.expires_in * 1000;
  return cachedToken;
}
