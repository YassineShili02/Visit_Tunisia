import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ItineraryService, SavedItinerary, ItineraryStep } from '../../services/itinerary.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-my-itineraries',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule],
  templateUrl: './my-itineraries.component.html',
})
export class MyItinerariesComponent implements OnInit {
  itineraries: SavedItinerary[] = [];
  isLoading = true;
  error: string | null = null;
  selectedItinerary: SavedItinerary | null = null;

  constructor(
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private router: Router,
    private transloco: TranslocoService,
    private languageService: LanguageService,
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadItineraries();
  }

  loadItineraries() {
    this.isLoading = true;
    this.error = null;
    this.itineraryService.getMyItineraries().subscribe({
      next: (data) => {
        this.itineraries = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement itinéraires:', err);
        this.error = this.transloco.translate('myItineraries.errorLoad');
        this.isLoading = false;
      }
    });
  }

  deleteItinerary(id: number, event?: Event) {
    if (event) event.stopPropagation();
    if (!confirm(this.transloco.translate('myItineraries.confirmDelete'))) return;

    this.itineraryService.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter(it => it.itineraireId !== id);
        if (this.selectedItinerary?.itineraireId === id) {
          this.selectedItinerary = null;
        }
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        alert(this.transloco.translate('myItineraries.errorDelete'));
      }
    });
  }

  openDetails(itinerary: SavedItinerary) {
    this.selectedItinerary = itinerary;
  }

  closeDetails() {
    this.selectedItinerary = null;
  }

  getTotalDestinations(itinerary: SavedItinerary): number {
    return itinerary.etapes?.length || 0;
  }

  getFirstDestinationPhoto(itinerary: SavedItinerary): string {
    if (itinerary.etapes && itinerary.etapes.length > 0) {
      for (const etape of itinerary.etapes) {
        const dest = etape.destination;
        if (!dest) continue;
        if (dest.photos && dest.photos.length > 0) {
          const photo = dest.photos[0];
          
          // Si c'est une string
          if (typeof photo === 'string' && photo.trim().length > 0) {
            // Si c'est une URL relative du backend, la compléter
            if (photo.startsWith('/api/uploads') || photo.startsWith('api/uploads')) {
              return `http://localhost:8082${photo.startsWith('/') ? '' : '/'}${photo}`;
            }
            // Si c'est déjà une URL complète
            if (photo.startsWith('http://') || photo.startsWith('https://')) {
              return photo;
            }
            // Si c'est un chemin relatif
            return `http://localhost:8082/api/uploads/${photo}`;
          }
          
          // Si c'est un objet
          if ((photo as any)?.url) {
            const url = (photo as any).url;
            if (url.startsWith('/api/uploads') || url.startsWith('api/uploads')) {
              return `http://localhost:8082${url.startsWith('/') ? '' : '/'}${url}`;
            }
            return url;
          }
        }
      }
    }
    return this.getFallbackPhoto(itinerary.titre);
  }

  getStepPhoto(step: ItineraryStep): string {
    const photos = step.destination?.photos;
    
    if (photos && photos.length > 0) {
      const p = photos[0];
      
      // Si c'est une string
      if (typeof p === 'string' && p.trim().length > 0) {
        // Si c'est une URL relative du backend, la compléter
        if (p.startsWith('/api/uploads') || p.startsWith('api/uploads')) {
          return `http://localhost:8082${p.startsWith('/') ? '' : '/'}${p}`;
        }
        // Si c'est déjà une URL complète, la retourner
        if (p.startsWith('http://') || p.startsWith('https://')) {
          return p;
        }
        // Si c'est un chemin relatif sans /api
        return `http://localhost:8082/api/uploads/${p}`;
      }
      
      // Si c'est un objet avec une propriété url
      if ((p as any)?.url) {
        const url = (p as any).url;
        if (url.startsWith('/api/uploads') || url.startsWith('api/uploads')) {
          return `http://localhost:8082${url.startsWith('/') ? '' : '/'}${url}`;
        }
        return url;
      }
    }
    
    // Fallback intelligent basé sur l'ID de la destination
    const destId = step.destination?.destinationId;
    if (destId) {
      // Utiliser l'API Unsplash avec une seed basée sur l'ID pour avoir toujours la même image
      const themes = ['tunisia', 'travel', 'architecture', 'beach', 'desert', 'mosque', 'food'];
      const theme = themes[destId % themes.length];
      return `https://source.unsplash.com/300x300/?${theme},tunisia&sig=${destId}`;
    }
    
    return 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=300';
  }

  getFallbackPhoto(titre?: string): string {
    const t = (titre || '').toLowerCase();
    if (t.includes('bizerte')) return 'https://images.unsplash.com/photo-1510525009512-ad7fc4b3de37?w=600&auto=format&fit=crop&q=80';
    if (t.includes('sousse')) return 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=600&auto=format&fit=crop&q=80';
    if (t.includes('djerba') || t.includes('medenine') || t.includes('médenine')) return 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&auto=format&fit=crop&q=80';
    if (t.includes('tozeur') || t.includes('kebili') || t.includes('k\u00e9bili') || t.includes('sahara')) return 'https://images.unsplash.com/photo-1502920514313-52581002a659?w=600&auto=format&fit=crop&q=80';
    if (t.includes('nabeul') || t.includes('hammamet')) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80';
  }

  getDestinationName(nom: any): string {
    if (typeof nom === 'string') return nom;
    if (typeof nom === 'object' && nom !== null) {
      const cur = this.languageService.currentLang;
      return nom[cur] || nom['fr'] || nom['en'] || nom['ar'] || Object.values(nom)[0] || this.transloco.translate('common.untitled');
    }
    return this.transloco.translate('common.untitled');
  }

  /**
   * Titre affiché d'un itinéraire :
   * - nouvelles sauvegardes (interets présent) -> reconstruit dans la langue active
   *   via itineraryResult.titleFormat {days, interests}
   * - anciennes sauvegardes -> titre nettoyé du suffixe « — Départ : … »
   */
  displayTitle(itinerary: SavedItinerary): string {
    if (itinerary.interets && itinerary.interets.length > 0) {
      const interests = itinerary.interets
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
        .map(k => this.transloco.translate(`onboarding.interests.${k}`) || k)
        .join(' & ');
      return this.transloco.translate('itineraryResult.titleFormat', {
        days: itinerary.dureeJours,
        interests,
      });
    }
    if (!itinerary.titre) return this.transloco.translate('common.untitled');
    // Ancienne version du code ajoutait « — Départ : Ville » en français à la sauvegarde
    return itinerary.titre.replace(/\s*[—–-]\s*[Dd]épart\s*:.*$/, '').trim();
  }

  getGroupedEtapes(itinerary: SavedItinerary): { jour: number; etapes: ItineraryStep[] }[] {
    if (!itinerary.etapes || itinerary.etapes.length === 0) return [];
    const map = new Map<number, ItineraryStep[]>();
    for (const etape of itinerary.etapes) {
      const jour = etape.jourNumero || 1;
      if (!map.has(jour)) {
        map.set(jour, []);
      }
      map.get(jour)!.push(etape);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([jour, etapes]) => ({
        jour,
        etapes: etapes.sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      }));
  }

  formatDuration(duration: string): string {
    if (!duration) return '—';
    // Marqueur neutre d'hébergement (nuitée) — traduit à l'affichage
    if (duration === 'NUIT') return this.transloco.translate('itineraryResult.overnightDuration');
    // Si c'est déjà au format ISO (PT2H30M)
    if (duration.startsWith('PT')) {
      const hours = duration.match(/(\d+)H/);
      const minutes = duration.match(/(\d+)M/);
      const h = hours ? parseInt(hours[1]) : 0;
      const m = minutes ? parseInt(minutes[1]) : 0;
      if (h > 0 && m > 0) return `${h}h${m}`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}${this.transloco.translate('common.minShort')}`;
      return '—';
    }
    // Si c'est un nombre (minutes)
    const num = parseInt(duration);
    if (!isNaN(num)) {
      const h = Math.floor(num / 60);
      const m = num % 60;
      if (h > 0 && m > 0) return `${h}h${m}`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}${this.transloco.translate('common.minShort')}`;
    }
    // Sinon retourner tel quel
    return duration;
  }

  getDayBudget(etapes: ItineraryStep[]): number {
    // Le budget n'est pas stocké dans les étapes sauvegardées
    // On doit le recalculer approximativement ou retourner "—"
    // Pour l'instant, retournons 0 pour indiquer "non disponible"
    return 0;
  }
}
