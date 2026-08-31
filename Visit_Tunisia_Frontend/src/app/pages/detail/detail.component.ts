import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Destination, PhotoData, PracticalInfo } from '../../data/models';
import { TUNISIA_PATH, CATEGORY_COLORS } from '../../data/constants';
import { MapComponent, MapMarker } from '../../shared/map/map.component';
import { PublicDestinationService } from '../../services/public-destination.service';
import { ReviewService, AvisStats, AvisResponse } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { WeatherService, WeatherForecast } from '../../services/weather.service';
import { FavoriteService } from '../../services/favorite.service';
import { LanguageService } from '../../services/language.service';
import { MiniMapPickerComponent } from '../../shared/mini-map-picker/mini-map-picker.component';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, MapComponent, MiniMapPickerComponent],
  templateUrl: './detail.component.html',
})
export class DetailComponent implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();

  id: string | null = null;
  numericDestinationId: number | null = null;
  destination: Destination | null = null;
  isLoading = true;
  loadError: string | null = null;
  descriptionText = '';

  photos: PhotoData[] = [];
  practical: PracticalInfo[] = [];
  forecast: WeatherForecast[] = [];
  isLoadingWeather = true;
  tunisiaPath = TUNISIA_PATH;
  activePhoto = 0;

  // Favorite state synced with FavoriteService
  isFavorite = false;
  private favoriteSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private langSubscription?: Subscription;
  private lastRenderedLang?: string;

  // Lightbox Modal
  showLightbox = false;
  lightboxIndex = 0;

  // Real Reviews State
  reviewStats: AvisStats = {
    noteMoyenne: 0,
    totalAvis: 0,
    distributionEtoiles: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    avisList: []
  };
  isLoadingReviews = false;

  get hasReviews(): boolean {
    return this.reviewStats.totalAvis > 0;
  }

  get displayRating(): number | null {
    return this.hasReviews ? this.reviewStats.noteMoyenne : null;
  }

  // Rating Form State (start neutral to avoid bias)
  userRating = 0;
  hoverRating = 0;
  userComment = '';
  isSubmittingReview = false;
  reviewMessage = '';
  reviewMessageType: 'success' | 'error' = 'success';
  hasUserReviewed = false;

  // Nearby destinations
  nearbyDestinations: any[] = [];
  isLoadingNearby = false;

  get ratingLabel(): string {
    const labels = this.getRatingLabels();
    return labels[this.userRating] ?? labels[0];
  }

  private getRatingLabels(): string[] {
    // `destination.ratingLabels` is a JSON array (indices 0..5), not a
    // pipe-delimited string. Reading it via `t()` (typed as `string`) used
    // to crash on `.split('|')`; delegate to LanguageService which reads
    // transloco directly and returns string[].
    return this.lang.getRatingLabels();
  }

  get canSubmitReview(): boolean {
    return (
      this.userRating > 0 &&
      !this.isSubmittingReview &&
      this.authService.isAuthenticated()
    );
  }

  mapCenter: [number, number] = [36.8, 10.1];
  mapZoom = 14;
  mapMarkers: MapMarker[] = [];
  categoryColors = CATEGORY_COLORS;

  get hasAccessibilitePmr(): boolean {
    return !!this.destination?.accessibilitePmr;
  }

  getCategoryColor(category: string): string {
    return this.categoryColors[category] || '#1B6FA8';
  }

  // Icon background classes for practical info tiles
  iconClasses(icon: string): string {
    switch (icon) {
      case 'Clock': return 'bg-sky-50 text-[#1B6FA8]';
      case 'Banknote': return 'bg-orange-50 text-[#D97D45]';
      case 'Accessibility': return 'bg-emerald-50 text-emerald-600';
      case 'MapPin': return 'bg-violet-50 text-violet-600';
      case 'Car': return 'bg-cyan-50 text-cyan-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  // Formatage propre et lisible des horaires (uses transloco for fallback strings)
  formatHoraires(h: any): string {
    const fallback = this.t('destination.infoUnavailable');
    if (h == null || h === '') return fallback;

    // Si déjà une chaîne de texte
    if (typeof h === 'string') {
      if (h.trim().toLowerCase() === 'toujours_ouvert' || h.trim().toLowerCase() === 'true') {
        return this.t('destination.alwaysOpen');
      }
      return h;
    }

    // Si objet JSON
    if (typeof h === 'object') {
      // Cas 1 : toujours_ouvert / always_open
      if (h.toujours_ouvert === true || h.toujoursOuvert === true || h.always_open === true) {
        return this.t('destination.alwaysOpen');
      }

      // Cas 2 : Réception hôtel
      if (h.reception) {
        let txt = this.tp('destination.reception', { value: h.reception });
        if (h.check_in) txt += ' | ' + this.tp('destination.arrival', { value: h.check_in });
        if (h.check_out) txt += ' | ' + this.tp('destination.departure', { value: h.check_out });
        return txt;
      }

      // Cas 3 : Horaires par jour de la semaine
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      const presentDays = days.filter(d => h[d] !== undefined);

      if (presentDays.length > 0) {
        const firstVal = h[presentDays[0]];
        const allSame = presentDays.every(d => h[d] === firstVal);

        if (allSame && presentDays.length === 7) {
          if (firstVal === 'Fermé') return this.t('destination.closed');
          return this.tp('destination.everyDayAt', { hours: firstVal.replace('-', ' - ') });
        }

        // Si jours de semaine identiques + week-end différent
        const weekdaysSame = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].every(d => h[d] === h['lundi']);
        const weekendSame = h['samedi'] === h['dimanche'];

        if (weekdaysSame && weekendSame && h['lundi'] && h['samedi']) {
          if (h['lundi'] === h['samedi']) {
            return this.tp('destination.everyDayAt', { hours: h['lundi'].replace('-', ' - ') });
          }
          const wd = this.tp('destination.weekdays', { hours: h['lundi'].replace('-', ' - ') });
          const we = this.tp('destination.weekend', { hours: h['samedi'].replace('-', ' - ') });
          return `${wd} | ${we}`;
        }

        // Formatage clair jour par jour
        return presentDays.map(d => {
          const capDay = d.charAt(0).toUpperCase() + d.slice(1, 3);
          const val = h[d];
          return `${capDay} : ${val ? val.replace('-', ' - ') : this.t('destination.notSpecified')}`;
        }).join('\n');
      }

      // Autres propriétés génériques
      const fallbackOpen = this.t('destination.alwaysOpen');
      return Object.entries(h).map(([k, val]) => {
        if (val === true) return k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
        if (val === false) return null;
        const key = k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
        return `${key} : ${val}`;
      }).filter(Boolean).join(' | ') || fallbackOpen;
    }

    return String(h);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicDestService: PublicDestinationService,
    private reviewService: ReviewService,
    public authService: AuthService,
    private weatherService: WeatherService,
    private favoriteService: FavoriteService,
    private lang: LanguageService,
    private transloco: TranslocoService
  ) {}

  t(key: string, fallback?: string): string {
    return this.lang.translate(key, fallback);
  }

  /** Traduction avec interpolation transloco ({{param}}) — voir LanguageService.translateParams. */
  tp(key: string, params: Record<string, unknown>, fallback?: string): string {
    return this.lang.translateParams(key, params, fallback);
  }

  ngOnInit(): void {
    // ✅ FIX: The route.paramMap is a BehaviorSubject, so it emits the current
    // value SYNCHRONOUSLY when we subscribe. This single subscription handles
    // BOTH the first navigation (/catalog → /destinations/123) and any
    // subsequent re-navigations (e.g. clicking "Destinations à proximité").
    //
    // We previously combined a snapshot read with `skip(1)` on this subscription.
    // That pattern was fragile: if the snapshot was empty (router not fully
    // resolved, hot-reload mid-compile, redirect, etc.), the subscription also
    // skipped its first emission — so `loadDestination()` was never called,
    // `isLoading` stayed true, and the user had to hit F5 to see the page.
    //
    // The `id !== this.id` guard prevents duplicate loads when the BehaviorSubject
    // emits the same value more than once.
    console.log('[Detail] ngOnInit — subscribing to route.paramMap');
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('[Detail] paramMap emit', { id, currentId: this.id });
      if (id && id !== this.id) {
        console.log('[Detail] paramMap → loadDestination(' + id + ')');
        this.loadDestination(id);
      } else {
        console.log('[Detail] paramMap → skip (guard: id === this.id)');
      }
    });

    // Safety net: if for any reason the paramMap subscription didn't fire
    // synchronously (e.g. SSR, unusual router state), still try the snapshot.
    const initialId = this.route.snapshot.paramMap.get('id');
    console.log('[Detail] ngOnInit — snapshot initialId', { initialId, currentId: this.id });
    if (initialId && initialId !== this.id) {
      console.log('[Detail] snapshot → loadDestination(' + initialId + ')');
      this.loadDestination(initialId);
    }

    // Subscribe to favorite state changes (synced with catalog)
    this.favoriteSubscription = this.favoriteService.favoriteIds$.subscribe(favoriteIds => {
      if (this.numericDestinationId) {
        this.isFavorite = favoriteIds.has(this.numericDestinationId);
      }
    });

    // Rechargement complet quand la nouvelle langue est disponible.
    // currentLang$ émet à CHAQUE changement (même vers une langue déjà en
    // cache) ; whenLangReady attend la fin du chargement du JSON ou résout
    // immédiatement si déjà chargé. Le nom et la description sont localisés
    // au moment du fetch -> il faut refetch pour que TOUT soit traduit sans
    // refresh manuel.
    this.langSubscription = this.lang.currentLang$.pipe(
      switchMap(lang => this.lang.whenLangReady(lang))
    ).subscribe(lang => {
      if (lang === this.lastRenderedLang) return;
      if (this.numericDestinationId && !this.isLoading) {
        console.log('[Detail] Langue prête → rechargement de la destination', this.numericDestinationId);
        this.loadDestination(String(this.numericDestinationId));
      }
    });
  }

  /**
   * Reset component state and trigger all data fetches for a given destination id.
   * Called both for the initial load (from `route.snapshot.paramMap`) and for
   * subsequent in-page navigations between destinations.
   */
  private loadDestination(id: string): void {
    this.id = id;
    this.numericDestinationId = parseInt(id, 10);
    this.lastRenderedLang = this.transloco.getActiveLang();

    // Reset state
    this.isLoading = true;
    this.loadError = null;
    this.destination = null;  // Clear previous destination
    this.photos = [];  // Clear previous photos
    this.descriptionText = '';
    this.nearbyDestinations = [];
    this.hasUserReviewed = false;
    this.userRating = 0;
    this.userComment = '';
    this.reviewMessage = '';
    this.reviewStats = {
      noteMoyenne: 0,
      totalAvis: 0,
      distributionEtoiles: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      avisList: []
    };

    // Reload all data
    this.fetchDestinationDetails(this.numericDestinationId);
    this.fetchReviews(this.numericDestinationId);
    this.fetchNearbyDestinations(this.numericDestinationId);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.favoriteSubscription) {
      this.favoriteSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  fetchDestinationDetails(id: number): void {
    console.log('[Detail] fetchDestinationDetails START', { id });
    this.isLoading = true;
    this.publicDestService.getDestinationById(id).subscribe({
      next: (found) => {
        console.log('[Detail] fetchDestinationDetails NEXT', { id, found: found ? { id: found.id, name: found.name, region: found.region, img: found.img, photosCount: (found.photos || []).length } : null });
        this.isLoading = false;
        if (found) {
          this.destination = found;
          this.setupDestinationData(found);
        } else {
          console.warn('[Detail] fetchDestinationDetails NEXT but found is null — leaving destination as null');
        }
      },
      error: (err) => {
        console.error('[Detail] fetchDestinationDetails ERROR', { id, status: err?.status, message: err?.message, url: err?.url });
        this.isLoading = false;
        this.loadError = this.transloco.translate('destination.loadError', { id, status: err?.status || '—' });
      }
    });
    console.log('[Detail] fetchDestinationDetails END (subscribe returned)');
  }

  fetchReviews(destinationId: number): void {
    this.isLoadingReviews = true;
    this.hasUserReviewed = false;
    this.userRating = 0;
    this.userComment = '';
    this.reviewMessage = '';

    this.reviewService.getReviews(destinationId).subscribe({
      next: (stats) => {
        this.isLoadingReviews = false;
        this.reviewStats = stats;

        // Pre-fill form if user already reviewed
        if (this.authService.isAuthenticated()) {
          this.reviewService.getMyReview(destinationId).subscribe({
            next: (myReview) => {
              if (myReview && myReview.note) {
                this.hasUserReviewed = true;
                this.userRating = myReview.note;
                this.userComment = myReview.commentaire || '';
              } else {
                this.hasUserReviewed = false;
                this.userRating = 0;
                this.userComment = '';
              }
            },
            error: () => {
              this.hasUserReviewed = false;
              this.userRating = 0;
              this.userComment = '';
            }
          });
        }
      },
      error: () => {
        this.isLoadingReviews = false;
      }
    });
  }

  fetchNearbyDestinations(destinationId: number): void {
    this.isLoadingNearby = true;
    this.publicDestService.getNearbyDestinations(destinationId, 20, 5).subscribe({
      next: (destinations) => {
        this.nearbyDestinations = destinations;
        this.isLoadingNearby = false;
      },
      error: (err) => {
        console.error('Error loading nearby destinations:', err);
        this.isLoadingNearby = false;
      }
    });
  }

  setupDestinationData(dest: Destination): void {
    // Use real description from backend (already localized by service layer)
    this.descriptionText = dest.description || '';

    // Photos: Load all published photos for this destination
    const photoUrls: string[] = dest.photos || [];
    console.log(`[Detail] Destination "${dest.name}" has ${photoUrls.length} photos:`, photoUrls);

    if (photoUrls.length > 0) {
      this.photos = photoUrls.map((u, i) => ({
        id: i + 1,
        url: u,
        thumb: u,
        alt: `${dest.name} - Photo ${i + 1}`,
      }));
    } else if (dest.img) {
      this.photos = [{ id: 1, url: dest.img, thumb: dest.img, alt: dest.name }];
    } else {
      this.photos = [];
    }

    // Practical info — only show verified data
    const pmrAccess = dest.accessibilitePmr;
    const pmrText = pmrAccess === true
      ? this.t('destination.pmrYes')
      : pmrAccess === false
        ? this.t('destination.pmrNo')
        : this.t('destination.infoUnavailable');

    this.practical = [
      // FIX: use formatHoraires to avoid [object Object]
      { icon: 'Clock', label: this.t('destination.horairesLabel'), value: this.formatHoraires(dest.horaires) },
      { icon: 'Banknote', label: this.t('destination.priceLabel'), value: dest.price > 0 ? this.tp('destination.pricePerPerson', { price: dest.price }) : this.t('destination.priceFree') },
      { icon: 'Accessibility', label: this.t('destination.accessibilityLabel'), value: pmrText },
      // FIX: use MapPin icon for region (semantically correct) — getRegionWithPrefix
      // gère l'interpolation {{region}} + la localisation du nom de gouvernorat
      { icon: 'MapPin', label: this.t('destination.regionLabel'), value: this.lang.getRegionWithPrefix(dest.region) },
    ];

    // Only add parking info if we have OSM tags confirming it
    const osmTags = (dest as any).osm_tags || (dest as any).osmTags || {};
    if (osmTags.parking || osmTags['parking:fee'] || osmTags.amenity === 'parking') {
      this.practical.push({ icon: 'Car', label: this.t('destination.parkingLabel'), value: this.t('destination.parkingAvailable') });
    }

    // Load real weather forecast based on coordinates
    if (dest.latitude != null && dest.longitude != null) {
      this.isLoadingWeather = true;
      this.weatherService.getForecast(dest.latitude, dest.longitude).subscribe({
        next: (forecast) => {
          this.forecast = forecast;
          this.isLoadingWeather = false;
          console.log(`[Detail] Weather forecast loaded for ${dest.name}:`, forecast);
        },
        error: (err) => {
          console.warn('[Detail] Weather forecast failed, using fallback', err);
          this.isLoadingWeather = false;
        }
      });

      this.mapCenter = [dest.latitude, dest.longitude];
      this.mapMarkers = [{
        id: dest.id,
        latitude: dest.latitude,
        longitude: dest.longitude,
        label: dest.name,
        category: dest.category,
        price: dest.price,
        img: dest.img,
      }];
    } else {
      this.isLoadingWeather = false;
    }
  }

  selectPhoto(i: number): void {
    this.activePhoto = i;
  }

  /**
   * Toggle favorite status (synced with catalog via FavoriteService)
   */
  toggleFavorite(): void {
    if (!this.authService.isAuthenticated() || !this.numericDestinationId) {
      return;
    }

    if (this.isFavorite) {
      // Remove from favorites
      this.favoriteService.removeFavorite(this.numericDestinationId).subscribe({
        next: () => {
          console.log(`[Detail] Removed destination ${this.numericDestinationId} from favorites`);
        },
        error: (err) => {
          console.error('[Detail] Failed to remove favorite:', err);
          // Revert optimistic update
          this.favoriteService.revertRemove(this.numericDestinationId!);
        }
      });
    } else {
      // Add to favorites
      this.favoriteService.addFavorite(this.numericDestinationId).subscribe({
        next: () => {
          console.log(`[Detail] Added destination ${this.numericDestinationId} to favorites`);
        },
        error: (err) => {
          console.error('[Detail] Failed to add favorite:', err);
          // Revert optimistic update
          this.favoriteService.revertAdd(this.numericDestinationId!);
        }
      });
    }
  }

  setRating(star: number): void {
    this.userRating = star;
  }

  submitReview(): void {
    if (!this.numericDestinationId) return;

    if (!this.authService.isAuthenticated()) {
      this.reviewMessage = this.t('destination.reviewLoginRequired');
      this.reviewMessageType = 'error';
      return;
    }

    // Validation: require a rating
    if (this.userRating === 0) {
      this.reviewMessage = this.t('destination.reviewRatingRequired');
      this.reviewMessageType = 'error';
      return;
    }

    this.isSubmittingReview = true;
    this.reviewMessage = '';

    this.reviewService.submitReview(this.numericDestinationId, {
      note: this.userRating,
      commentaire: this.userComment
    }).subscribe({
      next: () => {
        this.isSubmittingReview = false;
        this.reviewMessage = this.hasUserReviewed
          ? this.t('destination.reviewUpdated')
          : this.t('destination.reviewSuccess');
        this.reviewMessageType = 'success';
        this.hasUserReviewed = true;

        if (this.numericDestinationId) {
          this.fetchReviews(this.numericDestinationId);
        }
      },
      error: (err) => {
        this.isSubmittingReview = false;
        this.reviewMessage = err.error?.message || this.t('destination.reviewError');
        this.reviewMessageType = 'error';
      }
    });
  }

  scrollToReviewForm(): void {
    document.getElementById('review-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  renderStars(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i);
  }

  isFilled(i: number, rating: number): boolean {
    return i < rating;
  }

  getStarPercentage(star: number): number {
    if (!this.reviewStats.totalAvis || this.reviewStats.totalAvis === 0) return 0;
    const count = this.reviewStats.distributionEtoiles[star] || 0;
    return Math.round((count / this.reviewStats.totalAvis) * 100);
  }

  getRatingInt(): number {
    return this.hasReviews ? Math.round(this.reviewStats.noteMoyenne) : 0;
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return this.t('destination.recently');
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(this.lang.currentLang, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return this.t('destination.recently');
    }
  }

  // Lightbox Modal Methods
  openLightbox(index: number = 0, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.photos.length === 0) return;
    this.lightboxIndex = index;
    this.showLightbox = true;
  }

  closeLightbox(): void {
    this.showLightbox = false;
  }

  prevLightboxPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.photos.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + this.photos.length) % this.photos.length;
  }

  nextLightboxPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.photos.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.photos.length;
  }

  openGpsDirections(): void {
    if (this.destination?.latitude && this.destination?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${this.destination.latitude},${this.destination.longitude}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.destination?.name + ' ' + this.destination?.region + ' Tunisie')}`;
      window.open(url, '_blank');
    }
  }

  goToNearbyDestination(destinationId: number): void {
    // Navigate to nearby destination and scroll to top
    this.router.navigate(['/detail', destinationId]).then(() => {
      window.scrollTo(0, 0);
    });
  }

  /** Used in template to format "Gouvernorat de {region}" / "ولاية {region}" via transloco. */
  regionLabel(region?: string): string {
    return this.lang.getRegionWithPrefix(region);
  }

  typeLabel(type?: string): string {
    return this.lang.getTypeLabel(type);
  }

  categoryLabel(category?: string): string {
    return this.lang.getCategoryLabel(category);
  }
}
