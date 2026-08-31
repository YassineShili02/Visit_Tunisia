import { Component, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Destination, DestinationPin, FilterState } from '../../data/models';
import { DESTINATIONS_DATA } from '../../data/destinations.data';
import { CATEGORY_COLORS, GOVERNORATES, EST_TYPES } from '../../data/constants';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { MapComponent, MapMarker } from '../../shared/map/map.component';
import { PreferenceService } from '../../services/preference.service';
import { GeolocationService, GeoPosition } from '../../services/geolocation.service';
import { PublicDestinationService } from '../../services/public-destination.service';
import { FavoriteService } from '../../services/favorite.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

export interface ExtendedDestination extends Destination {
  distanceKm?: number;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule, RouterModule, TranslocoModule, StarRatingComponent, MapComponent],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();
  @ViewChild('mainScroll', { read: ElementRef }) mainScrollContainer!: ElementRef<HTMLElement>;

  // Taille de page normale (mode paginé / infinite scroll classique)
  private readonly DEFAULT_PAGE_SIZE = 12;

  allDestinations: Destination[] = [];
  isLoadingDestinations = true;
  currentPage = 0;
  pageSize = 12;
  totalPages = 1;
  totalElements = 0;

  // Separate storage for ALL pins (for map display)
  allPins: DestinationPin[] = [];
  isLoadingPins = true;

  // Local fallback favorites (used when backend unavailable or user not logged in)
  localFavorites = new Set<number>();

  hoveredId: number | null = null;
  selectedCardId: number | null = null;
  categoryColors = CATEGORY_COLORS;
  governorates = GOVERNORATES;
  estTypes = EST_TYPES;

  userPosition: GeoPosition | null = null;
  sortByProximity = false;
  geolocationStatus: 'loading' | 'success' | 'denied' | 'error' = 'loading';
  mapCenter: [number, number] = [34.0, 9.5];
  mapZoom = 7;
  mapLoading = true;

  filters: FilterState = {
    regions: [],
    categories: [],
    types: [],
    maxPrice: 500,
  };

  governorateOpen = false;
  sidebarCollapsed = false;

  // Infinite scroll state
  isLoadingMore = false;
  hasMorePages = true;

  // CACHE for mapMarkers to prevent infinite change detection loop
  private _cachedMapMarkers: MapMarker[] = [];
  private _lastFiltersJson = '';

  constructor(
    private preferenceService: PreferenceService,
    private geoService: GeolocationService,
    private publicDestService: PublicDestinationService,
    public favoriteService: FavoriteService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private langService: LanguageService,
  ) { }

  favIdsSet = new Set<number>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    // Subscribe to reactive favorite IDs
    this.subs.push(
      this.favoriteService.favoriteIds$.subscribe(ids => {
        this.favIdsSet = ids;
      })
    );

    // Read filters from URL params first
    const hasUrlParams = this.route.snapshot.queryParams['categories'] ||
      this.route.snapshot.queryParams['regions'] ||
      this.route.snapshot.queryParams['types'] ||
      this.route.snapshot.queryParams['maxPrice'];

    this.route.queryParams.subscribe(params => {
      if (params['categories']) {
        this.filters.categories = params['categories'].split(',');
      }
      if (params['regions']) {
        this.filters.regions = params['regions'].split(',');
      }
      if (params['types']) {
        this.filters.types = params['types'].split(',');
      }
      if (params['maxPrice']) {
        this.filters.maxPrice = Number(params['maxPrice']);
      }
    });

    // Apply user preferences if no URL filters
    if (this.filters.categories.length === 0 && !hasUrlParams) {
      const prefs = this.preferenceService.currentPreferences;
      if (prefs.length > 0) {
        this.filters.categories = [...prefs];
        // Sync preferences to URL
        this.syncFiltersToUrl();
      }
    }

    // Load initial paginated active destinations (for list)
    this.fetchDestinations(0);

    // Load ALL pins separately (for map)
    this.fetchAllPins();

    // Load favorite IDs if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.favoriteService.loadFavoriteIds().subscribe({
        next: () => console.log('[Catalog] Favorite IDs loaded'),
        error: (err) => console.warn('[Catalog] Could not load favorite IDs', err)
      });
    }

    // Request user location (one-shot, non-blocking)
    this.geoService.getCurrentPosition().subscribe({
      next: (pos) => {
        this.mapLoading = false;
        if (pos && pos.latitude != null && pos.longitude != null) {
          this.userPosition = pos;
          this.geolocationStatus = 'success';
          console.log('[Catalog] User position obtained:', pos);
        } else {
          this.geolocationStatus = 'error';
        }
      },
      error: (err) => {
        this.mapLoading = false;
        console.warn('[Catalog] Geolocation error:', err);
        // Check if it's a permission denied error
        if (err?.code === 1 || err?.message?.includes('denied')) {
          this.geolocationStatus = 'denied';
        } else {
          this.geolocationStatus = 'error';
        }
      },
    });
  }

  ngAfterViewInit(): void {
    // Attach scroll listener to the ACTUAL scrollable container (<main>)
    if (this.mainScrollContainer?.nativeElement) {
      this.mainScrollContainer.nativeElement.addEventListener('scroll', () => {
        this.onMainScroll();
      });
    }
  }

  fetchDestinations(page: number = 0): void {
    this.isLoadingDestinations = true;
    this.currentPage = page;

    const regionParam = this.filters.regions.length > 0 ? this.filters.regions[0] : undefined;
    const catParam = this.filters.categories.length > 0 ? this.filters.categories : undefined;
    const typeParam = this.filters.types.length > 0 ? this.filters.types : undefined;

    this.publicDestService.getPublishedDestinations(
      regionParam,
      catParam,
      typeParam,
      undefined,
      this.filters.maxPrice < 500 ? this.filters.maxPrice : undefined,
      page,
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.isLoadingDestinations = false;
        this.isLoadingMore = false;

        // For page 0, replace. For subsequent pages, append (infinite scroll)
        if (page === 0) {
          this.allDestinations = res.items;
        } else {
          this.allDestinations = [...this.allDestinations, ...res.items];
        }

        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;
        this.hasMorePages = (page + 1) < res.totalPages;

        // 🔧 Auto-correction : si le tri par proximité est actif mais qu'il reste
        // des pages non chargées (pageSize était périmé, ex: filtre changé pendant
        // le mode proximité), on relance immédiatement avec la vraie taille totale
        // pour charger TOUT le jeu de résultats filtré en une fois.
        if (this.sortByProximity && this.hasMorePages) {
          this.pageSize = this.totalElements;
          this.fetchDestinations(0);
          return;
        }
      },
      error: (err) => {
        console.warn('[CatalogComponent] Error fetching destinations from service', err);
        this.isLoadingDestinations = false;
        this.isLoadingMore = false;
        if (page === 0) {
          this.allDestinations = DESTINATIONS_DATA;
          this.totalElements = DESTINATIONS_DATA.length;
          this.totalPages = Math.ceil(DESTINATIONS_DATA.length / this.pageSize) || 1;
          this.hasMorePages = false;
        }
      }
    });
  }

  /**
   * Fetch ALL pins for map (separate lightweight call)
   * This ensures map shows all matching destinations regardless of list pagination
   */
  fetchAllPins(): void {
    this.isLoadingPins = true;

    const regionParam = this.filters.regions.length > 0 ? this.filters.regions[0] : undefined;
    const catParam = this.filters.categories.length > 0 ? this.filters.categories : undefined;
    const typeParam = this.filters.types.length > 0 ? this.filters.types : undefined;

    this.publicDestService.getAllPinsForMap(
      regionParam,
      catParam,
      typeParam,
      undefined,
      this.filters.maxPrice < 500 ? this.filters.maxPrice : undefined
    ).subscribe({
      next: (pins) => {
        this.isLoadingPins = false;
        this.allPins = pins;
        // Invalidate cache to trigger mapMarkers recalculation
        this._lastFiltersJson = '';
      },
      error: (err) => {
        console.warn('[CatalogComponent] Error fetching pins', err);
        this.isLoadingPins = false;
        // Fallback: use existing destinations
        this.allPins = this.allDestinations
          .filter(d => d.latitude != null && d.longitude != null)
          .map(d => ({
            id: d.id,
            name: d.name,
            latitude: d.latitude!,
            longitude: d.longitude!,
            category: d.category,
            price: d.price,
            img: d.img
          }));
      }
    });
  }

  onPageChange(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.fetchDestinations(newPage);
      // Scroll smoothly to top of main container
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    }
  }

  get userPreferences(): string[] {
    return this.preferenceService.currentPreferences;
  }

  get filtered(): ExtendedDestination[] {
    let result: ExtendedDestination[] = this.allDestinations.filter((d) => {
      if (this.filters.regions.length && !this.filters.regions.includes(d.region)) return false;

      // Check if destination has ANY of the selected categories
      if (this.filters.categories.length) {
        const destCategories = d.categories || [d.category];
        const hasMatchingCategory = destCategories.some(cat => this.filters.categories.includes(cat));
        if (!hasMatchingCategory) return false;
      }

      if (this.filters.types.length && !this.filters.types.includes(d.estType)) return false;
      if (d.price > this.filters.maxPrice) return false;
      return true;
    });

    // Attach calculated distance if user position is available
    if (this.userPosition) {
      const uLat = this.userPosition.latitude;
      const uLng = this.userPosition.longitude;
      result = result.map((d) => {
        if (d.latitude != null && d.longitude != null) {
          const dist = this.geoService.calculateDistanceKm(uLat, uLng, d.latitude, d.longitude);
          return { ...d, distanceKm: dist };
        }
        return d;
      });

      // Sort by distance if proximity sort is enabled
      if (this.sortByProximity) {
        result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      }
    }

    return result;
  }

  get mapMarkers(): MapMarker[] {
    // Build markers from allPins (separate lightweight data), not from filtered destinations
    const currentFiltersJson = JSON.stringify({
      pinsCount: this.allPins.length,
      regions: this.filters.regions,
      categories: this.filters.categories,
      types: this.filters.types,
      maxPrice: this.filters.maxPrice,
      sortByProximity: this.sortByProximity,
    });

    if (currentFiltersJson !== this._lastFiltersJson) {
      this._lastFiltersJson = currentFiltersJson;
      this._cachedMapMarkers = this.allPins.map((pin) => ({
        id: pin.id,
        latitude: pin.latitude,
        longitude: pin.longitude,
        label: pin.name,
        category: pin.category,
        price: pin.price,
        img: pin.img,
      }));
    }

    return this._cachedMapMarkers;
  }

  get hasActiveFilters(): boolean {
    return (
      this.filters.regions.length > 0 ||
      this.filters.categories.length > 0 ||
      this.filters.types.length > 0 ||
      this.filters.maxPrice < 500 ||
      this.sortByProximity
    );
  }

  toggleSortByProximity(): void {
    if (this.userPosition) {
      this.sortByProximity = !this.sortByProximity;

      if (this.sortByProximity) {
        // Charge tout le jeu de résultats filtré en un seul appel,
        // pour que le tri par distance soit correct sur l'ensemble complet
        // dès le premier rendu (pas seulement sur les 12 premiers).
        this.pageSize = Math.max(this.totalElements, this.DEFAULT_PAGE_SIZE);
      } else {
        // Retour au mode paginé normal avec infinite scroll
        this.pageSize = this.DEFAULT_PAGE_SIZE;
      }

      // Refetch to recalculate distances and re-sort
      this.fetchDestinations(0);

      console.log('[Catalog] Sort by proximity:', this.sortByProximity ? 'ENABLED' : 'DISABLED');
    } else {
      // Show message if geolocation not available
      if (this.geolocationStatus === 'denied') {
        alert(this.langService.translate('catalog.geoAlertDenied'));
      } else if (this.geolocationStatus === 'error') {
        alert(this.langService.translate('catalog.geoAlertError'));
      } else {
        alert(this.langService.translate('catalog.geoAlertLoading'));
      }
    }
  }

  /**
   * Returns the localized display name for a category, falling back to the
   * raw FR label if no translation key exists.
   */
  categoryLabel(label: string): string {
    return this.langService.getCategoryLabel(label);
  }

  /**
   * Returns the localized display name for an establishment type.
   */
  typeLabel(type: string): string {
    return this.langService.getTypeLabel(type);
  }

  /**
   * Returns the localized display name for a region / governorate.
   */
  regionLabel(region?: string): string {
    return this.langService.getRegionLabel(region);
  }


  onMarkerClick(id: number): void {
    this.selectedCardId = id;

    // Scroll to card in list
    const el = document.getElementById(`dest-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setTimeout(() => {
      if (this.selectedCardId === id) {
        this.selectedCardId = null;
      }
    }, 2500);
  }

  onGouvernoratClick(gouvernoratName: string): void {
    if (!gouvernoratName) {
      this.filters = { ...this.filters, regions: [] };
    } else {
      this.filters = { ...this.filters, regions: [gouvernoratName] };
    }
    this.fetchDestinations(0);
    this.fetchAllPins(); // Reload pins with new filter
    this.syncFiltersToUrl();
  }

  get selectedGouvernorat(): string | null {
    return this.filters.regions.length === 1 ? this.filters.regions[0] : null;
  }

  deselectAllGouvernorats(): void {
    this.filters = { ...this.filters, regions: [] };
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  toggleRegion(r: string): void {
    if (this.filters.regions.includes(r)) {
      this.filters = { ...this.filters, regions: [] };
    } else {
      this.filters = { ...this.filters, regions: [r] };
    }
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  trackByDestId(index: number, dest: ExtendedDestination): number {
    return dest.id;
  }

  toggleCategory(c: string): void {
    this.filters = {
      ...this.filters,
      categories: this.filters.categories.includes(c)
        ? this.filters.categories.filter((x) => x !== c)
        : [...this.filters.categories, c],
    };
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  toggleType(t: string): void {
    this.filters = {
      ...this.filters,
      types: this.filters.types.includes(t)
        ? this.filters.types.filter((x) => x !== t)
        : [...this.filters.types, t],
    };
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  resetFilters(): void {
    this.filters = { regions: [], categories: [], types: [], maxPrice: 500 };
    this.sortByProximity = false;
    this.pageSize = this.DEFAULT_PAGE_SIZE;
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  private syncFiltersToUrl(): void {
    const params: any = {};

    if (this.filters.categories.length > 0) {
      params.categories = this.filters.categories.join(',');
    }
    if (this.filters.regions.length > 0) {
      params.regions = this.filters.regions.join(',');
    }
    if (this.filters.types.length > 0) {
      params.types = this.filters.types.join(',');
    }
    if (this.filters.maxPrice !== 500) {
      params.maxPrice = this.filters.maxPrice;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onPriceChange(e: Event): void {
    this.filters = { ...this.filters, maxPrice: Number((e.target as HTMLInputElement).value) };
    this.fetchDestinations(0);
    this.fetchAllPins();
    this.syncFiltersToUrl();
  }

  toggleGovernorate(): void {
    this.governorateOpen = !this.governorateOpen;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getColor(category: string): string {
    return (this.categoryColors as Record<string, string>)[category] ?? '#1B6FA8';
  }

  onDetailClick(id?: number): void {
    console.log('[Catalog] onDetailClick triggered, id:', id);
    if (id != null) {
      this.router.navigate(['/destinations', id]);
    } else {
      this.navigate.emit('detail');
    }
  }

  resultSuffix(count: number): string {
    return count > 1 ? 's' : '';
  }

  // Infinite scroll handler - listens to <main> scroll, NOT window scroll
  private onMainScroll(): void {
    // Pas de chargement supplémentaire en mode "tri par proximité" :
    // dans ce mode on a déjà tout chargé en une fois (voir toggleSortByProximity).
    if (this.isLoadingMore || !this.hasMorePages || this.sortByProximity) return;

    const mainEl = this.mainScrollContainer?.nativeElement;
    if (!mainEl) return;

    const scrollPosition = mainEl.scrollTop + mainEl.clientHeight;
    const scrollHeight = mainEl.scrollHeight;

    // Load next page when within 300px of bottom
    if (scrollHeight - scrollPosition < 300) {
      this.loadNextPage();
    }
  }

  loadNextPage(): void {
    if (this.isLoadingMore || !this.hasMorePages || this.sortByProximity) return;

    this.isLoadingMore = true;
    this.fetchDestinations(this.currentPage + 1);
  }

  // Favorite management — optimistic local update, backend best-effort
  toggleFavorite(destId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.isAuthenticated()) {
      // Not logged in → local-only toggle (session only)
      if (this.localFavorites.has(destId)) {
        this.localFavorites.delete(destId);
      } else {
        this.localFavorites.add(destId);
      }
      return;
    }

    const isFav = this.favoriteService.isFavorite(destId);

    // Optimistic update already applied by FavoriteService before HTTP call
    if (isFav) {
      this.favoriteService.removeFavorite(destId).subscribe({
        next: () => { },
        error: () => {
          // Revert locally only — do NOT call addFavorite() again (would re-hit failing backend)
          this.favoriteService.revertAdd(destId);
        }
      });
    } else {
      this.favoriteService.addFavorite(destId).subscribe({
        next: () => { },
        error: () => {
          // Revert locally only
          this.favoriteService.revertRemove(destId);
        }
      });
    }
  }

  isFavorite(destId: number): boolean {
    return this.favIdsSet.has(destId) || this.localFavorites.has(destId);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}