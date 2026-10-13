// =============================================================================
// POST /api/analyse  — AI analyst note for a monitoring area
// =============================================================================
// Receives only observed numbers and produces a short, cited analyst note.
// The model is instructed to never invent values, never claim overgrazing, and
// never describe anything that is not present in the supplied evidence.
//
// Model: openai/gpt-oss-120b on Groq (Apache-2.0 open weights).
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { maxDuration: 30 };

interface AnalyseRequest {
  areaName?: string;
  region?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  demonstration?: boolean;
  riskLevel: string;
  riskHeadline: string;
  evidence: Array<{ label: string; value: string; direction: string }>;
  ndvi?: {
    latestDate?: string;
    latestValue?: number | null;
    baselineMean?: number | null;
    recentMean?: number | null;
    delta?: number | null;
    observationCount: number;
    earliestDate?: string;
  };
  rainfall?: {
    recentMean?: number | null;
    baselineMean?: number | null;
    percentChange?: number | null;
    observationCount: number;
  };
  alternativeExplanations?: string[];
}

function buildPrompt(body: AnalyseRequest): string {
  const lines: string[] = [];

  lines.push('You are an environmental analyst for a satellite-based rangeland monitoring system.');
  lines.push('');
  lines.push('Write a short analyst note in exactly three sentences, using plain English.');
  lines.push('Sentence 1: what the vegetation data shows.');
  lines.push('Sentence 2: what the rainfall context shows, if rainfall is provided.');
  lines.push('Sentence 3: what the note does NOT establish and what should be checked next.');
  lines.push('');
  lines.push('Hard rules — do not break these:');
  lines.push('- Never invent or estimate any value. Use only the numbers below.');
  lines.push('- Never claim the area is overgrazed.');
  lines.push('- Never claim to confirm grazing activity.');
  lines.push('- Never mention biodiversity, species, or carbon.');
  lines.push('- If evidence is limited, say so plainly.');
  lines.push('- Do not include headings, bullet points, or markdown.');
  lines.push('');
  lines.push('Observed facts:');
  lines.push(`- Area name: ${body.areaName ?? 'Unnamed'}`);
  if (body.region || body.countryCode) {
    lines.push(`- Location: ${[body.region, body.countryCode].filter(Boolean).join(', ')}`);
  }
  lines.push(`- Coordinates: ${body.latitude.toFixed(4)}, ${body.longitude.toFixed(4)}`);
  if (body.radiusKm) lines.push(`- Radius: ${body.radiusKm} km`);
  if (body.demonstration) lines.push('- NOTE: This area uses demonstration (simulated) data.');

  lines.push('');
  lines.push(`Risk classification: ${body.riskLevel}`);
  lines.push(`Risk headline: ${body.riskHeadline}`);
  lines.push('Evidence items:');
  for (const e of body.evidence) {
    lines.push(`- ${e.label}: ${e.value} (${e.direction})`);
  }

  if (body.ndvi) {
    lines.push('');
    lines.push('NDVI observations from Sentinel-2:');
    lines.push(`- Observation count: ${body.ndvi.observationCount}`);
    if (body.ndvi.earliestDate) lines.push(`- Earliest: ${body.ndvi.earliestDate}`);
    if (body.ndvi.latestDate) lines.push(`- Latest: ${body.ndvi.latestDate}`);
    if (body.ndvi.latestValue != null) lines.push(`- Latest value: ${body.ndvi.latestValue}`);
    if (body.ndvi.baselineMean != null) lines.push(`- Baseline mean: ${body.ndvi.baselineMean}`);
    if (body.ndvi.recentMean != null) lines.push(`- Recent mean: ${body.ndvi.recentMean}`);
    if (body.ndvi.delta != null) lines.push(`- Change: ${body.ndvi.delta}`);
  }

  if (body.rainfall) {
    lines.push('');
    lines.push('Rainfall from NASA POWER:');
    lines.push(`- Observation count: ${body.rainfall.observationCount}`);
    if (body.rainfall.baselineMean != null) lines.push(`- Baseline mean: ${body.rainfall.baselineMean} mm`);
    if (body.rainfall.recentMean != null) lines.push(`- Recent mean: ${body.rainfall.recentMean} mm`);
    if (body.rainfall.percentChange != null) lines.push(`- Change: ${body.rainfall.percentChange}%`);
  }

  if (body.alternativeExplanations && body.alternativeExplanations.length) {
    lines.push('');
    lines.push('Alternative explanations already noted by the system:');
    for (const a of body.alternativeExplanations) lines.push(`- ${a}`);
  }

  return lines.join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'VITE_GROQ_API_KEY is not configured on the server.' });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as AnalyseRequest;
  if (!body || typeof body.latitude !== 'number') {
    res.status(400).json({ error: 'Invalid request body.' });
    return;
  }

  const prompt = buildPrompt(body);

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a careful environmental analyst. Follow the rules exactly. Reply with only the three sentences, no preamble.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({ error: `Groq error: ${text.slice(0, 300)}` });
      return;
    }

    const json = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const note = json.choices?.[0]?.message?.content?.trim() ?? '';
    if (!note) {
      res.status(502).json({ error: 'Groq returned an empty response.' });
      return;
    }

    res.status(200).json({ note });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
