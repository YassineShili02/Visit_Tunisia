import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StatsOverview {
  totalUsers: number;
  touristCount: number;
  adminCount: number;
  totalDestinations: number;
  publishedDestinations: number;
  pendingDestinations: number;
  totalEvents: number;
  totalReviews: number;
}

export interface RecentUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  pays: string;
  photoUrl?: string;
  initiales: string;
}

export interface RecentReview {
  id: number;
  note: number;
  commentaire: string;
  datePublication: string;
  sentiment: string;
  userName: string;
  destinationName: string;
  userId?: number;
  userPhotoUrl?: string;
  userInitiales?: string;
  destinationId?: number;
  destinationRegion?: string;
}

export interface RecentActivity {
  recentUsers: RecentUser[];
  recentReviews: RecentReview[];
}

export interface TopDestination {
  destinationId: number;
  nom: string;
  region: string;
  viewsCount: number;
}

export interface TopSearchTerm {
  term: string;
  count: number;
}

export interface FrequentationStats {
  period: string;
  topDestinations: TopDestination[];
  topSearchTerms: TopSearchTerm[];
  dailyEvolution: Record<string, number>;
  totalConsultations?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private apiUrl = 'http://localhost:8082/api/admin/stats';

  constructor(private http: HttpClient) {}

  getOverview(): Observable<StatsOverview> {
    return this.http.get<StatsOverview>(`${this.apiUrl}/overview`);
  }

  getDestinationsByRegion(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/destinations-by-region`);
  }

  getDestinationsByType(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/destinations-by-type`);
  }

  getRecentActivity(): Observable<RecentActivity> {
    return this.http.get<RecentActivity>(`${this.apiUrl}/recent-activity`);
  }

  getFrequentation(period: string = '30D'): Observable<FrequentationStats> {
    return this.http.get<FrequentationStats>(`${this.apiUrl}/frequentation`, {
      params: { period }
    });
  }
}
