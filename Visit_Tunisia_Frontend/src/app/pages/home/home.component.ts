import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import { PublicDestinationService } from '../../services/public-destination.service';
import { PublicEventService } from '../../services/public-event.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { Destination } from '../../data/models';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { RecommandationService } from '../../services/recommandation.service';

interface CategorySummary {
  icon: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, StarRatingComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();

  // Hero Carousel Data with 5 images from public/images
  // Titles/subtitles are loaded via transloco keys to support all 5 languages.
  // Image/text pairing matches actual photo content:
  //   slide1 albina = desert Star Wars set (Tozeur) -> Oases & Sahara
  //   slide2 ayoub = blue-white dome with palm over the sea -> Sidi Bou Said & Coast
  //   slide3 amal = modern seaside promenade (Monastir) -> Mediterranean Coast
  //   slide4 brahim = Kasbah square, Tunis (flags monument) -> Capital & Medina
  readonly heroSlideKeys = [
    { image: 'images/albina-andreeva-Bo583WU9tMo-unsplash.jpg', titleKey: 'home.slide1.title', subtitleKey: 'home.slide1.subtitle' },
    { image: 'images/ayoub-chebbi-ldfV8I-ZaV4-unsplash.jpg', titleKey: 'home.slide2.title', subtitleKey: 'home.slide2.subtitle' },
    { image: 'images/amal-bourkhis-n2E0-rJHEfo-unsplash.jpg', titleKey: 'home.slide3.title', subtitleKey: 'home.slide3.subtitle' },
    { image: 'images/brahim-guedich-dbVp4jxZz7E-unsplash.jpg', titleKey: 'home.slide4.title', subtitleKey: 'home.slide4.subtitle' },
    { image: 'images/francesca-noemi-marconi-7J6rziLHYTQ-unsplash.jpg', titleKey: 'home.slide5.title', subtitleKey: 'home.slide5.subtitle' },
  ];

  currentSlide = 0;
  slideDuration = 5000; // 5 seconds per slide
  progressPercent = 0;
  private progressInterval: any;

  aiQuery = '';

  // Real data from backend
  featuredDestinations: Destination[] = [];
  recommendedDestinations: Destination[] = [];
  upcomingEvents: any[] = [];
  isLoading = false;
  isLoadingRecommendations = false;

  // Categories without fake counts
  categories: CategorySummary[] = [
    { icon: 'Compass', label: 'Culturel', color: '#D97D45' },
    { icon: 'Waves', label: 'Balnéaire', color: '#7EC8E3' },
    { icon: 'Leaf', label: 'Écologique', color: '#6B8E4E' },
    { icon: 'UtensilsCrossed', label: 'Gastronomique', color: '#E0A458' },
    { icon: 'Mountain', label: 'Aventure', color: '#D97D45' },
    { icon: 'Moon', label: 'Religieux', color: '#1B6FA8' },
  ];

  private subs: Subscription[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private destinationService: PublicDestinationService,
    private eventService: PublicEventService,
    private chatService: ChatService,
    public authService: AuthService,
    private recommandationService: RecommandationService,
    private router: Router,
    private langService: LanguageService,
  ) {
    // Force languageService initialization for tourist pages.
    void this.langService;
  }

  ngOnInit(): void {
    this.loadFeaturedDestinations();
    this.loadUpcomingEvents();
    this.startSlideTimer();

    // Lancer immédiatement le chargement si un token est présent en local
    if (this.authService.getToken()) {
      this.loadRecommandations();
    }

    // Recommandations personnalisées lors des changements de session utilisateur
    this.subs.push(
      this.authService.user$.subscribe(user => {
        if (user) {
          if (!this.isLoadingRecommendations && this.recommendedDestinations.length === 0) {
            this.loadRecommandations();
          }
        } else {
          this.recommendedDestinations = [];
          this.isLoadingRecommendations = false;
        }
      })
    );

    // Re-localize event dates when the language changes — y compris retour à
    // une langue déjà en cache (months/labels).
    this.subs.push(
      this.langService.currentLang$.pipe(
        switchMap(lang => this.langService.whenLangReady(lang))
      ).subscribe(() => {
        this.relocalizeUpcomingEvents();
      })
    );
  }

  loadRecommandations(): void {
    if (!this.authService.getToken()) {
      this.recommendedDestinations = [];
      this.isLoadingRecommendations = false;
      return;
    }
    this.isLoadingRecommendations = true;
    this.subs.push(
      this.recommandationService.getRecommandations().subscribe({
        next: (items) => {
          this.recommendedDestinations = items || [];
          this.isLoadingRecommendations = false;
        },
        error: (err) => {
          console.warn('[Home] Erreur lors du chargement des recommandations', err);
          this.recommendedDestinations = [];
          this.isLoadingRecommendations = false;
        }
      })
    );
  }

  goTo(page: string, id?: number): void {
    if (page === 'catalog') this.router.navigate(['/catalog']);
    else if (page === 'events') this.router.navigate(['/events']);
    else if (page === 'itinerary-form') this.router.navigate(['/itinerary-form']);
    else if (page === 'event-detail' && id != null) this.router.navigate(['/event-detail', id]);
    else if (page === 'detail' && id != null) this.router.navigate(['/detail', id]);
    else if (page === 'auth') this.router.navigate(['/login']);
    else this.router.navigate([`/${page}`]);
  }

  private loadUpcomingEvents(): void {
    this.subs.push(
      this.eventService.getActiveEvents(undefined, undefined, undefined, 0, 3).subscribe({
        next: (res) => {
          const items = res.content || [];
          this.upcomingEvents = items.map((e: any) => ({
            id: e.evenementId,
            title: e._localizedTitle || e.nom?.fr || e.nom?.en || Object.values(e.nom || {})[0] || this.langService.translate('searchModal.eventFallback', 'Événement'),
            category: e.genre || 'Culturel',
            price: (!e.tarif || e.tarif === 0) ? this.langService.translate('common.free', 'Gratuit') : `${e.tarif} TND`,
            photo: (e.photos && e.photos.length > 0) ? e.photos[0] : 'assets/images/tunisia/events-default.jpg',
            location: e.destinationNom
              ? `${e.destinationNom}${e.destinationRegion ? ' · ' + this.langService.getRegionLabel(e.destinationRegion) : ''}`
              : this.langService.getCountryName('TN'),
            dateDebut: e.dateDebut,
            dateFin: e.dateFin,
            dateLabel: this.formatDateLabel(e.dateDebut, e.dateFin),
            _tarif: e.tarif,
            _destName: e.destinationNom,
            _destRegion: e.destinationRegion,
          }));
        },
        error: (err) => {
          console.warn('[Home] Could not load upcoming events', err);
          this.upcomingEvents = [];
        }
      })
    );
  }

  private relocalizeUpcomingEvents(): void {
    this.upcomingEvents = this.upcomingEvents.map((e) => ({
      ...e,
      dateLabel: this.formatDateLabel(e.dateDebut, e.dateFin),
      price: (!e._tarif || e._tarif === 0) ? this.langService.translate('common.free', 'Gratuit') : `${e._tarif} TND`,
      location: e._destName
        ? `${e._destName}${e._destRegion ? ' · ' + this.langService.getRegionLabel(e._destRegion) : ''}`
        : this.langService.getCountryName('TN'),
    }));
  }

  private formatDateLabel(dateDebut?: string, dateFin?: string): string {
    const shortMonths = this.langService.getShortMonths();
    const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return { day: d, month: m - 1, year: y }; };
    if (!dateDebut) return this.langService.translate('home.datesToConfirm', 'Dates à confirmer');
    try {
      const d1 = parse(dateDebut);
      if (!dateFin || dateFin === dateDebut) return `${d1.day} ${shortMonths[d1.month]} ${d1.year}`;
      const d2 = parse(dateFin);
      if (d1.year === d2.year && d1.month === d2.month) return `${d1.day} – ${d2.day} ${shortMonths[d1.month]} ${d1.year}`;
      if (d1.year === d2.year) return `${d1.day} ${shortMonths[d1.month]} – ${d2.day} ${shortMonths[d2.month]} ${d1.year}`;
      return `${d1.day} ${shortMonths[d1.month]} ${d1.year} – ${d2.day} ${shortMonths[d2.month]} ${d2.year}`;
    } catch { return dateDebut; }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.stopSlideTimer();
  }

  startSlideTimer(): void {
    this.stopSlideTimer();
    this.progressPercent = 0;

    const startTime = Date.now();
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.progressPercent = Math.min(100, (elapsed / this.slideDuration) * 100);
      if (this.progressPercent >= 100) {
        this.nextSlide();
      }
    }, 50);
  }

  stopSlideTimer(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlideKeys.length;
    this.startSlideTimer();
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.heroSlideKeys.length) % this.heroSlideKeys.length;
    this.startSlideTimer();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.startSlideTimer();
  }

  private loadFeaturedDestinations(): void {
    this.isLoading = true;
    this.subs.push(
      this.destinationService.getPublishedDestinations(
        undefined, // region
        undefined, // category
        undefined, // type
        undefined, // search
        undefined, // maxPrice
        0,         // page
        8          // size: fetch 8 featured destinations
      ).subscribe({
        next: (result) => {
          // Sort by rating to show best destinations
          this.featuredDestinations = result.items
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load featured destinations', err);
          this.featuredDestinations = [];
          this.isLoading = false;
        }
      })
    );
  }

  handleAiSearch(): void {
    const query = this.aiQuery.trim();
    if (!query) return;

    // Check if user is logged in
    const user = this.authService.currentUser;
    if (!user) {
      // Redirect to auth page
      this.navigate.emit('auth');
      return;
    }

    // Create or use existing conversation and send message
    let conv = this.chatService.activeConversation;
    if (!conv) {
      conv = this.chatService.newConversation();
    }

    this.chatService.sendMessage(query);
    this.aiQuery = '';

    // Small delay to let the message be processed, then navigate
    setTimeout(() => {
      this.navigate.emit('home'); // Stay on home, chat widget will show the conversation
    }, 100);
  }

  onAiSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleAiSearch();
    }
  }

  private icons: Record<string, string> = {
    Compass: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    Waves: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
    Leaf: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 11-10 11Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
    UtensilsCrossed: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
    Mountain: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
    Moon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  };

  getCategoryIcon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.icons[name] ?? '');
  }

  getCategoryColor(cat: string): string {
    const found = this.categories.find(c => c.label === cat);
    return found?.color ?? '#1B6FA8';
  }

  /**
   * Returns the localized display name for a category, falling back to the
   * raw FR label if no translation key exists.
   */
  categoryLabel(label: string): string {
    return this.langService.getCategoryLabel(label);
  }

  /**
   * Returns the localized establishment type label.
   */
  typeLabel(type: string): string {
    return this.langService.getTypeLabel(type);
  }

  /**
   * Returns the localized region label.
   */
  regionLabel(region?: string): string {
    return this.langService.getRegionLabel(region);
  }

  /**
   * Returns the localized event genre label.
   */
  genreLabel(genre?: string): string {
    return this.langService.getGenreLabel(genre);
  }
}
