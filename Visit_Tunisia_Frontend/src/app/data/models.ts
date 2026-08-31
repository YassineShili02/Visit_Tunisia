export interface Destination {
  id: number;
  name: string;
  shortName: string;
  region: string;
  category: string; // Primary category (for backward compatibility)
  categories?: string[]; // All categories (for destinations with multiple categories)
  type: string;
  estType: string;
  rating: number;
  reviews: number;
  price: number;
  img: string;
  mapX: number;
  mapY: number;
  latitude?: number;
  longitude?: number;
  nombreAvis?: number;  // Nombre d'avis validés depuis le backend
  noteAverage?: number; // Note moyenne depuis le backend
  photos?: string[];    // Liste complète des photos
  description?: string; // Description de la destination
  horaires?: any;       // Horaires d'ouverture
  accessibilitePmr?: boolean; // Accessibilité PMR
}

export interface DestinationPin {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  price: number;
  img?: string;
}

export interface Experience {
  icon: string;
  label: string;
  count: string;
  color: string;
}

export interface EventItem {
  id: number;
  title: string;
  subtitle: string;
  photo: string;
  category: string;
  categoryColor: string;
  dateLabel: string;
  activeDays: number[];
  location: string;
  city: string;
  price: string;
  description: string;
  program: { day: string; items: string[] }[];
  tags: string[];
}

export interface FeaturedCard {
  id: number;
  name: string;
  region: string;
  type: string;
  category: string;
  categoryColor: string;
  img: string;
  rating: number;
  reviews: number;
}

export interface UpcomingEvent {
  name: string;
  date: string;
  location: string;
  img: string;
}

export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'TOURISTE' | 'ADMIN' | string;
  dateNaissance?: string;
  telephone?: string;
  pays?: string;
  preferences?: string[];
  languePreferee?: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  dateNaissance?: string;
  telephone?: string;
  pays?: string;
  languePreferee?: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface CompleteProfileRequest {
  dateNaissance?: string;
  telephone?: string;
  pays?: string;
  preferences?: string[];
  languePreferee?: string;
}

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  expiresInMs: number;
  utilisateur: AuthUser;
  newUser?: boolean;
  needsProfileCompletion?: boolean;
  emailVerificationRequired?: boolean;
}

export interface ApiResponse {
  message: string;
  success: boolean;
}

export interface Stop {
  time: string;
  name: string;
  cat: string;
  img: string;
  x: number;
  y: number;
  dur: string;
  transit?: string;
  latitude?: number;
  longitude?: number;
}

export interface DayData {
  id: number;
  label: string;
  date: string;
  city: string;
  stops: Stop[];
}

export interface FilterState {
  regions: string[];
  categories: string[];
  types: string[];
  maxPrice: number;
}

export interface SearchResult {
  id: string;
  numericId?: number;  // Real backend numeric ID for detail navigation
  type: 'destination' | 'event' | 'itinerary';
  title: string;
  subtitle: string;
  img?: string;
  category?: string;
  categoryColor?: string;
  page: string;
}

export interface ChatDestinationCard {
  id: number;
  name: string;
  region: string;
  category: string;
  type: string;
  price?: number | null;
  rating?: number | null;
  image?: string | null;
}

export interface ChatMsg {
  id: number;
  role: 'bot' | 'user';
  text: string;
  suggestions?: ChatDestinationCard[];
  quickQuestions?: string[];
  type?: 'upsell';
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: Date;
}

export interface AdminDestination {
  id: number;
  name: string;
  category: string;
  views: number;
  rating: number;
  status: string;
  updated: string;
}

export type DestinationStatut = 'BROUILLON' | 'ACTIF' | 'ARCHIVE';
export type StatusTab = 'TOUTES' | 'ACTIF' | 'BROUILLON' | 'ARCHIVE';

export interface ModerationDestination {
  id: number;
  nom: { fr: string; en?: string; ar?: string };
  description: { fr: string; en?: string };
  type: string;
  categories: string[];
  region: string;
  statut: DestinationStatut;
  qualityScore: number;
  photos: string[];
  latitude?: number;
  longitude?: number;
  tarifEstime?: number;
  accessibilitePmr?: boolean;
  horaires?: Record<string, string>;
  source: 'import_auto' | 'manuel';
  createdAt: string;
  wikidataId?: string;
  isRead?: boolean;
}

export interface AdminEvenement {
  id: number;
  nom: { fr: string; en?: string; ar?: string };
  description: { fr: string; en?: string; ar?: string };
  genre: string;
  dateDebut?: string;
  dateFin?: string;
  statut: DestinationStatut;
  tarif?: number;
  photos: string[];
  destinationId?: number;
  destinationNom?: string;
  destinationRegion?: string;
  lieuLibre?: string;
  lienEvenement?: string;
}

export type AdminEvent = AdminEvenement;

export interface AdminUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  pays?: string;
  dateNaissance?: string;
  role: string;
  statut: string;
  provider: string;
  languePreferee?: string;
  preferences?: string[];
  dateCreation: string;
  dateCreationFormatted: string;
}

export interface AdminReview {
  id: number;
  author: string;
  destination: string;
  rating: number;
  excerpt: string;
  date: string;
  status: string;
}

export interface ActivityRow {
  id: number;
  datetime: string;
  admin: string;
  action: string;
  entity: string;
  details: string;
}

export interface JournalEntry {
  journalId: number;
  typeAction: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'MODERATION' | 'CONNEXION' | 'DECONNEXION';
  entiteType: 'DESTINATION' | 'EVENEMENT' | 'AVIS' | 'UTILISATEUR' | 'CONVERSATION' | 'ITINERAIRE';
  details: string;
  dateAction: string;
  utilisateurId?: number;
  utilisateurNom?: string;
  utilisateurEmail?: string;
  utilisateurRole?: string;
}

export interface PaginatedJournal {
  content: JournalEntry[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PracticalInfo {
  icon: string;
  label: string;
  value: string;
}

export interface ReviewData {
  id: number;
  author: string;
  origin: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
}

export interface PhotoData {
  id: number;
  url: string;
  thumb: string;
  alt: string;
}
