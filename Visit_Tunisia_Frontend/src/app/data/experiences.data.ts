import { Experience } from './models';

export const HERO_DESTINATIONS = [
  {
    id: 1,
    name: "Amphithéâtre d'El Jem",
    region: 'Gouvernorat de Mahdia',
    tag: 'Archéologie',
    tagColor: '#D97D45',
    img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&h=900&fit=crop&auto=format',
    rating: 4.9,
  },
];

export const EXPERIENCES: Experience[] = [
  { icon: 'Compass', label: 'Culturel', count: '64 expériences', color: '#D97D45' },
  { icon: 'Waves', label: 'Balnéaire', count: '38 destinations', color: '#7EC8E3' },
  { icon: 'Leaf', label: 'Écologique', count: '22 parcs & oasis', color: '#6B8E4E' },
  { icon: 'UtensilsCrossed', label: 'Gastronomique', count: '300+ adresses', color: '#E0A458' },
  { icon: 'Mountain', label: 'Aventure', count: '17 circuits', color: '#D97D45' },
  { icon: 'Moon', label: 'Religieux', count: '41 sites sacrés', color: '#1B6FA8' },
];

export const UPCOMING_EVENTS = [
  { name: 'Festival International de Carthage', date: '15 Juil — 20 Août 2026', location: 'Carthage, Tunis', img: 'https://images.unsplash.com/photo-1468359601543-843bfaef291a?w=500&h=340&fit=crop&auto=format' },
  { name: 'Festival du Sahara de Douz', date: '19 — 22 Déc 2026', location: 'Douz, Kébili', img: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=500&h=340&fit=crop&auto=format' },
  { name: 'Nuits de la Médina', date: 'Tous les vendredis, Été 2026', location: 'Médina de Tunis', img: 'https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=500&h=340&fit=crop&auto=format' },
];
