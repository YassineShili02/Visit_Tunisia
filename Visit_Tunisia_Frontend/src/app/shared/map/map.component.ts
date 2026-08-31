import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

export interface MapMarker {
  id?: number;
  latitude: number;
  longitude: number;
  label: string;
  category?: string;
  price?: number;
  img?: string;
  isUser?: boolean;
}

export interface GouvernoratFeature {
  type: string;
  properties: {
    CIRC_ID: number;
    NAME_EN: string;
    NAME_AR: string;
  };
  geometry: any;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  template: `
    <div class="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-[#FBF9F5]">
      <!-- Map Container with clip to hide overflow -->
      <div #mapContainer class="w-full h-full min-h-[350px] z-0" style="clip-path: inset(0);"></div>

      <!-- Tunisian Flag Decoration - Top Start -->
      <div class="absolute top-3 start-3 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-md border border-gray-200">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Tunisia.svg/60px-Flag_of_Tunisia.svg.png" 
             alt="Drapeau Tunisie" 
             width="36" 
             height="24"
             class="rounded-sm shadow-sm" />
        <span class="text-xs font-semibold text-gray-700">{{ 'common.countryTunisia' | transloco }}</span>
      </div>

      <!-- Loading Overlay / Spinner -->
      <div
        *ngIf="loading"
        class="absolute inset-0 bg-[#FBF9F5]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 transition-opacity"
      >
        <div class="w-10 h-10 border-4 border-[#D97D45]/30 border-t-[#D97D45] rounded-full animate-spin"></div>
        <span class="text-xs font-semibold text-gray-600">{{ 'common.mapLoading' | transloco }}</span>
      </div>

      <!-- REMOVED: "Aucun résultat sur la carte" badge (user requested removal) -->
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
      }
      ::ng-deep .custom-marker-pin,
      ::ng-deep .user-pulse-marker,
      ::ng-deep .custom-gouvernorat-pin {
        background: transparent !important;
        border: none !important;
      }
      ::ng-deep .custom-gouvernorat-pin {
        cursor: pointer !important;
      }
      ::ng-deep .custom-gouvernorat-pin:hover {
        transform: scale(1.1);
        transition: transform 0.2s ease;
      }
      ::ng-deep .custom-marker-pin {
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      ::ng-deep .custom-marker-pin:hover {
        transform: scale(1.25);
        z-index: 1000 !important;
      }
      ::ng-deep .user-pulse-ring {
        position: absolute;
        top: -6px;
        left: -6px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(27, 111, 168, 0.35);
        animation: userPulse 2s infinite ease-out;
      }
      @keyframes userPulse {
        0% { transform: scale(0.6); opacity: 1; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      ::ng-deep .gouvernorat-tooltip {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        padding: 4px 10px !important;
        font-family: Inter, sans-serif !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      }
      ::ng-deep .gouvernorat-tooltip::before {
        border-top-color: #e5e7eb !important;
      }
      /* Permanent tooltip for selected gouvernorat */
      ::ng-deep .gouvernorat-tooltip-permanent {
        background: rgba(217, 125, 69, 0.95) !important;
        border: 2px solid #D97D45 !important;
        border-radius: 8px !important;
        padding: 4px 10px !important;
        font-family: Inter, sans-serif !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        color: white !important;
        box-shadow: 0 4px 8px -1px rgba(217, 125, 69, 0.3) !important;
        pointer-events: none !important;
      }
      ::ng-deep .gouvernorat-tooltip-permanent::before {
        display: none !important; /* No arrow */
      }
      ::ng-deep .custom-cluster-icon {
        background: transparent !important;
        border: none !important;
      }
      ::ng-deep .marker-cluster {
        background: transparent !important;
      }
      ::ng-deep .marker-cluster div {
        background: transparent !important;
      }
      /* Hide Leaflet zoom box / selection box artifacts */
      ::ng-deep .leaflet-zoom-box {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      /* CRITICAL: Hide ANY rect elements in ALL Leaflet panes - aggressive approach */
      ::ng-deep .leaflet-overlay-pane svg rect,
      ::ng-deep .leaflet-map-pane svg rect,
      ::ng-deep .leaflet-pane svg rect,
      ::ng-deep .leaflet-overlay-pane rect,
      ::ng-deep .leaflet-map-pane rect,
      ::ng-deep .leaflet-pane rect {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        stroke: none !important;
        fill: none !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      /* ULTRA AGGRESSIVE: Target any rect with black stroke or fill */
      ::ng-deep svg rect[stroke="black"],
      ::ng-deep svg rect[stroke="#000"],
      ::ng-deep svg rect[stroke="#000000"],
      ::ng-deep svg rect[fill="none"][stroke],
      ::ng-deep rect[stroke="black"],
      ::ng-deep rect[stroke="#000"],
      ::ng-deep rect[stroke="#000000"],
      ::ng-deep rect[fill="none"][stroke] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      /* Also target any rect with common bound-like attributes */
      ::ng-deep svg rect[fill="none"],
      ::ng-deep svg rect[stroke],
      ::ng-deep svg rect[stroke-width] {
        display: none !important;
      }
      /* Nuclear option: hide all rects in the map container */
      ::ng-deep #mapContainer rect {
        display: none !important;
      }
      /* CORRECTIF: Supprimer l'outline de focus par défaut (rectangle noir) */
      ::ng-deep .leaflet-interactive:focus,
      ::ng-deep .custom-gouvernorat-pin:focus {
        outline: none;
      }
      /* ACCESSIBILITÉ: Style de focus alternatif pour navigation clavier */
      ::ng-deep .leaflet-interactive:focus-visible {
        outline: none;
        filter: drop-shadow(0 0 4px rgba(217, 125, 69, 0.9));
      }
      ::ng-deep .custom-gouvernorat-pin:focus-visible {
        outline: none;
        filter: drop-shadow(0 0 3px rgba(217, 125, 69, 1));
        transform: scale(1.2);
        transition: transform 0.2s ease;
      }
      /* CRITICAL: Hide Leaflet attribution */
      ::ng-deep .leaflet-control-attribution {
        display: none !important;
      }
      ::ng-deep .leaflet-bottom.leaflet-right {
        display: none !important;
      }
      /* CRITICAL: Mask everything outside Tunisia bounds */
      ::ng-deep .leaflet-tile-pane {
        clip-path: polygon(
          /* Tunisia approximate border shape */
          7.52% 30.23%, 11.60% 30.23%, 11.60% 37.54%, 7.52% 37.54%
        );
      }
      /* Alternative: Add a white/transparent overlay that covers non-Tunisia areas */
      .map-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1000;
      }
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() markers: MapMarker[] = [];
  @Input() hoveredMarkerId: number | null = null;
  @Input() userPosition: { latitude: number; longitude: number } | null = null;
  @Input() center: [number, number] = [34.0, 9.5];
  @Input() zoom = 7;
  @Input() loading = false;
  @Input() selectedGouvernorat: string | null = null; // Frontend gouvernorat name

  @Output() markerClick = new EventEmitter<number>();
  @Output() gouvernoratClick = new EventEmitter<string>(); // Emits frontend gouvernorat name

  isMapReady = false;
  private L: any = null;
  private map: any = null;
  private markerLayerGroup: any = null;
  private markerClusterGroup: any = null; // MarkerCluster group for destinations
  private gouvernoratLayer: any = null; // GeoJSON layer for gouvernorats
  private markerMap = new Map<number, { leafletMarker: any; markerData: MapMarker }>();
  private userMarker: any = null;
  private isBrowser: boolean;
  private gouvernoratGeoJson: any = null; // Cache for GeoJSON data
  private boundsRectangleObserver: MutationObserver | null = null; // Aggressive rectangle watcher
  private cleanupInterval: any = null; // Continuous cleanup interval

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Import markercluster plugin
      await import('leaflet.markercluster');
      
      this.initMap();
    } catch (err) {
      console.error('[MapComponent] Leaflet import failed:', err);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser || !this.map || !this.L) return;

    if (changes['markers'] || changes['userPosition']) {
      this.renderMarkersAndFitBounds();
    }

    if (changes['hoveredMarkerId']) {
      this.highlightHoveredMarker();
    }

    if (changes['selectedGouvernorat']) {
      this.updateGouvernoratStyles();
    }
  }

  private async initMap(): Promise<void> {
    if (!this.mapContainer || !this.L) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Tunisia geographic bounds (EXACT - only Tunisia territory)
    const tunisiaBounds = this.L.latLngBounds(
      this.L.latLng(30.23, 7.52),  // Southwest corner (Borj el Khadra)
      this.L.latLng(37.54, 11.60)  // Northeast corner (Cap Bon)
    );

    this.map = this.L.map(this.mapContainer.nativeElement, {
      center: [33.9, 9.5],
      zoom: 6.6, // Zoom 6.8 - slightly tighter
      zoomControl: false, // REMOVED: Hide zoom buttons (+/-)
      scrollWheelZoom: false, // DISABLED: No zoom with mouse wheel
      boxZoom: false, // Disable box zoom to prevent rectangle artifacts
      doubleClickZoom: false, // DISABLED: No zoom on double click
      touchZoom: false, // DISABLED: No zoom with touch gestures
      dragging: false, // DISABLED: No panning - stay centered on Tunisia
      // CRITICAL: Restrict map to Tunisia bounds ONLY
      maxBounds: tunisiaBounds,
      maxBoundsViscosity: 1.0, // Makes the bounds completely solid
      minZoom: 6.6, // Fixed at 6.8
      maxZoom: 6.6,
    });

    // CartoDB Positron Tile Layer (minimalist, clean light style)
    const tileLayer = this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '', // REMOVED: Hide attribution text (user requested)
    });
    tileLayer.addTo(this.map);

    // CRITICAL: Fit to Tunisia bounds exactly (fills the view with Tunisia only)
    // Reuse the bounds defined above
    this.map.fitBounds(tunisiaBounds, {
      padding: [0, 0], // No padding for zoom 6.8
      animate: false,
      maxZoom: 6.8, // Match the fixed zoom level
    });

    // CRITICAL: Add event listener to clean up bounds rectangles after any map interaction
    this.map.on('moveend zoomend layeradd', () => {
      setTimeout(() => this.removeBoundsRectangles(), 0);
    });

    // Load and add gouvernorat GeoJSON layer (isolated try/catch)
    try {
      await this.loadGouvernoratLayer();
    } catch (error) {
      console.error('[MapComponent] Gouvernorat layer failed to load, but map will continue to work:', error);
      // Continue initialization - gouvernorat layer is optional
    }

    // Initialize marker cluster group for destinations
    this.initMarkerClusterGroup();

    // DISABLED: MutationObserver was too aggressive and broke gouvernorat interactivity
    // We'll rely on CSS + manual cleanup instead
    // this.setupBoundsRectangleWatcher();

    this.isMapReady = true;
    this.renderMarkersAndFitBounds();
    
    // Note: Cleanup interval n'est plus nécessaire maintenant que l'outline est fixé en CSS
    // mais on le garde au cas où pour sécurité
    if (this.isBrowser) {
      this.cleanupInterval = setInterval(() => {
        this.removeBoundsRectangles();
      }, 100); // Réduit à 100ms maintenant que le problème principal est résolu
      console.log('[MapComponent] Started cleanup interval (backup, main issue fixed via CSS)');
    }
  }

  /**
   * Setup a MutationObserver that watches for and removes bounds rectangles in real-time
   * SELECTIVE: Only removes rects that look like bounds (not marker icons)
   */
  private setupBoundsRectangleWatcher(): void {
    if (!this.isBrowser || !this.mapContainer) return;

    // Clean up existing observer if any
    if (this.boundsRectangleObserver) {
      this.boundsRectangleObserver.disconnect();
    }

    this.boundsRectangleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check for added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // CRITICAL: Only target rects in overlay pane (not marker pane)
            const isInOverlayPane = element.closest('.leaflet-overlay-pane');
            if (!isInOverlayPane) return; // Skip if not in overlay pane
            
            // If it's a rect element itself in overlay pane, remove it
            if (element.tagName === 'rect') {
              const fill = element.getAttribute('fill');
              const stroke = element.getAttribute('stroke');
              // Only remove if it looks like a bounds rect (has stroke or fill="none")
              if (stroke || fill === 'none') {
                console.log('[MapComponent] MutationObserver: Detected bounds rect, removing...');
                element.remove();
              }
            }
            
            // Check children for bounds rects (only in overlay pane)
            if (element.tagName === 'svg' || element.classList.contains('leaflet-overlay-pane')) {
              const rects = element.querySelectorAll('rect');
              rects.forEach(rect => {
                const fill = rect.getAttribute('fill');
                const stroke = rect.getAttribute('stroke');
                // Only remove if it looks like a bounds rect
                if (stroke || fill === 'none') {
                  console.log('[MapComponent] MutationObserver: Detected bounds rect in children, removing...');
                  rect.remove();
                }
              });
            }
          }
        });
      });
    });

    // Watch the map container for any DOM changes
    this.boundsRectangleObserver.observe(this.mapContainer.nativeElement, {
      childList: true,
      subtree: true,
    });

    console.log('[MapComponent] MutationObserver for bounds rectangles is now active (selective mode)');
  }

  /**
   * Initialize marker cluster group with custom styling
   */
  private initMarkerClusterGroup(): void {
    if (!this.L || !this.map) return;

    this.markerClusterGroup = this.L.markerClusterGroup({
      maxClusterRadius: 55, // Cluster only very close markers
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        
        // Custom cluster icon with orange color (matching design system)
        return this.L.divIcon({
          html: `
            <div style="
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #D97D45;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 10px rgba(217, 125, 69, 0.4);
              font-family: Inter, sans-serif;
              font-size: 14px;
              font-weight: 700;
              color: white;
            ">
              ${count}
            </div>
          `,
          className: 'custom-cluster-icon',
          iconSize: this.L.point(40, 40),
        });
      },
    });

    this.markerClusterGroup.addTo(this.map);
  }

  private renderMarkersAndFitBounds(): void {
    if (!this.map || !this.L || !this.markerClusterGroup) return;

    console.log('[MapComponent] renderMarkersAndFitBounds called - Creating one pin per gouvernorat');

    // Clear existing markers from cluster group
    this.markerClusterGroup.clearLayers();
    this.markerMap.clear();
    
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }

    // CRITICAL: Create ONE pin per gouvernorat using FIXED center coordinates (adjusted for better centering)
    const gouvernoratCenters: Record<string, { lat: number; lng: number }> = {
      'Ariana': { lat: 36.92, lng: 10.15 },
      'Beja': { lat: 36.72, lng: 9.18 },
      'Ben Arous': { lat: 36.63, lng: 10.28 },
      'Bizerte': { lat: 37.15, lng: 9.65 },
      'Gabes': { lat: 33.95, lng: 9.85 },
      'Gafsa': { lat: 34.35, lng: 8.70 },
      'Jendouba': { lat: 36.48, lng: 8.65 },
      'Kairouan': { lat: 35.60, lng: 10.00 },
      'Kasserine': { lat: 35.10, lng: 8.75 },
      'Kebili': { lat: 33.50, lng: 8.85 },
      'Le Kef': { lat: 36.10, lng: 8.65 },
      'Mahdia': { lat: 35.35, lng: 10.95 },
      'Manouba': { lat: 36.80, lng: 9.88 },
      'Medenine': { lat: 33.25, lng: 10.40 },
      'Monastir': { lat: 35.70, lng: 10.78 },
      'Nabeul': { lat: 36.50, lng: 10.70 },
      'Sfax': { lat: 34.68, lng: 10.55 },
      'Sidi Bouzid': { lat: 34.98, lng: 9.40 },
      'Siliana': { lat: 36.00, lng: 9.30 },
      'Sousse': { lat: 35.80, lng: 10.55 },
      'Tataouine': { lat: 32.30, lng: 10.10 },
      'Tozeur': { lat: 33.85, lng: 8.10 },
      'Tunis': { lat: 36.77, lng: 10.18 },
      'Zaghouan': { lat: 36.35, lng: 10.15 },
    };

    const mapping: Record<string, string> = {
      'Ariana': 'Ariana',
      'Beja': 'Béja',
      'Ben Arous': 'Ben Arous',
      'Bizerte': 'Bizerte',
      'Gabes': 'Gabès',
      'Gafsa': 'Gafsa',
      'Jendouba': 'Jendouba',
      'Kairouan': 'Kairouan',
      'Kasserine': 'Kasserine',
      'Kebili': 'Kébili',
      'Le Kef': 'Le Kef',
      'Mahdia': 'Mahdia',
      'Manouba': 'La Manouba',
      'Medenine': 'Médenine',
      'Monastir': 'Monastir',
      'Nabeul': 'Nabeul',
      'Sfax': 'Sfax',
      'Sidi Bouzid': 'Sidi Bouzid',
      'Siliana': 'Siliana',
      'Sousse': 'Sousse',
      'Tataouine': 'Tataouine',
      'Tozeur': 'Tozeur',
      'Tunis': 'Tunis',
      'Zaghouan': 'Zaghouan',
    };

    // Create one pin per gouvernorat
    Object.entries(gouvernoratCenters).forEach(([geojsonName, coords]) => {
      
      // Determine pin size based on gouvernorat area
      // Larger pins for big areas in the south, smaller for dense northern areas
      const largeAreaGouvernorats = ['Tataouine', 'Kebili', 'Tozeur', 'Gafsa', 'Kasserine', 'Medenine', 'Gabes'];
      const isLargeArea = largeAreaGouvernorats.includes(geojsonName);
      
      const pinWidth = isLargeArea ? 16 : 8;
      const pinHeight = isLargeArea ? 20 : 12;
      
      // Create pin icon with appropriate size
      const icon = this.L.divIcon({
        className: 'custom-gouvernorat-pin',
        html: `
          <div style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 38 16 38C16 38 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="#D97D45" stroke="#ffffff" stroke-width="2"/>
              <circle cx="16" cy="15" r="5" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [pinWidth, pinHeight],
        iconAnchor: [pinWidth / 2, pinHeight],
        popupAnchor: [0, -pinHeight],
      });

      const leafletMarker = this.L.marker([coords.lat, coords.lng], {
        icon: icon,
        zIndexOffset: 500, // High z-index to appear above gouvernorat layer
      });
      
      const frontendName = mapping[geojsonName] || geojsonName;

      // Click event - select this gouvernorat
      leafletMarker.on('click', () => {
        console.log('[MapComponent] Pin clicked:', frontendName);
        this.gouvernoratClick.emit(frontendName);
      });

      // Add to map directly (no clustering)
      leafletMarker.addTo(this.map);
    });

    console.log('[MapComponent] Created 24 pins with fixed coordinates');

    // Clean up any bounds rectangles after rendering
    this.removeBoundsRectangles();
  }

  private createMarkerIcon(m: MapMarker, isHovered: boolean): any {
    const color = isHovered ? '#1B6FA8' : '#D97D45';
    const scale = isHovered ? 'scale(1.25)' : 'scale(1)';
    const stroke = '#ffffff';
    const strokeWidth = isHovered ? '3' : '2';

    return this.L.divIcon({
      className: 'custom-marker-pin',
      html: `
        <div style="transform: ${scale}; transition: transform 0.2s ease; position: relative; width: 32px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 38 16 38C16 38 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
            <circle cx="16" cy="15" r="6" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38],
      popupAnchor: [0, -36],
    });
  }

  private highlightHoveredMarker(): void {
    if (!this.L || !this.markerClusterGroup) return;

    this.markerMap.forEach((item, id) => {
      const isHovered = id === this.hoveredMarkerId;
      const newIcon = this.createMarkerIcon(item.markerData, isHovered);
      item.leafletMarker.setIcon(newIcon);
      item.leafletMarker.setZIndexOffset(isHovered ? 1000 : 100);

      if (isHovered) {
        item.leafletMarker.openPopup();
      }
    });
    
    // Refresh cluster display to update marker icons
    if (this.markerClusterGroup) {
      this.markerClusterGroup.refreshClusters();
    }
  }

  ngOnDestroy(): void {
    // Clean up continuous cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clean up MutationObserver
    if (this.boundsRectangleObserver) {
      this.boundsRectangleObserver.disconnect();
      this.boundsRectangleObserver = null;
      console.log('[MapComponent] MutationObserver disconnected');
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Load gouvernorat GeoJSON layer from assets
   */
  private async loadGouvernoratLayer(): Promise<void> {
    if (!this.map || !this.L) return;

    // CRITICAL FIX: Remove existing layer first to prevent duplication
    if (this.gouvernoratLayer) {
      console.log('[MapComponent] Removing existing gouvernorat layer before reload');
      this.map.removeLayer(this.gouvernoratLayer);
      this.gouvernoratLayer = null;
    }

    try {
      // Correct path: no leading slash for Angular assets
      const response = await fetch('assets/geo/tunisia-gouvernorats.geojson');
      
      // Check if fetch was successful
      if (!response.ok) {
        throw new Error(
          `Failed to load gouvernorat GeoJSON file at assets/geo/tunisia-gouvernorats.geojson: ` +
          `HTTP ${response.status} ${response.statusText}`
        );
      }

      this.gouvernoratGeoJson = await response.json();

      // Import mapping
      const { GEOJSON_TO_FRONTEND_GOUVERNORAT } = await import('../../data/gouvernorat-mapping');

      this.gouvernoratLayer = this.L.geoJSON(this.gouvernoratGeoJson, {
        style: (feature: GouvernoratFeature) => this.getGouvernoratStyle(feature, false),
        interactive: true,
        bubblingMouseEvents: false,
        // CRITICAL: Disable pane to prevent SVG rect artifacts
        pane: 'overlayPane',
        // CRITICAL: Override coordsToLatLng to prevent bounds calculation
        coordsToLatLng: (coords: any) => {
          return this.L.latLng(coords[1], coords[0], coords[2]);
        },
        onEachFeature: (feature: GouvernoratFeature, layer: any) => {
          const geojsonName = feature.properties.NAME_EN;
          const frontendName = GEOJSON_TO_FRONTEND_GOUVERNORAT[geojsonName] || geojsonName;

          // CRITICAL FIX: Completely disable getBounds method
          layer.getBounds = function() {
            // Return a fake bounds that won't render
            return null;
          };
          
          // CRITICAL FIX: Override _updatePath to prevent bounds rectangle rendering
          if (layer._updatePath) {
            const originalUpdatePath = layer._updatePath.bind(layer);
            layer._updatePath = function() {
              // Delete _bounds before rendering to prevent rectangle
              if (this._bounds) {
                delete this._bounds;
              }
              originalUpdatePath();
            };
          }

          // CRITICAL FIX: Override bringToFront to prevent bounds rectangle
          if (layer.bringToFront) {
            const originalBringToFront = layer.bringToFront.bind(layer);
            layer.bringToFront = function() {
              if (this._bounds) {
                delete this._bounds;
              }
              return originalBringToFront();
            };
          }

          // Hover effects
          layer.on({
            mouseover: (e: any) => {
              const targetLayer = e.target;
              targetLayer.setStyle({
                fillOpacity: 0.9,
                weight: 2,
              });
              // Prevent bounds rectangle on hover
              if (targetLayer._bounds) {
                delete targetLayer._bounds;
              }
            },
            mouseout: (e: any) => {
              this.gouvernoratLayer.resetStyle(e.target);
              // Prevent bounds rectangle on reset
              if (e.target._bounds) {
                delete e.target._bounds;
              }
            },
            click: () => {
              this.onGouvernoratClick(frontendName);
            },
          });

          // Tooltip on hover showing gouvernorat name
          layer.bindTooltip(frontendName, {
            permanent: false,
            direction: 'center',
            className: 'gouvernorat-tooltip',
            opacity: 0.95,
          });
        },
      }).addTo(this.map);

      // Send layer to back so markers appear on top
      this.gouvernoratLayer.bringToBack();
      
      console.log('[MapComponent] Gouvernorat layer loaded successfully with', this.gouvernoratGeoJson.features.length, 'features');
    } catch (error) {
      console.error('[MapComponent] Error loading gouvernorat GeoJSON layer:', error);
      // Re-throw to be caught by initMap's try/catch
      throw error;
    }
  }

  /**
   * Get style for a gouvernorat feature
   */
  private getGouvernoratStyle(feature: GouvernoratFeature, isHovered: boolean): any {
    const geojsonName = feature.properties.NAME_EN;
    
    // Use a simple fallback mapping embedded here to avoid async issues
    const mapping: Record<string, string> = {
      'Ariana': 'Ariana',
      'Beja': 'Béja',
      'Ben Arous': 'Ben Arous',
      'Bizerte': 'Bizerte',
      'Gabes': 'Gabès',
      'Gafsa': 'Gafsa',
      'Jendouba': 'Jendouba',
      'Kairouan': 'Kairouan',
      'Kasserine': 'Kasserine',
      'Kebili': 'Kébili',
      'Le Kef': 'Le Kef',
      'Mahdia': 'Mahdia',
      'Manouba': 'La Manouba',
      'Medenine': 'Médenine',
      'Monastir': 'Monastir',
      'Nabeul': 'Nabeul',
      'Sfax': 'Sfax',
      'Sidi Bouzid': 'Sidi Bouzid',
      'Siliana': 'Siliana',
      'Sousse': 'Sousse',
      'Tataouine': 'Tataouine',
      'Tozeur': 'Tozeur',
      'Tunis': 'Tunis',
      'Zaghouan': 'Zaghouan',
    };
    
    // Colorful palette for each gouvernorat (darker, richer colors)
    const gouvernoratColors: Record<string, string> = {
      'Ariana': '#4A90A4',      // Deep teal
      'Beja': '#5CAD5C',        // Forest green
      'Ben Arous': '#E8983D',   // Golden orange
      'Bizerte': '#3B8EA5',     // Ocean blue
      'Gabes': '#D96AA6',       // Magenta pink
      'Gafsa': '#C9945F',       // Terracotta
      'Jendouba': '#6FAF6F',    // Grass green
      'Kairouan': '#9B7EBF',    // Purple
      'Kasserine': '#D4A76A',   // Mustard
      'Kebili': '#E89B5F',      // Burnt orange
      'Le Kef': '#7DB97D',      // Sage
      'Mahdia': '#6B9FD4',      // Steel blue
      'Manouba': '#F0C14B',     // Amber
      'Medenine': '#D97B9E',    // Rose
      'Monastir': '#4DBFAF',    // Turquoise
      'Nabeul': '#6BA3D4',      // Cerulean
      'Sfax': '#CD9B6B',        // Caramel
      'Sidi Bouzid': '#A8C96E', // Olive green
      'Siliana': '#5BC9A0',     // Emerald
      'Sousse': '#C77EB5',      // Orchid
      'Tataouine': '#E88B6E',   // Coral
      'Tozeur': '#D9A66A',      // Sandy brown
      'Tunis': '#5AA4D4',       // Azure
      'Zaghouan': '#A487C9',    // Lavender
    };
    
    const frontendName = mapping[geojsonName] || geojsonName;
    const isSelected = this.selectedGouvernorat === frontendName;
    
    // Get color for this gouvernorat
    const baseColor = gouvernoratColors[geojsonName] || '#A8D5E2';

    if (isSelected) {
      return {
        fillColor: '#D97D45', // Orange accent color for selected
        weight: 2,
        opacity: 1,
        color: '#D97D45',
        fillOpacity: 0.5,
      };
    }

    return {
      fillColor: baseColor,
      weight: 1.5,
      opacity: 0.8,
      color: '#FFFFFF', // White borders between gouvernorats
      fillOpacity: isHovered ? 0.9 : 0.7,
    };
  }

  /**
   * Handle gouvernorat click
   */
  private onGouvernoratClick(frontendName: string): void {
    console.log('[MapComponent] Gouvernorat clicked:', frontendName, 'Current selection:', this.selectedGouvernorat);
    
    // Toggle selection: if same gouvernorat is clicked, deselect
    if (this.selectedGouvernorat === frontendName) {
      this.gouvernoratClick.emit(''); // Empty string to deselect
    } else {
      this.gouvernoratClick.emit(frontendName);
    }
  }

  /**
   * Update gouvernorat layer styles based on selection
   */
  private updateGouvernoratStyles(): void {
    if (!this.gouvernoratLayer || !this.L) return;

    console.log('[MapComponent] Updating gouvernorat styles, selected:', this.selectedGouvernorat);

    // CRITICAL: Remove bounds rectangles BEFORE updating styles
    this.removeBoundsRectangles();

    // CRITICAL: Force reset ALL layers to default style first
    this.gouvernoratLayer.eachLayer((layer: any) => {
      // Delete bounds BEFORE reset
      if (layer._bounds) {
        console.log('[MapComponent] Deleting bounds before resetStyle for layer:', layer.feature?.properties?.NAME_EN);
        delete layer._bounds;
      }
      
      this.gouvernoratLayer.resetStyle(layer);
      
      // Delete bounds AFTER reset too
      if (layer._bounds) {
        console.log('[MapComponent] WARNING: Bounds recreated after resetStyle for:', layer.feature?.properties?.NAME_EN);
        delete layer._bounds;
      }
      
      // Remove only PERMANENT tooltips, keep hover tooltips
      const tooltip = layer.getTooltip();
      if (tooltip && tooltip.options.permanent) {
        layer.unbindTooltip();
      }
    });

    // Then apply new styles and tooltip based on selection
    this.gouvernoratLayer.eachLayer((layer: any) => {
      // CRITICAL: Delete bounds before applying new style
      if (layer._bounds) {
        delete layer._bounds;
      }
      
      const feature = layer.feature as GouvernoratFeature;
      const geojsonName = feature.properties.NAME_EN;
      
      // Get frontend name from mapping
      const mapping: Record<string, string> = {
        'Ariana': 'Ariana',
        'Beja': 'Béja',
        'Ben Arous': 'Ben Arous',
        'Bizerte': 'Bizerte',
        'Gabes': 'Gabès',
        'Gafsa': 'Gafsa',
        'Jendouba': 'Jendouba',
        'Kairouan': 'Kairouan',
        'Kasserine': 'Kasserine',
        'Kebili': 'Kébili',
        'Le Kef': 'Le Kef',
        'Mahdia': 'Mahdia',
        'Manouba': 'La Manouba',
        'Medenine': 'Médenine',
        'Monastir': 'Monastir',
        'Nabeul': 'Nabeul',
        'Sfax': 'Sfax',
        'Sidi Bouzid': 'Sidi Bouzid',
        'Siliana': 'Siliana',
        'Sousse': 'Sousse',
        'Tataouine': 'Tataouine',
        'Tozeur': 'Tozeur',
        'Tunis': 'Tunis',
        'Zaghouan': 'Zaghouan',
      };
      
      const frontendName = mapping[geojsonName] || geojsonName;
      const isSelected = this.selectedGouvernorat === frontendName;
      
      const newStyle = this.getGouvernoratStyle(feature, false);
      
      console.log('[MapComponent] Applying style to', geojsonName, ':', newStyle.fillColor === '#D97D45' ? 'SELECTED (orange)' : 'default');
      
      layer.setStyle(newStyle);
      
      // Re-bind hover tooltip if it doesn't exist or was removed
      if (!layer.getTooltip() || layer.getTooltip().options.permanent) {
        layer.bindTooltip(frontendName, {
          permanent: false,
          direction: 'center',
          className: 'gouvernorat-tooltip',
          opacity: 0.95,
        });
      }
      
      // Add permanent tooltip ONLY to selected gouvernorat (in addition to hover tooltip)
      if (isSelected) {
        // Unbind hover tooltip first, then bind permanent
        layer.unbindTooltip();
        layer.bindTooltip(frontendName, {
          permanent: true,
          direction: 'center',
          className: 'gouvernorat-tooltip-permanent',
          offset: [0, 0],
        }).openTooltip();
      }
      
      // CRITICAL: Delete bounds AFTER applying style too
      if (layer._bounds) {
        delete layer._bounds;
      }
    });

    // Note: Cleanup plus nécessaire maintenant que l'outline CSS est fixé
  }

  /**
   * Remove any SVG rect elements that represent bounds (black rectangles)
   * ULTRA AGGRESSIVE VERSION - removes ALL rects regardless of attributes
   */
  private removeBoundsRectangles(): void {
    if (!this.isBrowser) return;

    // Find all possible panes that could contain rectangles
    const panesToCheck = [
      '.leaflet-overlay-pane',
      '.leaflet-map-pane',
      '.leaflet-pane',
      '.leaflet-zoom-animated', // Additional target
    ];

    let totalRemoved = 0;

    panesToCheck.forEach(selector => {
      const pane = document.querySelector(selector);
      if (pane) {
        // Remove ALL rect elements without checking attributes
        const rects = pane.querySelectorAll('rect');
        rects.forEach(rect => {
          // Remove immediately without logging to improve performance
          rect.remove();
          totalRemoved++;
        });

        // Also check for SVGs containing rects and remove them
        const svgs = pane.querySelectorAll('svg');
        svgs.forEach(svg => {
          const rectsInSvg = svg.querySelectorAll('rect');
          if (rectsInSvg.length > 0) {
            // If SVG only contains rects, remove the entire SVG
            const hasOnlyRects = svg.children.length === rectsInSvg.length;
            if (hasOnlyRects) {
              svg.remove();
              totalRemoved++;
            } else {
              // Remove just the rects
              rectsInSvg.forEach(r => r.remove());
              totalRemoved += rectsInSvg.length;
            }
          }
        });
      }
    });

    // Also check document body for any stray rects
    const bodyRects = document.querySelectorAll('body rect[stroke], body rect[fill="none"]');
    bodyRects.forEach(rect => {
      const isInLeaflet = rect.closest('.leaflet-container');
      if (isInLeaflet) {
        rect.remove();
        totalRemoved++;
      }
    });

    if (totalRemoved > 0) {
      console.log('[MapComponent] Removed', totalRemoved, 'rectangle elements');
    }
  }
}
