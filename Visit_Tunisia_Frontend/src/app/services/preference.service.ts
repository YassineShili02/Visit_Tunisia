import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PreferenceService {
  private STORAGE_KEY = 'vt_user_preferences';
  private preferencesSubject = new BehaviorSubject<string[]>(this.loadPreferences());
  preferences$ = this.preferencesSubject.asObservable();

  get currentPreferences(): string[] {
    return this.preferencesSubject.value;
  }

  savePreferences(categories: string[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(categories));
    this.preferencesSubject.next(categories);
  }

  private loadPreferences(): string[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  hasPreference(category: string): boolean {
    return this.currentPreferences.some(
      p => p.toLowerCase() === category.toLowerCase()
    );
  }
}
