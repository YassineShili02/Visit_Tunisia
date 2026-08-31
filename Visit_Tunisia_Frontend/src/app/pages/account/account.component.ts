import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { SAMPLE_ITINERARIES } from '../../data/itineraries.data';
import { SAMPLE_REVIEWS } from '../../data/detail.data';
import { CATEGORY_COLORS, LANGUAGES_FULL } from '../../data/constants';
import { PreferenceService } from '../../services/preference.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { CountryPickerComponent } from '../../components/country-picker/country-picker.component';
import { PhoneFieldComponent } from '../../components/phone-field/phone-field.component';

type AccountSection = 'profil' | 'securite' | 'preferences' | 'itineraires' | 'avis';

const NAV_ICONS: Record<string, string> = {
  profil: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  securite: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  preferences: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  itineraires: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
  avis: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

const PREF_ICONS: Record<string, string> = {
  Culturel: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  Balnéaire: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  Écologique: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 11-10 11Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  Gastronomique: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
  Aventure: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
  Religieux: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
};

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, CountryPickerComponent, PhoneFieldComponent],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();

  section: AccountSection = 'profil';
  itineraries = SAMPLE_ITINERARIES;
  reviews: any[] = [];
  userReviews: any[] = [];
  languages = LANGUAGES_FULL;
  categoryColors = CATEGORY_COLORS;
  activeLang = 'FR';
  langSaving = false;
  langSaved = false;
  reviewsLoading = false;

  // Real user data from backend
  currentUser: any = null;
  private userSub?: Subscription;

  profileForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    pays: '',
    dateNaissance: '',
    bio: ''
  };
  
  phoneDial = '+216';
  phoneLocal = '';
  
  profileSaved = false;
  profileLoading = false;
  prefsSelected = new Set<string>();
  prefsSaved = false;

  // Password change state
  passwordForm = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmMotDePasse: ''
  };
  showAncienPassword = false;
  showNouveauPassword = false;
  showConfirmPassword = false;
  passwordLoading = false;
  passwordSuccess = false;
  passwordError = '';

  navItems = [
    { id: 'profil' as AccountSection, labelKey: 'account.sectionProfile', icon: 'profil' },
    { id: 'securite' as AccountSection, labelKey: 'account.sectionSecurity', icon: 'securite' },
    { id: 'preferences' as AccountSection, labelKey: 'account.sectionPreferences', icon: 'preferences' },
    { id: 'itineraires' as AccountSection, labelKey: 'account.sectionItineraries', icon: 'itineraires' },
    { id: 'avis' as AccountSection, labelKey: 'account.sectionReviews', icon: 'avis' },
  ];

  constructor(
    private preferenceService: PreferenceService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private router: Router,
    private lang: LanguageService
  ) {}

  t(key: string, fallback?: string): string {
    return this.lang.translate(key, fallback);
  }

  ngOnInit(): void {
    // Load real user data
    this.userSub = this.authService.user$.subscribe(user => {
      console.log('[Account] User loaded:', user); // DEBUG
      if (user) {
        this.currentUser = user;
        // Synchronise le sélecteur de langue : préférence du compte si définie,
        // sinon langue courante de l'application
        const pref = (user as any)?.languePreferee as string | undefined;
        this.activeLang = pref ? pref.toUpperCase() : this.lang.currentLang.toUpperCase();
        this.profileForm.prenom = user.prenom || '';
        this.profileForm.nom = user.nom || '';
        this.profileForm.email = user.email || '';
        this.profileForm.pays = user.pays || '';
        this.profileForm.dateNaissance = user.dateNaissance || '';
        
        // Parse telephone - split dial code from local number
        console.log('[Account] User telephone:', user.telephone); // DEBUG
        if (user.telephone) {
          // Known dial codes (most common country codes)
          const dialCodes = ['+216', '+33', '+1', '+44', '+49', '+34', '+39', '+212', '+213', '+218', '+20'];
          
          let foundDial = false;
          for (const code of dialCodes) {
            if (user.telephone.startsWith(code)) {
              this.phoneDial = code;
              this.phoneLocal = user.telephone.substring(code.length);
              foundDial = true;
              console.log('[Account] Parsed phone - dial:', this.phoneDial, 'local:', this.phoneLocal); // DEBUG
              break;
            }
          }
          
          if (!foundDial) {
            // Fallback: try to match +XXX pattern (1-4 digits)
            const match = user.telephone.match(/^(\+\d{1,4})(.*)$/);
            if (match) {
              this.phoneDial = match[1];
              this.phoneLocal = match[2];
              console.log('[Account] Parsed phone (fallback) - dial:', this.phoneDial, 'local:', this.phoneLocal); // DEBUG
            } else {
              this.phoneLocal = user.telephone;
            }
          }
        } else {
          console.log('[Account] No telephone in user object'); // DEBUG
          this.phoneLocal = '';
        }
        this.profileForm.telephone = user.telephone || '';
        
        // Load user reviews
        this.loadUserReviews();
      }
    });

    const prefs = this.preferenceService.currentPreferences;
    this.prefsSelected = new Set(prefs.length > 0 ? prefs : ['Culturel', 'Balnéaire', 'Gastronomique']);
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  setSection(s: AccountSection): void { this.section = s; }

  onCountryChange(pays: string): void {
    this.profileForm.pays = pays;
    this.profileSaved = false;
  }

  onPhoneDial(data: { code: string; dial: string }): void {
    this.phoneDial = data.dial;
    this.updatePhoneForm();
  }

  onPhoneLocal(local: string): void {
    this.phoneLocal = local;
    this.updatePhoneForm();
  }

  private updatePhoneForm(): void {
    this.profileForm.telephone = this.phoneLocal ? `${this.phoneDial}${this.phoneLocal}` : '';
    this.profileSaved = false;
  }

  saveProfile(): void {
    this.profileLoading = true;
    this.profileSaved = false;

    const fullPhone = this.phoneLocal ? `${this.phoneDial}${this.phoneLocal}` : undefined;

    this.authService.completeProfile({
      dateNaissance: this.profileForm.dateNaissance || undefined,
      telephone: fullPhone,
      pays: this.profileForm.pays || undefined,
      preferences: undefined // Don't change preferences here
    }).subscribe({
      next: (res) => {
        this.profileLoading = false;
        this.profileSaved = true;
        this.authService.setUser(res.utilisateur);
        setTimeout(() => this.profileSaved = false, 3000);
      },
      error: (err) => {
        console.error('Error saving profile:', err);
        this.profileLoading = false;
        alert(this.t('account.saveError', 'Erreur lors de la sauvegarde du profil'));
      }
    });
  }
  savePrefs(): void {
    this.preferenceService.savePreferences([...this.prefsSelected]);
    this.prefsSaved = true;
  }

  /**
   * Change la langue : application immédiate + localStorage (setLang) puis
   * sauvegarde côté backend (languePreferee) pour qu'elle devienne la langue
   * par défaut du compte à chaque connexion.
   */
  selectLanguage(code: string): void {
    if (this.langSaving || this.activeLang === code) return;
    this.activeLang = code;
    this.langSaved = false;
    this.lang.setLang(code.toLowerCase() as any);

    this.langSaving = true;
    this.authService.completeProfile({ languePreferee: code }).subscribe({
      next: (res) => {
        this.langSaving = false;
        this.langSaved = true;
        if (res?.utilisateur) this.authService.setUser(res.utilisateur);
        setTimeout(() => this.langSaved = false, 3000);
      },
      error: (err) => {
        console.error('[Account] Erreur sauvegarde langue:', err);
        this.langSaving = false;
      }
    });
  }

  togglePref(key: string): void {
    if (this.prefsSelected.has(key)) this.prefsSelected.delete(key);
    else this.prefsSelected.add(key);
    this.prefsSaved = false;
  }

  isPrefSelected(key: string): boolean { return this.prefsSelected.has(key); }

  loadUserReviews(): void {
    this.reviewsLoading = true;
    this.http.get<any[]>('http://localhost:8082/api/user/reviews').subscribe({
      next: (reviews) => {
        console.log('[Account] Loaded user reviews:', reviews);
        this.userReviews = reviews;
        this.reviewsLoading = false;
      },
      error: (err) => {
        console.error('[Account] Error loading user reviews:', err);
        this.reviewsLoading = false;
      }
    });
  }

  deleteReview(id: number): void {
    if (!confirm(this.t('account.deleteReviewConfirm', 'Êtes-vous sûr de vouloir supprimer cet avis ?'))) {
      return;
    }
    
    // TODO: Add backend DELETE endpoint for reviews
    // For now, just remove from local array
    this.userReviews = this.userReviews.filter(r => r.avisId !== id);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    try {
      return date.toLocaleDateString(this.lang.currentLang, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  getSentimentBadge(label: string | null): { text: string, color: string } {
    if (!label) return { text: this.t('account.sentimentNA', 'N/A'), color: '#9CA3AF' };

    switch(label.toUpperCase()) {
      case 'POSITIF':
        return { text: this.t('account.sentimentPositif', 'Positif'), color: '#10B981' };
      case 'NEUTRE':
        return { text: this.t('account.sentimentNeutre', 'Neutre'), color: '#F59E0B' };
      case 'NEGATIF':
        return { text: this.t('account.sentimentNegatif', 'Négatif'), color: '#EF4444' };
      default:
        return { text: this.t('account.sentimentNA', 'N/A'), color: '#9CA3AF' };
    }
  }

  navigateToDestination(destinationId: number | null): void {
    if (destinationId) {
      this.router.navigate(['/detail', destinationId]);
    }
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = false;

    const { ancienMotDePasse, nouveauMotDePasse, confirmMotDePasse } = this.passwordForm;

    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmMotDePasse) {
      this.passwordError = this.t('account.passwordErrors.fillAll', 'Veuillez remplir tous les champs du formulaire.');
      return;
    }

    if (nouveauMotDePasse.length < 6) {
      this.passwordError = this.t('account.passwordErrors.tooShort', 'Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (nouveauMotDePasse !== confirmMotDePasse) {
      this.passwordError = this.t('account.passwordErrors.mismatch', 'La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    if (nouveauMotDePasse === ancienMotDePasse) {
      this.passwordError = this.t('account.passwordErrors.same', 'Le nouveau mot de passe doit être différent de l\'ancien mot de passe.');
      return;
    }

    this.passwordLoading = true;

    this.authService.changePassword(ancienMotDePasse, nouveauMotDePasse).subscribe({
      next: (res) => {
        this.passwordLoading = false;
        this.passwordSuccess = true;
        this.passwordError = '';
        this.passwordForm = {
          ancienMotDePasse: '',
          nouveauMotDePasse: '',
          confirmMotDePasse: ''
        };
        setTimeout(() => this.passwordSuccess = false, 5000);
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordSuccess = false;
        this.passwordError = err.error?.message || err.error?.detail || this.t('account.passwordChangeError', 'Erreur lors de la modification du mot de passe.');
      }
    });
  }

  renderStars(n: number): number[] { return Array.from({ length: 5 }, (_, i) => i); }
  isFilled(i: number, n: number): boolean { return i < n; }
  getPrefColor(key: string): string { return (this.categoryColors as Record<string, string>)[key] ?? '#1B6FA8'; }

  getNavIcon(id: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(NAV_ICONS[id] ?? ''); }
  getPrefIcon(key: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(PREF_ICONS[key] ?? ''); }

  /** Libellé localisé d'une préférence (la clé canonique reste en FR côté données) */
  prefLabel(key: string): string { return this.lang.getCategoryLabel(key); }
}

