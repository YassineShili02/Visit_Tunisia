export const ADMIN_DESTINATIONS_DATA = [
  { id:1, name:"Amphithéâtre d'El Jem", category:"Culturel", views:12450, rating:4.8, status:"Publié", updated:"12 juil 2026" },
  { id:2, name:"Médina de Tunis", category:"Culturel", views:9820, rating:4.7, status:"Publié", updated:"10 juil 2026" },
  { id:3, name:"Île de Djerba", category:"Balnéaire", views:8340, rating:4.6, status:"Publié", updated:"8 juil 2026" },
  { id:4, name:"Sidi Bou Saïd", category:"Culturel", views:7960, rating:4.9, status:"Publié", updated:"15 juil 2026" },
  { id:5, name:"Désert de Douz", category:"Aventure", views:6700, rating:4.7, status:"Publié", updated:"5 juil 2026" },
  { id:6, name:"Dougga", category:"Culturel", views:5430, rating:4.5, status:"Brouillon", updated:"3 juil 2026" },
  { id:7, name:"Hammamet", category:"Balnéaire", views:4980, rating:4.4, status:"Publié", updated:"1 juil 2026" },
  { id:8, name:"Parc national de Boukornine", category:"Écologique", views:2310, rating:4.3, status:"Brouillon", updated:"18 juin 2026" },
];

export const ADMIN_EVENTS_DATA = [
  { id:1, title:"Festival International de Carthage", category:"Musique", date:"25 juil – 26 août", venue:"Théâtre de Carthage", tickets:4820, status:"Actif" },
  { id:2, title:"Festival de Jazz de Tabarka", category:"Musique", date:"10 – 14 juil", venue:"Forteresse de Tabarka", tickets:1240, status:"Terminé" },
  { id:3, title:"Festival International de Hammamet", category:"Arts", date:"20 – 30 juil", venue:"CCH de Hammamet", tickets:3310, status:"Actif" },
  { id:4, title:"Les Nuits de la Médina", category:"Culturel", date:"5 – 12 juil", venue:"Médina de Tunis", tickets:0, status:"Gratuit" },
  { id:5, title:"Festival du Sahara de Douz", category:"Aventure", date:"12 – 15 déc", venue:"Arène de Douz", tickets:890, status:"À venir" },
  { id:6, title:"JCC", category:"Cinéma", date:"1 – 9 nov", venue:"Palais des Congrès", tickets:2100, status:"À venir" },
];

// Users data is now loaded from backend via AdminUserService
export const ADMIN_USERS_DATA: any[] = [];

export const ADMIN_REVIEWS_DATA = [
  { id:1, author:"Layla Ben Ali", destination:"Amphithéâtre d'El Jem", rating:5, excerpt:"Absolument magnifique, un chef-d'œuvre de l'architecture romaine…", date:"14 juil 2026", status:"En attente" },
  { id:2, author:"Karim Mzabi", destination:"Médina de Tunis", rating:3, excerpt:"Expérience mitigée, trop de vendeurs insistants dans la médina…", date:"13 juil 2026", status:"En attente" },
  { id:3, author:"Tourist123", destination:"Île de Djerba", rating:1, excerpt:"Totalement décevant — rien à voir avec les photos promotionnelles…", date:"12 juil 2026", status:"En attente" },
  { id:4, author:"Yasmine Ouertani", destination:"Sidi Bou Saïd", rating:5, excerpt:"Coup de cœur absolu ! Le village le plus photogénique du pays…", date:"11 juil 2026", status:"Approuvé" },
  { id:5, author:"Pierre Dumont", destination:"Dougga", rating:4, excerpt:"Site impressionnant, bien conservé. Prévoir de bonnes chaussures…", date:"10 juil 2026", status:"Approuvé" },
  { id:6, author:"@spam_bot_77", destination:"Festival de Carthage", rating:1, excerpt:"PROMO LIEN EXTERNE CLIQUEZ ICI OFFRE LIMITÉE…", date:"9 juil 2026", status:"En attente" },
];

export const ACTIVITY_DATA = [
  { id:1,  datetime:"18/07/2026 09:14", admin:"Sana Mejri", action:"Connexion", entity:"—", details:"Connexion depuis Chrome / Tunis" },
  { id:2,  datetime:"18/07/2026 09:22", admin:"Sana Mejri", action:"Création", entity:"Destination : Tabarka", details:"Nouvelle fiche destination ajoutée (statut : Brouillon)" },
  { id:3,  datetime:"18/07/2026 10:05", admin:"Karim Belhaj", action:"Connexion", entity:"—", details:"Connexion depuis Safari / Sfax" },
  { id:4,  datetime:"18/07/2026 10:18", admin:"Karim Belhaj", action:"Modification", entity:"Destination : El Jem", details:"Mise à jour de la description (EN)" },
  { id:5,  datetime:"18/07/2026 10:44", admin:"Sana Mejri", action:"Modération", entity:"Avis #1047", details:"Avis approuvé — utilisateur : mariam.ch" },
  { id:6,  datetime:"18/07/2026 11:02", admin:"Sana Mejri", action:"Modération", entity:"Avis #1052", details:"Avis rejeté — contenu inapproprié" },
  { id:7,  datetime:"18/07/2026 11:30", admin:"Admin Système", action:"Modification", entity:"Événement : Festival Sahara", details:"Modification du tarif (45 DT → 50 DT)" },
  { id:8,  datetime:"18/07/2026 13:15", admin:"Karim Belhaj", action:"Création", entity:"Événement : Jazz à Tabarka", details:"Nouvelle fiche événement créée (statut : Actif)" },
  { id:9,  datetime:"18/07/2026 14:00", admin:"Sana Mejri", action:"Suppression", entity:"Destination : Hébergement X", details:"Fiche supprimée définitivement" },
  { id:10, datetime:"18/07/2026 14:33", admin:"Admin Système", action:"Modification", entity:"Utilisateur #2231", details:"Compte suspendu — signalement" },
  { id:11, datetime:"18/07/2026 15:10", admin:"Karim Belhaj", action:"Modération", entity:"Avis #1063", details:"Avis approuvé — utilisateur : youssef.mn" },
  { id:12, datetime:"18/07/2026 16:02", admin:"Sana Mejri", action:"Modification", entity:"Destination : Djerba", details:"Photos mises à jour (3 nouvelles photos)" },
  { id:13, datetime:"18/07/2026 16:45", admin:"Karim Belhaj", action:"Déconnexion", entity:"—", details:"Session terminée" },
  { id:14, datetime:"17/07/2026 08:55", admin:"Admin Système", action:"Connexion", entity:"—", details:"Connexion système — maintenance programmée" },
  { id:15, datetime:"17/07/2026 09:30", admin:"Admin Système", action:"Modification", entity:"Destination : Bardo", details:"Mise à jour des coordonnées GPS" },
  { id:16, datetime:"17/07/2026 11:00", admin:"Sana Mejri", action:"Création", entity:"Destination : Cap Bon", details:"Fiche publiée directement (statut : Actif)" },
  { id:17, datetime:"17/07/2026 14:20", admin:"Karim Belhaj", action:"Suppression", entity:"Événement : Concert annulé", details:"Événement retiré (annulation organisateur)" },
  { id:18, datetime:"16/07/2026 10:10", admin:"Sana Mejri", action:"Modération", entity:"Avis #1031", details:"Avis signalé — transmis à la modération" },
];

export const TRAFFIC_DATA = [
  {d:"1",v:3240,s:1820},{d:"2",v:2980,s:1640},{d:"3",v:3450,s:1920},{d:"4",v:3800,s:2140},
  {d:"5",v:4100,s:2380},{d:"6",v:5200,s:3100},{d:"7",v:5800,s:3400},
  {d:"8",v:4200,s:2400},{d:"9",v:3900,s:2200},{d:"10",v:4500,s:2600},
  {d:"11",v:4800,s:2750},{d:"12",v:5100,s:2980},{d:"13",v:6200,s:3600},{d:"14",v:6800,s:3900},
  {d:"15",v:4600,s:2650},{d:"16",v:4300,s:2450},{d:"17",v:4700,s:2700},{d:"18",v:3100,s:1750},
];

export const ACTION_STYLE: Record<string, { bg: string; color: string }> = {
  'Création':     { bg:'rgba(16,185,129,0.1)',  color:'#059669' },
  'Modification': { bg:'rgba(27,111,168,0.1)',  color:'#1B6FA8' },
  'Suppression':  { bg:'rgba(239,68,68,0.1)',   color:'#DC2626' },
  'Modération':   { bg:'rgba(217,125,69,0.12)', color:'#D97D45' },
  'Connexion':    { bg:'rgba(107,107,107,0.08)',color:'#6B7A90' },
  'Déconnexion':  { bg:'rgba(107,107,107,0.08)',color:'#6B7A90' },
};

export const ALL_ADMINS = ['Tous', 'Sana Mejri', 'Karim Belhaj', 'Admin Système'];
export const ALL_ACTIONS = ['Tous','Création','Modification','Suppression','Modération','Connexion','Déconnexion'];

export const STATUS_COLORS: Record<string, string> = {
  'Publié': '#059669',
  'Brouillon': '#D97706',
  'Actif': '#059669',
  'Terminé': '#6B7A90',
  'Gratuit': '#1B6FA8',
  'À venir': '#8B6FB5',
  'Inactif': '#9CA3AF',
  'Suspendu': '#DC2626',
  'Approuvé': '#059669',
  'En attente': '#D97706',
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'CULTUREL':    { bg: 'rgba(59,130,246,0.12)', text: '#2563EB' },
  'BALNEAIRE':   { bg: 'rgba(6,182,212,0.12)',  text: '#0891B2' },
  'AVENTURE':    { bg: 'rgba(234,88,12,0.12)',  text: '#EA580C' },
  'ECOLOGIQUE':  { bg: 'rgba(22,163,74,0.12)',  text: '#16A34A' },
  'GASTRONOMIE': { bg: 'rgba(168,85,247,0.12)', text: '#9333EA' },
  'RELIGIEUX':   { bg: 'rgba(202,138,4,0.12)',  text: '#CA8A04' },
  'ARTISANAL':   { bg: 'rgba(217,125,69,0.12)', text: '#D97D45' },
};

export const GOUVERNORATS_LIST = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Le Kef','Mahdia','La Manouba','Médenine','Monastir',
  'Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'
];

import { ModerationDestination } from './models';

export const MODERATION_DESTINATIONS_DATA: ModerationDestination[] = [
  {
    id: 101, nom: { fr: 'Musée Archéologique de Nabeul', en: 'Nabeul Archaeological Museum' },
    description: { fr: 'Le musée archéologique de Nabeul abrite une collection exceptionnelle de mosaïques romaines et de poteries puniques, datant du IIe siècle av. J.-C. au Ve siècle apr. J.-C.' },
    type: 'SITE_TOURISTIQUE', categories: ['CULTUREL'], region: 'Nabeul', statut: 'BROUILLON',
    qualityScore: 78, photos: ['https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400'],
    latitude: 36.4513, longitude: 10.7356, tarifEstime: 8, accessibilitePmr: true,
    horaires: { lundi: '09:00-17:00', mardi: '09:00-17:00', mercredi: '09:00-17:00', jeudi: '09:00-17:00', vendredi: '09:00-17:00', samedi: '09:00-13:00', dimanche: 'Fermé' },
    source: 'import_auto', createdAt: '2026-08-01T08:30:00Z', wikidataId: 'Q3329732',
  },
  {
    id: 102, nom: { fr: 'Fort de Kélibia' },
    description: { fr: 'Forteresse byzantine surplombant la mer, offrant une vue panoramique sur le cap Bon et la côte sicilienne par temps clair.' },
    type: 'SITE_TOURISTIQUE', categories: ['CULTUREL', 'AVENTURE'], region: 'Nabeul', statut: 'BROUILLON',
    qualityScore: 65, photos: ['https://images.unsplash.com/photo-1568322503362-93e14d1ded0e?w=400'],
    latitude: 36.8462, longitude: 11.0936, tarifEstime: 5, accessibilitePmr: false,
    horaires: { lundi: '08:00-18:00', mardi: '08:00-18:00' },
    source: 'import_auto', createdAt: '2026-08-01T07:15:00Z', wikidataId: 'Q2474712',
  },
  {
    id: 103, nom: { fr: 'Maison à louer bord de mer' },
    description: { fr: 'Jolie maison.' },
    type: 'HEBERGEMENT', categories: [], region: 'Nabeul', statut: 'BROUILLON',
    qualityScore: 15, photos: [],
    source: 'import_auto', createdAt: '2026-08-01T06:45:00Z',
  },
  {
    id: 104, nom: { fr: 'Mosquée Okba Ibn Nafaa' },
    description: { fr: 'La Grande Mosquée de Kairouan, également connue sous le nom de mosquée Okba Ibn Nafaa, est l\'un des monuments les plus importants de l\'islam en Afrique du Nord et un site classé au patrimoine mondial de l\'UNESCO.' },
    type: 'SITE_TOURISTIQUE', categories: ['CULTUREL', 'RELIGIEUX'], region: 'Kairouan', statut: 'BROUILLON',
    qualityScore: 88, photos: ['https://images.unsplash.com/photo-1590071089561-a312b0373885?w=400', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400'],
    latitude: 35.6812, longitude: 10.1035, tarifEstime: 0, accessibilitePmr: true,
    horaires: { lundi: '08:00-14:00', mardi: '08:00-14:00', mercredi: '08:00-14:00', jeudi: '08:00-14:00', vendredi: 'Fermé', samedi: '08:00-14:00', dimanche: '08:00-14:00' },
    source: 'import_auto', createdAt: '2026-07-31T22:00:00Z', wikidataId: 'Q188992',
  },
  {
    id: 105, nom: { fr: 'Restaurant Le Pêcheur' },
    description: { fr: 'Restaurant de fruits de mer traditionnel sur le vieux port de Bizerte, spécialités de poisson grillé et couscous au mérou.' },
    type: 'RESTAURANT', categories: ['GASTRONOMIE'], region: 'Bizerte', statut: 'BROUILLON',
    qualityScore: 52, photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'],
    latitude: 37.2746, longitude: 9.8739, tarifEstime: 35,
    source: 'import_auto', createdAt: '2026-07-31T20:30:00Z',
  },
  {
    id: 106, nom: { fr: 'Oasis de Tozeur', en: 'Tozeur Oasis', ar: 'واحة توزر' },
    description: { fr: 'L\'oasis de Tozeur s\'étend sur plus de 1 000 hectares et abrite plus de 400 000 palmiers dattiers. Un réseau ingénieux de canaux d\'irrigation datant du XIIIe siècle alimente encore les jardins.', en: 'The Tozeur Oasis spans over 1,000 hectares with more than 400,000 date palms.' },
    type: 'SITE_TOURISTIQUE', categories: ['ECOLOGIQUE', 'AVENTURE'], region: 'Tozeur', statut: 'BROUILLON',
    qualityScore: 91, photos: ['https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=400', 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=400'],
    latitude: 33.9185, longitude: 8.1339, tarifEstime: 12, accessibilitePmr: false,
    horaires: { lundi: '07:00-19:00', mardi: '07:00-19:00', mercredi: '07:00-19:00', jeudi: '07:00-19:00', vendredi: '07:00-19:00', samedi: '07:00-19:00', dimanche: '07:00-19:00' },
    source: 'import_auto', createdAt: '2026-07-31T15:00:00Z', wikidataId: 'Q1145280',
  },
  {
    id: 107, nom: { fr: '' },
    description: { fr: '' },
    type: 'SITE_TOURISTIQUE', categories: [], region: 'Sfax', statut: 'BROUILLON',
    qualityScore: 5, photos: [],
    source: 'import_auto', createdAt: '2026-07-31T12:00:00Z',
  },
  {
    id: 108, nom: { fr: 'Thermes d\'Antonin de Carthage' },
    description: { fr: 'Les thermes d\'Antonin sont les plus grands thermes romains construits en Afrique. Situés en bord de mer, ils témoignent de la grandeur de Carthage romaine au IIe siècle.' },
    type: 'SITE_TOURISTIQUE', categories: ['CULTUREL'], region: 'Tunis', statut: 'ACTIF',
    qualityScore: 95, photos: ['https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400'],
    latitude: 36.8570, longitude: 10.3295, tarifEstime: 10, accessibilitePmr: true,
    source: 'manuel', createdAt: '2026-07-15T10:00:00Z', wikidataId: 'Q1261957',
  },
  {
    id: 109, nom: { fr: 'Plage de Sidi Ali El Mekki' },
    description: { fr: 'Plage sauvage préservée dans le golfe de Tunis, considérée comme l\'une des plus belles plages de Tunisie avec son sable fin et son eau turquoise.' },
    type: 'SITE_TOURISTIQUE', categories: ['BALNEAIRE'], region: 'Bizerte', statut: 'ACTIF',
    qualityScore: 72, photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'],
    latitude: 37.2198, longitude: 10.0988, tarifEstime: 0,
    source: 'manuel', createdAt: '2026-07-10T08:00:00Z',
  },
  {
    id: 110, nom: { fr: 'Musée du Bardo' },
    description: { fr: 'Le musée national du Bardo est le plus grand musée de Tunisie, abritant la plus riche collection de mosaïques romaines au monde.' },
    type: 'SITE_TOURISTIQUE', categories: ['CULTUREL'], region: 'Tunis', statut: 'ARCHIVE',
    qualityScore: 80, photos: ['https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400'],
    latitude: 36.8094, longitude: 10.1341, tarifEstime: 12,
    source: 'manuel', createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 111, nom: { fr: 'Atelier de Poterie Guellala' },
    description: { fr: 'Atelier artisanal traditionnel de Guellala à Djerba, perpétuant un savoir-faire ancestral de la poterie berbère depuis le XIIe siècle.' },
    type: 'SITE_TOURISTIQUE', categories: ['ARTISANAL', 'CULTUREL'], region: 'Médenine', statut: 'BROUILLON',
    qualityScore: 45, photos: [],
    latitude: 33.7131, longitude: 10.8563,
    source: 'import_auto', createdAt: '2026-07-30T18:00:00Z',
  },
];
