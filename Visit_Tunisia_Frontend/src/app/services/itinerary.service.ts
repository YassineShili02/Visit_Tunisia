import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Destination } from '../data/models';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';

// ─── Interfaces pour itinéraires sauvegardés (Spring Boot backend) ────────
export interface ItineraryStep {
  etapeId: number;
  jourNumero: number;
  ordre: number;
  heurePrevue: string;
  dureeVisite: string;
  tempsTrajet: string;
  destination: {
    destinationId: number;
    nom: any;
    photos: string[];
  };
}

export interface SavedItinerary {
  itineraireId: number;
  titre: string;
  interets?: string;    // Clés canoniques FR séparées par des virgules (nouvelles sauvegardes)
  dureeJours: number;
  budgetTotal: number;
  dateDebut?: string;
  dateCreation: string;
  nombreVoyageurs: number;
  etapes: ItineraryStep[];
}

// ─────────────────────────────────────────────
// Modèles internes de l'itinéraire généré
// ─────────────────────────────────────────────

export interface ItineraryStop {
  destinationId: number;
  name: string;
  category: string;     // Clé de catégorie brute (ex: 'CULTUREL', 'gastronomie', 'hotelNight') — traduite à l'affichage
  type: NormalizedDestType;
  time: string;         // Heure de début calculée (ex: '09:30')
  durationMin: number;  // Durée en minutes pour le chaînage
  transitMode?: 'walk' | 'car'; // Mode de trajet depuis l'étape précédente
  transitMin?: number;  // Durée du trajet en minutes
  transitKm?: number;   // Distance en kilomètres
  transitCost?: number; // Frais de transport calculés en DT
  img: string;
  latitude: number;
  longitude: number;
  estimatedCost: number;// Coût réel de l'activité/repas/nuitée en DT
  region: string;
  isOvernight?: boolean;// Vrai UNIQUEMENT pour un vrai hébergement
}

export interface ItineraryUpgradeOption {
  destinationId: number;
  stopIndex: number;
  originalName: string;
  name: string;
  category: string;     // Clé de catégorie brute — traduite à l'affichage
  type: NormalizedDestType;
  img: string;
  estimatedCost: number;// VRAI coût de la destination de surclassement
  costDiff: number;     // Supplément exact en DT (upgradeCost - currentCost)
  badgeKey: string;     // Clé transloco du badge (ex: 'upgradeHotelBadge')
  reasonKey: string;    // Clé transloco de la raison (ex: 'upgradeHotelReason')
  latitude: number;
  longitude: number;
}

export interface ItineraryDay {
  id: number;
  dayNumber: number;    // Numéro brut du jour (1, 2, 3...) — traduit à l'affichage ('Jour 1', 'Day 1', 'اليوم 1'...)
  dateISO: string;      // Date brute ISO (ex: '2026-09-04') — formatée à l'affichage selon la langue
  city: string;         // Nom de gouvernorat brut — traduit à l'affichage via regionLabel()
  stops: ItineraryStop[];
  dayBudget: number;
  upgrades: ItineraryUpgradeOption[];
}

export interface ItineraryCriteria {
  duration: number;
  budget: number;       // budget par personne en DT
  travelers: number;
  interests: string[];  // ex: ['Culturel', 'Balnéaire']
  departure: string;    // ville de départ
}

export interface GeneratedItinerary {
  criteria: ItineraryCriteria;
  days: ItineraryDay[];
  totalStops: number;
  estimatedTotalCost: number;
  citiesCount: number;
  title: string;
}

// ─────────────────────────────────────────────
// Normalisation stricte du type de destination
// ─────────────────────────────────────────────
export type NormalizedDestType = 'SITE_TOURISTIQUE' | 'RESTAURANT' | 'HEBERGEMENT' | 'ACTIVITE' | 'COMMERCE';

export function normalizeDestType(t?: string): NormalizedDestType {
  if (!t) return 'SITE_TOURISTIQUE';
  const u = t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (u.includes('HEBERGEMENT') || u.includes('HOTEL') || u.includes('AUBERGE') || u.includes('RESORT') || u.includes('CAMP')) {
    return 'HEBERGEMENT';
  }
  if (u.includes('RESTAURANT') || u.includes('GASTRONOMIE') || u.includes('CAFE')) {
    return 'RESTAURANT';
  }
  if (u.includes('ACTIVITE') || u.includes('PARC') || u.includes('SPORT') || u.includes('PLONGEE')) {
    return 'ACTIVITE';
  }
  if (u.includes('COMMERCE') || u.includes('MALL') || u.includes('SHOPPING') || u.includes('SOUK')) {
    return 'COMMERCE';
  }
  return 'SITE_TOURISTIQUE';
}

// ─────────────────────────────────────────────
// Correspondances centres d'intérêt ↔ catégories backend
// ─────────────────────────────────────────────
const INTEREST_TO_CATEGORY: Record<string, string[]> = {
  'Culturel': ['CULTUREL'],
  'Balnéaire': ['BALNEAIRE'],
  'Gastronomique': ['GASTRONOMIQUE'],
  'Aventure': ['AVENTURE'],
  'Religieux': ['RELIGIEUX'],
  'Écologique': ['ECOLOGIQUE'],
  'Randonnée': ['AVENTURE', 'ECOLOGIQUE'],
  'Plongée': ['BALNEAIRE'],
  'Photographie': ['CULTUREL', 'ECOLOGIQUE'],
  'Architecture': ['CULTUREL'],
  'Cuisine locale': ['GASTRONOMIQUE'],
  'Artisanat': ['CULTUREL'],
  'Sports nautiques': ['BALNEAIRE'],
  'Thermalisme': ['ECOLOGIQUE'],
};

// Correspondance des régions tunisiennes vers des noms de villes et alias
const CITY_TO_REGION: Record<string, string[]> = {
  'Tunis': ['Tunis', 'تونس', 'Carthage', 'La Marsa', 'Sidi Bou Saïd', 'Ariana', 'Gammarth', 'قرطاج بيرصة', 'عين كميشة', 'غزالة', 'La Goulette', 'Bab Saadoun'],
  'Bizerte': ['Bizerte', 'بنزرت', 'Menzel Bourguiba', 'Ras Angela', 'Cap Angela'],
  'Nabeul': ['Nabeul', 'Cap Bon', 'Hammamet', 'Korba', 'Kelibia', 'Yasmine Hammamet', 'نابل', 'الحمامات'],
  'Sousse': ['Sousse', 'سوسة', 'Port El Kantaoui', 'Hammam Sousse'],
  'Monastir': ['Monastir', 'المنستير', 'Sahline'],
  'Mahdia': ['Mahdia', 'المهدية', 'El Jem'],
  'Kairouan': ['Kairouan', 'القيروان'],
  'Tozeur': ['Tozeur', 'توزر', 'Nefta', 'Chebika', 'Tamerza', 'Midès', 'Mides', 'Chott El Djerid'],
  'Kébili': ['Kébili', 'Kebili', 'Kbili', 'Douz', 'قبلي', 'دوز', 'Ksar Ghilane', 'El Faouar'],
  'Tataouine': ['Tataouine', 'تطاوين', 'Chenini', 'Ksar Ouled Soltane', 'Guermassa', 'Douiret'],
  'Médenine': ['Médenine', 'Medenine', 'Mdenine', 'Djerba', 'Zarzis', 'مدنين', 'جربة', 'جرجيس', 'Midoun', 'Houmt Souk', 'Ksar Haddada'],
};

// Coordonnées GPS de référence pour les centres de gouvernorats
const REGION_CENTERS: Record<string, [number, number]> = {
  'Tunis': [36.819, 10.166],
  'Bizerte': [37.274, 9.875],
  'Nabeul': [36.452, 10.736],
  'Sousse': [35.825, 10.636],
  'Monastir': [35.770, 10.826],
  'Mahdia': [35.502, 11.062],
  'Kairouan': [35.678, 10.100],
  'Tozeur': [33.918, 8.130],
  'Kébili': [33.705, 8.971],
  'Tataouine': [32.929, 10.452],
  'Médenine': [33.354, 10.505],
};

const TYPE_COST_ESTIMATE: Record<NormalizedDestType, number> = {
  'SITE_TOURISTIQUE': 10,
  'ACTIVITE': 35,
  'RESTAURANT': 35,
  'HEBERGEMENT': 150,
  'COMMERCE': 25,
};

const TYPE_VISIT_DURATION: Record<NormalizedDestType, number> = {
  'SITE_TOURISTIQUE': 105, // 1h45
  'RESTAURANT': 80,        // 1h20 (déjeuner)
  'ACTIVITE': 120,         // 2h00
  'COMMERCE': 90,          // 1h30
  'HEBERGEMENT': 0,        // Nuitée (Check-in fin de journée)
};

@Injectable({ providedIn: 'root' })
export class ItineraryService {

  private readonly apiUrl = 'http://localhost:8082/api/itineraries';

  private _generatedItinerary = new BehaviorSubject<GeneratedItinerary | null>(null);
  generatedItinerary$ = this._generatedItinerary.asObservable();

  get current(): GeneratedItinerary | null {
    return this._generatedItinerary.value;
  }

  /** Alias pour compatibilité avec les anciens composants */
  setGeneratedItinerary(it: GeneratedItinerary | null): void {
    this._generatedItinerary.next(it);
  }

  constructor(
    private http: HttpClient,
    private transloco: TranslocoService,
    private langService: LanguageService
  ) {}

  // ─────────────────────────────────────────────
  // Point d'entrée : génère l'itinéraire complet
  // ─────────────────────────────────────────────
  generate(criteria: ItineraryCriteria, allDestinations: Destination[]): GeneratedItinerary {
    // 1. Filtrer et scorer les destinations
    const pool = this.buildScoredPool(criteria, allDestinations);

    // 2. Déterminer les régions de circuit (UNIQUEMENT celles qui ont des données réelles)
    const regionOrder = this.buildRegionOrder(criteria.departure, criteria.duration, pool);

    // 3. Construire les jours avec horaires, transport et upgrades
    const days = this.buildDays(criteria, pool, regionOrder);

    // 4. Calculer les statistiques
    const totalStops = days.reduce((s, d) => s + d.stops.length, 0);
    const estimatedTotal = days.reduce((s, d) => s + d.dayBudget, 0);
    const cities = new Set(days.map(d => d.city)).size;

    const it: GeneratedItinerary = {
      criteria,
      days,
      totalStops,
      estimatedTotalCost: estimatedTotal,
      citiesCount: cities,
      title: this.buildTitle(criteria),
    };

    this._generatedItinerary.next(it);
    return it;
  }

  clear(): void {
    this._generatedItinerary.next(null);
  }

  /**
   * Calcule les frais de transport réalistes en Tunisie selon la distance :
   * - < 0.8 km : À pied (0 DT - Gratuit)
   * - 0.8 à 15 km : Trajet urbain / Taxi (~3 à 12 DT)
   * - 15 à 60 km : Trajet moyen / Louage / Essence (~5 à 10 DT)
   * - >= 60 km : Trajet inter-gouvernorat (~0.085 DT/km, ex: 70 km ≈ 6 DT, 140 km ≈ 12 DT)
   */
  calculateTransitCost(distKm: number): number {
    if (distKm < 0.8) return 0;
    if (distKm < 15) {
      return Math.round(Math.max(3, 2.0 + distKm * 0.8));
    }
    if (distKm < 60) {
      return Math.round(3.0 + distKm * 0.10);
    }
    return Math.max(6, Math.round(distKm * 0.085));
  }

  // ─────────────────────────────────────────────
  // Filtrage et scoring des destinations candidates
  // ─────────────────────────────────────────────
  private buildScoredPool(criteria: ItineraryCriteria, dests: Destination[]): (Destination & { score: number; normalizedType: NormalizedDestType })[] {
    const wantedCats = new Set<string>(
      criteria.interests.flatMap(i => INTEREST_TO_CATEGORY[i] || [])
    );

    const dailyBudgetPerPerson = criteria.budget / criteria.duration;

    return dests
      .filter(d => {
        if (!d.latitude || !d.longitude) return false;
        if ((d as any).statut && (d as any).statut !== 'PUBLIE' && (d as any).statut !== 'publie') return false;
        return true;
      })
      .map(d => {
        const normType = normalizeDestType(d.type || (d as any).estType);
        let score = 0;

        // +30 si la catégorie correspond aux intérêts choisis
        const destCats = (d.categories || [d.category || '']).map((c: string) => c.toUpperCase());
        if (destCats.some((c: string) => wantedCats.has(c))) score += 30;

        // +20 selon les avis
        const rating = (d as any).noteAverage || (d as any).noteMoyenne || (d as any).rating || 0;
        score += Math.round(rating * 4);

        // Bonus pour la variété
        if (normType === 'SITE_TOURISTIQUE') score += 10;
        if (normType === 'RESTAURANT') score += 10;
        if (normType === 'HEBERGEMENT') score += 10;

        // Ajustement selon le budget
        const cost = parseFloat(String((d as any).tarifEstime || d.price || 0)) || 0;
        const typeCost = TYPE_COST_ESTIMATE[normType] || 10;
        const effectiveCost = cost > 0 ? cost : typeCost;
        if (effectiveCost <= dailyBudgetPerPerson * 0.45) score += 10;

        return { ...d, score, normalizedType: normType };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ─────────────────────────────────────────────
  // Ordre des régions — algorithme greedy nearest-neighbor
  // Résultat : Régions triées par proximité géographique cumulative
  // FILTRE STRICT : Ne sélectionne QUE les régions qui ont RÉELLEMENT des destinations dans la base
  // ─────────────────────────────────────────────
  private buildRegionOrder(
    departure: string,
    duration: number,
    pool: (Destination & { score: number; normalizedType: NormalizedDestType })[]
  ): string[] {
    const depRegion = this.cityToRegion(departure);

    // 1. Compter les destinations réellement disponibles par région dans la base
    const regionCounts = new Map<string, number>();
    for (const d of pool) {
      const r = this.cityToRegion(d.region || '');
      regionCounts.set(r, (regionCounts.get(r) || 0) + 1);
    }

    // 2. Régions valides = celles qui possèdent au moins 2 destinations réelles (ou 1 si c'est le départ)
    const validRegions = Object.keys(REGION_CENTERS).filter(r => {
      const count = regionCounts.get(r) || 0;
      return count >= (r === depRegion ? 1 : 2);
    });

    if (validRegions.length === 0) {
      return [depRegion];
    }

    // Déterminer la région initiale (départ si valide, sinon la région avec données la plus proche)
    let currentRegion = validRegions.includes(depRegion) ? depRegion : validRegions[0];
    if (!validRegions.includes(depRegion)) {
      const depCenter = REGION_CENTERS[depRegion];
      if (depCenter) {
        let bestDist = Infinity;
        for (const vr of validRegions) {
          const c = REGION_CENTERS[vr];
          if (c) {
            const d = this.haversineKm(depCenter[0], depCenter[1], c[0], c[1]);
            if (d < bestDist) { bestDist = d; currentRegion = vr; }
          }
        }
      }
    }

    const ordered: string[] = [currentRegion];
    const unvisited = validRegions.filter(r => r !== currentRegion);

    // Greedy nearest-neighbor parmi les régions ayant RÉELLEMENT des destinations
    while (ordered.length < Math.min(duration, validRegions.length)) {
      const currentCenter = REGION_CENTERS[currentRegion];
      if (!currentCenter) break;

      let nearestRegion: string | null = null;
      let nearestDist = Infinity;

      for (const region of unvisited) {
        const center = REGION_CENTERS[region];
        if (!center) continue;
        const dist = this.haversineKm(currentCenter[0], currentCenter[1], center[0], center[1]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestRegion = region;
        }
      }

      if (!nearestRegion) break;
      ordered.push(nearestRegion);
      const idx = unvisited.indexOf(nearestRegion);
      if (idx !== -1) unvisited.splice(idx, 1);
      currentRegion = nearestRegion;
    }

    return ordered;
  }

  // ─────────────────────────────────────────────
  // Construction des journées avec chaînage strict et transport
  // ─────────────────────────────────────────────
  private buildDays(
    criteria: ItineraryCriteria,
    allPool: (Destination & { score: number; normalizedType: NormalizedDestType })[],
    regions: string[]
  ): ItineraryDay[] {
    const used = new Set<number>();
    const days: ItineraryDay[] = [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14); // Départ dans 2 semaines

    let prevDayLastStopLat: number | null = null;
    let prevDayLastStopLng: number | null = null;

    for (let dayIdx = 0; dayIdx < criteria.duration; dayIdx++) {
      const region = regions[dayIdx % regions.length];
      const regionNames = CITY_TO_REGION[region] || [region];

      // Pool spécifique à la région
      const regionPool = allPool.filter(d => {
        const destRegion = d.region || '';
        return regionNames.some(r => destRegion.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(destRegion.toLowerCase()));
      });

      const dayCenter = this.findDayCenter(regionPool.length > 0 ? regionPool : allPool.slice(0, 10));

      const stops: ItineraryStop[] = [];
      let dayBudget = 0;
      let prevLat = prevDayLastStopLat !== null ? prevDayLastStopLat : dayCenter[0];
      let prevLng = prevDayLastStopLng !== null ? prevDayLastStopLng : dayCenter[1];

      // ────────────────────────────────────────────────────────
      // Définition des 4 créneaux STRICTS de chaque journée :
      // 1. Matin (09:30) : UNIQUEMENT Site Touristique ou Activité
      // 2. Midi (12:30) : UNIQUEMENT Restaurant
      // 3. Après-midi (14:45) : UNIQUEMENT Activité ou 2ème Site Touristique
      // 4. Soirée (18:30) : UNIQUEMENT vrai Hébergement (Hôtel / Maison d'hôtes / Resort)
      // ────────────────────────────────────────────────────────
      const dailySlots: {
        slotName: string;
        allowedTypes: NormalizedDestType[];
        targetMinStart: number;
        fallbackSearchGlobal?: boolean;
        preferStandardPrice?: boolean;
      }[] = [
          { slotName: 'matin', allowedTypes: ['SITE_TOURISTIQUE', 'ACTIVITE'], targetMinStart: 9 * 60 + 30 },
          { slotName: 'midi', allowedTypes: ['RESTAURANT'], targetMinStart: 12 * 60 + 30, fallbackSearchGlobal: true },
          { slotName: 'aprem', allowedTypes: ['ACTIVITE', 'SITE_TOURISTIQUE', 'COMMERCE'], targetMinStart: 14 * 60 + 45 },
          { slotName: 'nuit', allowedTypes: ['HEBERGEMENT'], targetMinStart: 18 * 60 + 30, fallbackSearchGlobal: true, preferStandardPrice: true },
        ];

      let currentMinutes = 9 * 60 + 30; // 09:30

      for (let slotIdx = 0; slotIdx < dailySlots.length; slotIdx++) {
        const slotConfig = dailySlots[slotIdx];
        const isHotelSlot = slotConfig.slotName === 'nuit';
        const isLunchSlot = slotConfig.slotName === 'midi';

        // 1. Chercher dans la région avec les types autorisés STRICTS
        let candidate = this.pickStrict(regionPool, used, slotConfig.allowedTypes, prevLat, prevLng, slotConfig.preferStandardPrice);

        // 2. Si non trouvé dans la région (ex: pas de Restaurant répertorié dans ce gouvernorat) :
        //    Priorité 1 : Chercher un autre type (Site touristique, Activité) DANS LA MÊME RÉGION
        if (!candidate) {
          const localFallbackTypes: NormalizedDestType[] = isHotelSlot
            ? ['HEBERGEMENT']
            : ['SITE_TOURISTIQUE', 'ACTIVITE', 'COMMERCE', 'RESTAURANT'];
          candidate = this.pickStrict(regionPool, used, localFallbackTypes, prevLat, prevLng, slotConfig.preferStandardPrice);
        }

        // 3. Priorité 2 : Si toujours rien dans la région, chercher UNIQUEMENT à proximité géographique immédiate (max 30 km)
        //    JAMAIS de recherche globale qui téléporte le voyageur dans une autre ville à 150 km !
        if (!candidate && prevLat && prevLng) {
          candidate = this.pickNearby(allPool, used, slotConfig.allowedTypes, prevLat, prevLng, 30);
        }

        if (!candidate) continue;

        used.add(candidate.id);

        const normType = candidate.normalizedType;
        const isRealHotel = normType === 'HEBERGEMENT';

        // Coût réel de l'activité / repas / nuitée
        const rawCost = parseFloat(String((candidate as any).tarifEstime || candidate.price || 0));
        const effectiveCost = rawCost > 0 ? rawCost : (TYPE_COST_ESTIMATE[normType] || 10);

        // ─── Calcul réaliste du trajet et des frais de transport ───
        let transitMode: 'walk' | 'car' | undefined;
        let transitMin = 0;
        let transitKm = 0;
        let transitCost = 0;

        const isInterDayMovement = stops.length === 0 && prevDayLastStopLat !== null;

        if (stops.length > 0 || isInterDayMovement) {
          transitKm = Math.round(this.haversineKm(prevLat, prevLng, candidate.latitude!, candidate.longitude!) * 10) / 10;
          transitCost = this.calculateTransitCost(transitKm);

          if (transitKm < 0.8) {
            transitMode = 'walk';
            transitMin = Math.max(3, Math.round(transitKm * 12));
          } else {
            transitMode = 'car';
            transitMin = Math.max(5, Math.round(transitKm * 1.8));
          }
        }

        // Budget de la journée = Coût des visites + Activités + Nuitée
        dayBudget += effectiveCost;

        // ─── Heure d'arrivée logique ───
        let arrivalMinutes = currentMinutes + transitMin;

        // Respecter l'heure de repas (pas de déjeuner avant 12h15)
        if (isLunchSlot && arrivalMinutes < 12 * 60 + 15) {
          arrivalMinutes = 12 * 60 + 30;
        } else if (arrivalMinutes < slotConfig.targetMinStart) {
          arrivalMinutes = slotConfig.targetMinStart;
        }

        const timeFormatted = this.formatMinutesToTime(arrivalMinutes);

        // ─── Durée sur place ───
        let visitDurationMin = TYPE_VISIT_DURATION[normType] || 90;

        if (isRealHotel) {
          visitDurationMin = 0;
        }

        currentMinutes = arrivalMinutes + visitDurationMin;
        prevLat = candidate.latitude!;
        prevLng = candidate.longitude!;

        const stop: ItineraryStop = {
          destinationId: candidate.id,
          name: candidate.name || (candidate as any).title || this.transloco.translate('common.untitled'),
          category: isRealHotel ? 'hotelNight' : this.getDisplayCategory(candidate, normType),
          type: normType,
          time: timeFormatted,
          durationMin: visitDurationMin,
          transitMode,
          transitMin,
          transitKm,
          transitCost,
          img: this.getDestImage(candidate),
          latitude: candidate.latitude!,
          longitude: candidate.longitude!,
          estimatedCost: effectiveCost,
          region: candidate.region || region,
          isOvernight: isRealHotel,
        };
        stops.push(stop);
      }

      // Conserver la position du dernier arrêt (l'hôtel) pour le trajet du lendemain
      if (stops.length > 0) {
        const last = stops[stops.length - 1];
        prevDayLastStopLat = last.latitude;
        prevDayLastStopLng = last.longitude;
      }

      // ─── Génération des options d'Upgrade Premium STRICTEMENT dans la même région et dans le budget ───
      const currentEstimatedTotal = days.reduce((sum, d) => sum + d.dayBudget, 0) + dayBudget;
      const remainingBudget = Math.max(0, criteria.budget - currentEstimatedTotal);
      const upgrades = this.buildDayUpgrades(stops, regionPool, remainingBudget);

      const d = new Date(startDate);
      d.setDate(startDate.getDate() + dayIdx);
      const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      days.push({
        id: dayIdx + 1,
        dayNumber: dayIdx + 1,
        dateISO,
        city: region,
        stops,
        dayBudget: Math.round(dayBudget),
        upgrades,
      });
    }

    return days;
  }

  // ─────────────────────────────────────────────
  // Suggestions d'Upgrades Premium STRICTEMENT dans la même région et PLUS CHER / PLUS LUXE
  // ─────────────────────────────────────────────
  private buildDayUpgrades(
    stops: ItineraryStop[],
    regionPool: (Destination & { score: number; normalizedType: NormalizedDestType })[],
    remainingBudget: number
  ): ItineraryUpgradeOption[] {
    const upgrades: ItineraryUpgradeOption[] = [];
    if (remainingBudget < 20) return [];

    // 1. Upgrade Hôtel STRICTEMENT dans la même région/gouvernorat
    const hotelStopIndex = stops.findIndex(s => s.isOvernight || s.type === 'HEBERGEMENT');
    if (hotelStopIndex !== -1) {
      const currentHotel = stops[hotelStopIndex];
      const currentCost = currentHotel.estimatedCost;

      // Chercher uniquement les hôtels de la région STRICTEMENT PLUS CHERS (vrais surclassements)
      const hotelCandidates = regionPool
        .filter(d => d.normalizedType === 'HEBERGEMENT' && d.id !== currentHotel.destinationId)
        .map(d => {
          const rawCost = parseFloat(String((d as any).tarifEstime || d.price || 0));
          const cost = rawCost > 0 ? rawCost : (currentCost + 80);
          return { dest: d, cost, diff: Math.round(cost - currentCost) };
        })
        .filter(h => h.diff > 20 && h.diff <= remainingBudget) // Strictement plus cher et dans le budget restant
        .sort((a, b) => a.diff - b.diff); // Proposer le premier surclassement accessible

      if (hotelCandidates.length > 0) {
        const upgradeChoice = hotelCandidates[0];
        const hDest = upgradeChoice.dest;

        upgrades.push({
          destinationId: hDest.id,
          stopIndex: hotelStopIndex,
          originalName: currentHotel.name,
          name: hDest.name || (hDest as any).title || this.transloco.translate('itineraryResult.upgradeHotelFallback'),
          category: 'hotelNight',
          type: 'HEBERGEMENT',
          img: this.getDestImage(hDest),
          estimatedCost: upgradeChoice.cost, // VRAI coût de l'hôtel de surclassement
          costDiff: upgradeChoice.diff,     // VRAIE différence de prix positive
          badgeKey: 'upgradeHotelBadge',
          reasonKey: 'upgradeHotelReason',
          latitude: hDest.latitude!,
          longitude: hDest.longitude!,
        });
      }
    }

    // 2. Upgrade Restaurant STRICTEMENT dans la même région/gouvernorat
    const restoStopIndex = stops.findIndex(s => s.type === 'RESTAURANT');
    if (restoStopIndex !== -1) {
      const currentResto = stops[restoStopIndex];
      const currentCost = currentResto.estimatedCost;

      const restoCandidates = regionPool
        .filter(d => d.normalizedType === 'RESTAURANT' && d.id !== currentResto.destinationId)
        .map(d => {
          const rawCost = parseFloat(String((d as any).tarifEstime || d.price || 0));
          const cost = rawCost > 0 ? rawCost : (currentCost + 30);
          return { dest: d, cost, diff: Math.round(cost - currentCost) };
        })
        .filter(r => r.diff > 15 && r.diff <= remainingBudget)
        .sort((a, b) => a.diff - b.diff);

      if (restoCandidates.length > 0) {
        const upgradeResto = restoCandidates[0];
        const rDest = upgradeResto.dest;

        upgrades.push({
          destinationId: rDest.id,
          stopIndex: restoStopIndex,
          originalName: currentResto.name,
          name: rDest.name || (rDest as any).title || this.transloco.translate('itineraryResult.upgradeRestoFallback'),
          category: 'gastronomie',
          type: 'RESTAURANT',
          img: this.getDestImage(rDest),
          estimatedCost: upgradeResto.cost,
          costDiff: upgradeResto.diff,
          badgeKey: 'upgradeRestoBadge',
          reasonKey: 'upgradeRestoReason',
          latitude: rDest.latitude!,
          longitude: rDest.longitude!,
        });
      }
    }

    return upgrades.slice(0, 2);
  }

  // ─────────────────────────────────────────────
  // Sélection STRICTEMENT typée parmi les candidats
  // ─────────────────────────────────────────────
  private pickStrict(
    pool: (Destination & { score: number; normalizedType: NormalizedDestType })[],
    used: Set<number>,
    allowedTypes: NormalizedDestType[],
    nearLat: number,
    nearLng: number,
    preferStandardPrice: boolean = false
  ): (Destination & { score: number; normalizedType: NormalizedDestType }) | null {
    const available = pool.filter(d => !used.has(d.id) && allowedTypes.includes(d.normalizedType));
    if (available.length === 0) return null;

    if (preferStandardPrice && allowedTypes.includes('HEBERGEMENT')) {
      // Pour l'hôtel de base, choisir l'hôtel standard/accessible de la région
      // pour laisser les palaces/resorts (Four Seasons, etc.) en opportunité de surclassement
      const byPrice = [...available].sort((a, b) => {
        const costA = parseFloat(String((a as any).tarifEstime || a.price || 0)) || TYPE_COST_ESTIMATE['HEBERGEMENT'];
        const costB = parseFloat(String((b as any).tarifEstime || b.price || 0)) || TYPE_COST_ESTIMATE['HEBERGEMENT'];
        return costA - costB;
      });
      return byPrice[0];
    }

    const topCandidates = available.slice(0, 8);
    return this.closestTo(topCandidates, nearLat, nearLng);
  }

  private pickNearby(
    pool: (Destination & { score: number; normalizedType: NormalizedDestType })[],
    used: Set<number>,
    allowedTypes: NormalizedDestType[],
    nearLat: number,
    nearLng: number,
    maxDistKm: number = 30
  ): (Destination & { score: number; normalizedType: NormalizedDestType }) | null {
    const available = pool.filter(d => !used.has(d.id) && allowedTypes.includes(d.normalizedType));
    const nearby = available.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const dist = this.haversineKm(nearLat, nearLng, d.latitude, d.longitude);
      return dist <= maxDistKm;
    });
    if (nearby.length === 0) return null;
    return this.closestTo(nearby, nearLat, nearLng);
  }

  private closestTo<T extends { latitude?: number; longitude?: number }>(
    pool: T[],
    lat: number,
    lng: number
  ): T | null {
    if (!pool.length) return null;
    return pool.reduce((best, d) => {
      const dDist = this.haversineKm(lat, lng, d.latitude || 0, d.longitude || 0);
      const bDist = this.haversineKm(lat, lng, best.latitude || 0, best.longitude || 0);
      return dDist < bDist ? d : best;
    });
  }

  // ─────────────────────────────────────────────
  // Distance GPS (Haversine en km)
  // ─────────────────────────────────────────────
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private deg2rad(deg: number): number { return deg * (Math.PI / 180); }

  private formatMinutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private cityToRegion(city: string): string {
    const lower = city.toLowerCase();
    for (const [region, aliases] of Object.entries(CITY_TO_REGION)) {
      if (aliases.some(a => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase()))) {
        return region;
      }
    }
    return city;
  }

  private findDayCenter(pool: { latitude?: number; longitude?: number }[]): [number, number] {
    const withGps = pool.filter(d => d.latitude && d.longitude);
    if (!withGps.length) return [36.8, 10.1];
    const avgLat = withGps.reduce((s, d) => s + (d.latitude || 0), 0) / withGps.length;
    const avgLng = withGps.reduce((s, d) => s + (d.longitude || 0), 0) / withGps.length;
    return [avgLat, avgLng];
  }

  /**
   * Retourne une CLÉ de catégorie brute (jamais de texte traduit) :
   * - enum backend ('CULTUREL', 'BALNEAIRE'...) → résolu via home.categories.* à l'affichage
   * - clés dédiées ('gastronomie', 'activite', 'shopping', 'visite') → résolues via itineraryResult.stopCategory.*
   */
  private getDisplayCategory(d: Destination, normType: NormalizedDestType): string {
    if (normType === 'RESTAURANT') return 'gastronomie';
    if (normType === 'ACTIVITE') return 'activite';
    if (normType === 'COMMERCE') return 'shopping';

    const cats = d.categories || [];
    if (cats.length > 0) {
      const known = ['CULTUREL', 'BALNEAIRE', 'GASTRONOMIQUE', 'AVENTURE', 'RELIGIEUX', 'ECOLOGIQUE'];
      if (known.includes(cats[0])) return cats[0];
    }
    return 'visite';
  }

  private getDestImage(d: Destination): string {
    const photos = (d as any).photos;
    if (photos && photos.length > 0) {
      const p = photos[0];
      if (typeof p === 'string') {
        if (p.startsWith('http') || p.startsWith('/')) return p;
        return `data:image/jpeg;base64,${p}`;
      }
      if (p?.url) return p.url;
      if (p?.data) return `data:image/jpeg;base64,${p.data}`;
    }
    if ((d as any).image) return (d as any).image;
    if (d.img) return d.img;
    const regionFallbacks: Record<string, string> = {
      'Tozeur': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=200',
      'Kébili': 'https://images.unsplash.com/photo-1502920514313-52581002a659?w=200',
      'Tunis': 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200',
      'Bizerte': 'https://images.unsplash.com/photo-1510525009512-ad7fc4b3de37?w=200',
      'Sousse': 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=200',
      'Kairouan': 'https://images.unsplash.com/photo-1574108989049-8b1cb8c7f4d3?w=200',
    };
    return regionFallbacks[d.region || ''] || 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200';
  }

  private buildTitle(criteria: ItineraryCriteria): string {
    const topInterests = criteria.interests
      .slice(0, 2)
      .map(interest => {
        // Translate each interest via onboarding.interests.*
        const key = `onboarding.interests.${interest}`;
        return this.transloco.translate(key);
      })
      .join(' & ');
    
    const defaultInterests = this.transloco.translate('itineraryResult.defaultInterests') || 'Découverte & Culture';
    const interests = topInterests || defaultInterests;
    
    // Utiliser la clé de traduction avec paramètres
    return this.transloco.translate('itineraryResult.titleFormat', {
      days: criteria.duration,
      interests
    });
  }

  // ─── Méthodes HTTP backend (Spring Boot) ──────────────────────────────

  /** Sauvegarde un itinéraire généré */
  saveItinerary(payload: any): Observable<{ success: boolean; message: string; itineraireId: number }> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  /** Récupère tous les itinéraires sauvegardés de l'utilisateur connecté */
  getMyItineraries(): Observable<SavedItinerary[]> {
    return this.http.get<SavedItinerary[]>(`${this.apiUrl}/my`);
  }

  /** Supprime un itinéraire sauvegardé */
  deleteItinerary(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
