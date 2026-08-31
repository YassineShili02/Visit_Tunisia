import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConsultationLogService {
  private apiUrl = 'http://localhost:8082/api/consultations';

  constructor(private http: HttpClient) {}

  /**
   * Log une visite de page détail destination
   */
  logDestinationView(destinationId: number): void {
    if (!destinationId || destinationId <= 0) return;
    
    this.http.post(`${this.apiUrl}/log`, {
      typeConsultation: 'VUE_DESTINATION',
      destinationId: destinationId
    }, { responseType: 'text' }).subscribe({
      next: () => console.log('[Log] Destination view logged:', destinationId),
      error: (err) => console.warn('[Log] Failed to log destination view', err)
    });
  }

  /**
   * Log une recherche effectuée
   */
  logSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    
    this.http.post(`${this.apiUrl}/log`, {
      typeConsultation: 'RECHERCHE',
      termeRecherche: searchTerm.trim()
    }, { responseType: 'text' }).subscribe({
      next: () => console.log('[Log] Search logged:', searchTerm),
      error: (err) => console.warn('[Log] Failed to log search', err)
    });
  }

  /**
   * Log une visite de page détail événement
   */
  logEventView(eventId: number): void {
    if (!eventId || eventId <= 0) return;
    
    this.http.post(`${this.apiUrl}/log`, {
      typeConsultation: 'VUE_EVENEMENT',
      evenementId: eventId
    }, { responseType: 'text' }).subscribe({
      next: () => console.log('[Log] Event view logged:', eventId),
      error: (err) => console.warn('[Log] Failed to log event view', err)
    });
  }
}
