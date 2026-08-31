export const NAV_LINKS = ["Accueil", "Explorer", "Itinéraires", "Événements"];
export const LANGUAGES = ["FR", "AR", "EN", "IT", "DE"];

export const CATEGORY_COLORS: Record<string, string> = {
  Culturel: '#1B6FA8',
  Balnéaire: '#7EC8E3',
  Écologique: '#6B8E4E',
  Gastronomique: '#E0A458',
  Aventure: '#D97D45',
  Religieux: '#8B6FB5',
};

export const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

export const EST_TYPES = ['Site touristique', 'Restaurant', 'Hébergement', 'Activité', 'Commerce'];

export const CITIES = [
  'Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Gabès', 'Kairouan', 'Monastir', 'Nabeul',
  'Mahdia', 'Hammamet', 'Djerba', 'Tozeur', 'Tabarka', 'Sidi Bou Saïd', 'El Jem',
];

export const INTERESTS = [
  { label: 'Culturel', color: '#1B6FA8' },
  { label: 'Balnéaire', color: '#7EC8E3' },
  { label: 'Gastronomique', color: '#E0A458' },
  { label: 'Aventure', color: '#D97D45' },
  { label: 'Religieux', color: '#8B6FB5' },
  { label: 'Écologique', color: '#6B8E4E' },
  { label: 'Randonnée', color: '#6B8E4E' },
  { label: 'Plongée', color: '#7EC8E3' },
  { label: 'Photographie', color: '#1B6FA8' },
  { label: 'Architecture', color: '#D97D45' },
  { label: 'Cuisine locale', color: '#E0A458' },
  { label: 'Artisanat', color: '#8B6FB5' },
  { label: 'Sports nautiques', color: '#7EC8E3' },
  { label: 'Thermalisme', color: '#6B8E4E' },
];

export const DAY_COLORS = ['#1B6FA8', '#6B8E4E', '#D97D45', '#8B6FB5', '#E0A458'];
export const STEP_LABELS = ['stepDurationBudget', 'stepInterests', 'stepDeparture'];

export const TUNISIA_PATH = 'M 90,28 L 240,5 L 268,40 L 290,30 L 350,22 L 330,65 L 308,112 L 330,152 L 325,192 L 285,242 L 340,255 L 362,270 L 395,295 L 368,390 L 185,458 L 105,425 L 92,342 L 88,275 L 96,195 L 105,115 Z';

export const NAV_PAGE_MAP: Record<string, string> = {
  Accueil: 'home',
  Explorer: 'catalog',
  'Itinéraires': 'itinerary-form',
  'Événements': 'events',
};


export const LANGUAGES_FULL = [
  { code: 'FR', label: 'Français', native: 'Français' },
  { code: 'AR', label: 'Arabe', native: 'عربي' },
  { code: 'EN', label: 'Anglais', native: 'English' },
  { code: 'IT', label: 'Italien', native: 'Italiano' },
  { code: 'DE', label: 'Allemand', native: 'Deutsch' },
];

export const EVENT_GENRES = [
  'Musical',
  'Culturel',
  'Cinéma',
  'Sportif',
  'Religieux',
  'Gastronomique',
  'Théâtre',
  'Festival',
  'Art & Artisanat',
  'Traditionnel'
];

export const EVENT_CATEGORY_FILTERS = ['Tous', ...EVENT_GENRES];

export const FR_DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

export interface CountryCode {
  code: string;
  name: string;
  dial: string;
}

export interface PhoneRule {
  minLen: number;
  maxLen: number;
  placeholder: string;
}

export function getPhoneRule(countryCode: string): PhoneRule {
  const code = (countryCode || '').toUpperCase();
  switch (code) {
    case 'TN': // Tunisie (+216) -> 8 chiffres exacts
      return { minLen: 8, maxLen: 8, placeholder: 'XX XXX XXX' };

    case 'FR': // France (+33)
    case 'DZ': // Algérie (+213)
    case 'MA': // Maroc (+212)
    case 'ES': // Espagne (+34)
    case 'IT': // Italie (+39)
    case 'SA': // Arabie Saoudite (+966)
    case 'AE': // Émirats Arabes Unis (+971)
    case 'LY': // Libye (+218)
    case 'JO': // Jordanie (+962)
    case 'BE': // Belgique (+32)
    case 'CH': // Suisse (+41)
    case 'PT': // Portugal (+351)
    case 'GR': // Grèce (+30)
    case 'NL': // Pays-Bas (+31)
    case 'SE': // Suède (+46)
    case 'NO': // Norvège (+47)
    case 'FI': // Finlande (+358)
    case 'SN': // Sénégal (+221)
    case 'CM': // Cameroun (+237)
      return { minLen: 9, maxLen: 9, placeholder: 'X XX XX XX XX' };

    case 'CI': // Côte d'Ivoire (+225)
    case 'US': // États-Unis (+1)
    case 'CA': // Canada (+1)
    case 'DE': // Allemagne (+49)
    case 'GB': // Royaume-Uni (+44)
    case 'TR': // Turquie (+90)
    case 'EG': // Égypte (+20)
    case 'IN': // Inde (+91)
    case 'PK': // Pakistan (+92)
    case 'NG': // Nigéria (+234)
    case 'ZA': // Afrique du Sud (+27)
    case 'JP': // Japon (+81)
    case 'RU': // Russie (+7)
    case 'MX': // Mexique (+52)
      return { minLen: 10, maxLen: 10, placeholder: 'XXX XXX XXXX' };

    case 'CN': // Chine (+86)
    case 'BR': // Brésil (+55)
      return { minLen: 11, maxLen: 11, placeholder: 'XXX XXXX XXXX' };

    case 'DK': // Danemark (+45)
    case 'QA': // Qatar (+974)
    case 'KW': // Koweït (+965)
    case 'BH': // Bahreïn (+973)
    case 'OM': // Oman (+968)
    case 'LB': // Liban (+961)
    case 'SG': // Singapour (+65)
    case 'MT': // Malte (+356)
    case 'CY': // Chypre (+357)
      return { minLen: 8, maxLen: 8, placeholder: 'XXXX XXXX' };

    default:
      return { minLen: 7, maxLen: 11, placeholder: 'XX XXX XXX' };
  }
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'AF', name: 'Afghanistan', dial: '+93' },
  { code: 'ZA', name: 'Afrique du Sud', dial: '+27' },
  { code: 'AL', name: 'Albanie', dial: '+355' },
  { code: 'DZ', name: 'Algérie', dial: '+213' },
  { code: 'DE', name: 'Allemagne', dial: '+49' },
  { code: 'AD', name: 'Andorre', dial: '+376' },
  { code: 'AO', name: 'Angola', dial: '+244' },
  { code: 'AG', name: 'Antigua-et-Barbuda', dial: '+1268' },
  { code: 'SA', name: 'Arabie Saoudite', dial: '+966' },
  { code: 'AR', name: 'Argentine', dial: '+54' },
  { code: 'AM', name: 'Arménie', dial: '+374' },
  { code: 'AU', name: 'Australie', dial: '+61' },
  { code: 'AT', name: 'Autriche', dial: '+43' },
  { code: 'AZ', name: 'Azerbaïdjan', dial: '+994' },
  { code: 'BS', name: 'Bahamas', dial: '+1242' },
  { code: 'BH', name: 'Bahreïn', dial: '+973' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'BB', name: 'Barbade', dial: '+1246' },
  { code: 'BE', name: 'Belgique', dial: '+32' },
  { code: 'BZ', name: 'Belize', dial: '+501' },
  { code: 'BJ', name: 'Bénin', dial: '+229' },
  { code: 'BT', name: 'Bhoutan', dial: '+975' },
  { code: 'BY', name: 'Biélorussie', dial: '+375' },
  { code: 'MM', name: 'Birmanie (Myanmar)', dial: '+95' },
  { code: 'BO', name: 'Bolivie', dial: '+591' },
  { code: 'BA', name: 'Bosnie-Herzégovine', dial: '+387' },
  { code: 'BW', name: 'Botswana', dial: '+267' },
  { code: 'BR', name: 'Brésil', dial: '+55' },
  { code: 'BN', name: 'Brunei', dial: '+673' },
  { code: 'BG', name: 'Bulgarie', dial: '+359' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'BI', name: 'Burundi', dial: '+257' },
  { code: 'KH', name: 'Cambodge', dial: '+855' },
  { code: 'CM', name: 'Cameroun', dial: '+237' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'CV', name: 'Cap-Vert', dial: '+238' },
  { code: 'CL', name: 'Chili', dial: '+56' },
  { code: 'CN', name: 'Chine', dial: '+86' },
  { code: 'CY', name: 'Chypre', dial: '+357' },
  { code: 'CO', name: 'Colombie', dial: '+57' },
  { code: 'KM', name: 'Comores', dial: '+269' },
  { code: 'CG', name: 'Congo-Brazzaville', dial: '+242' },
  { code: 'CD', name: 'Congo-Kinshasa (RDC)', dial: '+243' },
  { code: 'KP', name: 'Corée du Nord', dial: '+850' },
  { code: 'KR', name: 'Corée du Sud', dial: '+82' },
  { code: 'CR', name: 'Costa Rica', dial: '+506' },
  { code: 'CI', name: 'Côte d\'Ivoire', dial: '+225' },
  { code: 'HR', name: 'Croatie', dial: '+385' },
  { code: 'CU', name: 'Cuba', dial: '+53' },
  { code: 'DK', name: 'Danemark', dial: '+45' },
  { code: 'DJ', name: 'Djibouti', dial: '+253' },
  { code: 'DM', name: 'Dominique', dial: '+1767' },
  { code: 'EG', name: 'Égypte', dial: '+20' },
  { code: 'AE', name: 'Émirats Arabes Unis', dial: '+971' },
  { code: 'EC', name: 'Équateur', dial: '+593' },
  { code: 'ER', name: 'Érythrée', dial: '+291' },
  { code: 'ES', name: 'Espagne', dial: '+34' },
  { code: 'EE', name: 'Estonie', dial: '+372' },
  { code: 'SZ', name: 'Eswatini (Swaziland)', dial: '+268' },
  { code: 'US', name: 'États-Unis', dial: '+1' },
  { code: 'ET', name: 'Éthiopie', dial: '+251' },
  { code: 'FJ', name: 'Fidji', dial: '+679' },
  { code: 'FI', name: 'Finlande', dial: '+358' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'GA', name: 'Gabon', dial: '+241' },
  { code: 'GM', name: 'Gambie', dial: '+220' },
  { code: 'GE', name: 'Géorgie', dial: '+995' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'GR', name: 'Grèce', dial: '+30' },
  { code: 'GD', name: 'Grenade', dial: '+1473' },
  { code: 'GT', name: 'Guatemala', dial: '+502' },
  { code: 'GN', name: 'Guinée', dial: '+224' },
  { code: 'GW', name: 'Guinée-Bissau', dial: '+245' },
  { code: 'GQ', name: 'Guinée Équatoriale', dial: '+240' },
  { code: 'GY', name: 'Guyana', dial: '+592' },
  { code: 'HT', name: 'Haïti', dial: '+509' },
  { code: 'HN', name: 'Honduras', dial: '+504' },
  { code: 'HU', name: 'Hongrie', dial: '+36' },
  { code: 'IN', name: 'Inde', dial: '+91' },
  { code: 'ID', name: 'Indonésie', dial: '+62' },
  { code: 'IQ', name: 'Irak', dial: '+964' },
  { code: 'IR', name: 'Iran', dial: '+98' },
  { code: 'IE', name: 'Irlande', dial: '+353' },
  { code: 'IS', name: 'Islande', dial: '+354' },
  { code: 'IL', name: 'Israël', dial: '+972' },
  { code: 'IT', name: 'Italie', dial: '+39' },
  { code: 'JM', name: 'Jamaïque', dial: '+876' },
  { code: 'JP', name: 'Japon', dial: '+81' },
  { code: 'JO', name: 'Jordanie', dial: '+962' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'KG', name: 'Kirghizistan', dial: '+996' },
  { code: 'KI', name: 'Kiribati', dial: '+686' },
  { code: 'KW', name: 'Koweït', dial: '+965' },
  { code: 'LA', name: 'Laos', dial: '+856' },
  { code: 'LS', name: 'Lesotho', dial: '+266' },
  { code: 'LV', name: 'Lettonie', dial: '+371' },
  { code: 'LB', name: 'Liban', dial: '+961' },
  { code: 'LR', name: 'Libéria', dial: '+231' },
  { code: 'LY', name: 'Libye', dial: '+218' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423' },
  { code: 'LT', name: 'Lituanie', dial: '+370' },
  { code: 'LU', name: 'Luxembourg', dial: '+352' },
  { code: 'MK', name: 'Macédoine du Nord', dial: '+389' },
  { code: 'MG', name: 'Madagascar', dial: '+261' },
  { code: 'MY', name: 'Malaisie', dial: '+60' },
  { code: 'MW', name: 'Malawi', dial: '+265' },
  { code: 'MV', name: 'Maldives', dial: '+960' },
  { code: 'ML', name: 'Mali', dial: '+223' },
  { code: 'MT', name: 'Malte', dial: '+356' },
  { code: 'MA', name: 'Maroc', dial: '+212' },
  { code: 'MU', name: 'Maurice', dial: '+230' },
  { code: 'MR', name: 'Mauritanie', dial: '+222' },
  { code: 'MX', name: 'Mexique', dial: '+52' },
  { code: 'FM', name: 'Micronésie', dial: '+691' },
  { code: 'MD', name: 'Moldavie', dial: '+373' },
  { code: 'MC', name: 'Monaco', dial: '+377' },
  { code: 'MN', name: 'Mongolie', dial: '+976' },
  { code: 'ME', name: 'Monténégro', dial: '+382' },
  { code: 'MZ', name: 'Mozambique', dial: '+258' },
  { code: 'NA', name: 'Namibie', dial: '+264' },
  { code: 'NR', name: 'Nauru', dial: '+674' },
  { code: 'NP', name: 'Népal', dial: '+977' },
  { code: 'NI', name: 'Nicaragua', dial: '+505' },
  { code: 'NE', name: 'Niger', dial: '+227' },
  { code: 'NG', name: 'Nigéria', dial: '+234' },
  { code: 'NO', name: 'Norvège', dial: '+47' },
  { code: 'NZ', name: 'Nouvelle-Zélande', dial: '+64' },
  { code: 'OM', name: 'Oman', dial: '+968' },
  { code: 'UG', name: 'Ouganda', dial: '+256' },
  { code: 'UZ', name: 'Ouzbékistan', dial: '+998' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'PW', name: 'Palaos', dial: '+680' },
  { code: 'PS', name: 'Palestine', dial: '+970' },
  { code: 'PA', name: 'Panama', dial: '+507' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée', dial: '+675' },
  { code: 'PY', name: 'Paraguay', dial: '+595' },
  { code: 'NL', name: 'Pays-Bas', dial: '+31' },
  { code: 'PE', name: 'Pérou', dial: '+51' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'PL', name: 'Pologne', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'CF', name: 'République Centrafricaine', dial: '+236' },
  { code: 'DO', name: 'République Dominicaine', dial: '+1809' },
  { code: 'CZ', name: 'République Tchèque', dial: '+420' },
  { code: 'RO', name: 'Roumanie', dial: '+40' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44' },
  { code: 'RU', name: 'Russie', dial: '+7' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'KN', name: 'Saint-Christophe-et-Niévès', dial: '+1869' },
  { code: 'LC', name: 'Sainte-Lucie', dial: '+1758' },
  { code: 'SM', name: 'Saint-Marin', dial: '+378' },
  { code: 'VC', name: 'Saint-Vincent-et-les-Grenadines', dial: '+1784' },
  { code: 'SB', name: 'Salomon', dial: '+677' },
  { code: 'WS', name: 'Samoa', dial: '+685' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', dial: '+239' },
  { code: 'SN', name: 'Sénégal', dial: '+221' },
  { code: 'RS', name: 'Serbie', dial: '+381' },
  { code: 'SC', name: 'Seychelles', dial: '+248' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232' },
  { code: 'SG', name: 'Singapour', dial: '+65' },
  { code: 'SK', name: 'Slovaquie', dial: '+421' },
  { code: 'SI', name: 'Slovénie', dial: '+386' },
  { code: 'SO', name: 'Somalie', dial: '+252' },
  { code: 'SD', name: 'Soudan', dial: '+249' },
  { code: 'SS', name: 'Soudan du Sud', dial: '+211' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94' },
  { code: 'SE', name: 'Suède', dial: '+46' },
  { code: 'CH', name: 'Suisse', dial: '+41' },
  { code: 'SR', name: 'Suriname', dial: '+597' },
  { code: 'SY', name: 'Syrie', dial: '+963' },
  { code: 'TJ', name: 'Tadjikistan', dial: '+992' },
  { code: 'TZ', name: 'Tanzanie', dial: '+255' },
  { code: 'TD', name: 'Tchad', dial: '+235' },
  { code: 'TH', name: 'Thaïlande', dial: '+66' },
  { code: 'TL', name: 'Timor Oriental', dial: '+670' },
  { code: 'TG', name: 'Togo', dial: '+228' },
  { code: 'TO', name: 'Tonga', dial: '+676' },
  { code: 'TT', name: 'Trinité-et-Tobago', dial: '+1868' },
  { code: 'TN', name: 'Tunisie', dial: '+216' },
  { code: 'TM', name: 'Turkménistan', dial: '+993' },
  { code: 'TR', name: 'Turquie', dial: '+90' },
  { code: 'TV', name: 'Tuvalu', dial: '+688' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'UY', name: 'Uruguay', dial: '+598' },
  { code: 'VU', name: 'Vanuatu', dial: '+678' },
  { code: 'VA', name: 'Vatican', dial: '+379' },
  { code: 'VE', name: 'Venezuela', dial: '+58' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'YE', name: 'Yémen', dial: '+967' },
  { code: 'ZM', name: 'Zambie', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263' }
];
