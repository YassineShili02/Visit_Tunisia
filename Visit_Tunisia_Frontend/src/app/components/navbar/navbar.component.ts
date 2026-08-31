import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthUser } from '../../data/models';
import { NAV_PAGE_MAP } from '../../data/constants';
import { LanguageService, SupportedLang } from '../../services/language.service';

const PAGE_TO_ROUTE: Record<string, string> = {
  home: '/',
  catalog: '/catalog',
  'itinerary-form': '/itinerary-form',
  'itinerary-result': '/itinerary-result',
  events: '/events',
  account: '/account',
  onboarding: '/onboarding',
  admin: '/admin',
};

interface LangOption {
  code: SupportedLang;
  short: string; // 2-letter display in the navbar trigger
  labelKey: string; // transloco key
  isRtl?: boolean;
}

const LANG_OPTIONS: LangOption[] = [
  { code: 'fr', short: 'FR', labelKey: 'nav.lang.fr' },
  { code: 'en', short: 'EN', labelKey: 'nav.lang.en' },
  { code: 'ar', short: 'AR', labelKey: 'nav.lang.ar', isRtl: true },
  { code: 'it', short: 'IT', labelKey: 'nav.lang.it' },
  { code: 'de', short: 'DE', labelKey: 'nav.lang.de' },
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() currentPage = 'home';
  @Input() user: AuthUser | null = null;
  @Output() authClick = new EventEmitter<void>();
  @Output() accountClick = new EventEmitter<void>();
  @Output() adminClick = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<string>();
  @Output() searchClick = new EventEmitter<void>();
  @Output() openConversations = new EventEmitter<void>();
  @Output() favoritesClick = new EventEmitter<void>();

  /** Translation key per nav link (in canonical order: Accueil, Explorer, Itinéraires, Événements). */
  readonly navLinkKeys = ['nav.home', 'nav.catalog', 'nav.itinerary', 'nav.events'];
  readonly langOptions = LANG_OPTIONS;

  activeLang: SupportedLang = 'fr';
  langOpen = false;
  profileOpen = false;
  isRtl = false;

  private subs: Subscription[] = [];

  constructor(private router: Router, private langService: LanguageService) {}

  ngOnInit(): void {
    this.activeLang = this.langService.currentLang;
    this.isRtl = this.langService.isRtl;
    this.subs.push(
      this.langService.currentLang$.subscribe((l) => {
        this.activeLang = l;
        this.isRtl = this.langService.isRtl;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  get activeLinkKey(): string {
    if (this.currentPage === 'catalog' || this.currentPage === 'detail') return 'nav.catalog';
    if (this.currentPage === 'itinerary-form' || this.currentPage === 'itinerary-result' || this.currentPage === 'my-itineraries') return 'nav.itinerary';
    if (this.currentPage === 'events' || this.currentPage === 'event-detail') return 'nav.events';
    if (this.currentPage === 'home') return 'nav.home';
    return '';
  }

  get currentLangShort(): string {
    return LANG_OPTIONS.find((l) => l.code === this.activeLang)?.short ?? 'FR';
  }

  get userName(): string {
    if (!this.user) return '';
    if (this.user.prenom || this.user.nom) {
      return `${this.user.prenom || ''} ${this.user.nom || ''}`.trim();
    }
    return this.user.email;
  }

  get userInitials(): string {
    if (!this.user) return 'VT';
    const p = (this.user.prenom || '').trim();
    const n = (this.user.nom || '').trim();
    if (p && n) return (p[0] + n[0]).toUpperCase();
    if (p) return p.substring(0, 2).toUpperCase();
    if (n) return n.substring(0, 2).toUpperCase();
    return this.user.email.substring(0, 2).toUpperCase();
  }

  get isAdmin(): boolean {
    return this.user?.role?.toUpperCase() === 'ADMIN';
  }

  get isTourist(): boolean {
    const role = this.user?.role?.toUpperCase();
    return role === 'TOURISTE' || role === 'TOURIST';
  }

  onNavClick(linkKey: string): void {
    // Map translation key back to canonical page name for routing.
    const reverseMap: Record<string, string> = {
      'nav.home': 'home',
      'nav.catalog': 'catalog',
      'nav.itinerary': 'itinerary-form',
      'nav.events': 'events',
    };
    const page = reverseMap[linkKey];
    if (!page) return;
    const route = PAGE_TO_ROUTE[page] ?? `/${page}`;
    this.router.navigateByUrl(route);
  }

  onAccountClick(): void {
    this.profileOpen = false;
    this.router.navigate(['/account']);
    this.accountClick.emit();
  }

  onAdminClick(): void {
    this.profileOpen = false;
    this.router.navigate(['/admin']);
    this.adminClick.emit();
  }

  onAuthClick(): void {
    this.router.navigate(['/login']);
    this.authClick.emit();
  }

  onLogout(): void {
    this.profileOpen = false;
    this.logout.emit();
  }

  toggleLang(): void { this.langOpen = !this.langOpen; }
  selectLang(code: SupportedLang): void {
    this.langService.setLang(code);
    this.langOpen = false;
  }
  toggleProfile(): void { this.profileOpen = !this.profileOpen; }
  closeProfile(): void { this.profileOpen = false; }
}
