# Invisible Grazing — Global Roots application

**Product:** Invisible Grazing
**Tagline:** See the pressure before the damage.
**Developer:** Gabolekwe Topo Gabolekwe (solo)
**Live deployment:** https://invisible-grazing.vercel.app
**Source code:** https://github.com/gabolekwetopo-bot/invisible-grazing
**Status:** Working prototype. Real satellite observations. Two-day build.

---

## Founder note

I built Invisible Grazing because rangeland degradation is invisible until it becomes expensive. You cannot see grazing pressure by driving past a paddock. You see it two years later when the grass does not come back. The satellite record sees it earlier. This prototype shows what that early-warning capability can look like as a working product, not a concept.

---

## 1. Innovation summary

Invisible Grazing is a global rangeland intelligence platform that reads real satellite vegetation observations and real rainfall records, compares recent vegetation condition against a prior baseline, and returns an explainable risk classification with cited evidence for any coordinate on Earth.

The prototype is functional. It fetches real Sentinel-2 NDVI from ESA Copernicus and real monthly rainfall from NASA POWER for any location a user selects. It does not confirm grazing. It identifies vegetation changes and highlights areas that may warrant grazing-pressure investigation — a distinction the platform treats as fundamental.

The innovation is not a new algorithm. It is the honest, transparent combination of existing public data with an explainable risk index that never overclaims. Most rangeland monitoring tools either stay academic or overclaim what satellite data can prove. This prototype does neither.

## 2. Problem and target users

**The problem.** Rangeland degradation is slow, spatial, and invisible from the ground. By the time it appears in the field, the cost of restoration is many times the cost of prevention. Livestock managers, conservation organisations, and environmental agencies lack an affordable, global, transparent way to see vegetation change early.

**Target users.**
- Livestock farmers and ranchers managing extensive rangeland
- Rangeland and land managers at regional scale
- Conservation organisations monitoring protected or buffer areas
- Biodiversity researchers needing an explainable screening tool
- Environmental agencies responsible for drought and land-degradation response
- Restoration projects needing a baseline before intervention
- Agricultural insurers and sustainability programmes with rangeland exposure

## 3. How Invisible Grazing works

1. A user selects any coordinate on a global map, or chooses one of four pre-configured seed areas (Kalahari, Laikipia, New South Wales, Mongolia).
2. The platform retrieves real Sentinel-2 L2A surface reflectance for a 25 km radius around that coordinate, applies a cloud and shadow mask using the Sentinel-2 Scene Classification Layer, and computes mean NDVI over the requested time window.
3. It retrieves real monthly precipitation from NASA POWER for the same coordinate and window.
4. It compares the mean NDVI of the last 12 months to the mean of the prior baseline period, and the same for rainfall.
5. It classifies the area as Low, Moderate, High, or Insufficient Data using a transparent, documented rule set.
6. It produces an evidence list, alternative explanations, and recommended next steps. An optional AI analyst generates a plain-language reading of the same numbers — never introducing new values.

## 4. What makes the approach innovative

- **Real data, not mockups.** Every observation in the deployed product is traceable to a public source, a date, and a documented limitation.
- **Honest science by design.** The risk engine returns Insufficient Data rather than a false-confidence result. It never claims overgrazing. Every classification carries its alternative explanations.
- **An explainable rules-based index.** Thresholds are provisional and published openly. The method can be reviewed, critiqued, and calibrated against field data — which is the plan.
- **Global by architecture from day one.** No country-specific assumptions are hardcoded. The same pipeline runs for Botswana, Kenya, Australia, Mongolia, or any coordinate the user chooses.
- **Working in two days.** A solo developer delivered a functioning, deployed, real-data product, not a concept deck. That is a statement about feasibility and speed.

## 5. Global scalability and relevance

The data sources are global:
- Sentinel-2 provides 5-day revisit coverage of the entire land surface between 84°N and 56°S.
- NASA POWER provides global precipitation at 0.5° resolution.

The architecture separates geography, data providers, the risk engine, and the user interface. Adding a new country, a new satellite product, or a new ecological baseline requires adding a provider file, not rewriting the application. The platform is designed to be calibrated per ecosystem, not applied universally.

The current prototype demonstrates coverage wherever these two public sources provide data. It does not claim validated coverage anywhere yet.

## 6. Potential biodiversity and land-management impact

- Earlier detection of vegetation change gives managers more options and lower restoration costs.
- Transparent, published thresholds build trust with rangeland users who are wary of black-box satellite claims.
- Real evidence, not sentiment, can inform grazing rotation, stocking decisions, and restoration investment.
- The same tool can feed national drought-monitoring and land-degradation-neutrality reporting.
- Over time, an explainable risk index becomes a shared language between satellite data, rangeland science, and the people who make land-use decisions.

The prototype does not measure species, carbon, or biodiversity directly. Those would require additional data. The current output supports investigation, not measurement.

## 7. Prototype status and actual technical evidence

**Deployed and working.**
- Live at https://invisible-grazing.vercel.app
- Real Sentinel-2 NDVI time series for any coordinate the user selects, retrieved via the ESA Copernicus Sentinel Hub Statistical API with server-side OAuth
- Real NASA POWER monthly rainfall for the same coordinates
- Real risk assessment with evidence, alternatives, and recommendations
- Four seed areas hydrated with real data on first load
- Printable full report per area, with optional AI narrative
- AI analyst (openai/gpt-oss-120b on Groq) constrained to the observed numbers only
- War room view with live scan engine and alert feed
- Public source code on GitHub

**Not yet implemented.**
- Fire history (planned, documented as extension)
- Seasonal phenology correction inside the risk engine
- Field-observation input
- Multi-ecoregion baselines
- Validation against independent rangeland studies

## 8. Data sources and methodology

| Source | Variable | Resolution | Cadence | Access | Licence |
|---|---|---|---|---|---|
| Sentinel-2 L2A (ESA Copernicus, via Sentinel Hub Statistical API) | NDVI, SCL cloud mask | 10 m native | ~5-day revisit, aggregated to 10-30 days | OAuth client credentials (free tier) | Copernicus open data |
| NASA POWER | Monthly precipitation (PRECTOTCORR) | 0.5° x 0.625° | Monthly | Keyless | Public |

**Method.** Mean NDVI of the last 12 months, compared with the mean of the prior baseline period for the same coordinate. Rainfall change computed over the same window. Classification thresholds are provisional and stated openly in the product and README. Evidence items are listed for every result. When fewer than 6 usable observations are available, the result is Insufficient Data.

## 9. Current limitations and scientific validation needs

- Thresholds are provisional and have not been validated against field-measured rangeland condition.
- NDVI is not directly comparable across ecosystems. A 0.3 in the Kalahari is not the same as a 0.3 in Kenya.
- The 12-month split does not account for seasonal phenology within the year. A dry-season low can look like a decline.
- Cloud cover and sensor outages create gaps, especially in the tropics.
- The AI analyst generates readable text over real numbers. It is not a source of new evidence.
- The platform does not confirm grazing. Confirmation requires independent field evidence.

Validation requires: field transects in at least three ecoregions, comparison against known grazing-exclusion plots, and calibration of thresholds by rainfall regime.

## 10. Development and validation roadmap

**Next 3 months.**
- Fire history via Sentinel Hub BYOC (Copernicus Burnt Area v3)
- Seasonal phenology correction using per-month baselines
- Field-observation input for confirmed grazing evidence
- First calibration exercise against an existing rangeland dataset

**Next 12 months.**
- Multi-ecoregion baselines for Africa, Australia, Central Asia, and South America
- Partnership with a rangeland research institution for validation transects
- Localised units and language support
- Mobile-friendly field mode for use during inspections

**Next 3 years.**
- Operational deployment with a national environmental agency or pastoral association
- Integration into drought-monitoring and land-degradation-neutrality reporting
- Additional ecological indicators (soil moisture, fire frequency, vegetation composition proxies) where public data supports them

## 11. Potential partners and adoption strategy

**Research partners.** Universities and institutes with rangeland, pastoral, or dryland research programmes, for validation of thresholds and baselines.

**Operational partners.** National rangeland or environmental agencies, pastoral associations, and conservation organisations that already conduct field inspections and can feed confirmed observations back into the platform.

**Technology partners.** ESA Copernicus and NASA for continued free access to the data; cloud providers for hosting at scale; open-source geospatial communities.

**Adoption strategy.** Start with a small number of institutions already doing field work in one ecoregion. Calibrate the risk thresholds against their records. Publish the calibration. Expand to a second ecoregion only when the first is validated. Grow by credibility, not by press.

---

## Honest closing note

Invisible Grazing is a two-day solo prototype. It uses real public data, it is deployed, and it does not overclaim. Its thresholds are provisional and clearly labelled as such. Its roadmap to validation is honest and specific. What it demonstrates is that a global rangeland early-warning capability can be built with public data, transparent methods, and a strict refusal to claim what the data cannot support.
