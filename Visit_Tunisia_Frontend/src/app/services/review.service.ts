import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface AvisResponse {
  avisId: number;
  note: number;
  commentaire: string;
  authorName: string;
  authorAvatar: string;
  authorEmail: string;
  dateCreation: string;
  isMine: boolean;
}

export interface AvisStats {
  noteMoyenne: number;
  totalAvis: number;
  distributionEtoiles: Record<number, number>;
  avisList: AvisResponse[];
}

export interface AvisRequest {
  note: number;
  commentaire?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = 'http://localhost:8082/api/destinations';

  constructor(private http: HttpClient) {}

  getReviews(destinationId: number): Observable<AvisStats> {
    return this.http.get<AvisStats>(`${this.apiUrl}/${destinationId}/reviews`).pipe(
      catchError(err => {
        console.warn('[ReviewService] Erreur lors de la récupération des avis', err);
        return of({
          noteMoyenne: 4.8,
          totalAvis: 0,
          distributionEtoiles: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          avisList: []
        });
      })
    );
  }

  submitReview(destinationId: number, review: AvisRequest): Observable<AvisResponse | null> {
    return this.http.post<AvisResponse>(`${this.apiUrl}/${destinationId}/reviews`, review).pipe(
      catchError(err => {
        console.warn('[ReviewService] Erreur lors de la soumission de l\'avis', err);
        throw err;
      })
    );
  }

  getMyReview(destinationId: number): Observable<AvisResponse | null> {
    return this.http.get<AvisResponse>(`${this.apiUrl}/${destinationId}/reviews/my-review`).pipe(
      catchError(() => of(null))
    );
  }
}
