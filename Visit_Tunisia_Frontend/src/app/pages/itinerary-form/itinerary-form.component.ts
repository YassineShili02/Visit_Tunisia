import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CITIES, INTERESTS, STEP_LABELS } from '../../data/constants';
import { PreferenceService } from '../../services/preference.service';
import { ItineraryService, ItineraryCriteria } from '../../services/itinerary.service';
import { PublicDestinationService } from '../../services/public-destination.service';
import { NavigationService } from '../../services/navigation.service';
import { firstValueFrom } from 'rxjs';

const INTEREST_ICONS: Record<string, string> = {
  Culturel: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  Balnéaire: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  Gastronomique: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
  Aventure: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
  Religieux: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  Écologique: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 11-10 11Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  Randonnée: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  Plongée: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  Photographie: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  Architecture: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  'Cuisine locale': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
  Artisanat: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/></svg>`,
  'Sports nautiques': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  Thermalisme: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
};

@Component({
  selector: 'app-itinerary-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './itinerary-form.component.html',
})
export class ItineraryFormComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();

  step = 0;
  duration = 5;
  budget = 800;
  travelers = 2;
  chosen: string[] = ['Culturel', 'Aventure'];
  departure = 'Tunis';
  dropOpen = false;
  stepLabels = STEP_LABELS;
  interests = INTERESTS;
  cities = CITIES;

  isGenerating = false;
  generationError: string | null = null;

  /** Minimum time the loading state is shown, in ms, so the user always sees feedback. */
  private readonly minGeneratingMs = 600;

  constructor(
    private preferenceService: PreferenceService,
    private sanitizer: DomSanitizer,
    private itineraryService: ItineraryService,
    private destinationService: PublicDestinationService,
    private router: Router,
    public nav: NavigationService,
    private transloco: TranslocoService,
  ) {}

  get stepLabelsTranslated(): string[] {
    return STEP_LABELS.map(key => this.transloco.translate('itineraryForm.' + key));
  }

  ngOnInit(): void {
    const prefs = this.preferenceService.currentPreferences;
    if (prefs.length > 0) {
      this.chosen = [...prefs];
    }
  }

  get filteredCities(): string[] {
    return this.cities.filter(c =>
      c.toLowerCase().includes(this.departure.toLowerCase()) && this.departure.length > 0 && c !== this.departure
    );
  }

  get travelersLabel(): string {
    if (this.travelers === 1) return this.transloco.translate('itineraryForm.solo');
    if (this.travelers <= 2) return this.transloco.translate('itineraryForm.duo');
    if (this.travelers <= 4) return this.transloco.translate('itineraryForm.smallGroup');
    return this.transloco.translate('itineraryForm.bigGroup');
  }

  /** Returns the translated label for an interest. Falls back to the raw label. */
  interestLabel(label: string): string {
    return this.transloco.translate('onboarding.interests.' + label) || label;
  }

  /** Labels traduits des intérêts choisis (le .map(this.interestLabel) du template perdait `this`). */
  get chosenInterestLabels(): string {
    return this.chosen.map(label => this.interestLabel(label)).join(', ');
  }

  /** Label du bouton Générer, calculé en TS (le pipe ternaire ne s'évaluait pas dans le DOM). */
  get generateLabel(): string {
    if (this.isGenerating) {
      return this.transloco.translate('itineraryForm.generating') || 'Génération en cours...';
    }
    return this.transloco.translate('itineraryForm.generate') || 'Générer mon itinéraire';
  }

  prevStep(): void { if (this.step > 0) this.step--; }
  nextStep(): void { if (this.step < 2) this.step++; }

  async goToResult(): Promise<void> {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.generationError = null;

    const startedAt = Date.now();

    try {
      // Charger les destinations depuis le backend
      const result = await firstValueFrom(
        this.destinationService.getPublishedDestinations(undefined, undefined, undefined, undefined, undefined, 0, 500)
      );

      const criteria: ItineraryCriteria = {
        duration: this.duration,
        budget: this.budget,
        travelers: this.travelers,
        interests: this.chosen.length > 0 ? this.chosen : ['Culturel'],
        departure: this.departure || 'Tunis',
      };

      // Générer l'itinéraire
      this.itineraryService.generate(criteria, result.items);

      // Garantir un délai minimum pour que le spinner soit perceptible
      await this.waitMinimum(startedAt);

      // Naviguer avec le Router Angular et émettre pour compatibilité
      this.navigate.emit('itinerary-result');
      this.router.navigate(['/itinerary-result']);
    } catch (err) {
      console.error('[ItineraryForm] Erreur lors de la génération', err);
      // On attend aussi le délai minimum avant d'afficher l'erreur,
      // pour éviter le clignotement bouton → erreur instantané.
      await this.waitMinimum(startedAt);
      this.generationError = this.transloco.translate('itineraryForm.generationError');
    } finally {
      this.isGenerating = false;
    }
  }

  /** Attend que `minGeneratingMs` se soient écoulés depuis `startedAt`. */
  private waitMinimum(startedAt: number): Promise<void> {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, this.minGeneratingMs - elapsed);
    return remaining > 0 ? new Promise(r => setTimeout(r, remaining)) : Promise.resolve();
  }

  goHome(): void {
    this.navigate.emit('home');
    this.router.navigate(['/']);
  }

  toggleInterest(label: string): void {
    this.chosen = this.chosen.includes(label) ? this.chosen.filter(x => x !== label) : [...this.chosen, label];
  }

  incrementTravelers(): void { if (this.travelers < 10) this.travelers++; }
  decrementTravelers(): void { if (this.travelers > 1) this.travelers--; }

  toggleDrop(): void { this.dropOpen = !this.dropOpen; }
  selectCity(city: string): void { this.departure = city; this.dropOpen = false; }

  pluralSuffix(count: number): string { return count > 1 ? 's' : ''; }
  isDone(i: number): boolean { return i < this.step; }
  isActive(i: number): boolean { return i === this.step; }
  getInterestIcon(label: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(INTEREST_ICONS[label] ?? ''); }
}
