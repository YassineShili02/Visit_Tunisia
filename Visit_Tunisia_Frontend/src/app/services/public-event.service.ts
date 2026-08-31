import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LanguageService } from './language.service';

export interface PaginatedPublicEvents {
  content: any[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class PublicEventService {
  private apiUrl = 'http://localhost:8082/api/events';

  constructor(private http: HttpClient, private langService: LanguageService) {}

  getActiveEvents(genre?: string, destinationId?: number, search?: string, page: number = 0, size: number = 12): Observable<PaginatedPublicEvents> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (genre && genre !== 'Tous') params = params.set('genre', genre);
    if (destinationId) params = params.set('destinationId', destinationId.toString());
    if (search && search.trim()) params = params.set('search', search.trim());

    return this.http.get<PaginatedPublicEvents>(this.apiUrl, { params }).pipe(
      // Localize title and description for each event according to the active UI language.
      // The fallback chain is implemented inside LanguageService.getLocalized.
      map((res) => {
        const content = (res?.content || []).map((e: any) => ({
          ...e,
          _localizedTitle: this.langService.getLocalizedName(e.nom),
          _localizedDescription: this.langService.getLocalizedDescription(e.description),
        }));
        return { ...res, content };
      })
    );
  }

  getEventById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((e) => ({
        ...e,
        _localizedTitle: this.langService.getLocalizedName(e.nom),
        _localizedDescription: this.langService.getLocalizedDescription(e.description),
      }))
    );
  }
}
