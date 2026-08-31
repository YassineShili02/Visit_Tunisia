import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AuthComponent } from './pages/auth/auth.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { DetailComponent } from './pages/detail/detail.component';
import { ItineraryFormComponent } from './pages/itinerary-form/itinerary-form.component';
import { ItineraryResultComponent } from './pages/itinerary-result/itinerary-result.component';
import { EventsComponent } from './pages/events/events.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { AccountComponent } from './pages/account/account.component';
import { AdminComponent } from './pages/admin/admin.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { MyItinerariesComponent } from './pages/my-itineraries/my-itineraries.component';
import { AuthGuard } from './guards/auth.guard';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: AuthComponent },
  { path: 'reset-password', component: AuthComponent },
  { path: 'catalog', component: CatalogComponent },
  { path: 'destinations/:id', component: DetailComponent },
  { path: 'detail/:id', component: DetailComponent },
  { path: 'detail', component: DetailComponent },
  { path: 'itinerary-form', component: ItineraryFormComponent },
  { path: 'itinerary-result', component: ItineraryResultComponent },
  { path: 'events', component: EventsComponent },
  { path: 'event-detail/:id', component: EventDetailComponent },
  { path: 'event-detail', component: EventDetailComponent },
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'favorites', component: FavoritesComponent, canActivate: [AuthGuard] },
  { path: 'my-itineraries', component: MyItinerariesComponent, canActivate: [AuthGuard] },
  { path: 'account', component: AccountComponent, canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'stats', pathMatch: 'full' },
      { path: 'stats', component: AdminComponent },
      { path: 'journal', component: AdminComponent },
      { path: 'destinations', component: AdminComponent },
      { path: 'events', component: AdminComponent },
      { path: 'users', component: AdminComponent },
      { path: 'reviews', component: AdminComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
