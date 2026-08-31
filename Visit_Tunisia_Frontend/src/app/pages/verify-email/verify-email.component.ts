import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit, AfterViewInit {
  private transloco = inject(TranslocoService);
  private t = (key: string, fallback: string) => {
    const v = this.transloco.translate(key);
    return v && v !== key ? v : fallback;
  };

  email: string = '';
  code: string[] = ['', '', '', '', '', ''];

  /** Code collé en un seul bloc (synchronisé avec les 6 cases). */
  pastedCode: string = '';

  isLoading: boolean = false;
  isSending: boolean = false;
  isResending: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  resendCooldown: number = 0;
  /** Vrai quand le backend a déjà envoyé un code à l'arrivée sur la page. */
  codeSentOnInit: boolean = false;
  private resendInterval: any;

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  get isCodeComplete(): boolean {
    return this.code.every(digit => digit !== '');
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    // L'email n'est plus dans l'URL (fuite historique / referer / logs).
    // On le récupère depuis l'état du router, et en fallback on accepte
    // encore ?email=... pour ne pas casser les liens partagés existants,
    // mais on l'efface immédiatement de l'URL après lecture.
    const state = (history.state ?? {}) as { email?: string };
    const fromState = (state && typeof state.email === 'string') ? state.email : '';
    const fromQuery = this.route.snapshot.queryParams['email'] || '';

    this.email = fromState || fromQuery;

    if (!this.email) {
      this.router.navigate(['/register']);
      return;
    }

    // Si on a lu l'email depuis l'URL, on nettoie l'URL pour ne pas
    // laisser l'email exposé dans la barre d'adresse / l'historique.
    if (fromQuery && !fromState) {
      this.location.replaceState(this.router.url.split('?')[0]);
    }

    // Dès qu'on a l'email, on demande au backend d'envoyer un code frais.
    // Ça gère le cas : user bloqué → login → "Vérifier mon email" → page.
    this.sendInitialCode();
  }

  ngAfterViewInit(): void {
    // Focus le premier input après le rendu
    setTimeout(() => {
      const first = this.codeInputs?.first?.nativeElement;
      if (first) first.focus();
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  /** Appel à l'arrivée sur la page : déclenche l'envoi d'un code. */
  sendInitialCode(): void {
    this.isSending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendVerificationCode(this.email).subscribe({
      next: (res) => {
        this.isSending = false;
        this.codeSentOnInit = true;
        this.successMessage = res?.message || this.t('verifyEmail.codeSentSuccess', 'Un code vient d\'être envoyé à votre adresse email.');
        // Efface le message au bout de 6s
        setTimeout(() => {
          if (this.successMessage === res?.message) {
            this.successMessage = '';
          }
        }, 6000);
      },
      error: (err) => {
        this.isSending = false;
        this.codeSentOnInit = false;
        this.errorMessage = err?.error?.message || this.t('verifyEmail.sendCodeError', 'Impossible d\'envoyer le code pour le moment.');
      }
    });
  }

  onCodeInput(event: any, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Garder uniquement le dernier chiffre saisi
    if (value.length > 1) {
      input.value = value.slice(-1);
      this.code[index] = input.value;
    } else {
      this.code[index] = value;
    }

    // Auto-focus sur la case suivante
    if (value && index < 5) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    // Vérifier automatiquement si toutes les cases sont remplies
    if (this.isCodeComplete) {
      this.verifyEmail();
    }
  }

  /**
   * Quand l'utilisateur colle un code complet dans l'input "bloc unique",
   * on remplit les 6 cases et on lance la vérification.
   */
  onPasteBlock(event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const raw = input.value || '';
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    this.applyDigits(digits);
    if (this.isCodeComplete) {
      this.verifyEmail();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    this.applyDigits(pasted);
    if (this.isCodeComplete) {
      this.verifyEmail();
    }
  }

  private applyDigits(digits: string): void {
    // Réinitialiser toutes les cases
    for (let i = 0; i < 6; i++) {
      this.code[i] = digits[i] || '';
    }
    // Synchroniser les inputs DOM
    const inputs = this.codeInputs?.toArray() ?? [];
    inputs.forEach((ref, i) => {
      const el = ref.nativeElement;
      el.value = this.code[i];
    });
    // Focus la première case vide, ou la dernière si tout est rempli
    const firstEmpty = this.code.findIndex(c => c === '');
    const target = firstEmpty === -1 ? 5 : firstEmpty;
    inputs[target]?.nativeElement.focus();
    // Mettre à jour le bloc collé
    this.pastedCode = this.code.join('');
  }

  onPastedCodeInput(): void {
    // Quand l'utilisateur tape dans le bloc, on synchronise au fur et à mesure
    const digits = (this.pastedCode || '').replace(/\D/g, '').slice(0, 6);
    this.code = digits.split('').concat(Array(6).fill('')).slice(0, 6).map(c => c || '');
    // Re-render les inputs
    const inputs = this.codeInputs?.toArray() ?? [];
    inputs.forEach((ref, i) => {
      const el = ref.nativeElement;
      el.value = this.code[i];
    });
    if (this.isCodeComplete) {
      this.verifyEmail();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = input.previousElementSibling as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      const prevInput = input.previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  verifyEmail(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const fullCode = this.code.join('');
    if (fullCode.length !== 6) {
      this.errorMessage = this.t('verifyEmail.codeRequired', 'Veuillez saisir les 6 chiffres du code');
      return;
    }

    this.isLoading = true;

    this.authService.verifyEmail({ email: this.email, code: fullCode }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = this.t('verifyEmail.verifiedSuccess', 'Email vérifié avec succès ! Redirection vers vos préférences...');

        // Le token et l'utilisateur sont déjà persistés par AuthService.handleAuthSuccess()
        // (sous les clés vt_token / vt_user). Pas besoin de les re-stocker ici.
        // On s'assure juste que le BehaviorSubject est à jour si le service ne l'a pas fait.
        if (response.utilisateur) {
          this.authService.setUser(response.utilisateur);
        }

        // Après vérification, on passe par /onboarding pour choisir les préférences.
        // (Si l'utilisateur a déjà des préférences, OnboardingComponent le redirige
        // vers l'accueil — voir OnboardingComponent.canProceed / onSkip).
        setTimeout(() => {
          this.router.navigate(['/onboarding']);
        }, 1200);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || this.t('verifyEmail.codeInvalid', 'Code invalide ou expiré');
        this.code = ['', '', '', '', '', ''];
        this.pastedCode = '';
        const inputs = this.codeInputs?.toArray() ?? [];
        inputs.forEach(ref => ref.nativeElement.value = '');
        const first = inputs[0]?.nativeElement;
        if (first) first.focus();
      }
    });
  }

  resendCode(): void {
    if (this.resendCooldown > 0 || this.isResending) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isResending = true;

    this.authService.sendVerificationCode(this.email).subscribe({
      next: (response) => {
        this.isResending = false;
        this.successMessage = response?.message || this.t('verifyEmail.resendSuccess', 'Un nouveau code a été envoyé à votre adresse email');

        // Cooldown 30s
        this.resendCooldown = 30;
        this.resendInterval = setInterval(() => {
          this.resendCooldown--;
          if (this.resendCooldown <= 0) {
            clearInterval(this.resendInterval);
          }
        }, 1000);

        setTimeout(() => {
          if (this.successMessage === response?.message) {
            this.successMessage = '';
          }
        }, 6000);
      },
      error: (error) => {
        this.isResending = false;
        this.errorMessage = error?.error?.message || this.t('verifyEmail.resendError', 'Erreur lors de l\'envoi du code');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/register']);
  }
}
