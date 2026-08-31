import { PhotoData, PracticalInfo, ReviewData } from './models';

export const ELJEM_PHOTOS: PhotoData[] = [
  { id:1, url:"https://images.unsplash.com/photo-1744512300329-e7dcca5aca9b?w=1200&h=680&fit=crop&auto=format", thumb:"https://images.unsplash.com/photo-1744512300329-e7dcca5aca9b?w=180&h=110&fit=crop&auto=format", alt:"Vue extérieure de l'amphithéâtre" },
  { id:2, url:"https://images.unsplash.com/photo-1587974928442-e4e14b2d3de5?w=1200&h=680&fit=crop&auto=format", thumb:"https://images.unsplash.com/photo-1587974928442-e4e14b2d3de5?w=180&h=110&fit=crop&auto=format", alt:"Les arènes depuis l'intérieur" },
  { id:3, url:"https://images.unsplash.com/photo-1775129068313-8be80f13f12f?w=1200&h=680&fit=crop&auto=format", thumb:"https://images.unsplash.com/photo-1775129068313-8be80f13f12f?w=180&h=110&fit=crop&auto=format", alt:"Galeries souterraines" },
  { id:4, url:"https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=1200&h=680&fit=crop&auto=format", thumb:"https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=180&h=110&fit=crop&auto=format", alt:"Panorama au coucher du soleil" },
];

export const ELJEM_PRACTICAL: PracticalInfo[] = [
  { icon:"Clock", label:"Horaires", value:"8h – 19h (été)\n8h – 17h (hiver)" },
  { icon:"Banknote", label:"Tarif d'entrée", value:"12 DT adulte\n6 DT enfant (–12 ans)" },
  { icon:"Accessibility", label:"Accessibilité PMR", value:"Accès partiel\n(niveau principal)" },
  { icon:"Clock", label:"Durée conseillée", value:"1 à 2 heures" },
  { icon:"Phone", label:"Contact", value:"+216 73 630 022" },
  { icon:"Car", label:"Parking", value:"Gratuit sur place\n(Rue Ibn Khaldoun)" },
];

export const ELJEM_REVIEWS: ReviewData[] = [
  {
    id:1, author:"Sophie L.", origin:"France", avatar:"SL", rating:5, date:"Août 2026",
    text:"Époustouflant. Un des sites archéologiques les plus impressionnants que j'aie visités. La mise en lumière nocturne lors du festival de Carthage était féerique — voir les gradins baignés de lumière orange au crépuscule, c'est inoubliable.",
  },
  {
    id:2, author:"Youssef H.", origin:"Tunis", avatar:"YH", rating:5, date:"Juin 2026",
    text:"Notre fierté nationale. L'amphithéâtre d'El Jem rivalise avec le Colisée de Rome en termes de conservation et de grandeur. Le guide était excellent — il nous a montré les galeries souterraines où les gladiateurs attendaient avant les combats. Un frisson.",
  },
  {
    id:3, author:"Markus B.", origin:"München", avatar:"MB", rating:4, date:"Mai 2026",
    text:"Magnifique monument, très bien conservé. Prévoyez de l'eau en été, il fait très chaud. Le musée adjacent est également intéressant pour comprendre le contexte historique. Le trajet depuis Sousse est facile en train.",
  },
];

export const FORECAST = [
  { day:'Ven.', icon:'Sun', high:33, low:22, cond:'Ensoleillé' },
  { day:'Sam.', icon:'Cloud', high:29, low:20, cond:'Nuageux' },
  { day:'Dim.', icon:'Sun', high:32, low:21, cond:'Ensoleillé' },
];

export const SAMPLE_REVIEWS = [
  { id:1, dest:"Amphithéâtre d'El Jem", rating:5, date:"15 mars 2026", text:"Absolument magnifique. Un chef-d'œuvre de l'architecture romaine, mieux conservé que le Colisée. La lumière dorée du coucher de soleil sur les pierres ocres est inoubliable.", cat:"Culturel" },
  { id:2, dest:"Médina de Tunis", rating:4, date:"2 avr 2026", text:"Expérience authentique et immersive. Les souks sont fascinants, les artisans passionnants. Prévoir au moins une demi-journée pour explorer sans se presser.", cat:"Culturel" },
];
