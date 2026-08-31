import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Destination } from '../data/models';
import { PublicDestinationService } from './public-destination.service';

@Injectable({ providedIn: 'root' })
export class RecommandationService {
  private apiUrl = '/api/recommandations';

  constructor(
    private http: HttpClient,
    private destinationService: PublicDestinationService
  ) {}

  /**
   * Récupère les destinations recommandées pour l'utilisateur connecté.
   * Retourne un tableau vide si l'utilisateur n'est pas connecté ou n'a pas de données.
   */
  getRecommandations(): Observable<Destination[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(items => {
        if (!items || !Array.isArray(items)) return [];
        return items.map(item => this.destinationService.mapBackendToFrontend(item));
      }),
      catchError(err => {
        console.warn('[RecommandationService] Impossible de charger les recommandations', err);
        return of([]);
      })
    );
  }
}
