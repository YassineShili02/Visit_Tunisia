import { SearchResult } from './models';
import { DESTINATIONS_DATA } from './destinations.data';
import { EVENTS_DATA } from './events.data';

export function buildSearchIndex(): SearchResult[] {
  const destinations: SearchResult[] = DESTINATIONS_DATA.map(d => ({
    id: `dest-${d.id}`,
    type: 'destination',
    title: d.name,
    subtitle: `${d.type} · ${d.region}`,
    img: d.img,
    category: d.category,
    categoryColor: d.category === 'Culturel' ? '#1B6FA8' : d.category === 'Balnéaire' ? '#7EC8E3' : d.category === 'Aventure' ? '#D97D45' : '#6B8E4E',
    page: 'detail',
  }));
  const events: SearchResult[] = EVENTS_DATA.map(e => ({
    id: `event-${e.id}`,
    type: 'event',
    title: e.title,
    subtitle: `${e.dateLabel} · ${e.city}`,
    img: e.photo,
    category: e.category,
    categoryColor: e.categoryColor,
    page: 'event-detail',
  }));
  return [...destinations, ...events];
}

export const USER_ITINERARIES: Record<string, SearchResult[]> = {
  'yasmine@example.com': [
    { id:'u-1', type:'itinerary', title:'Odyssée de 7 jours entre Mer et Histoire', subtitle:'7 jours · Créé le 12 juillet', page:'itinerary-result' },
    { id:'u-2', type:'itinerary', title:'Week-end à Djerba — Plages & Médina', subtitle:'3 jours · Créé le 5 juillet', page:'itinerary-result', category:'Brouillon', categoryColor:'#D97D45' },
    { id:'u-3', type:'itinerary', title:'Circuit Culturel du Nord', subtitle:'5 jours · Créé le 28 juin', page:'itinerary-result' },
    { id:'u-4', type:'itinerary', title:'Désert du Sud — Tozeur & Douz', subtitle:'4 jours · Créé le 14 juin', page:'itinerary-result', category:'Brouillon', categoryColor:'#D97D45' },
  ],
  'admin@visittunisia.tn': [],
};

export const SEARCH_INDEX = buildSearchIndex();
