import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-mini-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  template: `
    <div class="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50"
         [style.height.px]="mapHeight">

      <!-- Search Bar -->
      <div class="absolute top-2.5 left-2.5 right-2.5 z-[1000]">
        <div class="relative">
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keydown.enter)="searchLocation()"
            placeholder="{{ 'common.mapSearchPlaceholder' | transloco }}"
            class="w-full pl-9 pr-20 py-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl text-xs text-gray-800 shadow-lg outline-none focus:ring-2 focus:ring-[#D97D45]/40 placeholder:text-gray-400"
          />
          <button
            (click)="searchLocation()"
            [disabled]="isSearching"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#D97D45] hover:bg-[#c26c37] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <span *ngIf="!isSearching">{{ 'common.mapSearchButton' | transloco }}</span>
            <span *ngIf="isSearching">...</span>
          </button>
        </div>
        <!-- Search Results Dropdown -->
        <div *ngIf="searchResults.length > 0" class="mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-40 overflow-y-auto">
          <button
            *ngFor="let r of searchResults"
            (click)="selectSearchResult(r)"
            class="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors cursor-pointer"
          >
            <span class="font-semibold text-gray-800">{{ r.name }}</span>
            <span class="text-gray-400 ml-1 text-[10px]">{{ r.type }}</span>
          </button>
        </div>
      </div>

      <!-- Layer Toggle -->
      <div class="absolute bottom-2.5 right-2.5 z-[1000] flex flex-col gap-1">
        <button
          (click)="setLayer('street')"
          class="px-2 py-1 text-[10px] font-bold rounded-lg border shadow-md transition-all cursor-pointer"
          [ngClass]="activeLayer === 'street' ? 'bg-[#D97D45] text-white border-[#D97D45]' : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'"
        >
          🗺️ {{ 'common.mapPlan' | transloco }}
        </button>
        <button
          (click)="setLayer('satellite')"
          class="px-2 py-1 text-[10px] font-bold rounded-lg border shadow-md transition-all cursor-pointer"
          [ngClass]="activeLayer === 'satellite' ? 'bg-[#D97D45] text-white border-[#D97D45]' : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'"
        >
          🛰️ Satellite
        </button>
      </div>

      <!-- Map Container -->
      <div #mapContainer class="w-full h-full"></div>

      <!-- No coordinates overlay -->
      <div *ngIf="!lat || !lng" class="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
        <span class="text-xs font-semibold bg-white/90 text-gray-700 px-3 py-1.5 rounded-full shadow-sm">
          {{ 'common.mapClickToPlace' | transloco }}
        </span>
      </div>

      <!-- Coordinates badge -->
      <div *ngIf="lat && lng" class="absolute bottom-2.5 left-2.5 z-[1000] bg-gray-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] font-mono shadow-md">
        📍 {{ lat | number:'1.4-4' }}, {{ lng | number:'1.4-4' }}
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      ::ng-deep .picker-marker-pin {
        background: transparent !important;
        border: none !important;
      }
    `,
  ],
})
export class MiniMapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() mapHeight: number = 300;

  @Output() locationChange = new EventEmitter<{ latitude: number; longitude: number }>();

  searchQuery = '';
  searchResults: { name: string; type: string; lat: number; lng: number }[] = [];
  isSearching = false;
  activeLayer: 'street' | 'satellite' = 'street';

  private map: any = null;
  private marker: any = null;
  private L: any = null;
  private streetLayer: any = null;
  private satelliteLayer: any = null;
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private transloco: TranslocoService,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      this.initMap();
    } catch (err) {
      console.error('[MiniMapPickerComponent] Leaflet load failed:', err);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser || !this.map || !this.L) return;

    if (changes['lat'] || changes['lng']) {
      this.updateMarkerPosition();
    }
  }

  private initMap(): void {
    if (!this.mapContainer || !this.L) return;

    const initialLat = this.lat ?? 36.8065;
    const initialLng = this.lng ?? 10.1815;
    const initialZoom = this.lat && this.lng ? 15 : 7;

    this.map = this.L.map(this.mapContainer.nativeElement, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
    });

    // Street layer (OpenStreetMap detailed)
    this.streetLayer = this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });

    // Satellite layer (ESRI World Imagery — free, high-res satellite)
    this.satelliteLayer = this.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: '© Esri',
      }
    );

    // Default: street
    this.streetLayer.addTo(this.map);

    // Map click → place marker
    this.map.on('click', (e: any) => {
      const newLat = parseFloat(e.latlng.lat.toFixed(6));
      const newLng = parseFloat(e.latlng.lng.toFixed(6));
      this.setMarker(newLat, newLng);
      this.locationChange.emit({ latitude: newLat, longitude: newLng });
    });

    if (this.lat != null && this.lng != null) {
      this.setMarker(this.lat, this.lng);
    }
  }

  setLayer(layer: 'street' | 'satellite'): void {
    if (!this.map) return;
    this.activeLayer = layer;

    if (layer === 'street') {
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    }
  }

  async searchLocation(): Promise<void> {
    if (!this.searchQuery.trim() || this.isSearching) return;
    this.isSearching = true;
    this.searchResults = [];

    try {
      const query = encodeURIComponent(this.searchQuery.trim());
      // Nominatim geocoding (free, no API key needed) — bounded to Tunisia
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&countrycodes=tn&accept-language=fr`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'VisitTunisia-AdminDashboard/1.0' },
      });
      const data = await response.json();

      this.searchResults = data.map((item: any) => ({
        name: item.display_name.split(',').slice(0, 3).join(', '),
        type: item.type?.replace(/_/g, ' ') || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    } catch (err) {
      console.error('[MiniMapPicker] Search failed:', err);
    } finally {
      this.isSearching = false;
    }
  }

  selectSearchResult(result: { name: string; lat: number; lng: number }): void {
    this.searchResults = [];
    this.searchQuery = result.name;
    this.setMarker(result.lat, result.lng);
    this.map.setView([result.lat, result.lng], 16);
    this.locationChange.emit({ latitude: result.lat, longitude: result.lng });
  }

  private updateMarkerPosition(): void {
    if (this.lat != null && this.lng != null) {
      this.setMarker(this.lat, this.lng);
      this.map.setView([this.lat, this.lng], Math.max(this.map.getZoom(), 13));
    } else if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  private setMarker(lat: number, lng: number): void {
    if (!this.map || !this.L) return;

    const customIcon = this.L.divIcon({
      className: 'picker-marker-pin',
      html: `
        <div style="width: 30px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <svg width="30" height="36" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 38 16 38C16 38 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="#D97D45" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="16" cy="15" r="5.5" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [30, 36],
      iconAnchor: [15, 36],
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = this.L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(this.map);

      // Drag to reposition
      this.marker.on('dragend', () => {
        const position = this.marker.getLatLng();
        const newLat = parseFloat(position.lat.toFixed(6));
        const newLng = parseFloat(position.lng.toFixed(6));
        this.locationChange.emit({ latitude: newLat, longitude: newLng });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
