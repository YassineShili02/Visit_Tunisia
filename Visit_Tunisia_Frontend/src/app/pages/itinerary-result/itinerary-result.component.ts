import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DAY_COLORS } from '../../data/constants';
import { ItineraryMapComponent } from '../../shared/itinerary-map/itinerary-map.component';
import { ItineraryService, GeneratedItinerary, ItineraryDay, ItineraryStop, ItineraryUpgradeOption } from '../../services/itinerary.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { Router } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-itinerary-result',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule, ItineraryMapComponent],
  templateUrl: './itinerary-result.component.html',
})
export class ItineraryResultComponent implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();

  itinerary: GeneratedItinerary | null = null;
  days: ItineraryDay[] = [];
  dayColors = DAY_COLORS;
  activeDay = 0;
  highlightedStop = -1;

  isSaving = false;
  saveSuccess = false;
  saveError = false;
  isSaved = false;

  private sub: Subscription | null = null;

  constructor(
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    public nav: NavigationService,
    private langService: LanguageService,
    private transloco: TranslocoService,
  ) {}

  ngOnInit(): void {
    this.sub = this.itineraryService.generatedItinerary$.subscribe(it => {
      this.itinerary = it;
      this.days = it?.days || [];
      this.activeDay = 0;
      this.isSaved = false;
      this.saveSuccess = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Map ────────────────────────────────────────────────────────
  get currentStops(): ItineraryStop[] {
    return this.days[this.activeDay]?.stops || [];
  }

  // ─── Getters d'affichage ────────────────────────────────────────
  get title(): string {
    return this.itinerary?.title || this.transloco.translate('itineraryResult.notAvailable');
  }

  // Paramètres du sous-titre — la phrase est construite dans le template
  // via 'itineraryResult.subtitle' | transloco (jamais de texte traduit en TS).
  get subtitleParams(): { departure: string; travelers: number; s: string; budget: number } {
    if (!this.itinerary) return { departure: '', travelers: 0, s: '', budget: 0 };
    const c = this.itinerary.criteria;
    return { departure: c.departure, travelers: c.travelers, s: c.travelers > 1 ? 's' : '', budget: c.budget };
  }

  /**
   * Formate une durée sur place depuis les minutes brutes ("2h30", "45 min").
   * L'unité "min" passe par transloco (common.minShort).
   */
  formatVisitDuration(min?: number): string {
    if (!min || min <= 0) return this.transloco.translate('itineraryResult.notAvailable');
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
    if (h > 0) return `${h}h`;
    return `${m} ${this.transloco.translate('common.minShort')}`;
  }

  /** Formate la date ISO brute selon la langue courante (ex: "lun. 4 sept.") */
  formatDateISO(dateISO?: string): string {
    if (!dateISO) return '';
    const parts = dateISO.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateISO;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = this.langService.getShortDays();
    const months = this.langService.getShortMonths();
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  /** Nom localisé du gouvernorat (via common.regions.*) */
  regionLabel(region?: string): string {
    return this.langService.getRegionLabel(region);
  }

  /** Libellé localisé d'une clé de catégorie d'étape */
  categoryLabel(cat?: string): string {
    return this.langService.getItineraryCategoryLabel(cat);
  }

  get totalBudgetEstimated(): number {
    if (!this.itinerary) return 0;
    return Math.round(this.days.reduce((sum, d) => sum + (d.dayBudget ?? 0), 0));
  }

  get dailyTargetBudget(): number {
    if (!this.itinerary) return 1;
    const c = this.itinerary.criteria;
    return Math.max(1, Math.round(c.budget / (c.duration || 1)));
  }

  getDayBudgetPercent(dayBudget: number | undefined): number {
    const target = this.dailyTargetBudget;
    const budget = dayBudget ?? 0;
    return Math.min(100, Math.max(8, Math.round((budget / target) * 100)));
  }

  get budgetFit(): 'ok' | 'tight' | 'over' {
    if (!this.itinerary) return 'ok';
    const c = this.itinerary.criteria;
    const totalBudget = c.budget;
    const estimated = this.totalBudgetEstimated;
    if (estimated <= totalBudget * 0.85) return 'ok';
    if (estimated <= totalBudget) return 'tight';
    return 'over';
  }

  get budgetLabel(): string {
    // Translatable budget label; uses transloco keys
    const key = `itineraryResult.budgetFit.${this.budgetFit}`;
    return key; // resolved in template via transloco pipe
  }

  get budgetColor(): string {
    if (this.budgetFit === 'ok') return '#6B8E4E';
    if (this.budgetFit === 'tight') return '#D97D45';
    return '#E05252';
  }

  get isLoggedIn(): boolean {
    return !!this.authService.currentUser;
  }

  // ─── Actions ────────────────────────────────────────────────
  selectDay(i: number): void { this.activeDay = i; this.highlightedStop = -1; }
  getColor(i: number): string { return this.dayColors[i % this.dayColors.length]; }
  getTotalStops(): number { return this.days.reduce((sum, d) => sum + d.stops.length, 0); }

  onStopHover(i: number): void { this.highlightedStop = i; }
  onStopClick(i: number): void { this.highlightedStop = i; }

  getCategoryStyle(stop: ItineraryStop): { background: string; color: string } {
    const color = this.getColor(this.activeDay);
    return { background: color + '22', color };
  }

  getTypeIcon(stop: ItineraryStop): string {
    switch (stop.type) {
      case 'RESTAURANT': return '🍽';
      case 'HEBERGEMENT': return '🏨';
      case 'ACTIVITE': return '⚡';
      default: return '📍';
    }
  }

  applyUpgrade(dayIndex: number, upgrade: ItineraryUpgradeOption): void {
    const day = this.days[dayIndex];
    if (!day || upgrade.stopIndex === undefined || !day.stops[upgrade.stopIndex] || !this.itinerary) return;

    // Vérifier que l'upgrade ne dépasse pas le budget total alloué
    const totalMax = this.itinerary.criteria.budget;
    if (this.totalBudgetEstimated + (upgrade.costDiff ?? 0) > totalMax) {
      alert(this.transloco.translate('itineraryResult.budgetExceeded', { max: totalMax }));
      return;
    }

    const stop = day.stops[upgrade.stopIndex];
    const isHotel = upgrade.type === 'HEBERGEMENT';

    // Remplacer le stop par la version surclassée
    day.stops[upgrade.stopIndex] = {
      ...stop,
      destinationId: upgrade.destinationId,
      name: upgrade.name,
      category: isHotel ? 'hotelNight' : (upgrade.category ?? stop.category),
      type: upgrade.type,
      img: upgrade.img,
      latitude: upgrade.latitude,
      longitude: upgrade.longitude,
      estimatedCost: upgrade.estimatedCost ?? stop.estimatedCost,
      isOvernight: isHotel,
    };

    // Recalculer le budget de la journée
    day.dayBudget = Math.round(day.stops.reduce((sum, s) => sum + s.estimatedCost, 0));

    // Mettre à jour le coût total estimé de l'itinéraire
    this.itinerary.estimatedTotalCost = this.totalBudgetEstimated;

    // Recalculer le budget restant et re-filtrer les upgrades sur tous les jours
    const newRemainingBudget = totalMax - this.totalBudgetEstimated;
    this.days.forEach(d => {
      if (d.upgrades) {
        d.upgrades = d.upgrades.filter(u => u.destinationId !== upgrade.destinationId && (u.costDiff ?? 0) <= newRemainingBudget);
      }
    });
  }

  regenerate(): void {
    this.navigate.emit('itinerary-form');
    this.router.navigate(['/itinerary-form']);
  }

  async saveItinerary(): Promise<void> {
    if (!this.itinerary || !this.isLoggedIn || this.isSaving || this.isSaved) return;
    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = false;

    try {
      const payload = {
        titre: this.itinerary.title,
        // Clés canoniques des intérêts -> permet de reconstruire le titre traduit à l'affichage
        interets: this.itinerary.criteria.interests.join(','),
        dureeJours: this.itinerary.criteria.duration,
        budgetTotal: this.totalBudgetEstimated,
        nombreVoyageurs: this.itinerary.criteria.travelers,
        pointDepart: this.itinerary.criteria.departure,
        etapes: this.itinerary.days.flatMap((day, dayIdx) =>
          day.stops.map((stop, idx) => ({
            destinationId: stop.destinationId,
            jourNumero: dayIdx + 1,
            ordre: idx + 1,
            heurePrevue: stop.time,
            dureeVisite: stop.isOvernight ? 'NUIT' : String(Math.max(1, Math.ceil((stop.durationMin || 90) / 60))),
            tempsTrajet: String(stop.transitMin ?? 0),
          }))
        ),
      };

      await this.http.post('http://localhost:8082/api/itineraries', payload).toPromise();
      this.saveSuccess = true;
      this.isSaved = true;
    } catch (err) {
      console.error('Erreur lors de la sauvegarde', err);
      this.saveError = true;
      setTimeout(() => this.saveError = false, 3500);
    } finally {
      this.isSaving = false;
    }
  }
}
