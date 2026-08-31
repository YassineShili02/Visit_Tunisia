import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export const TUNIS_FALLBACK: GeoPosition = {
  latitude: 36.8065,
  longitude: 10.1815,
};

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  /**
   * One-shot current position request via navigator.geolocation.getCurrentPosition.
   * Returns Observable<GeoPosition | null>. Emits null gracefully if denied or unavailable.
   */
  getCurrentPosition(): Observable<GeoPosition | null> {
    return new Observable<GeoPosition | null>((observer) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        observer.next(null);
        observer.complete();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          observer.complete();
        },
        (error) => {
          console.warn('[GeolocationService] Geolocation denied or failed:', error.message);
          observer.next(null);
          observer.complete();
        },
        {
          timeout: 8000,
          maximumAge: 300000, // 5 minutes cache
          enableHighAccuracy: true,
        }
      );
    });
  }

  /**
   * Calculates Haversine distance in kilometers between two coordinates.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRadians(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
