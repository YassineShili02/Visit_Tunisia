import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export type Page = 'home' | 'auth' | 'catalog' | 'detail' | 'itinerary-form' | 'itinerary-result' | 'account' | 'onboarding' | 'events' | 'event-detail' | 'admin';

const PAGE_TO_ROUTE: Record<string, string> = {
  home: '/',
  catalog: '/catalog',
  'itinerary-form': '/itinerary-form',
  'itinerary-result': '/itinerary-result',
  events: '/events',
  account: '/account',
  onboarding: '/onboarding',
  admin: '/admin',
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
};

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private searchOpenSubject = new BehaviorSubject<boolean>(false);
  searchOpen$ = this.searchOpenSubject.asObservable();
  private authModalOpenSubject = new BehaviorSubject<boolean>(false);
  authModalOpen$ = this.authModalOpenSubject.asObservable();

  constructor(private router: Router) {}

  navigate(page: string, id?: number): void {
    if (page === 'detail' && id != null) {
      this.router.navigate(['/detail', id]);
    } else if (page === 'event-detail' && id != null) {
      this.router.navigate(['/event-detail', id]);
    } else {
      const route = PAGE_TO_ROUTE[page] ?? `/${page}`;
      this.router.navigateByUrl(route);
    }
    window.scrollTo(0, 0);
  }

  openSearch(): void { this.searchOpenSubject.next(true); }
  closeSearch(): void { this.searchOpenSubject.next(false); }
  openAuth(): void { this.router.navigate(['/login']); }
  closeAuth(): void { this.router.navigate(['/']); }
}
