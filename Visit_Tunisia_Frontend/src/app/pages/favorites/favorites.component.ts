import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { FavoriteService, FavoriteDestination } from '../../services/favorite.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './favorites.component.html',
})
export class FavoritesComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();

  favorites: FavoriteDestination[] = [];
  isLoading = true;
  removingId: number | null = null;

  constructor(
    private favoriteService: FavoriteService,
    private router: Router,
    private lang: LanguageService
  ) {}

  t(key: string, fallback?: string): string {
    return this.lang.translate(key, fallback);
  }

  tp(key: string, params: Record<string, unknown>, fallback?: string): string {
    return this.lang.translateParams(key, params, fallback);
  }

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.favoriteService.getFavorites().subscribe({
      next: (data) => {
        this.isLoading = false;
        this.favorites = data;
      },
      error: (err) => {
        console.error('[Favorites] Error loading favorites', err);
        this.isLoading = false;
      }
    });
  }

  removeFavorite(destId: number, event: Event): void {
    event.stopPropagation();
    this.removingId = destId;

    this.favoriteService.removeFavorite(destId).subscribe({
      next: () => {
        // Animate out then remove
        setTimeout(() => {
          this.favorites = this.favorites.filter(f => f.destinationId !== destId);
          this.removingId = null;
        }, 250);
      },
      error: (err) => {
        console.error('[Favorites] Error removing favorite', err);
        this.removingId = null;
        // Revert optimistic update in service
        this.favoriteService.revertAdd(destId);
      }
    });
  }

  onDestinationClick(destId: number): void {
    this.router.navigate(['/destinations', destId]);
  }

  goToCatalog(): void {
    this.router.navigate(['/catalog']);
  }

  getImageUrl(photoPath: string | null): string {
    if (!photoPath) {
      return 'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=700&h=500&fit=crop&auto=format';
    }
    if (photoPath.startsWith('http') || photoPath.startsWith('data:')) {
      return photoPath;
    }
    return 'http://localhost:8082' + photoPath;
  }

  getCategoryColor(categories: string[]): string {
    if (!categories || categories.length === 0) return '#1B6FA8';
    const map: Record<string, string> = {
      'CULTUREL':      '#9B7EBF',
      'BALNEAIRE':     '#5AA4D4',
      'ECOLOGIQUE':    '#5B9E72',
      'GASTRONOMIQUE': '#E88B6E',
      'AVENTURE':      '#E5A03C',
      'RELIGIEUX':     '#C98686',
    };
    return map[categories[0]] ?? '#1B6FA8';
  }

  getCategoryLabel(category: string): string {
    return this.lang.getCategoryLabel(category);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now  = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

    if (diffDays === 0) return this.t('favorites.addedToday');
    if (diffDays === 1) return this.t('favorites.addedYesterday');
    if (diffDays < 7)  return this.tp('favorites.addedDaysAgo', { n: diffDays });
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return this.tp('favorites.addedWeeksAgo', { n: weeks, s: weeks > 1 ? 's' : '' });
    }

    const formatted = date.toLocaleDateString(this.lang.currentLang, { day: 'numeric', month: 'short', year: 'numeric' });
    return this.tp('favorites.addedOn', { date: formatted });
  }

  /** Localized destination name (jsonb fallback handled by service). */
  localizedName(fav: FavoriteDestination): string {
    const n: any = (fav as any).nom;
    if (n && typeof n === 'object') {
      return this.lang.getLocalizedName(n, fav.destinationId ? String(fav.destinationId) : '');
    }
    if (typeof n === 'string') return n;
    return (fav as any).name || '';
  }

  /** Returns the saved count summary line. */
  savedCountLabel(): string {
    const n = this.favorites.length;
    if (n === 0) return this.t('favorites.savedNone');
    const plural = n > 1 ? 's' : '';
    return this.tp('favorites.savedCount', { n, s: plural });
  }
}
