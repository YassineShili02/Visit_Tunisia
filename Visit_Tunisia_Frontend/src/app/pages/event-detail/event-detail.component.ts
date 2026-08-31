import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import { PublicEventService } from '../../services/public-event.service';
import { LanguageService } from '../../services/language.service';

export interface DisplayEventDetail {
  id: number;
  title: string;
  description: string;
  genre: string;
  categoryColor: string;
  dateLabel: string;
  dateDebut?: string;
  dateFin?: string;
  price: string;
  tarif: number;
  destinationId?: number;
  destinationNom?: string;
  destinationRegion?: string;
  lieuLibre?: string;
  lienEvenement?: string;
  displayLocation: string;
  photos: string[];
}

export interface SimilarEventItem {
  id: number;
  title: string;
  genre: string;
  location: string;
  dateLabel: string;
  photo: string;
}

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './event-detail.component.html',
})
export class EventDetailComponent implements OnInit, OnDestroy {
  event: DisplayEventDetail | null = null;
  similarEvents: SimilarEventItem[] = [];
  activePhoto = 0;
  bookmarked = false;
  isLoading = true;
  errorMessage = '';

  private routeSub?: Subscription;
  private langSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicEventService: PublicEventService,
    private langService: LanguageService
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        if (!isNaN(id)) {
          this.loadEvent(id);
        } else {
          this.errorMessage = this.langService.translate('eventDetail.errorInvalidId');
          this.isLoading = false;
        }
      } else {
        this.errorMessage = this.langService.translate('eventDetail.errorNoId');
        this.isLoading = false;
      }
    });

    // Recharge l'événement (titre, région, dates) quand la langue change —
    // y compris retour à une langue déjà en cache
    this.langSub = this.langService.currentLang$.pipe(
      switchMap(lang => this.langService.whenLangReady(lang))
    ).subscribe(() => {
      if (this.event?.id) {
        this.loadEvent(this.event.id);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  loadEvent(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.activePhoto = 0;

    this.publicEventService.getEventById(id).subscribe({
      next: (data) => {
        this.event = this.mapToDetail(data);
        this.isLoading = false;
        this.loadSimilarEvents(this.event.genre, this.event.id);
      },
      error: (err) => {
        console.error('[EventDetail] Erreur chargement événement #' + id, err);
        this.errorMessage = this.langService.translate('eventDetail.errorLoad');
        this.isLoading = false;
      }
    });
  }

  private mapToDetail(e: any): DisplayEventDetail {
    const title = e._localizedTitle || this.langService.getLocalizedName(e.nom, this.langService.translate('events.title'));
    const description = e._localizedDescription || this.langService.getLocalizedDescription(e.description, '');
    const genre = e.genre || 'Culturel';
    const tarif = e.tarif || 0;
    const price = tarif === 0
      ? this.langService.translate('eventDetail.free')
      : `${tarif} ${this.langService.translate('eventDetail.tnd')}`;
    const photos = (e.photos && e.photos.length > 0) ? e.photos : ['assets/images/tunisia/events-default.jpg'];
    const displayLocation = e.destinationNom
      ? `${e.destinationNom}${e.destinationRegion ? ', ' + this.langService.getRegionLabel(e.destinationRegion) : ''}`
      : (e.lieuLibre || this.langService.getCountryName('TN'));

    return {
      id: e.evenementId,
      title,
      description,
      genre,
      categoryColor: this.getCategoryColor(genre),
      dateLabel: this.formatDateLabel(e.dateDebut, e.dateFin),
      dateDebut: e.dateDebut,
      dateFin: e.dateFin,
      price,
      tarif,
      destinationId: e.destinationId,
      destinationNom: e.destinationNom || '',
      destinationRegion: e.destinationRegion || '',
      lieuLibre: e.lieuLibre || '',
      lienEvenement: e.lienEvenement || '',
      displayLocation,
      photos
    };
  }

  private loadSimilarEvents(genre: string, currentId: number): void {
    this.publicEventService.getActiveEvents(genre, undefined, undefined, 0, 5).subscribe({
      next: (res) => {
        const items = res.content || [];
        this.similarEvents = items
          .filter(e => e.evenementId !== currentId)
          .slice(0, 3)
          .map(e => ({
            id: e.evenementId,
            title: e._localizedTitle || this.langService.getLocalizedName(e.nom, this.langService.translate('events.title')),
            genre: e.genre || 'Culturel',
            location: e.destinationNom || e.lieuLibre || this.langService.getCountryName('TN'),
            dateLabel: this.formatDateLabel(e.dateDebut, e.dateFin),
            photo: (e.photos && e.photos.length > 0) ? e.photos[0] : 'assets/images/tunisia/events-default.jpg'
          }));
      },
      error: () => {
        this.similarEvents = [];
      }
    });
  }

  private formatDateLabel(dateDebut?: string, dateFin?: string): string {
    if (!dateDebut) return this.langService.translate('events.dateFormatError');
    const shortMonths = this.langService.getShortMonths();
    const parse = (s: string) => {
      try {
        const [y, m, d] = s.split('-').map(Number);
        return { day: d, month: m - 1, year: y };
      } catch {
        return null;
      }
    };
    const d1 = parse(dateDebut);
    if (!d1) return dateDebut;
    if (!dateFin || dateFin === dateDebut) return `${d1.day} ${shortMonths[d1.month]} ${d1.year}`;
    const d2 = parse(dateFin);
    if (!d2) return `${d1.day} ${shortMonths[d1.month]} ${d1.year}`;

    if (d1.year === d2.year && d1.month === d2.month) {
      return `${d1.day} – ${d2.day} ${shortMonths[d1.month]} ${d1.year}`;
    }
    if (d1.year === d2.year) {
      return `${d1.day} ${shortMonths[d1.month]} – ${d2.day} ${shortMonths[d2.month]} ${d1.year}`;
    }
    return `${d1.day} ${shortMonths[d1.month]} ${d1.year} – ${d2.day} ${shortMonths[d2.month]} ${d2.year}`;
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

  selectPhoto(index: number): void {
    this.activePhoto = index;
  }

  toggleBookmark(): void {
    this.bookmarked = !this.bookmarked;
  }

  goToEvents(): void {
    this.router.navigate(['/events']);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  goToDestination(destinationId?: number): void {
    if (destinationId) {
      this.router.navigate(['/detail', destinationId]);
    }
  }

  openSimilarEvent(id: number): void {
    this.router.navigate(['/event-detail', id]);
  }

  participer(): void {
    if (this.event?.lienEvenement && this.event.lienEvenement.trim()) {
      let url = this.event.lienEvenement.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(this.langService.translate('eventDetail.participateFallback'));
    }
  }

  genreLabel(genre?: string): string {
    return this.langService.getGenreLabel(genre);
  }

  regionLabel(region?: string): string {
    return this.langService.getRegionLabel(region);
  }
}
