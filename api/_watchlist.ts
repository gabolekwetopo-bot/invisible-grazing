// =============================================================================
// INVISIBLE GRAZING — global watchlist
// =============================================================================
// 40 real rangeland coordinates, sampled across the world's drylands. These
// are the sites the scheduled scan checks every day. Every coordinate is a
// genuine place. No risk level is assumed; each is assessed from the real
// Sentinel-2 and NASA POWER data at that point.
// =============================================================================

export interface WatchSite {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export const GLOBAL_WATCHLIST: WatchSite[] = [
  // ---- Africa (12) ----
  { id: 'wl-bot-kalahari-n', name: 'Kalahari north transect',   region: 'Botswana',       latitude: -21.20, longitude:  23.40, radiusKm: 25 },
  { id: 'wl-bot-okavango',   name: 'Okavango Delta margin',     region: 'Botswana',       latitude: -19.50, longitude:  22.90, radiusKm: 25 },
  { id: 'wl-nam-etch',       name: 'Etosha pan margin',         region: 'Namibia',        latitude: -18.90, longitude:  16.10, radiusKm: 25 },
  { id: 'wl-zaf-karoo',      name: 'Karoo semi-desert',         region: 'South Africa',   latitude: -32.00, longitude:  22.50, radiusKm: 25 },
  { id: 'wl-zaf-namaqua',    name: 'Namaqualand',               region: 'South Africa',   latitude: -29.50, longitude:  17.80, radiusKm: 25 },
  { id: 'wl-tza-serengeti',  name: 'Serengeti plains',          region: 'Tanzania',       latitude:  -2.30, longitude:  34.80, radiusKm: 25 },
  { id: 'wl-ken-mara',       name: 'Maasai Mara',               region: 'Kenya',          latitude:  -1.50, longitude:  35.10, radiusKm: 25 },
  { id: 'wl-ken-tsavo',      name: 'Tsavo rangeland',           region: 'Kenya',          latitude:  -2.90, longitude:  38.50, radiusKm: 25 },
  { id: 'wl-ner-sahel',      name: 'Sahel Niger',               region: 'Niger',          latitude:  14.50, longitude:   6.00, radiusKm: 25 },
  { id: 'wl-mli-sahel',      name: 'Sahel Mali',                region: 'Mali',           latitude:  15.50, longitude:  -3.00, radiusKm: 25 },
  { id: 'wl-eth-horn',       name: 'Horn of Africa rangeland',  region: 'Ethiopia',       latitude:   5.50, longitude:  42.50, radiusKm: 25 },
  { id: 'wl-som-north',      name: 'Somaliland plains',         region: 'Somalia',        latitude:   9.20, longitude:  46.20, radiusKm: 25 },

  // ---- Australia (6) ----
  { id: 'wl-aus-nt',         name: 'NT tropical savanna',       region: 'Australia',      latitude: -14.50, longitude: 132.50, radiusKm: 25 },
  { id: 'wl-aus-qld',        name: 'Queensland Mitchell grass', region: 'Australia',      latitude: -22.50, longitude: 143.50, radiusKm: 25 },
  { id: 'wl-aus-nsw',        name: 'NSW Riverina grassland',    region: 'Australia',      latitude: -34.00, longitude: 146.00, radiusKm: 25 },
  { id: 'wl-aus-wa-gold',    name: 'WA Goldfields',             region: 'Australia',      latitude: -30.50, longitude: 121.50, radiusKm: 25 },
  { id: 'wl-aus-pilbara',    name: 'Pilbara rangeland',         region: 'Australia',      latitude: -21.50, longitude: 118.50, radiusKm: 25 },
  { id: 'wl-aus-arnhem',     name: 'Arnhem Land savanna',       region: 'Australia',      latitude: -12.50, longitude: 134.50, radiusKm: 25 },

  // ---- Central Asia (6) ----
  { id: 'wl-mng-steppe-e',   name: 'Mongolian steppe east',     region: 'Mongolia',       latitude:  47.50, longitude: 110.50, radiusKm: 25 },
  { id: 'wl-mng-gobi',       name: 'Gobi steppe margin',        region: 'Mongolia',       latitude:  44.00, longitude: 105.00, radiusKm: 25 },
  { id: 'wl-kaz-steppe',     name: 'Kazakh steppe',             region: 'Kazakhstan',     latitude:  50.50, longitude:  68.50, radiusKm: 25 },
  { id: 'wl-tib-plateau',    name: 'Tibetan Plateau',           region: 'China',          latitude:  33.50, longitude:  88.50, radiusKm: 25 },
  { id: 'wl-tkm-karakum',    name: 'Karakum desert',            region: 'Turkmenistan',   latitude:  39.50, longitude:  58.50, radiusKm: 25 },
  { id: 'wl-uzb-kyzylkum',   name: 'Kyzylkum desert',           region: 'Uzbekistan',     latitude:  42.00, longitude:  63.50, radiusKm: 25 },

  // ---- South America (6) ----
  { id: 'wl-arg-patagonia',  name: 'Patagonian steppe',         region: 'Argentina',      latitude: -45.00, longitude: -68.50, radiusKm: 25 },
  { id: 'wl-arg-pampas',     name: 'Argentine Pampas',          region: 'Argentina',      latitude: -35.50, longitude: -60.50, radiusKm: 25 },
  { id: 'wl-bra-cerrado',    name: 'Brazilian Cerrado',         region: 'Brazil',         latitude: -15.50, longitude: -47.50, radiusKm: 25 },
  { id: 'wl-bol-altiplano',  name: 'Bolivian Altiplano',        region: 'Bolivia',        latitude: -18.50, longitude: -68.50, radiusKm: 25 },
  { id: 'wl-chl-atacama',    name: 'Atacama margin',            region: 'Chile',          latitude: -23.50, longitude: -69.50, radiusKm: 25 },
  { id: 'wl-pry-chaco',      name: 'Paraguayan Chaco',          region: 'Paraguay',       latitude: -22.00, longitude: -60.50, radiusKm: 25 },

  // ---- North America (6) ----
  { id: 'wl-usa-gp-s',       name: 'Southern Great Plains',     region: 'United States',  latitude:  33.50, longitude: -100.50, radiusKm: 25 },
  { id: 'wl-usa-gp-n',       name: 'Northern Great Plains',     region: 'United States',  latitude:  46.50, longitude: -104.50, radiusKm: 25 },
  { id: 'wl-usa-sonoran',    name: 'Sonoran desert',            region: 'United States',  latitude:  32.50, longitude: -112.50, radiusKm: 25 },
  { id: 'wl-usa-chihuahua',  name: 'Chihuahuan desert',         region: 'United States',  latitude:  31.50, longitude: -106.50, radiusKm: 25 },
  { id: 'wl-usa-basin',      name: 'Great Basin rangeland',     region: 'United States',  latitude:  40.50, longitude: -117.50, radiusKm: 25 },
  { id: 'wl-can-prairie',    name: 'Canadian prairie',          region: 'Canada',         latitude:  51.50, longitude: -106.50, radiusKm: 25 },

  // ---- Europe (2) ----
  { id: 'wl-esp-dehesa',     name: 'Spanish Dehesa',            region: 'Spain',          latitude:  38.50, longitude:  -6.00, radiusKm: 25 },
  { id: 'wl-hun-puszta',     name: 'Hungarian Puszta',          region: 'Hungary',        latitude:  47.00, longitude:  19.50, radiusKm: 25 },

  // ---- Middle East (2) ----
  { id: 'wl-isr-negev',      name: 'Negev highlands',           region: 'Israel',         latitude:  30.50, longitude:  34.80, radiusKm: 25 },
  { id: 'wl-tur-anatolia',   name: 'Anatolian steppe',          region: 'Turkey',         latitude:  39.00, longitude:  34.00, radiusKm: 25 },
];
