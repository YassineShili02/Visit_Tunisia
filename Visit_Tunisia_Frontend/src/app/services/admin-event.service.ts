import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { AdminEvenement, DestinationStatut } from '../data/models';
import { CountsResponse } from './admin-destination.service';

export interface PaginatedEvents {
  items: AdminEvenement[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminEventService {
  private apiUrl = 'http://localhost:8082/api/admin/events';

  // Toast notifications
  private toastSubject = new BehaviorSubject<{ message: string; type: 'success' | 'error' } | null>(null);
  toast$ = this.toastSubject.asObservable();

  constructor(private http: HttpClient) {}

  // --- READ ---

  getEvents(
    statut?: DestinationStatut,
    genre?: string,
    destinationId?: number,
    search?: string,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedEvents> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (statut) params = params.set('statut', statut);
    if (genre && genre !== 'Tous') params = params.set('genre', genre);
    if (destinationId) params = params.set('destinationId', destinationId.toString());
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
      }))
    );
  }

  getEventById(id: number): Observable<AdminEvenement> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapBackendToFrontend(item))
    );
  }

  // --- CREATE & UPDATE ---

  createEvent(data: Partial<AdminEvenement>): Observable<AdminEvenement> {
    const payload = this.mapFrontendToBackend(data);
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => this.mapBackendToFrontend(res)),
      tap(created => {
        this.showToast(`Événement "${created.nom?.fr || created.id}" créé avec succès`, 'success');
      })
    );
  }

  updateEvent(id: number, data: Partial<AdminEvenement>): Observable<AdminEvenement> {
    const payload = this.mapFrontendToBackend(data);
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => this.mapBackendToFrontend(res)),
      tap(updated => {
        this.showToast(`Événement #${id} mis à jour avec succès`, 'success');
      })
    );
  }

  updateStatut(id: number, statut: DestinationStatut): Observable<AdminEvenement> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/statut`, { statut }).pipe(
      map(res => this.mapBackendToFrontend(res)),
      tap(() => {
        const label = statut === 'ACTIF' ? 'publié' : 'modifié';
        this.showToast(`Événement #${id} ${label} avec succès`, 'success');
      })
    );
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.showToast(`Événement #${id} supprimé avec succès`, 'success');
      })
    );
  }

  // --- BULK ACTIONS ---

  bulkUpdateStatut(ids: number[], statut: DestinationStatut): Observable<any> {
    const action = statut === 'ACTIF' ? 'PUBLISH' : 'DELETE';
    return this.http.post<any>(`${this.apiUrl}/bulk`, { ids, action }).pipe(
      tap(res => {
        const label = statut === 'ACTIF' ? 'publiés' : 'supprimés';
        this.showToast(`${res.modifiedCount || ids.length} événement(s) ${label} avec succès`, 'success');
      })
    );
  }

  bulkDelete(ids: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, { ids, action: 'DELETE' }).pipe(
      tap(res => {
        this.showToast(`${res.modifiedCount || ids.length} événement(s) supprimé(s) avec succès`, 'success');
      })
    );
  }

  // --- PHOTO UPLOAD ---

  uploadPhotos(eventId: number, files: File[]): Observable<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    return this.http.post<{ urls: string[]; count: number }>(`http://localhost:8082/api/uploads/evenements/${eventId}/photos`, formData).pipe(
      tap(res => {
        this.showToast(`${res.urls.length} photo(s) téléversée(s) avec succès`, 'success');
      })
    );
  }

  deletePhotoFile(photoUrl: string): Observable<any> {
    if (photoUrl.startsWith('/api/uploads/')) {
      const params = new HttpParams().set('url', photoUrl);
      return this.http.delete('http://localhost:8082/api/uploads/photo', { params });
    }
    return new Observable(obs => { obs.next(true); obs.complete(); });
  }

  // --- TOAST ---

  showToast(message: string, type: 'success' | 'error'): void {
    this.toastSubject.next({ message, type });
    setTimeout(() => this.toastSubject.next(null), 4000);
  }

  dismissToast(): void {
    this.toastSubject.next(null);
  }

  // --- MAPPERS ---

  private mapBackendToFrontend(item: any): AdminEvenement {
    const nomObj = typeof item.nom === 'object' && item.nom !== null ? item.nom : { fr: item.nom || '' };
    const descObj = typeof item.description === 'object' && item.description !== null ? item.description : { fr: item.description || '' };

    return {
      id: item.evenementId || item.id,
      nom: nomObj,
      description: descObj,
      genre: item.genre || '',
      dateDebut: item.dateDebut || '',
      dateFin: item.dateFin || '',
      statut: item.statut || 'ACTIF',
      tarif: item.tarif != null ? Number(item.tarif) : undefined,
      photos: item.photos || [],
      destinationId: item.destinationId,
      destinationNom: item.destinationNom || '',
      destinationRegion: item.destinationRegion || '',
      lieuLibre: item.lieuLibre || '',
      lienEvenement: item.lienEvenement || '',
    };
  }

  private mapFrontendToBackend(item: Partial<AdminEvenement>): any {
    return {
      nom: item.nom,
      description: item.description,
      genre: item.genre,
      dateDebut: item.dateDebut || null,
      dateFin: item.dateFin || null,
      statut: item.statut,
      tarif: item.tarif != null ? item.tarif : null,
      photos: item.photos || [],
      destinationId: item.destinationId || null,
      lieuLibre: item.lieuLibre || null,
      lienEvenement: item.lienEvenement || null,
    };
  }
}
