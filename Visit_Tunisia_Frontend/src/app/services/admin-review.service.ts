import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReviewResponse {
  avisId: number;
  note: number;
  commentaire: string;
  sentimentLabel: string;
  sentimentScore: number;
  statutModeration: string;
  dateCreation: string;
  utilisateur?: {
    nom: string;
    prenom: string;
    email: string;
  };
  destination?: {
    nom: any; // Can be string or {ar, en, fr}
    destinationId: number;
    noteAverage?: number; // Average rating of this destination
  };
  evenement?: {
    nom: any; // Can be string or {ar, en, fr}
    evenementId: number;
  };
}

// Display model for reviews (after mapping)
export interface ReviewDisplay {
  id: number;
  note: number;
  commentaire: string;
  sentimentLabel: string;
  sentimentScore: number;
  statutModeration: string;
  dateCreation: string;
  dateCreationFormatted: string;
  authorName: string;
  authorEmail: string;
  destinationName: string;
  destinationId: number;
  destinationAvgRating?: number; // Average rating of the destination
  evenementName: string;
  evenementId: number;
  expanded?: boolean; // For expanding long comments
}

export interface ReviewStatsResponse {
  totalReviews: number;
  enAttente: number;
  approuves: number;
  rejetes: number;
  averageRating: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminReviewService {
  private baseUrl = 'http://localhost:8082/api/admin/reviews';

  constructor(private http: HttpClient) {}

  getReviews(params?: any): Observable<PageResponse<ReviewResponse>> {
    let httpParams = new HttpParams();
    
    console.log('[AdminReviewService] getReviews called with params:', params);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
          console.log(`[AdminReviewService] Set param ${key} = ${params[key]}`);
        }
      });
    }
    
    console.log('[AdminReviewService] Final HTTP params:', httpParams.toString());
    console.log('[AdminReviewService] Request URL:', `${this.baseUrl}?${httpParams.toString()}`);
    
    return this.http.get<PageResponse<ReviewResponse>>(this.baseUrl, { params: httpParams });
  }

  getStats(): Observable<ReviewStatsResponse> {
    return this.http.get<ReviewStatsResponse>(`${this.baseUrl}/stats`);
  }

  updateModerationStatus(id: number, statut: string): Observable<ReviewResponse> {
    return this.http.patch<ReviewResponse>(`${this.baseUrl}/${id}/moderation`, { statut });
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  bulkModeration(ids: number[], statut: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/bulk-moderation`, { ids, statut });
  }

  bulkDelete(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/bulk-delete`, { body: { ids } });
  }
}
