import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedJournal } from '../data/models';

@Injectable({
  providedIn: 'root'
})
export class AdminJournalService {
  private apiUrl = 'http://localhost:8082/api/admin/journal';

  constructor(private http: HttpClient) {}

  getJournal(
    typeAction?: string,
    entiteType?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 0,
    size: number = 20,
    sortBy: string = 'dateAction',
    sortDir: string = 'DESC'
  ): Observable<PaginatedJournal> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (typeAction && typeAction !== 'Tous') {
      params = params.set('typeAction', typeAction);
    }
    if (entiteType && entiteType !== 'Tous') {
      params = params.set('entiteType', entiteType);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (dateFrom && dateFrom.trim()) {
      params = params.set('dateFrom', dateFrom.trim());
    }
    if (dateTo && dateTo.trim()) {
      params = params.set('dateTo', dateTo.trim());
    }

    return this.http.get<PaginatedJournal>(this.apiUrl, { params });
  }
}
