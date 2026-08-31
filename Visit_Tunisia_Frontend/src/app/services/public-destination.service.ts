import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, catchError, map } from 'rxjs';
import { Destination, DestinationPin } from '../data/models';
import { LanguageService } from './language.service';

export interface PaginatedPublicDestinations {
  items: Destination[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class PublicDestinationService {
  private apiUrl = 'http://localhost:8082/api/destinations';

  constructor(private http: HttpClient, private langService: LanguageService) {}

  /**
   * Get paginated active destinations from backend with optional filters
   */
  getPublishedDestinations(
    region?: string,
    categorie?: string | string[],
    type?: string | string[],
    search?: string,
    maxPrice?: number,
    page: number = 0,
    size: number = 12
  ): Observable<PaginatedPublicDestinations> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (region && region !== 'Tous') params = params.set('region', region);

    const categoriesArray = Array.isArray(categorie) ? categorie : (categorie ? [categorie] : []);
    categoriesArray.forEach(c => {
      const backendCat = this.mapCategoryToBackend(c);
      if (backendCat) params = params.append('categories', backendCat);
    });

    const typesArray = Array.isArray(type) ? type : (type ? [type] : []);
    typesArray.forEach(t => {
      const backendType = this.mapTypeToBackend(t);
      if (backendType) params = params.append('types', backendType);
    });

    if (search && search.trim()) params = params.set('search', search.trim());
    if (maxPrice != null && maxPrice < 500) params = params.set('maxPrice', maxPrice.toString());

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const content = res.content || (Array.isArray(res) ? res : []);
        const backendItems: Destination[] = content.map((item: any) => this.mapBackendToFrontend(item));

        const totalElements = res.totalElements ?? backendItems.length;
        const totalPages = res.totalPages ?? (Math.ceil(totalElements / size) || 1);
        return {
          items: backendItems,
          totalElements: totalElements,
          totalPages: totalPages,
          page: res.number ?? page,
          size: res.size ?? size,
        };
      }),
      catchError(err => {
        // FIX Step 1 : on ne masque plus l'échec derrière un mock silencieux.
        // L'erreur remonte au composant, qui affichera un message d'erreur explicite.
        console.error('[PublicDestinationService] getPublishedDestinations failed', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Get single published destination details by ID
   */
  getDestinationById(id: number): Observable<Destination | null> {
    console.log('[PublicDestinationService] getDestinationById START', { id, url: `${this.apiUrl}/${id}` });
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => {
        console.log('[PublicDestinationService] getDestinationById MAP input', { id, item });
        const mapped = this.mapBackendToFrontend(item);
        console.log('[PublicDestinationService] getDestinationById MAP output', { id, mapped });
        return mapped;
      }),
      catchError(err => {
        // FIX Step 1 : on ne masque plus l'échec derrière un mock silencieux.
        // L'erreur remonte au composant, qui affichera un message d'erreur explicite.
        console.error(`[PublicDestinationService] getDestinationById FAILED for #${id}`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Get ALL pins for map display (lightweight, non-paginated)
   * This ensures the map shows all matching destinations while the list is paginated
   */
  getAllPinsForMap(
    region?: string,
    categorie?: string | string[],
    type?: string | string[],
    search?: string,
    maxPrice?: number
  ): Observable<DestinationPin[]> {
    let params = new HttpParams();

    if (region && region !== 'Tous') params = params.set('region', region);

    const categoriesArray = Array.isArray(categorie) ? categorie : (categorie ? [categorie] : []);
    categoriesArray.forEach(c => {
      const backendCat = this.mapCategoryToBackend(c);
      if (backendCat) params = params.append('categories', backendCat);
    });

    const typesArray = Array.isArray(type) ? type : (type ? [type] : []);
    typesArray.forEach(t => {
      const backendType = this.mapTypeToBackend(t);
      if (backendType) params = params.append('types', backendType);
    });

    if (search && search.trim()) params = params.set('search', search.trim());
    if (maxPrice != null && maxPrice < 500) params = params.set('maxPrice', maxPrice.toString());

    return this.http.get<any[]>(`${this.apiUrl}/pins`, { params }).pipe(
      map(pins => pins.map(pin => this.mapPinBackendToFrontend(pin))),
      catchError(err => {
        // FIX Step 1 : on ne masque plus l'échec derrière un mock silencieux.
        // L'erreur remonte au composant, qui affichera un message d'erreur explicite.
        console.error('[PublicDestinationService] getAllPinsForMap failed', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Map lightweight pin response from backend to frontend model
   */
  private mapPinBackendToFrontend(pin: any): DestinationPin {
    const name = this.langService.getLocalizedName(pin.nom, 'Destination');

    const img = pin.img
      ? (pin.img.startsWith('http') || pin.img.startsWith('data:') ? pin.img : 'http://localhost:8082' + pin.img)
      : undefined;

    const categoriesList = Array.isArray(pin.categories)
      ? pin.categories
      : (pin.categories ? Array.from(pin.categories) : []);
    
    const category = this.mapCategoryToFrontend(categoriesList[0] as string);

    return {
      id: pin.destinationId || pin.id,
      name: name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      category: category,
      price: pin.tarifEstime ? Number(pin.tarifEstime) : 0,
      img: img
    };
  }

  /**
   * Map backend DestinationResponse JSON to Frontend Destination model
   */
  public mapBackendToFrontend(item: any): Destination {
    const name = this.langService.getLocalizedName(item.nom, 'Destination sans nom');

    const photos: string[] = item.photos || [];
    let mainImg = '';
    if (photos.length > 0 && photos[0]) {
      const p = photos[0].trim();
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) {
        mainImg = p;
      } else if (p.startsWith('/')) {
        mainImg = 'http://localhost:8082' + p;
      } else {
        mainImg = 'http://localhost:8082/' + p;
      }
    }

    const categoriesList = Array.isArray(item.categories)
      ? item.categories
      : (item.categories ? Array.from(item.categories) : []);
    
    console.log('[DestinationMapper] Destination:', item.nom?.fr, 'Categories from backend:', item.categories, 'Parsed list:', categoriesList);
    
    // Map all categories to frontend format
    const allCategories = categoriesList.map((cat: string) => this.mapCategoryToFrontend(cat));
    
    console.log('[DestinationMapper] Mapped categories:', allCategories);
    
    // Primary category is the first one (for backward compatibility)
    const category = allCategories[0] || 'Culturel';
    const estType = this.mapTypeToFrontend(item.type);

    // Use backend-provided review stats if available
    const nombreAvis = item.nombreAvis ?? item.reviews_count ?? 0;
    const noteAverage = item.noteAverage;

    // Fallback rating calculation if backend doesn't provide
    const attr = item.attributsSpecifiques || {};
    const score = attr.quality_score ?? attr.qualityScore ?? 92;
    const fallbackRating = Math.min(5.0, Math.max(3.5, Number((score / 20).toFixed(1))));

    // Map all photos with full URLs
    const allPhotos = photos.map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
      } else if (trimmed.startsWith('/')) {
        return 'http://localhost:8082' + trimmed;
      } else {
        return 'http://localhost:8082/' + trimmed;
      }
    });

    // Extract description
    const description = this.langService.getLocalizedDescription(item.description, '');

    return {
      id: item.destinationId || item.id,
      name: name,
      shortName: name,
      region: item.region || 'Tunisie',
      category: category,
      categories: allCategories, // All categories mapped
      type: estType,
      estType: estType,
      rating: noteAverage ?? fallbackRating,
      reviews: nombreAvis,
      price: item.tarifEstime ? Number(item.tarifEstime) : 0,
      img: mainImg,
      mapX: 200,
      mapY: 200,
      latitude: item.latitude,
      longitude: item.longitude,
      nombreAvis: nombreAvis,
      noteAverage: noteAverage,
      photos: allPhotos,
      description: description,
      horaires: item.horaires,
      accessibilitePmr: item.accessibilitePmr
    };
  }

  /**
   * Get nearby destinations within a certain radius
   */
  getNearbyDestinations(
    destinationId: number,
    radiusKm: number = 20,
    limit: number = 5
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('radiusKm', radiusKm.toString())
      .set('limit', limit.toString());

    return this.http.get<any[]>(`${this.apiUrl}/${destinationId}/nearby`, { params }).pipe(
      map(items => items.map(item => {
        const name = this.langService.getLocalizedName(item.nom, 'Destination');
        const imageUrl = item.imageUrl
          ? (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:') 
              ? item.imageUrl 
              : 'http://localhost:8082' + item.imageUrl)
          : undefined;

        const categoriesList = Array.isArray(item.categories)
          ? item.categories
          : (item.categories ? Array.from(item.categories) : []);
        
        const category = this.mapCategoryToFrontend(categoriesList[0] as string);

        return {
          id: item.destinationId,
          name: name,
          type: this.mapTypeToFrontend(item.type),
          category: category,
          region: item.region,
          latitude: item.latitude,
          longitude: item.longitude,
          price: item.tarifEstime ? Number(item.tarifEstime) : 0,
          imageUrl: imageUrl,
          distanceKm: item.distanceKm
        };
      })),
      catchError(err => {
        console.warn('[PublicDestinationService] Failed to load nearby destinations', err);
        return of([]);
      })
    );
  }

  private mapCategoryToFrontend(cat?: string): string {
    if (!cat) return 'Culturel';
    const c = cat.toUpperCase();
    if (c.includes('CULTUREL')) return 'Culturel';
    if (c.includes('BALNEAIRE')) return 'Balnéaire';
    if (c.includes('ECOLOGIQUE')) return 'Écologique';
    if (c.includes('GASTRONOMIQUE')) return 'Gastronomique';
    if (c.includes('AVENTURE')) return 'Aventure';
    if (c.includes('RELIGIEUX')) return 'Religieux';
    return cat;
  }

  private mapCategoryToBackend(cat?: string): string | undefined {
    if (!cat || cat === 'Tous') return undefined;
    const normalized = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes('culturel')) return 'CULTUREL';
    if (normalized.includes('balneaire')) return 'BALNEAIRE';
    if (normalized.includes('ecologique')) return 'ECOLOGIQUE';
    if (normalized.includes('gastronomique')) return 'GASTRONOMIQUE';
    if (normalized.includes('aventure')) return 'AVENTURE';
    if (normalized.includes('religieux')) return 'RELIGIEUX';
    return undefined;
  }

  private mapTypeToFrontend(t?: string): string {
    if (!t) return 'Site touristique';
    const typeUpper = t.toUpperCase();
    if (typeUpper.includes('SITE')) return 'Site touristique';
    if (typeUpper.includes('RESTAURANT')) return 'Restaurant';
    if (typeUpper.includes('HEBERGEMENT')) return 'Hébergement';
    if (typeUpper.includes('ACTIVITE')) return 'Activité';
    if (typeUpper.includes('COMMERCE')) return 'Commerce';
    return t;
  }

  private mapTypeToBackend(typeStr?: string): string | undefined {
    if (!typeStr) return undefined;
    if (typeStr.includes('Site')) return 'SITE_TOURISTIQUE';
    if (typeStr.includes('Restaurant')) return 'RESTAURANT';
    if (typeStr.includes('Hébergement') || typeStr.includes('Hebergement')) return 'HEBERGEMENT';
    if (typeStr.includes('Activité') || typeStr.includes('Activite')) return 'ACTIVITE';
    if (typeStr.includes('Commerce')) return 'COMMERCE';
    return undefined;
  }
}
