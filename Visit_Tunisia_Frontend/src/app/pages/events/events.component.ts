import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { PublicEventService } from '../../services/public-event.service';
import { LanguageService } from '../../services/language.service';
import { EVENT_CATEGORY_FILTERS } from '../../data/constants';

export interface DisplayEventItem {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  categoryColor: string;
  dateLabel: string;
  location: string;
  price: string;
  photo: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './events.component.html',
})
export class EventsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Output() navigate = new EventEmitter<string>();
  @Output() eventSelect = new EventEmitter<number>();

  events: DisplayEventItem[] = [];
  filters = EVENT_CATEGORY_FILTERS;
  activeFilter = 'Tous';
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private publicEventService: PublicEventService,
    private langService: LanguageService
  ) {}

  ngOnInit(): void {
    // Read initial genre from URL query param (e.g. /events?genre=Musical)
    const qp = this.route.snapshot.queryParams;
    if (qp['genre']) {
      const match = this.filters.find(f => f.toLowerCase() === qp['genre'].toLowerCase());
      if (match) {
        this.activeFilter = match;
      }
    }
    this.loadEvents();

    // Recharge les événements (titres, régions, dates) quand la nouvelle
    // langue est disponible — y compris retour à une langue déjà en cache
    this.langService.currentLang$
      .pipe(
        switchMap(lang => this.langService.whenLangReady(lang)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadEvents());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    this.isLoading = true;
    const genreParam = this.activeFilter !== 'Tous' ? this.activeFilter : undefined;
    this.publicEventService.getActiveEvents(genreParam, undefined, undefined, 0, 50).subscribe({
      next: (res) => {
        this.events = (res.content || []).map(e => this.mapEventToDisplay(e));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Events] Erreur chargement événements publics:', err);
        this.events = [];
        this.isLoading = false;
      }
    });
  }

  private mapEventToDisplay(e: any): DisplayEventItem {
    // Use the localized title/description already injected by PublicEventService.
    const title = e._localizedTitle || this.langService.getLocalizedName(e.nom, this.langService.translate('events.title'));
    const subtitle = e._localizedDescription || this.langService.getLocalizedDescription(e.description, '');
    const category = e.genre || 'Culturel';
    const price = (!e.tarif || e.tarif === 0)
      ? this.langService.translate('events.free')
      : `${e.tarif} ${this.langService.translate('events.tndSuffix')}`;
    const photo = (e.photos && e.photos.length > 0) ? e.photos[0] : 'assets/images/tunisia/events-default.jpg';
    const location = e.destinationNom
      ? `${e.destinationNom}${e.destinationRegion ? ' · ' + this.langService.getRegionLabel(e.destinationRegion) : ''}`
      : (e.lieuLibre || this.langService.translate('events.upcoming'));

    return {
      id: e.evenementId,
      title,
      subtitle: subtitle.length > 120 ? subtitle.substring(0, 117) + '...' : subtitle,
      category,
      categoryColor: this.getCategoryColor(category),
      dateLabel: this.formatDateLabel(e.dateDebut, e.dateFin),
      location,
      price,
      photo,
    };
  }

  private formatDateLabel(dateDebut?: string, dateFin?: string): string {
    if (!dateDebut) return this.langService.translate('events.dateFormatError');
    const shortMonths = this.langService.getShortMonths();
    const d1 = this.parseDate(dateDebut);
    if (!d1) return dateDebut;

    if (!dateFin || dateFin === dateDebut) {
      return `${d1.day} ${shortMonths[d1.month]} ${d1.year}`;
    }

    const d2 = this.parseDate(dateFin);
    if (!d2) return `${d1.day} ${shortMonths[d1.month]} ${d1.year}`;

    if (d1.year === d2.year && d1.month === d2.month) {
      return `${d1.day} – ${d2.day} ${shortMonths[d1.month]} ${d1.year}`;
    }
    if (d1.year === d2.year) {
      return `${d1.day} ${shortMonths[d1.month]} – ${d2.day} ${shortMonths[d2.month]} ${d1.year}`;
    }
    return `${d1.day} ${shortMonths[d1.month]} ${d1.year} – ${d2.day} ${shortMonths[d2.month]} ${d2.year}`;
  }

  private parseDate(s: string): { day: number; month: number; year: number } | null {
    try {
      const [y, m, d] = s.split('-').map(Number);
      if (!y || !m || !d) return null;
      return { day: d, month: m - 1, year: y };
    } catch {
      return null;
    }
  }

  private getCategoryColor(genre: string): string {
    const colors: Record<string, string> = {
      Musical: '#1B6FA8',
      Culturel: '#D97D45',
      'Cinéma': '#8B6FB5',
      Sportif: '#6B8E4E',
      Religieux: '#7C5CBF',
      Gastronomique: '#E0A458',
      Festival: '#D97D45',
      'Théâtre': '#7EC8E3',
      'Art & Artisanat': '#E0A458',
      Traditionnel: '#C0392B',
    };
    return colors[genre] || '#D97D45';
  }

  get filtered(): DisplayEventItem[] {
    if (this.activeFilter === 'Tous') return this.events;
    return this.events.filter(e =>
      e.category.toLowerCase() === this.activeFilter.toLowerCase()
    );
  }

  setFilter(f: string): void {
    this.activeFilter = f;

    // Sync filter to URL query params
    const queryParams: any = {};
    if (f !== 'Tous') {
      queryParams.genre = f;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });

    this.loadEvents();
  }

  openEvent(id: number): void {
    this.router.navigate(['/event-detail', id]);
  }

  genreLabel(genre?: string): string {
    return this.langService.getGenreLabel(genre);
  }

  filterLabel(f: string): string {
    if (f === 'Tous') return this.langService.translate('events.allGenres', 'Tous');
    return this.langService.getGenreLabel(f);
  }
}
