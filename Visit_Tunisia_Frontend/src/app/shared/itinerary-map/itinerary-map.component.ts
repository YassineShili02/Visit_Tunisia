import {
  Component, Input, OnChanges, AfterViewInit, OnDestroy,
  SimpleChanges, ElementRef, ViewChild, Inject, PLATFORM_ID, Output, EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DAY_COLORS } from '../../data/constants';
import { ItineraryDay, ItineraryStop } from '../../services/itinerary.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-itinerary-map',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  template: `
    <div class="relative w-full h-full rounded-xl overflow-hidden bg-[#f2efe9]">
      <div #mapContainer class="w-full h-full"></div>

      <!-- Day badge top-left -->
      <div *ngIf="activeDayObj" class="absolute top-3 left-3 z-20 flex items-center gap-2
           bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-gray-100">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              [style.background]="activeColor"></span>
        <span class="text-xs font-bold text-gray-800">
          {{ 'itineraryResult.dayLabel' | transloco: { n: activeDayObj.dayNumber } }} · {{ regionLabel(activeDayObj.city) }}
        </span>
        <span class="text-xs text-gray-400 font-medium">{{ 'itineraryResult.stopsCount' | transloco: { n: activeDayObj.stops.length } }}</span>
      </div>

      <!-- Loading -->
      <div *ngIf="!isReady"
           class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f2efe9]">
        <div class="w-8 h-8 border-4 border-[#D97D45]/30 border-t-[#D97D45] rounded-full animate-spin"></div>
        <span class="text-xs font-semibold text-gray-500">{{ 'common.mapLoading' | transloco }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    ::ng-deep .itin-marker { background: transparent !important; border: none !important; }
    ::ng-deep .leaflet-control-attribution { display: none !important; }
    ::ng-deep .leaflet-bottom.leaflet-right { display: none !important; }
    ::ng-deep .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
    }
    ::ng-deep .leaflet-control-zoom a {
      border-radius: 6px !important;
      font-size: 16px !important;
      color: #374151 !important;
      border-color: #e5e7eb !important;
    }
    ::ng-deep .itin-popup .leaflet-popup-content-wrapper {
      border-radius: 14px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.16) !important;
      padding: 0 !important;
      border: 1px solid #f3f4f6 !important;
    }
    ::ng-deep .itin-popup .leaflet-popup-content { margin: 14px 16px !important; }
    ::ng-deep .itin-popup .leaflet-popup-tip-container { display: none !important; }
    ::ng-deep .itin-marker-highlighted > div { filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)) !important; transform: scale(1.25) !important; }
  `],
})
export class ItineraryMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() days: ItineraryDay[] = [];
  @Input() activeDay = 0;
  /** Index of the stop to highlight (-1 = none) */
  @Input() highlightedStop = -1;

  @Output() stopClick = new EventEmitter<number>(); // emits stop index

  isReady = false;
  private L: any = null;
  private map: any = null;
  private activeLayer: any = null;   // active day route + markers
  private ghostLayer: any = null;    // other days, grey ghost polylines
  private isBrowser: boolean;
  private dayColors = DAY_COLORS;

  // marker refs for highlight
  private stopMarkers: any[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private transloco: TranslocoService,
    private langService: LanguageService,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  get activeDayObj(): ItineraryDay | undefined { return this.days[this.activeDay]; }
  get activeColor(): string { return this.dayColors[this.activeDay % this.dayColors.length]; }

  /** Nom localisé du gouvernorat (via common.regions.*) */
  regionLabel(region?: string): string { return this.langService.getRegionLabel(region); }

  /** Libellé localisé d'une clé de catégorie d'étape */
  categoryLabel(cat?: string): string { return this.langService.getItineraryCategoryLabel(cat); }

  /** Formate une durée sur place depuis les minutes brutes ("2h30", "45 min") */
  formatVisitDuration(min?: number): string {
    if (!min || min <= 0) return this.transloco.translate('itineraryResult.notAvailable');
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
    if (h > 0) return `${h}h`;
    return `${m} ${this.transloco.translate('common.minShort')}`;
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const mod = await import('leaflet');
      this.L = mod.default || mod;
      this.initMap();
    } catch (err) { console.error('[ItineraryMap]', err); }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map || !this.L) return;
    if (changes['days'] || changes['activeDay']) {
      this.renderAll();
    } else if (changes['highlightedStop']) {
      this.applyHighlight();
    }
  }

  ngOnDestroy(): void { if (this.map) { this.map.remove(); this.map = null; } }

  // ─── Public method: called from parent to highlight a stop ─────
  highlightStop(stopIndex: number): void {
    this.highlightedStop = stopIndex;
    this.applyHighlight();
  }

  private initMap(): void {
    if (!this.mapContainer || !this.L) return;
    this.map = this.L.map(this.mapContainer.nativeElement, {
      center: [34.0, 9.5], zoom: 7,
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      dragging: true,
    });
    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd', attribution: '',
    }).addTo(this.map);
    this.isReady = true;
    this.renderAll();
  }

  private renderAll(): void {
    if (!this.map || !this.L) return;

    // Clear all layers
    this.stopMarkers = [];
    if (this.activeLayer) { this.activeLayer.clearLayers(); }
    else { this.activeLayer = this.L.layerGroup().addTo(this.map); }
    if (this.ghostLayer) { this.ghostLayer.clearLayers(); }
    else { this.ghostLayer = this.L.layerGroup().addTo(this.map); }

    // ── 1. Ghost lines for other days (very subtle, no markers) ──────
    this.days.forEach((day, dayIdx) => {
      if (dayIdx === this.activeDay) return;
      const pts: [number, number][] = day.stops
        .filter((s): s is ItineraryStop & { latitude: number; longitude: number } => 
          s.latitude !== undefined && s.longitude !== undefined)
        .map(s => [s.latitude, s.longitude]);
      if (pts.length > 1) {
        this.L.polyline(pts, {
          color: '#b0b0b0', weight: 1.5, opacity: 0.3,
          dashArray: '5 7', lineJoin: 'round',
        }).addTo(this.ghostLayer);
      }
    });

    // ── 2. Active day route ───────────────────────────────────────────
    const day = this.days[this.activeDay];
    if (!day) return;
    const color = this.activeColor;

    const activePts: [number, number][] = day.stops
      .filter((s): s is ItineraryStop & { latitude: number; longitude: number } => 
        s.latitude !== undefined && s.longitude !== undefined)
      .map(s => [s.latitude, s.longitude]);

    if (activePts.length > 1) {
      // Main polyline
      this.L.polyline(activePts, {
        color,
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(this.activeLayer);

      // Directional arrows along each segment
      for (let i = 0; i < activePts.length - 1; i++) {
        const p1 = activePts[i];
        const p2 = activePts[i + 1];
        // Place 2 arrows per segment if long enough, 1 if short
        const fractions = [0.35, 0.65];
        for (const f of fractions) {
          const mid: [number, number] = [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f];
          const angle = this.bearing(p1, p2);
          const arrowIcon = this.L.divIcon({
            className: 'itin-marker',
            html: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                        style="transform:rotate(${angle - 90}deg);display:block;">
                     <path d="M7 1L13 7L7 13M1 7H13" stroke="${color}" stroke-width="2.2"
                           stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          });
          this.L.marker(mid, { icon: arrowIcon, interactive: false, zIndexOffset: 200 })
            .addTo(this.activeLayer);
        }
      }
    }

    // ── 3. Numbered markers for active day stops ──────────────────────
    day.stops.forEach((stop, idx) => {
      if (!stop.latitude || !stop.longitude) return;
      const icon = this.L.divIcon({
        className: 'itin-marker',
        html: this.buildMarkerHtml(idx + 1, color, false, !!stop.isOvernight),
        iconSize: [38, 46], iconAnchor: [19, 46], popupAnchor: [0, -50],
      });
      const marker = this.L.marker([stop.latitude, stop.longitude], { icon, zIndexOffset: 600 })
        .bindPopup(this.buildPopupHtml(stop, color), { maxWidth: 250, className: 'itin-popup' })
        .addTo(this.activeLayer);

      marker.on('click', () => { this.stopClick.emit(idx); });
      this.stopMarkers.push(marker);
    });

    // ── 4. Fit bounds to ACTIVE DAY only ─────────────────────────────
    if (activePts.length > 0) {
      const bounds = this.L.latLngBounds(activePts);
      this.map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: activePts.length <= 2 ? 13 : activePts.length <= 3 ? 12 : 11,
        animate: true,
        duration: 0.5,
      });
    }

    this.applyHighlight();
  }

  // ─── Highlight a specific stop marker ──────────────────────────────
  private applyHighlight(): void {
    if (!this.L) return;
    const color = this.activeColor;
    this.stopMarkers.forEach((m, idx) => {
      const stop = this.days[this.activeDay]?.stops[idx];
      if (!stop) return;
      const isHighlighted = idx === this.highlightedStop;
      const icon = this.L.divIcon({
        className: 'itin-marker',
        html: this.buildMarkerHtml(idx + 1, color, isHighlighted, !!stop.isOvernight),
        iconSize: isHighlighted ? [46, 56] : [38, 46],
        iconAnchor: isHighlighted ? [23, 56] : [19, 46],
        popupAnchor: [0, -52],
      });
      m.setIcon(icon);
      m.setZIndexOffset(isHighlighted ? 1000 : 600);
      if (isHighlighted && stop.latitude && stop.longitude) {
        this.map.setView([stop.latitude, stop.longitude], Math.max(this.map.getZoom(), 12), { animate: true, duration: 0.4 });
        m.openPopup();
      }
    });
  }

  // ─── Bearing angle ────────────────────────────────────────────────
  private bearing(from: [number, number], to: [number, number]): number {
    const r = (d: number) => d * Math.PI / 180;
    const dL = r(to[1] - from[1]);
    const y = Math.sin(dL) * Math.cos(r(to[0]));
    const x = Math.cos(r(from[0])) * Math.sin(r(to[0])) - Math.sin(r(from[0])) * Math.cos(r(to[0])) * Math.cos(dL);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  // ─── Marker HTML (circle with number, white ring, drop shadow) ────
  private buildMarkerHtml(num: number, color: string, isHighlighted: boolean, isHotel: boolean): string {
    const sz = isHighlighted ? 44 : 36;
    const fontSize = isHighlighted ? '15' : '13';
    const shadow = isHighlighted
      ? `0 0 0 3px white, 0 0 0 5px ${color}55, 0 6px 18px rgba(0,0,0,0.32)`
      : `0 0 0 2.5px white, 0 4px 12px rgba(0,0,0,0.22)`;
    const inner = isHotel
      ? `<span style="font-size:${fontSize}px;line-height:1;">🏨</span>`
      : `<span style="font-size:${fontSize}px;font-weight:800;font-family:Inter,sans-serif;color:white;line-height:1;">${num}</span>`;
    return `
      <div style="
        width:${sz}px; height:${sz}px;
        border-radius:50%;
        background:${color};
        box-shadow:${shadow};
        display:flex; align-items:center; justify-content:center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        ${isHighlighted ? 'transform:scale(1.1);' : ''}
      ">${inner}</div>
      <div style="
        position:absolute; bottom:-7px; left:50%;
        transform:translateX(-50%);
        width:0; height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:8px solid ${color};
      "></div>`;
  }

  // ─── Popup HTML ────────────────────────────────────────────────────
  private buildPopupHtml(stop: ItineraryStop, color: string): string {
    const cost = stop.estimatedCost > 0
      ? `~${stop.estimatedCost} DT`
      : this.transloco.translate('itineraryResult.free');
    const duration = stop.isOvernight
      ? this.transloco.translate('itineraryResult.overnightDuration')
      : this.formatVisitDuration(stop.durationMin);
    let transitHtml = '';
    if (stop.transitMode) {
      const transitText = stop.transitMode === 'walk'
        ? this.transloco.translate('itineraryResult.transitWalk', { min: stop.transitMin, m: Math.round((stop.transitKm ?? 0) * 1000), km: stop.transitKm })
        : this.transloco.translate('itineraryResult.transitCar', { min: stop.transitMin, m: 0, km: stop.transitKm });
      transitHtml = `
        <div style="margin-top:8px;font-size:10px;color:#9ca3af;padding-top:6px;
                    border-top:1px solid #f3f4f6;">${transitText}</div>`;
    }
    return `
      <div style="font-family:Inter,sans-serif;min-width:180px;">
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;
                    letter-spacing:0.06em;margin-bottom:4px;">${stop.time} · ${this.categoryLabel(stop.category)}</div>
        <div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:6px;line-height:1.3;">
          ${stop.name}
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:11px;color:#6b7280;">
          <span style="font-weight:600;color:${color};">${cost}</span>
          <span>·</span>
          <span>⏱ ${duration}</span>
        </div>
        ${transitHtml}
      </div>`;
  }
}
