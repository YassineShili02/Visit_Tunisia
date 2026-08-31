import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, catchError, map, tap } from 'rxjs';
import { ModerationDestination, DestinationStatut } from '../data/models';
import { MODERATION_DESTINATIONS_DATA } from '../data/admin.data';

export interface CountsResponse {
  total: number;
  actif: number;
  brouillon: number;
  archive: number;
}

export interface ImportResponse {
  status: string;
  message: string;
}

export interface PaginatedDestinations {
  items: ModerationDestination[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDestinationService {
  private apiUrl = 'http://localhost:8082/api/admin/destinations';

  // Fallback in-memory mock store
  private mockStore: ModerationDestination[] = JSON.parse(JSON.stringify(MODERATION_DESTINATIONS_DATA));

  // Toast notifications
  private toastSubject = new BehaviorSubject<{ message: string; type: 'success' | 'error' } | null>(null);
  toast$ = this.toastSubject.asObservable();

  constructor(private http: HttpClient) {}

  // --- READ ---

  getDestinations(
    statut?: DestinationStatut,
    region?: string,
    categorie?: string,
    search?: string,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedDestinations> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (statut) params = params.set('statut', statut);
    if (region && region !== 'Tous') params = params.set('region', region);
    if (categorie && categorie !== 'Tous') params = params.set('categorie', categorie);
    if (search && search.trim()) params = params.set('search', search.trim());

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const content = res.content || (Array.isArray(res) ? res : []);
        const items = content.map((item: any) => this.mapBackendToFrontend(item));
        return {
          items,
          totalPages: res.totalPages ?? 1,
          totalElements: res.totalElements ?? items.length,
          page: res.number ?? page,
          size: res.size ?? size,
        };
      }),
      catchError(err => {
        console.warn('[AdminDestinationService] Backend non disponible, filtrage sur le mock', err);
        let filtered = statut
          ? this.mockStore.filter(d => d.statut === statut)
          : [...this.mockStore];

        if (region && region !== 'Tous') {
          filtered = filtered.filter(d => d.region === region);
        }
        if (categorie && categorie !== 'Tous') {
          filtered = filtered.filter(d => d.categories?.includes(categorie));
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          filtered = filtered.filter(d => d.nom?.fr?.toLowerCase().includes(q) || d.region?.toLowerCase().includes(q));
        }

        const start = page * size;
        const paginatedItems = filtered.slice(start, start + size);
        return of({
          items: paginatedItems,
          totalPages: Math.ceil(filtered.length / size) || 1,
          totalElements: filtered.length,
          page,
          size,
        });
      })
    );
  }

  getCountsByStatut(): Observable<{ TOUTES: number; ACTIF: number; BROUILLON: number; ARCHIVE: number }> {
    return this.http.get<CountsResponse>(`${this.apiUrl}/counts`).pipe(
      map(res => ({
        TOUTES: res.total,
        ACTIF: res.actif,
        BROUILLON: res.brouillon,
        ARCHIVE: res.archive,
      })),
      catchError(err => {
        return of({
          TOUTES: this.mockStore.length,
          ACTIF: this.mockStore.filter(d => d.statut === 'ACTIF').length,
          BROUILLON: this.mockStore.filter(d => d.statut === 'BROUILLON').length,
          ARCHIVE: this.mockStore.filter(d => d.statut === 'ARCHIVE').length,
        });
      })
    );
  }

  // --- UPDATE STATUT & DELETE ---

  updateStatut(id: number, statut: DestinationStatut): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/statut`, { statut }).pipe(
      tap(() => {
        const label = statut === 'ACTIF' ? 'publiée' : 'modifiée';
        this.showToast(`Destination #${id} ${label} avec succès`, 'success');
      }),
      catchError(err => {
        const dest = this.mockStore.find(d => d.id === id);
        if (dest) {
          dest.statut = statut;
          const label = statut === 'ACTIF' ? 'publiée' : 'modifiée';
          this.showToast(`[Mock] Destination "${dest.nom.fr}" ${label} avec succès`, 'success');
        }
        return of(dest ?? null);
      })
    );
  }

  deleteDestination(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.showToast(`Destination #${id} supprimée avec succès`, 'success');
      }),
      catchError(err => {
        const idx = this.mockStore.findIndex(d => d.id === id);
        if (idx !== -1) {
          const name = this.mockStore[idx].nom.fr;
          this.mockStore.splice(idx, 1);
          this.showToast(`[Mock] Destination "${name}" supprimée`, 'success');
        }
        return of(true);
      })
    );
  }

  // --- BULK ACTIONS ---

  bulkUpdateStatut(ids: number[], statut: DestinationStatut): Observable<any> {
    const action = statut === 'ACTIF' ? 'PUBLISH' : 'DELETE';
    return this.http.post<any>(`${this.apiUrl}/bulk`, { ids, action }).pipe(
      tap(res => {
        const label = statut === 'ACTIF' ? 'publiées' : 'supprimées';
        this.showToast(`${res.modifiedCount || ids.length} destinations ${label} avec succès`, 'success');
      }),
      catchError(err => {
        let count = 0;
        ids.forEach(id => {
          const dest = this.mockStore.find(d => d.id === id);
          if (dest) { dest.statut = statut; count++; }
        });
        const label = statut === 'ACTIF' ? 'publiées' : 'supprimées';
        this.showToast(`[Mock] ${count} destinations ${label} avec succès`, 'success');
        return of({ modifiedCount: count });
      })
    );
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, { ids, action: 'DELETE' }).pipe(
      tap(res => {
        this.showToast(`${res.modifiedCount || ids.length} destinations supprimées avec succès`, 'success');
      }),
      catchError(err => {
        let count = 0;
        ids.forEach(id => {
          const idx = this.mockStore.findIndex(d => d.id === id);
          if (idx !== -1) { this.mockStore.splice(idx, 1); count++; }
        });
        this.showToast(`[Mock] ${count} destinations supprimées avec succès`, 'success');
        return of({ modifiedCount: count });
      })
    );
  }

  // --- PHOTO UPLOAD ---

  uploadPhotos(destinationId: number, files: File[]): Observable<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    return this.http.post<{ urls: string[]; count: number }>(`http://localhost:8082/api/uploads/destinations/${destinationId}/photos`, formData).pipe(
      tap(res => {
        this.showToast(`${res.urls.length} photo(s) téléversée(s) avec succès`, 'success');
      }),
      catchError(err => {
        console.warn('[AdminDestinationService] Erreur upload photo, fallback locale (Data URL)', err);
        // Fallback: Convert files to Data URLs locally if backend fails
        const readers = files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        });

        return new Observable<{ urls: string[] }>(observer => {
          Promise.all(readers).then(urls => {
            this.showToast(`[Local] ${urls.length} photo(s) ajoutée(s)`, 'success');
            observer.next({ urls });
            observer.complete();
          });
        });
      })
    );
  }

  deletePhotoFile(photoUrl: string): Observable<any> {
    if (photoUrl.startsWith('/api/uploads/')) {
      const params = new HttpParams().set('url', photoUrl);
      return this.http.delete('http://localhost:8082/api/uploads/photo', { params }).pipe(
        catchError(() => of(true))
      );
    }
    return of(true);
  }

  // --- UPDATE FULL ---

  updateDestination(id: number, data: Partial<ModerationDestination>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => {
        this.showToast(`Destination #${id} mise à jour avec succès`, 'success');
      }),
      catchError(err => {
        const idx = this.mockStore.findIndex(d => d.id === id);
        if (idx !== -1) {
          this.mockStore[idx] = { ...this.mockStore[idx], ...data };
          this.showToast(`[Mock] Destination "${this.mockStore[idx].nom.fr}" mise à jour`, 'success');
          return of(this.mockStore[idx]);
        }
        return of(null);
      })
    );
  }

  // --- GET SINGLE ---
  getDestination(id: number): Observable<ModerationDestination | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapBackendToFrontend(item)),
      catchError(err => {
        const dest = this.mockStore.find(d => d.id === id);
        return of(dest ?? null);
      })
    );
  }

  // --- IMPORT ---

  importDestinations(gouvernorat: string): Observable<ImportResponse> {
    const params = new HttpParams().set('gouvernorat', gouvernorat);
    return this.http.post<ImportResponse>(`${this.apiUrl}/import`, {}, { params }).pipe(
      tap(res => {
        this.showToast(res.message || `Import de ${gouvernorat} lancé en arrière-plan`, 'success');
      }),
      catchError(err => {
        console.warn('[AdminDestinationService] Erreur appel HTTP /import, fallback mock', err);
        const newId = Math.max(...this.mockStore.map(d => d.id), 100) + 1;
        const newDest: ModerationDestination = {
          id: newId,
          nom: { fr: `Import ${gouvernorat} #${newId}` },
          description: { fr: `Destination importée automatiquement depuis le gouvernorat de ${gouvernorat}.` },
          type: 'SITE_TOURISTIQUE',
          categories: ['CULTUREL'],
          region: gouvernorat,
          statut: 'BROUILLON',
          qualityScore: Math.floor(Math.random() * 60) + 20,
          photos: [],
          source: 'import_auto',
          createdAt: new Date().toISOString(),
        };
        this.mockStore.push(newDest);
        const msg = `Import de ${gouvernorat} lancé. (Serveur backend hors-ligne — simulation)`;
        this.showToast(msg, 'success');
        return of({ status: 'PENDING', message: msg });
      })
    );
  }

  getImportStatus(gouvernorat: string): Observable<any> {
    const params = new HttpParams().set('gouvernorat', gouvernorat);
    return this.http.get<any>(`${this.apiUrl}/import/status`, { params }).pipe(
      catchError(() => of({ status: 'NOT_STARTED', progress: 0, message: '' }))
    );
  }

  // --- TOAST ---

  showToast(message: string, type: 'success' | 'error'): void {
    this.toastSubject.next({ message, type });
    setTimeout(() => this.toastSubject.next(null), 4000);
  }

  dismissToast(): void {
    this.toastSubject.next(null);
  }

  // --- MAPPER BACKEND -> FRONTEND ---
  private mapBackendToFrontend(item: any): ModerationDestination {
    const nomObj = typeof item.nom === 'object' ? item.nom : { fr: item.nom || '' };
    const descObj = typeof item.description === 'object' ? item.description : { fr: item.description || '' };
    const categoriesList = Array.isArray(item.categories)
      ? item.categories
      : (item.categories ? Array.from(item.categories) : []);
    const attr = item.attributsSpecifiques || {};
    const score = attr.quality_score ?? attr.qualityScore ?? 65;

    return {
      id: item.destinationId || item.id,
      nom: nomObj,
      description: descObj,
      type: item.type || 'SITE_TOURISTIQUE',
      categories: categoriesList,
      region: item.region || '',
      statut: item.statut || 'BROUILLON',
      qualityScore: score,
      photos: item.photos || [],
      latitude: item.latitude,
      longitude: item.longitude,
      tarifEstime: item.tarifEstime,
      accessibilitePmr: item.accessibilitePmr,
      horaires: item.horaires,
      source: attr.source || 'import_auto',
      createdAt: item.createdAt || new Date().toISOString(),
      wikidataId: attr.wikidataId,
    };
  }
}
