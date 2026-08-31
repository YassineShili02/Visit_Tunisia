import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ViewChild, ElementRef,
  OnDestroy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize } from 'rxjs/operators';
import { AuthUser, SearchResult } from '../../data/models';
import { PublicDestinationService } from '../../services/public-destination.service';
import { PublicEventService } from '../../services/public-event.service';
import { NavigationService } from '../../services/navigation.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './search-modal.component.html',
})
export class SearchModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() user: AuthUser | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<string>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  cursor = -1;
  flatList: SearchResult[] = [];

  // State
  isLoading = false;
  results: SearchResult[] = [];
  popularResults: SearchResult[] = [];

  private querySubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private destService = inject(PublicDestinationService);
  private eventService = inject(PublicEventService);
  private nav = inject(NavigationService);

  constructor(private transloco: TranslocoService) {
    // Set up debounced search
    this.querySubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        const trimmed = q.trim();
        if (!trimmed) {
          this.isLoading = false;
          this.results = [];
          return of(null);
        }
        this.isLoading = true;
        return combineLatest([
          this.destService.getPublishedDestinations(undefined, undefined, undefined, trimmed, undefined, 0, 5)
            .pipe(catchError(() => of({ items: [], totalElements: 0, totalPages: 1, page: 0, size: 5 }))),
          this.eventService.getActiveEvents(undefined, undefined, trimmed, 0, 5)
            .pipe(catchError(() => of({ content: [], totalElements: 0, totalPages: 1, size: 5, number: 0 }))),
        ]).pipe(
          finalize(() => this.isLoading = false)
        );
      })
    ).subscribe(res => {
      this.isLoading = false;
      if (!res) { this.results = []; return; }

      const [destPage, eventsPage] = res;

      const destResults: SearchResult[] = (destPage.items || []).map(d => ({
        id: `dest-${d.id}`,
        numericId: d.id,
        type: 'destination' as const,
        title: d.name,
        subtitle: `${d.type} · ${d.region}`,
        img: d.img,
        category: d.category,
        categoryColor: this.categoryColor(d.category),
        page: 'detail',
      }));

      const eventResults: SearchResult[] = (eventsPage.content || []).map((e: any) => {
        // nom is a multilingual object {fr, en, ar}
        const nomFr = typeof e.nom === 'object' ? (e.nom?.fr || e.nom?.en || '') : (e.nom || e.titre || e.title || '');
        // photos is an array of base64 or URLs
        const firstPhoto = Array.isArray(e.photos) && e.photos.length > 0 ? e.photos[0] : undefined;
        const imgSrc = firstPhoto
          ? (firstPhoto.startsWith('data:') || firstPhoto.startsWith('http') ? firstPhoto : `http://localhost:8082${firstPhoto}`)
          : undefined;
        // location
        const lieu = e.lieuLibre || e.destinationNom || e.destinationRegion || '';
        return {
          id: `event-${e.evenementId || e.id}`,
          numericId: e.evenementId || e.id,
          type: 'event' as const,
          title: nomFr || this.transloco.translate('searchModal.eventFallback'),
          subtitle: `${e.genre || ''}${lieu ? ' · ' + lieu : ''}`,
          img: imgSrc,
          category: e.genre || '',
          categoryColor: this.eventGenreColor(e.genre),
          page: 'event-detail',
        };
      });

      this.results = [...destResults, ...eventResults];
      this.buildFlatList();
    });

    // Load popular destinations on init
    this.loadPopular();
  }

  private loadPopular(): void {
    this.destService.getPublishedDestinations(undefined, undefined, undefined, undefined, undefined, 0, 6)
      .pipe(catchError(() => of({ items: [], totalElements: 0, totalPages: 1, page: 0, size: 6 })))
      .subscribe(page => {
        this.popularResults = (page.items || []).map(d => ({
          id: `dest-${d.id}`,
          numericId: d.id,
          type: 'destination' as const,
          title: d.name,
          subtitle: `${d.type} · ${d.region}`,
          img: d.img,
          page: 'detail',
        }));
      });
  }

  private categoryColor(cat: string): string {
    if (!cat) return '#1B6FA8';
    const c = cat.toLowerCase();
    if (c.includes('culturel')) return '#1B6FA8';
    if (c.includes('baln')) return '#7EC8E3';
    if (c.includes('aventure')) return '#D97D45';
    if (c.includes('cologique')) return '#6B8E4E';
    if (c.includes('gastrono')) return '#E67E22';
    if (c.includes('religieux')) return '#8E44AD';
    return '#1B6FA8';
  }

  private eventGenreColor(genre: string): string {
    if (!genre) return '#D97D45';
    const g = genre.toLowerCase();
    if (g.includes('musicale') || g.includes('musical')) return '#8E44AD';
    if (g.includes('culturel')) return '#1B6FA8';
    if (g.includes('sportif') || g.includes('sport')) return '#27AE60';
    if (g.includes('theatre') || g.includes('théâtre')) return '#E74C3C';
    if (g.includes('gastrono')) return '#E67E22';
    if (g.includes('artisanal') || g.includes('artisan')) return '#D4A017';
    return '#D97D45';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.query = '';
      this.cursor = -1;
      this.results = [];
      this.isLoading = false;
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.querySubject.complete();
  }

  onQueryChange(): void {
    this.cursor = -1;
    this.querySubject.next(this.query);
  }

  get grouped(): Record<string, (SearchResult & { numericId?: number })[]> {
    const typeOrder = ['destination', 'event'];
    const result: Record<string, any[]> = {};
    for (const t of typeOrder) {
      const items = this.results.filter(r => r.type === t);
      if (items.length) result[t] = items;
    }
    return result;
  }

  private buildFlatList(): void {
    this.flatList = Object.values(this.grouped).flat();
  }

  get hasResults(): boolean {
    return this.results.length > 0;
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.close.emit(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.cursor = Math.min(this.cursor + 1, this.flatList.length - 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.cursor = Math.max(this.cursor - 1, 0); }
    if (e.key === 'Enter' && this.cursor >= 0 && this.flatList[this.cursor]) {
      this.goToResult(this.flatList[this.cursor] as any);
    }
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement) === e.currentTarget) this.close.emit();
  }

  goToResult(item: SearchResult & { numericId?: number }): void {
    if ((item.page === 'detail' || item.page === 'event-detail') && item.numericId != null) {
      this.nav.navigate(item.page, item.numericId);
    } else {
      this.navigate.emit(item.page);
      this.nav.navigate(item.page);
    }
    this.close.emit();
  }

  goToPage(page: string): void {
    this.navigate.emit(page);
    this.nav.navigate(page);
    this.close.emit();
  }

  clearQuery(): void {
    this.query = '';
    this.cursor = -1;
    this.results = [];
    this.querySubject.next('');
  }

  // Type labels are pulled from i18n at template time via typeLabelKeys.
  typeLabelKeys: Record<string, string> = {
    destination: 'searchModal.typeDestination',
    event: 'searchModal.typeEvent',
  };

  seeAllPage(type: string): string {
    return type === 'event' ? 'events' : 'catalog';
  }

  private langService = inject(LanguageService);

  categoryLabel(cat?: string): string {
    if (!cat) return '';
    return this.langService.getCategoryLabel(cat) || this.langService.getGenreLabel(cat);
  }
}
