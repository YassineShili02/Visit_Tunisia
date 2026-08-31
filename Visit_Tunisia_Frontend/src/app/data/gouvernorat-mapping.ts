/**
 * Mapping entre les noms de gouvernorats du GeoJSON (NAME_EN) et les noms utilisés dans le frontend (GOVERNORATES)
 * 
 * GeoJSON source: tunisia-gouvernorats.geojson
 * Propriété utilisée: NAME_EN
 */
export const GEOJSON_TO_FRONTEND_GOUVERNORAT: Record<string, string> = {
  'Ariana': 'Ariana',
  'Beja': 'Béja',
  'Ben Arous': 'Ben Arous',
  'Bizerte': 'Bizerte',
  'Gabes': 'Gabès',
  'Gafsa': 'Gafsa',
  'Jendouba': 'Jendouba',
  'Kairouan': 'Kairouan',
  'Kasserine': 'Kasserine',
  'Kebili': 'Kébili',
  'Le Kef': 'Le Kef',
  'Mahdia': 'Mahdia',
  'Manouba': 'La Manouba',
  'Medenine': 'Médenine',
  'Monastir': 'Monastir',
  'Nabeul': 'Nabeul',
  'Sfax': 'Sfax',
  'Sidi Bouzid': 'Sidi Bouzid',
  'Siliana': 'Siliana',
  'Sousse': 'Sousse',
  'Tataouine': 'Tataouine',
  'Tozeur': 'Tozeur',
  'Tunis': 'Tunis',
  'Zaghouan': 'Zaghouan',
};

/**
 * Mapping inverse: frontend → GeoJSON
 */
export const FRONTEND_TO_GEOJSON_GOUVERNORAT: Record<string, string> = Object.fromEntries(
  Object.entries(GEOJSON_TO_FRONTEND_GOUVERNORAT).map(([k, v]) => [v, k])
);
