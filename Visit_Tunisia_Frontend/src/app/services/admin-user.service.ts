import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  pays?: string;
  dateNaissance?: string;
  role: string;
  statut: string;
  provider: string;
  languePreferee?: string;
  preferences?: string[];
  dateCreation: string;
  dateCreationFormatted: string;
}

export interface UserStatsResponse {
  totalUsers: number;
  actifs: number;
  desactives: number;
  touristes: number;
  admins: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private baseUrl = 'http://localhost:8082/api/admin/users';

  constructor(private http: HttpClient) {}

  getUsers(
    page: number = 0,
    size: number = 20,
    statut?: string,
    role?: string,
    search?: string,
    sortBy: string = 'dateCreation',
    sortDir: string = 'DESC',
    dateFrom?: string,
    dateTo?: string
  ): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (statut) params = params.set('statut', statut);
    if (role) params = params.set('role', role);
    if (search) params = params.set('search', search);
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);

    return this.http.get<PageResponse<UserResponse>>(this.baseUrl, { params });
  }

  getUserStats(): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${this.baseUrl}/stats`);
  }

  updateUserStatus(id: number, statut: 'ACTIF' | 'DESACTIVE'): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/statut`, { statut });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
