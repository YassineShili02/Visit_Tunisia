import { Component, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthUser } from '../../data/models';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { PhoneFieldComponent } from '../../components/phone-field/phone-field.component';
import { CountryPickerComponent } from '../../components/country-picker/country-picker.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, PhoneFieldComponent, CountryPickerComponent],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<AuthUser>();
  @Output() signup = new EventEmitter<void>();

  mode: 'login' | 'signup' | 'forgot' | 'reset' | 'complete-profile' = 'login';
  form = { nom: '', prenom: '', email: '', password: '', confirm: '', dateNaissance: '', pays: 'Tunisie' };
  phoneDial = '+216';
  phoneCode = 'TN';
  phoneLocal = '';
  showPassword = false;
  showConfirm = false;
  loginError = '';
  signupError = '';
  googleError = '';
  forgotMessage = '';
  resetMessage = '';
  resetError = '';
  resetToken = '';
  isLoading = false;

  // === Compte bloqué (email non vérifié) ===
  // Quand l'utilisateur essaie de se connecter avec un compte dont
  // l'email n'a pas été vérifié, on lui propose deux options :
  //   1) Vérifier son email existant (redirection vers /verify-email)
  //   2) Créer un nouveau compte (redirection vers /register)
  blockedAccountEmail = '';

  showGoogleTokenBox = false;
  googleTokenInput = '';

  // Carousel slider state
  currentSlideIndex = 0;
  private slideInterval: any;

  // Carousel slides: titles and subtitles are read from translation keys at render time
  // via getSlideTitle(i) / getSlideSubtitle(i), so they update when the user changes language.
  slides = [
    {
      titleKey: 'auth.slide1Title',
      subtitleKey: 'auth.slide1Subtitle',
      image: '/images/tunisia/sidi_bou_said.png'
    },
    {
      titleKey: 'auth.slide2Title',
      subtitleKey: 'auth.slide2Subtitle',
      image: '/images/tunisia/medina_tunis.png'
    },
    {
      titleKey: 'auth.slide3Title',
      subtitleKey: 'auth.slide3Subtitle',
      image: '/images/tunisia/el_jem.png'
    },
    {
      titleKey: 'auth.slide4Title',
      subtitleKey: 'auth.slide4Subtitle',
      image: '/images/tunisia/sahara.png'
    },
    {
      titleKey: 'auth.slide5Title',
      subtitleKey: 'auth.slide5Subtitle',
      image: '/images/tunisia/djerba.png'
    },
    {
      titleKey: 'auth.slide6Title',
      subtitleKey: 'auth.slide6Subtitle',
      image: '/images/tunisia/tabarka.jpg'
    },
    {
      titleKey: 'auth.slide7Title',
      subtitleKey: 'auth.slide7Subtitle',
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&h=1600&fit=crop&auto=format'
    },
    {
      titleKey: 'auth.slide8Title',
      subtitleKey: 'auth.slide8Subtitle',
      image: '/images/tunisia/hammamet.jpg'
    }
  ];

  getSlideTitle(i: number): string {
    return this.t(this.slides[i]?.titleKey ?? '');
  }

  getSlideSubtitle(i: number): string {
    return this.t(this.slides[i]?.subtitleKey ?? '');
  }

  private readonly GOOGLE_CLIENT_ID = '590621432009-58pah1vgk5fnborrot1cfjphuq5svlq5.apps.googleusercontent.com';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private ngZone: NgZone,
    private lang: LanguageService
  ) { }

  t(key: string, fallback?: string): string {
    return this.lang.translate(key, fallback);
  }

  ngOnInit(): void {
    const url = this.router.url;
    if (url.includes('/register')) {
      this.mode = 'signup';
    } else if (url.includes('/forgot-password')) {
      this.mode = 'forgot';
    } else if (url.includes('/reset-password')) {
      this.mode = 'reset';
      this.resetToken = this.route.snapshot.queryParams['token'] || '';
    } else {
      this.mode = 'login';
    }

    this.startSlideTimer();
  }

  ngOnDestroy(): void {
    this.stopSlideTimer();
  }

  startSlideTimer(): void {
    this.stopSlideTimer();
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 4500);
  }

  stopSlideTimer(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.currentSlideIndex = index;
    this.startSlideTimer();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initGoogleBtn(), 100);
  }

  triggerGoogleAuth(): void {
    console.log('[Google] triggerGoogleAuth fallback called');
    const gsi = (window as any).google?.accounts?.id;
    if (!gsi) {
      this.initGoogleBtn();
      return;
    }
    try {
      gsi.prompt((notification: any) => {
        console.log('[Google] One Tap notification:', notification);
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          this.initGoogleBtn();
        }
      });
    } catch (e) {
      console.error('[Google] Error in prompt fallback:', e);
      this.initGoogleBtn();
    }
  }

  initGoogleBtn(retryCount = 0): void {
    const gsi = (window as any).google?.accounts?.id;
    if (!gsi) {
      if (retryCount < 10) {
        console.warn(`[Google] SDK not loaded yet, retrying (${retryCount + 1}/10)...`);
        setTimeout(() => this.initGoogleBtn(retryCount + 1), 300);
      } else {
        console.error('[Google] SDK failed to load after retries.');
        this.googleError = this.t('auth.errorsGoogleNotLoaded');
      }
      return;
    }

    const container = document.getElementById('googleBtnContainer');
    if (!container) {
      if (retryCount < 5) {
        setTimeout(() => this.initGoogleBtn(retryCount + 1), 100);
      }
      return;
    }

    try {
      try {
        gsi.cancel();
      } catch (_) {}

      gsi.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: (res: any) => {
          this.ngZone.run(() => {
            console.log('[Google] Callback triggered', res);
            const token = res?.credential;
            if (token) {
              this.onGoogleTokenReceived(token);
            } else {
              console.error('[Google] No credential in response', res);
              this.googleError = this.t('auth.errorsGoogleNoReturned');
            }
          });
        },
        ux_mode: 'popup',
        cancel_on_tap_outside: true,
        auto_select: false,
      });

      container.innerHTML = '';
      gsi.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 380,
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
      });

      // Ensure rendered iframe stretches across the container to capture clicks
      setTimeout(() => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.opacity = '0.0001';
          iframe.style.position = 'absolute';
          iframe.style.inset = '0';
        }
        const innerDiv = container.querySelector('div');
        if (innerDiv) {
          innerDiv.style.width = '100%';
          innerDiv.style.height = '100%';
        }
      }, 50);

      console.log('[Google] Button rendered successfully');
    } catch (e) {
      console.error('[Google] Init error:', e);
    }
  }

  setMode(m: 'login' | 'signup' | 'forgot' | 'reset' | 'complete-profile'): void {
    this.mode = m;
    this.loginError = '';
    this.signupError = '';
    this.googleError = '';
    this.forgotMessage = '';
    this.resetError = '';
    this.resetMessage = '';
    this.blockedAccountEmail = '';
    this.showGoogleTokenBox = false;

    const path = m === 'signup' ? '/register' : m === 'forgot' ? '/forgot-password' : m === 'reset' ? '/reset-password' : '/login';
    this.location.go(path);

    if (m === 'login' || m === 'signup') {
      // Reinitialize Google button when switching between login/signup
      setTimeout(() => this.initGoogleBtn(), 200);
    }
  }

  onClose(): void {
    this.close.emit();
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.router.navigateByUrl(returnUrl);
  }

  /**
   * Option 1 : le compte bloqué veut vérifier son email existant.
   * On redirige vers la page de vérification avec l'email passé via l'état
   * du router (PAS dans l'URL, pour éviter la fuite dans l'historique, les
   * logs serveur, le referer, etc.).
   */
  goToVerifyEmail(): void {
    const email = this.blockedAccountEmail || this.form.email;
    this.close.emit();
    this.router.navigate(['/verify-email'], { state: { email } });
  }

  /**
   * Option 2 : l'utilisateur préfère créer un tout nouveau compte.
   * On le renvoie vers le formulaire d'inscription.
   */
  goToCreateNewAccount(): void {
    // On vide le mot de passe pour ne pas le re-soumettre par erreur
    this.form.password = '';
    this.form.confirm = '';
    this.blockedAccountEmail = '';
    this.close.emit();
    this.router.navigate(['/register']);
  }

  handleGoogleAuth(): void {
    // This method is no longer used (button is rendered by SDK)
    // Kept for fallback
    this.initGoogleBtn();
  }

  submitGoogleToken(): void {
    if (!this.googleTokenInput.trim()) return;
    this.onGoogleTokenReceived(this.googleTokenInput.trim());
  }

  onGoogleTokenReceived(token: string): void {
    console.log('[Google] onGoogleTokenReceived called, token length:', token?.length);
    if (!token) {
      this.googleError = this.t('auth.errorsGoogleNoToken');
      return;
    }
    this.isLoading = true;
    this.googleError = '';

        this.authService.googleAuth(token).subscribe({
          next: (res) => {
            console.log('[Google] Auth success, newUser:', res.newUser, res);
            this.isLoading = false;
            this.authService.setUser(res.utilisateur);
            if (res.newUser) {
              // New Google account → show complete-profile form to collect missing data
              this.mode = 'complete-profile';
              this.location.go('/register');
            } else {
              // Existing account → go straight to home
              this.close.emit();
              this.router.navigate(['/']);
            }
          },
      error: (err) => {
        console.error('[Google] Auth error:', err);
        this.isLoading = false;
        if (err.status === 400 || err.status === 401) {
          this.googleError = this.t('auth.errorsGoogleTokenInvalid');
        } else {
          this.googleError = err.error?.message || this.t('auth.errorsGoogle');
        }
      }
    });
  }

  onCountryChange(pays: string): void {
    this.form.pays = pays;
  }

  isPhoneValid = true;
  phoneMessage = '';
  
  // Password validation
  passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  passwordMessage = '';
  passwordMatch = true;
  passwordMatchMessage = '';
  passwordFocused = false;
  confirmFocused = false;

  onPhoneValidityChange(v: { isValid: boolean; message: string }): void {
    this.isPhoneValid = v.isValid;
    this.phoneMessage = v.message;
  }
  
  onPasswordInput(): void {
    const pwd = this.form.password;

    if (!pwd) {
      this.passwordStrength = '';
      this.passwordMessage = '';
      return;
    }

    // Check password strength
    const hasMinLength = pwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;

    if (!hasMinLength) {
      this.passwordStrength = 'weak';
      this.passwordMessage = this.t('auth.passwordMinChars');
    } else if (score <= 2) {
      this.passwordStrength = 'weak';
      this.passwordMessage = this.t('auth.passwordWeak');
    } else if (score === 3) {
      this.passwordStrength = 'medium';
      this.passwordMessage = this.t('auth.passwordMedium');
    } else {
      // score >= 4
      this.passwordStrength = 'strong';
      this.passwordMessage = this.t('auth.passwordStrong');
    }

    // Check if passwords match
    this.checkPasswordMatch();
  }
  
  onPasswordFocus(): void {
    this.passwordFocused = true;
  }
  
  onPasswordBlur(): void {
    this.passwordFocused = false;
  }
  
  onConfirmPasswordInput(): void {
    this.checkPasswordMatch();
  }
  
  onConfirmFocus(): void {
    this.confirmFocused = true;
  }
  
  onConfirmBlur(): void {
    this.confirmFocused = false;
  }
  
  private checkPasswordMatch(): void {
    if (!this.form.confirm) {
      this.passwordMatch = true;
      this.passwordMatchMessage = '';
      return;
    }

    if (this.form.password === this.form.confirm) {
      this.passwordMatch = true;
      this.passwordMatchMessage = this.t('auth.passwordMatchOk');
    } else {
      this.passwordMatch = false;
      this.passwordMatchMessage = this.t('auth.passwordMatchFail');
    }
  }

  handleCompleteProfileSubmit(e: Event): void {
    e.preventDefault();
    if (this.phoneLocal && !this.isPhoneValid) {
      alert(this.phoneMessage || this.t('auth.validationPhone'));
      return;
    }
    this.isLoading = true;
    const fullPhone = this.phoneLocal ? `${this.phoneDial}${this.phoneLocal}` : undefined;

    this.authService.completeProfile({
      dateNaissance: this.form.dateNaissance || undefined,
      telephone: fullPhone,
      pays: this.form.pays || 'Tunisie'
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.authService.setUser(res.utilisateur);
        this.router.navigate(['/onboarding']);
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/onboarding']);
      }
    });
  }

  handleSubmit(e: Event): void {
    e.preventDefault();
    if (this.mode === 'login') {
      if (!this.form.email || !this.form.password) {
        this.loginError = this.t('auth.validationRequired');
        return;
      }
      this.isLoading = true;
      this.loginError = '';

      this.authService.login({ email: this.form.email, motDePasse: this.form.password }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.login.emit(res.utilisateur);
          this.close.emit();
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || (res.utilisateur.role?.toUpperCase() === 'ADMIN' ? '/admin' : '/');
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.isLoading = false;
          // Cas particulier : email non vérifié (compte "bloqué")
          // On propose à l'utilisateur de vérifier son email ou de créer un nouveau compte.
          if (err.status === 403 && err.error?.error === 'EMAIL_NOT_VERIFIED') {
            this.blockedAccountEmail = err.error?.details?.email || this.form.email;
            this.loginError = '';
            return;
          }
          if (err.error?.message) {
            this.loginError = err.error.message;
          } else if (err.status === 401 || err.status === 400) {
            this.loginError = this.t('auth.errorsLogin');
          } else if (err.status === 403) {
            this.loginError = this.t('auth.errorsAccountDisabled');
          } else {
            this.loginError = this.t('auth.errorsBackend');
          }
        }
      });
    } else if (this.mode === 'signup') {
      if (!this.form.nom.trim()) {
        this.signupError = this.t('auth.validationLastName');
        return;
      }
      if (!this.form.prenom.trim()) {
        this.signupError = this.t('auth.validationFirstName');
        return;
      }
      if (!this.form.email.trim() || !this.form.email.includes('@')) {
        this.signupError = this.t('auth.validationEmail');
        return;
      }
      if (this.form.password.length < 8) {
        this.signupError = this.t('auth.validationPassword');
        return;
      }
      if (this.passwordStrength === 'weak') {
        this.signupError = this.t('auth.validationPasswordWeak');
        return;
      }
      if (this.form.password !== this.form.confirm) {
        this.signupError = this.t('auth.validationPasswordsMismatch');
        return;
      }
      if (this.phoneLocal && !this.isPhoneValid) {
        this.signupError = this.phoneMessage || this.t('auth.validationPhone');
        return;
      }
      this.isLoading = true;
      this.signupError = '';

      const fullPhone = this.phoneLocal ? `${this.phoneDial}${this.phoneLocal}` : undefined;

      this.authService.register({
        nom: this.form.nom,
        prenom: this.form.prenom,
        email: this.form.email,
        motDePasse: this.form.password,
        dateNaissance: this.form.dateNaissance || undefined,
        telephone: fullPhone,
        pays: this.form.pays || 'Tunisie',
        languePreferee: (this.lang.currentLang || 'fr').toUpperCase()
      }).subscribe({
        next: (res) => {
          this.isLoading = false;

          // === DEBUG EMAIL VERIFICATION ===
          console.log('[Signup DEBUG] Full response from backend:', res);
          console.log('[Signup DEBUG] emailVerificationRequired value:', res.emailVerificationRequired);
          console.log('[Signup DEBUG] typeof:', typeof res.emailVerificationRequired);
          console.log('[Signup DEBUG] token:', res.token);
          console.log('[Signup DEBUG] newUser:', res.newUser);
          // === END DEBUG ===

          // Vérifier si la vérification d'email est requise
          if (res.emailVerificationRequired) {
            // Rediriger vers la page de vérification d'email.
            // L'email est passé via l'état du router (PAS dans l'URL) pour
            // ne pas l'exposer dans l'historique navigateur / logs / referer.
            this.close.emit();
            this.router.navigate(['/verify-email'], { state: { email: this.form.email } });
          } else if (res.token) {
            // Cas normal (ex: compte Google) - rediriger vers onboarding
            this.login.emit(res.utilisateur);
            this.close.emit();
            this.router.navigate(['/onboarding']);
          } else {
            // État anormal : pas de token ET pas de vérification email demandée
            // Forcer la vérification d'email par sécurité
            console.error('[Signup] Abnormal state - no token, no email verification. Forcing verify-email.', res);
            this.signupError = this.t('auth.errorsEmailRequired');
            this.close.emit();
            this.router.navigate(['/verify-email'], { state: { email: this.form.email } });
          }
        },
        error: (err) => {
          this.isLoading = false;
          if (err.error?.message) {
            this.signupError = err.error.message;
          } else if (err.error?.errors) {
            const firstKey = Object.keys(err.error.errors)[0];
            this.signupError = err.error.errors[firstKey];
          } else {
            this.signupError = this.t('auth.errorsSignup');
          }
        }
      });
    } else if (this.mode === 'forgot') {
      if (!this.form.email.trim()) {
        return;
      }
      this.isLoading = true;
      this.forgotMessage = '';

      this.authService.forgotPassword(this.form.email).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.forgotMessage = res.message || this.t('auth.forgotEmailSent');
        },
        error: () => {
          this.isLoading = false;
          this.forgotMessage = this.t('auth.forgotEmailSentFallback');
        }
      });
    } else if (this.mode === 'reset') {
      if (!this.resetToken) {
        this.resetError = this.t('auth.validationResetToken');
        return;
      }
      if (this.form.password.length < 8) {
        this.resetError = this.t('auth.validationMinPassword');
        return;
      }
      if (this.form.password !== this.form.confirm) {
        this.resetError = this.t('auth.validationPasswordsMismatch');
        return;
      }
      this.isLoading = true;
      this.resetError = '';
      this.resetMessage = '';

      this.authService.resetPassword(this.resetToken, this.form.password).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.resetMessage = res.message || this.t('auth.resetSuccess');
        },
        error: (err) => {
          this.isLoading = false;
          this.resetError = err.error?.message || this.t('auth.errorsReset');
        }
      });
    }
  }

  onPhoneDialChange(v: { code: string; dial: string }): void {
    this.phoneCode = v.code;
    this.phoneDial = v.dial;
  }

  onPhoneLocalChange(v: string): void {
    this.phoneLocal = v;
  }
}
