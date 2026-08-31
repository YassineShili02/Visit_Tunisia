import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NavigationService } from './services/navigation.service';
import { AuthService } from './services/auth.service';
import { FavoriteService } from './services/favorite.service';
import { LanguageService } from './services/language.service';
import { AuthUser } from './data/models';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SearchModalComponent } from './components/search-modal/search-modal.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    NavbarComponent,
    SearchModalComponent,
    ChatWidgetComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  currentPage = '';
  user: AuthUser | null = null;
  searchOpen = false;
  chatHistoryRequested = false;
  private subs: Subscription[] = [];

  constructor(
    public nav: NavigationService,
    public auth: AuthService,
    private favoriteService: FavoriteService,
    private router: Router,
    // Injecting LanguageService here guarantees its bootstrap() runs at app start,
    // applying the persisted language + RTL direction before any view renders.
    private languageService: LanguageService,
  ) {
    // Set favorite service reference in auth service (to clear on logout)
    this.auth.setFavoriteService(this.favoriteService);
  }

  ngOnInit(): void {
    this.subs.push(
      this.auth.user$.subscribe(u => {
        this.user = u;
        // When a user logs in, sync their preferred language to the UI.
        // (syncFromUser respects localStorage; manual choice stays priority.)
        if (u) {
          this.languageService.syncFromUser();
        }
        // Load favorites when user logs in
        if (u && this.auth.isAuthenticated()) {
          this.favoriteService.loadFavoriteIds().subscribe({
            next: () => console.log('[App] Favorites loaded on login'),
            error: (err) => console.warn('[App] Could not load favorites', err)
          });
        }
      }),
      this.nav.searchOpen$.subscribe(o => this.searchOpen = o),
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
      ).subscribe((e: any) => {
        const url: string = e.urlAfterRedirects ?? e.url;
        this.currentPage = url.replace(/^\//, '').split('?')[0].split('/')[0] || 'home';
      }),
    );
    // Set initial page from current URL
    const initialUrl = this.router.url.replace(/^\//, '').split('?')[0].split('/')[0] || 'home';
    this.currentPage = initialUrl;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  handleLogin(user: AuthUser): void {
    this.auth.setUser(user);
  }

  handleLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  requestChatHistory(): void {
    this.chatHistoryRequested = true;
    setTimeout(() => { this.chatHistoryRequested = false; }, 500);
  }

  onNavigate(page: string): void {
    this.nav.navigate(page);
  }

  isAdminPage(): boolean {
    return this.currentPage === 'admin';
  }

  isOnboardingPage(): boolean {
    return this.currentPage === 'onboarding';
  }

  isAuthPage(): boolean {
    return ['login', 'register', 'forgot-password', 'reset-password'].includes(this.currentPage);
  }

  showNavbar(): boolean {
    return !this.isAdminPage() && !this.isOnboardingPage() && !this.isAuthPage();
  }
}
