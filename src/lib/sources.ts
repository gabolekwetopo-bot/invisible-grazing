// =============================================================================
// INVISIBLE GRAZING — Data source catalog
// =============================================================================
// Every source is described honestly: resolution, cadence, access, licensing.
// We never imply access we do not have. New providers are added here only.
// =============================================================================

import type { DataSource, DataSourceKind } from '../types';

export const DATA_SOURCES: Record<DataSourceKind, DataSource> = {
  'sentinel-2': {
    id: 'sentinel-2',
    name: 'Sentinel-2 (ESA Copernicus)',
    description:
      'Multispectral optical imagery at 10–60 m. NDVI can be derived from ' +
      'bands B4 (red) and B8 (NIR). Global coverage; ~5-day revisit ' +
      'with both satellites. Cloud cover reduces usable observations.',
    spatialResolution: '10 m (visible/NIR)',
    temporalResolution: '~5 days',
    homepage: 'https://dataspace.copernicus.eu/',
    simulated: false,
  },
  modis: {
    id: 'modis',
    name: 'MODIS (NASA)',
    description:
      'MOD13Q1 / MOD13A2 vegetation indices (NDVI, EVI) at 250 m–1 km. ' +
      'Reliable long historical record since 2000; ideal for broad-area trend ' +
      'monitoring where 250 m is sufficient.',
    spatialResolution: '250 m – 1 km',
    temporalResolution: '16 days',
    homepage: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php',
    simulated: false,
  },
  chirps: {
    id: 'chirps',
    name: 'CHIRPS rainfall (UCSB / USGS)',
    description:
      'Quasi-global daily and monthly rainfall, 0.05° (~5.5 km). ' +
      'Merges satellite thermal IR with station data; widely used in dryland studies.',
    spatialResolution: '0.05° (~5.5 km)',
    temporalResolution: 'daily / monthly',
    homepage: 'https://www.chc.ucsb.edu/data/chirps',
    simulated: false,
  },
  'nasa-power': {
    id: 'nasa-power',
    name: 'NASA POWER',
    description:
      'Meteorological and solar datasets derived from MERRA-2 and satellite ' +
      'sources, available on a 0.5° × 0.625° grid via a public REST API. ' +
      'Useful for precipitation and temperature context alongside vegetation.',
    spatialResolution: '0.5° × 0.625°',
    temporalResolution: 'daily / monthly',
    homepage: 'https://power.larc.nasa.gov/',
    simulated: false,
  },
  era5: {
    id: 'era5',
    name: 'ERA5 climate reanalysis (ECMWF)',
    description:
      'Global reanalysis of climate variables, 0.25° grid. Used here only as ' +
      'supporting climate context — not as a direct vegetation measurement.',
    spatialResolution: '0.25° (~31 km)',
    temporalResolution: 'hourly / monthly',
    homepage: 'https://www.ecmwf.int/en/forecasts/datasets/reanalysis-datasets/era5',
    simulated: false,
  },
  field: {
    id: 'field',
    name: 'Field observation',
    description:
      'In-situ measurement entered by a user. Required for any claim about ' +
      'confirmed grazing activity or direct biodiversity indicators.',
    homepage: undefined,
    simulated: false,
  },
  demonstration: {
    id: 'demonstration',
    name: 'Demonstration data (simulated)',
    description:
      'Explicitly simulated values used only to demonstrate the interface ' +
      'when live data is unavailable. NEVER presented as satellite observations.',
    simulated: true,
  },
};

/** Convenience list, useful for the "Data Sources" info panel. */
export const ALL_SOURCES: DataSource[] = Object.values(DATA_SOURCES);

/** True if the given source id produces real (non-simulated) observations. */
export function isRealSource(id: DataSourceKind): boolean {
  return !DATA_SOURCES[id].simulated;
}
