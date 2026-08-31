import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { PreferenceService } from '../../services/preference.service';

interface CategoryDisplay {
  key: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
  photo: string;
}

/** Mapping de l'enum backend vers les métadonnées d'affichage */
const CATEGORY_META: Record<string, Omit<CategoryDisplay, 'key'>> = {
  CULTUREL: {
    label: 'Culturel',
    icon: 'Compass',
    color: '#1B6FA8',
    desc: 'Médinas, ruines, musées',
    photo: 'https://images.unsplash.com/photo-1738873712992-60607f0df361?w=800&h=600&fit=crop&auto=format',
  },
  BALNEAIRE: {
    label: 'Balnéaire',
    icon: 'Waves',
    color: '#7EC8E3',
    desc: 'Plages, mer, stations',
    photo: 'https://images.unsplash.com/photo-1531386450450-969f935bd522?w=800&h=600&fit=crop&auto=format',
  },
  ECOLOGIQUE: {
    label: 'Écologique',
    icon: 'Leaf',
    color: '#6B8E4E',
    desc: 'Parcs, randonnées, nature',
    photo: 'https://images.unsplash.com/photo-1767895655140-8d341f24493f?w=800&h=600&fit=crop&auto=format',
  },
  GASTRONOMIQUE: {
    label: 'Gastronomique',
    icon: 'UtensilsCrossed',
    color: '#E0A458',
    desc: 'Cuisine locale, marchés',
    photo: 'https://images.unsplash.com/photo-1772580310425-63f2290c2ba7?w=800&h=600&fit=crop&auto=format',
  },
  AVENTURE: {
    label: 'Aventure',
    icon: 'Mountain',
    color: '#D97D45',
    desc: 'Désert, trekking, quad',
    photo: 'https://images.unsplash.com/photo-1568387380357-ba90334a6541?w=800&h=600&fit=crop&auto=format',
  },
  RELIGIEUX: {
    label: 'Religieux',
    icon: 'Moon',
    color: '#8B6FB5',
    desc: 'Mosquées, médersas, zaouïas',
    photo: 'https://images.unsplash.com/photo-1783989342155-604edc90e42c?w=800&h=600&fit=crop&auto=format',
  },
};

const ICON_SVGS: Record<string, string> = {
  Compass: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  Waves: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  Leaf: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 11-10 11Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  UtensilsCrossed: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
  Mountain: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
  Moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
})
export class OnboardingComponent implements OnInit {
  categories: CategoryDisplay[] = [];
  selected = new Set<string>();
  loading = true;
  error = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private preferenceService: PreferenceService,
    private sanitizer: DomSanitizer,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    // Pre-select existing preferences if any
    const existingPrefs = this.preferenceService.currentPreferences;

    this.http.get<string[]>('http://localhost:8082/api/categories').subscribe({
      next: (keys) => {
        this.categories = keys.map(key => {
          const meta = CATEGORY_META[key];
          if (meta) {
            if (existingPrefs.includes(meta.label) || existingPrefs.includes(key)) {
              this.selected.add(key);
            }
            return { key, ...meta };
          }
          return {
            key,
            label: key.charAt(0) + key.slice(1).toLowerCase(),
            icon: 'Compass',
            color: '#1B6FA8',
            desc: '',
            photo: 'https://images.unsplash.com/photo-1738873712992-60607f0df361?w=800&h=600&fit=crop&auto=format',
          };
        });
        this.loading = false;
      },
      error: () => {
        this.categories = Object.entries(CATEGORY_META).map(([key, meta]) => {
          if (existingPrefs.includes(meta.label) || existingPrefs.includes(key)) {
            this.selected.add(key);
          }
          return { key, ...meta };
        });
        this.loading = false;
        this.error = true;
      },
    });
  }

  toggle(key: string): void {
    if (this.selected.has(key)) this.selected.delete(key);
    else this.selected.add(key);
  }

  isSelected(key: string): boolean {
    return this.selected.has(key);
  }

  get canContinue(): boolean {
    return this.selected.size > 0;
  }

  get selectionCount(): number {
    return this.selected.size;
  }

  get selectionLabels(): string {
    return [...this.selected]
      .map(k => this.transloco.translate('onboarding.interests.' + (this.categoryLabelKey(k) ?? k)))
      .join(', ');
  }

  /** Returns the translated display label for a category key (CULTUREL -> "Cultural", etc.). */
  categoryLabel(key: string): string {
    const labelKey = this.categoryLabelKey(key) ?? (key.charAt(0) + key.slice(1).toLowerCase());
    return this.transloco.translate('onboarding.interests.' + labelKey);
  }

  /**
   * Returns the i18n key suffix for a category enum (CULTUREL -> "Culturel", BALNEAIRE -> "Balnéaire").
   * The previous reconstruction `key.charAt(0) + key.slice(1).toLowerCase()` dropped accented
   * characters, so BALNEAIRE became "Balneaire" and never matched the JSON key "Balnéaire".
   * We now read the label directly from CATEGORY_META (which preserves the `é`) and fall back to
   * a tolerant strip-accents variant for unknown backend keys.
   */
  private categoryLabelKey(key: string): string | null {
    const meta = (CATEGORY_META as Record<string, { label: string } | undefined>)[key];
    if (meta?.label) return meta.label;
    // Fallback: lower-case-first form, keep accents as-is in the source string.
    return key.charAt(0) + key.slice(1).toLowerCase();
  }

  getIcon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICON_SVGS[name] ?? '');
  }

  onContinue(): void {
    if (this.canContinue) {
      const selectedKeys = [...this.selected];
      const selectedLabels = selectedKeys.map(k => {
        const cat = this.categories.find(c => c.key === k);
        return cat?.label ?? k;
      });
      this.preferenceService.savePreferences(selectedLabels);
      this.authService.completeProfile({ preferences: selectedKeys as any }).subscribe({
        next: () => this.router.navigate(['/catalog']),
        error: () => this.router.navigate(['/catalog'])
      });
    }
  }

  onSkip(): void {
    this.router.navigate(['/']);
  }
}
