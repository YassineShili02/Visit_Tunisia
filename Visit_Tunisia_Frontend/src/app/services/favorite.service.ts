import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface FavoriteDestination {
  favoriteId: number;
  dateAjout: string;
  destinationId: number;
  nom: { fr: string; en?: string; ar?: string };
  region: string;
  categories: string[];
  tarifEstime: number;
  photoMain: string;
  latitude: number;
  longitude: number;
  nombreAvis: number;
  noteAverage: number;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private apiUrl = 'http://localhost:8082/api/favorites';
  
  // Observable set of favorite IDs (for catalog to show filled hearts)
  private favoriteIdsSubject = new BehaviorSubject<Set<number>>(new Set());
  public favoriteIds$ = this.favoriteIdsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load user's favorite IDs from backend (called at login/app init)
   */
  loadFavoriteIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/ids`).pipe(
      tap(ids => {
        this.favoriteIdsSubject.next(new Set(ids));
      })
    );
  }

  /**
   * Get full favorite destinations list
   */
  getFavorites(): Observable<FavoriteDestination[]> {
    return this.http.get<FavoriteDestination[]>(this.apiUrl);
  }

  /**
   * Add destination to favorites — optimistic update BEFORE HTTP call
   */
  addFavorite(destinationId: number): Observable<any> {
    // Update local state immediately (optimistic — visible right away)
    const current = new Set(this.favoriteIdsSubject.value);
    current.add(destinationId);
    this.favoriteIdsSubject.next(current);

    return this.http.post(`${this.apiUrl}/${destinationId}`, {});
  }

  /**
   * Remove destination from favorites — optimistic update BEFORE HTTP call
   */
  removeFavorite(destinationId: number): Observable<any> {
    // Update local state immediately (optimistic — visible right away)
    const current = new Set(this.favoriteIdsSubject.value);
    current.delete(destinationId);
    this.favoriteIdsSubject.next(current);

    return this.http.delete(`${this.apiUrl}/${destinationId}`);
  }

  /**
   * Check if a destination is favorited (sync check from local state)
   */
  isFavorite(destinationId: number): boolean {
    return this.favoriteIdsSubject.value.has(destinationId);
  }

  /**
   * Revert an optimistic add (called when backend POST failed)
   * Pure local mutation — no HTTP call
   */
  revertAdd(destinationId: number): void {
    const current = new Set(this.favoriteIdsSubject.value);
    current.delete(destinationId);
    this.favoriteIdsSubject.next(current);
  }

  /**
   * Revert an optimistic remove (called when backend DELETE failed)
   * Pure local mutation — no HTTP call
   */
  revertRemove(destinationId: number): void {
    const current = new Set(this.favoriteIdsSubject.value);
    current.add(destinationId);
    this.favoriteIdsSubject.next(current);
  }

  /**
   * Clear local favorites state (called on logout)
   */
  clearFavorites(): void {
    this.favoriteIdsSubject.next(new Set());
  }
}
