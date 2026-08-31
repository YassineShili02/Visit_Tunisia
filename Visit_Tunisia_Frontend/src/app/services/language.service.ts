import { Injectable, inject, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { COUNTRY_CODES } from '../data/constants';

export type SupportedLang = 'fr' | 'en' | 'ar' | 'it' | 'de';

export const SUPPORTED_LANGS: SupportedLang[] = ['fr', 'en', 'ar', 'it', 'de'];

const STORAGE_KEY = 'vt_lang';
const FALLBACK_LANG: SupportedLang = 'fr';
const RTL_LANGS: SupportedLang[] = ['ar'];

/**
 * Localized jsonb field. Backend currently serves: fr, en?, ar?, it?, de?.
 */
export type LocalizedField =
  | string
  | null
  | undefined
  | { fr?: string; en?: string; ar?: string; it?: string; de?: string };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private currentLangSubject = new BehaviorSubject<SupportedLang>(FALLBACK_LANG);
  private isRtlSubject = new BehaviorSubject<boolean>(false);

  currentLang$: Observable<SupportedLang> = this.currentLangSubject.asObservable();
  isRtl$: Observable<boolean> = this.isRtlSubject.asObservable();

  /**
   * Émet UNIQUEMENT quand une langue a été PLEINEMENT chargée par transloco
   * (event 'langLoaded'). À utiliser au lieu de currentLang$ pour recharger
   * des données traduites côté TS : currentLang$ émet AVANT que le JSON de
   * la nouvelle langue soit disponible (race condition -> clés brutes).
   */
  langReady$: Observable<SupportedLang> = this.transloco.events$.pipe(
    filter(e => e.type === 'translationLoadSuccess'),
    map(e => ((e as any).payload?.lang ?? this.transloco.getActiveLang()) as SupportedLang),
    filter(code => SUPPORTED_LANGS.includes(code)),
    distinctUntilChanged()
  );

  /**
   * Résout quand le JSON de la langue est réellement disponible.
   * - langue jamais chargée -> attend la fin du chargement réseau
   * - langue déjà en cache (retour à une langue déjà utilisée) -> résout
   *   IMMÉDIATEMENT (transloco.load ne ré-émet pas d'event dans ce cas,
   *   c'est pourquoi langReady$ seul ne suffit pas).
   */
  whenLangReady(code: SupportedLang): Observable<SupportedLang> {
    return from(this.transloco.load(code)).pipe(map(() => code));
  }

  private initialized = false;

  constructor() {
    this.bootstrap();
    // Applique la langue préférée du compte (stockée côté backend) dès que
    // l'utilisateur est chargé (login ou restauration de session). Si un
    // choix valide existe déjà dans localStorage, il reste prioritaire.
    this.auth.user$.subscribe(() => this.syncFromUser(false));
  }

  /**
   * Appelé par le constructeur. Lit localStorage, puis la préférence utilisateur,
   * puis le fallback. Configure aussi le html lang / dir.
   */
  private bootstrap(): void {
    if (this.initialized) return;
    this.initialized = true;

    let chosen: SupportedLang | null = null;

    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        chosen = stored;
      }
    }

    if (!chosen) {
      const user = this.auth.currentUser;
      // Backend stores languePreferee as uppercase enum (FR/EN/AR/IT/DE) — normalize
      const rawLang = (user as any)?.languePreferee as string | undefined;
      const fromUser = rawLang?.toLowerCase() as SupportedLang | undefined;
      if (fromUser && SUPPORTED_LANGS.includes(fromUser)) {
        chosen = fromUser;
      }
    }

    if (!chosen) {
      chosen = FALLBACK_LANG;
    }

    this.applyLang(chosen, { persist: false });
  }

  /**
   * Déclenche un changement de langue. Persiste dans localStorage.
   */
  setLang(code: SupportedLang): void {
    if (!SUPPORTED_LANGS.includes(code)) return;
    this.applyLang(code, { persist: true });
  }

  /**
   * Lit la langue courante (synchrone).
   */
  get currentLang(): SupportedLang {
    return this.currentLangSubject.value;
  }

  get isRtl(): boolean {
    return this.isRtlSubject.value;
  }

  /**
   * Synchronise la langue avec celle de l'utilisateur authentifié. Si l'utilisateur
   * a explicitement choisi une langue dans localStorage, on ne l'écrase PAS sauf si
   * `force` est vrai.
   */
  syncFromUser(force: boolean = false): void {
    const user = this.auth.currentUser;
    // Backend stores languePreferee as uppercase enum (FR/EN/AR/IT/DE) — normalize
    const rawLang = (user as any)?.languePreferee as string | undefined;
    const fromUser = rawLang?.toLowerCase() as SupportedLang | undefined;
    if (!fromUser || !SUPPORTED_LANGS.includes(fromUser)) return;

    if (!force && isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored as SupportedLang)) return;
    }

    this.applyLang(fromUser, { persist: true });
  }

  /**
   * Convertit un champ jsonb (objet ou string) en texte dans la langue courante,
   * avec fallback en cascade : lang courante -> fr -> en -> première valeur non vide -> fallback.
   */
  getLocalizedName(field: LocalizedField, fallback?: string): string {
    return this.getLocalized(field, fallback ?? this.t('common.untitled'));
  }

  getLocalizedDescription(field: LocalizedField, fallback?: string): string {
    return this.getLocalized(field, fallback ?? this.t('common.noDescription'));
  }

  private getLocalized(field: LocalizedField, fallback: string): string {
    if (field == null) return fallback;
    if (typeof field === 'string') {
      return field.trim() || fallback;
    }
    if (typeof field === 'object') {
      const cur = this.currentLang;
      const candidates: Array<keyof typeof field> = [cur, 'fr', 'en', 'it', 'de', 'ar'];
      for (const key of candidates) {
        const v = (field as any)[key];
        if (typeof v === 'string' && v.trim().length > 0) return v;
      }
      // First non-empty key, regardless of order
      for (const key of Object.keys(field)) {
        const v = (field as any)[key];
        if (typeof v === 'string' && v.trim().length > 0) return v;
      }
    }
    return fallback;
  }

  private applyLang(code: SupportedLang, opts: { persist: boolean }): void {
    this.transloco.setActiveLang(code);
    this.currentLangSubject.next(code);
    const isRtl = RTL_LANGS.includes(code);
    this.isRtlSubject.next(isRtl);

    if (isPlatformBrowser(this.platformId)) {
      const doc = document.documentElement;
      doc.lang = code;
      doc.dir = isRtl ? 'rtl' : 'ltr';
      if (opts.persist) {
        try {
          localStorage.setItem(STORAGE_KEY, code);
        } catch {
          /* localStorage may not be available */
        }
      }
    }
  }

  private t(key: string): string {
    try {
      const v = this.transloco.translate(key);
      return v && v !== key ? v : key;
    } catch {
      return key;
    }
  }

  /**
   * Public translator with optional fallback. Returns the key itself if no
   * translation is available, so components can safely call this in templates.
   */
  translate(key: string, fallback?: string): string {
    const v = this.t(key);
    if (v && v !== key) return v;
    return fallback ?? key;
  }

  /**
   * Traduction avec paramètres d'interpolation transloco ({{param}}).
   * À utiliser au lieu de .replace('{x}', ...) qui ne fonctionne pas
   * car transloco vide les {{x}} non fournis avant le replace.
   */
  translateParams(key: string, params: Record<string, unknown>, fallback?: string): string {
    try {
      const v = this.transloco.translate(key, params);
      return v && v !== key ? v : (fallback ?? key);
    } catch {
      return fallback ?? key;
    }
  }

  /**
   * Returns short month abbreviations in the current language. The JSON files
   * expose these under home.months.short. Falls back to the French list.
   */
  /**
   * Returns short month abbreviations in the current language. The JSON files
   * expose these under home.months.short. Falls back to the French list.
   */
  getShortMonths(): string[] {
    const fallback = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const raw = this.transloco.translate('home.months.short');
    if (Array.isArray(raw) && raw.length === 12) return raw as string[];
    return fallback;
  }

  /**
   * Returns short day abbreviations in the current language. The JSON files
   * expose these under common.days.short. Falls back to the French list.
   */
  getShortDays(): string[] {
    const fallback = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const raw = this.transloco.translate('common.days.short');
    if (Array.isArray(raw) && raw.length === 7) return raw as string[];
    return fallback;
  }

  /**
   * Returns the localized label for an itinerary stop category key.
   * - Backend enums ('CULTUREL', 'BALNEAIRE'...) resolve via home.categories.*
   * - Dedicated keys ('gastronomie', 'activite', 'shopping', 'visite', 'hotelNight')
   *   resolve via itineraryResult.stopCategory.*
   */
  getItineraryCategoryLabel(key?: string): string {
    if (!key) return '';
    const enums = ['CULTUREL', 'BALNEAIRE', 'GASTRONOMIQUE', 'AVENTURE', 'RELIGIEUX', 'ECOLOGIQUE'];
    if (enums.includes(key)) return this.getCategoryLabel(key);
    return this.translate(`itineraryResult.stopCategory.${key}`, key);
  }

  /**
   * Returns the rating label array (index 0 = neutral "rate it" label,
   * indices 1..5 = star descriptors). The JSON files expose this as a real
   * JSON array under `destination.ratingLabels`, not a pipe-delimited string,
   * so we read it via `transloco.translate()` directly (the `t()`/`translate()`
   * helpers above are typed as `string` and would coerce it). Falls back to
   * the French labels so the UI never renders empty if the locale file is
   * missing or out of sync.
   */
  getRatingLabels(): string[] {
    const fallback = ['À vous de noter', 'Déçu', 'Moyen', 'Bien', 'Très bien', 'Excellent !'];
    const raw = this.transloco.translate('destination.ratingLabels');
    if (Array.isArray(raw) && raw.length >= 6) return raw as string[];
    return fallback;
  }

  /**
   * Returns localized establishment type (e.g., "Site touristique", "Hébergement", etc.)
   */
  getTypeLabel(type?: string): string {
    if (!type) return '';
    return this.translate(`common.types.${type}`, type);
  }

  /**
   * Returns localized category label (e.g., "Culturel", "Balnéaire", etc.)
   */
  getCategoryLabel(category?: string): string {
    if (!category) return '';
    // Normalise l'enum backend ('CULTUREL') vers la clé canonique du JSON ('Culturel')
    const enumToKey: Record<string, string> = {
      CULTUREL: 'Culturel',
      BALNEAIRE: 'Balnéaire',
      GASTRONOMIQUE: 'Gastronomique',
      AVENTURE: 'Aventure',
      RELIGIEUX: 'Religieux',
      ECOLOGIQUE: 'Écologique',
    };
    const key = enumToKey[category] ?? category;
    return this.translate(`home.categories.${key}`, key);
  }

  /**
   * Returns localized region / governorate name (e.g., "Médenine" -> "مدنين")
   */
  getRegionLabel(region?: string): string {
    if (!region) return '';
    // Strip "Gouvernorat de " or "ولاية " if already prefixed in data
    const clean = region.replace(/^(Gouvernorat de |ولاية )/i, '').trim();
    return this.translate(`common.regions.${clean}`, clean);
  }

  /**
   * Returns the localized country name from an ISO code ("DZ") or a stored
   * French name ("Algérie"), via the browser-native Intl.DisplayNames API.
   * Falls back to the canonical French name from constants.
   */
  getCountryName(codeOrName?: string): string {
    if (!codeOrName) return '';
    const entry = COUNTRY_CODES.find(
      c => c.code === codeOrName.toUpperCase() || c.name === codeOrName
    );
    const iso = entry?.code ?? codeOrName;
    try {
      const dn = new Intl.DisplayNames([this.currentLang], { type: 'region' });
      return dn.of(iso.toUpperCase()) ?? entry?.name ?? codeOrName;
    } catch {
      return entry?.name ?? codeOrName;
    }
  }

  /**
   * Returns localized region with prefix (e.g., "ولاية مدنين" / "Gouvernorat de Médenine")
   */
  getRegionWithPrefix(region?: string): string {
    if (!region) return '';
    const localized = this.getRegionLabel(region);
    // IMPORTANT : lire le template via translate() SANS params ne fonctionne pas,
    // transloco vide les {{region}} non fournis. On traduit directement avec le param.
    const prefixed = this.transloco.translate('destination.regionPrefix', { region: localized });
    return prefixed && prefixed !== 'destination.regionPrefix' ? prefixed : localized;
  }

  /**
   * Returns localized event genre (e.g., "Musical", "Culturel", etc.)
   */
  getGenreLabel(genre?: string): string {
    if (!genre) return '';
    return this.translate(`common.genres.${genre}`, genre);
  }
}

