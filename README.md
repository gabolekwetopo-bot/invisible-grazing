# Invisible Grazing

**See the pressure before the damage.**

Global rangeland intelligence that uses satellite-derived environmental observations to identify vegetation changes and highlight areas that may require grazing-pressure investigation.

**Live deployment:** https://invisible-grazing.vercel.app

---

## What this product is

A working environmental monitoring platform for grasslands, savannas, and dryland rangelands. It reads real satellite vegetation observations and real rainfall records, compares recent vegetation condition against a prior baseline, corrects for rainfall, and returns an explainable risk classification with cited evidence for any coordinate on Earth.

Designed for livestock farmers, rangeland managers, conservation organisations, biodiversity researchers, environmental agencies, and restoration programmes.

## What this product is not

- It does not confirm grazing activity. Confirmation requires independent field evidence.
- It does not measure biodiversity, species abundance, carrying capacity, or carbon.
- It does not claim verified global coverage. It claims coverage wherever Sentinel-2 and NASA POWER provide data, which is most of the world.
- It does not interpret vegetation decline as proof of overgrazing. Drought, fire, cultivation, pests, land-use change, and seasonal phenology all produce similar signals.

## Real data sources

Every observation in the app is traceable to a source, a date, and a known limitation.

| Source | Variable | Resolution | Cadence | Access |
|---|---|---|---|---|
| Sentinel-2 L2A (ESA Copernicus, via Sentinel Hub Statistical API) | NDVI | 10 m native, mean over the requested bbox | ~5-day revisit, aggregated to 10 or 30 days | OAuth client credentials |
| NASA POWER | Monthly precipitation (PRECTOTCORR) | 0.5° x 0.625° grid | Monthly | Keyless |

Both sources are genuinely live. Sentinel-2 is accessed through a Vercel serverless function that holds the CDSE OAuth credentials server-side. NASA POWER is keyless and called directly from the browser.

## How the risk assessment works

The **Invisible Grazing Risk Index** is a transparent, rules-based screen. It is not a validated model. Thresholds are provisional experimental assumptions.

The engine computes the mean NDVI over the last 12 months and compares it to the mean over the prior baseline. It also computes rainfall change over the same window when NASA POWER data is available.

| Risk level | Condition (provisional) |
|---|---|
| **High** | NDVI change of -0.10 or lower over the assessment window |
| **Moderate** | NDVI change between -0.10 and -0.05 |
| **Low** | NDVI change above -0.05 (including improvement) |
| **Insufficient Data** | Fewer than 6 usable observations |

Every risk result on the app carries an evidence list, alternative explanations, and recommended next steps. The engine never claims overgrazing. When important inputs are missing, it returns Insufficient Data rather than a false-confidence result.

## Features

- **Hero landing page** with a live coverage map
- **Dashboard** - metrics derived from real observations, not invented
- **World Map** - filter by risk, click any point on Earth to fetch real data for that coordinate
- **Add monitoring area** - pick a coordinate, name it, and the app fetches real Sentinel-2 NDVI and real NASA POWER rainfall and persists it in your browser
- **Area investigation page** - real NDVI and rainfall chart, evidence list, alternative explanations, recommended actions, data provenance
- **Working actions** - compare with neighbouring areas, review rainfall, generate a full printable AI report
- **War Room** - full-viewport monitoring view with live scan engine, risk-coloured markers, and an alert feed
- **AI analyst** - openai/gpt-oss-120b on Groq generates a three-sentence note or a structured four-section report using only the observed numbers, never inventing values
- **Full printable report** - location, observation period, vegetation trend, evidence, alternative explanations, recommended investigations, data provenance, and the optional AI narrative. Print to PDF or download as text.
- **Reports list** - one-line summary per area with direct links

## Architecture

- **Frontend:** React 19, TypeScript, Vite, Leaflet, Recharts
- **Hosting:** Vercel (static site plus serverless functions)
- **Serverless functions:**
  - api/cdse/statistics.ts - proxies Sentinel Hub Statistical API with server-side OAuth
  - api/analyse.ts - calls Groq with a fixed, evidence-only prompt
  - api/health.ts - deployment health check
- **Local development:** a Vite plugin mirrors the two serverless functions so npm run dev behaves like production
- **Storage:** browser localStorage only. No user accounts, no database, no tracking.

Secrets are stored in .env locally and in Vercel environment variables in production. They are never committed and never exposed to the browser bundle.

## Running locally

Requirements: Node.js 18 or newer, npm.

Clone the repository, install dependencies, and create a .env file with four variables:

- VITE_CDSE_CLIENT_ID - Copernicus Data Space OAuth client id
- VITE_CDSE_CLIENT_SECRET - Copernicus Data Space OAuth client secret
- VITE_STADIA_API_KEY - Stadia Maps API key
- VITE_GROQ_API_KEY - Groq API key for the AI analyst

Get CDSE credentials from shapps.dataspace.copernicus.eu/dashboard, a Stadia Maps key from client.stadiamaps.com, and a Groq key from console.groq.com.

Then run:

    npm install
    npm run dev

Open http://localhost:5173.

On first load, the app fetches real Sentinel-2 NDVI and real NASA POWER rainfall for four seed areas (Kalahari, Laikipia, New South Wales, Mongolia). This takes 20 to 60 seconds and is cached in the browser. Subsequent loads are instant.

## Deployment

The app deploys to Vercel automatically on every push to main. The four environment variables above must be set in the Vercel project settings.

## Adding a new data provider

1. Create a file under src/lib/providers/ that returns an ObservationSeries.
2. Register the source in src/lib/sources.ts with its name, resolution, cadence, homepage, and whether it is simulated.
3. If the provider needs credentials, add a serverless function under api/ and mirror it in vite.config.ts.
4. The risk engine reads any series whose indicator is NDVI or Rainfall and will pick up new observations automatically.

## Known limitations

- Risk thresholds are provisional and not yet validated against field data.
- NDVI values are not directly comparable across ecosystems.
- Cloud cover and sensor outages create gaps in the Sentinel-2 record.
- The risk engine splits recent vs baseline at a fixed 12-month window. It does not yet account for seasonal phenology within a year.
- Fire history is documented as a planned extension. The current implementation does not detect fires.
- The AI analyst is a generator of readable text over real numbers. It is not a source of new evidence.

## Roadmap

- Fire history via Sentinel Hub BYOC (Copernicus Burnt Area)
- Seasonal phenology correction in the risk engine
- Field-observation input for confirmed grazing evidence
- Multi-year baselines per ecoregion
- Comparison mode across multiple areas at once
- Localised unit and language support for global deployment

## Credits

Developed by Gabolekwe Topo Gabolekwe.

Metric units. ISO dates. UTC.
