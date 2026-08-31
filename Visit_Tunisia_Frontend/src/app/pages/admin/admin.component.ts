import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthUser, AdminDestination, AdminEvent, AdminEvenement, AdminUser, AdminReview, ActivityRow, ModerationDestination, StatusTab, DestinationStatut, JournalEntry, PaginatedJournal } from '../../data/models';
import { ADMIN_DESTINATIONS_DATA, ADMIN_USERS_DATA, ADMIN_REVIEWS_DATA, ACTIVITY_DATA, TRAFFIC_DATA, ACTION_STYLE, ALL_ADMINS, ALL_ACTIONS, STATUS_COLORS, CATEGORY_COLORS, GOUVERNORATS_LIST } from '../../data/admin.data';
import { EVENT_GENRES } from '../../data/constants';
import { AuthService } from '../../services/auth.service';
import { AdminDestinationService } from '../../services/admin-destination.service';
import { AdminEventService, PaginatedEvents } from '../../services/admin-event.service';
import { AdminUserService, UserResponse, UserStatsResponse } from '../../services/admin-user.service';
import { AdminReviewService, ReviewResponse, ReviewDisplay, ReviewStatsResponse } from '../../services/admin-review.service';
import { AdminJournalService } from '../../services/admin-journal.service';
import { AdminStatsService, StatsOverview, RecentActivity, FrequentationStats, TopDestination, TopSearchTerm } from '../../services/admin-stats.service';
import { MiniMapPickerComponent } from '../../shared/mini-map-picker/mini-map-picker.component';
import { AdminChartComponent } from '../../shared/admin-chart/admin-chart.component';

type AdminSection = 'stats' | 'activity' | 'destinations' | 'events' | 'users' | 'reviews';

const URL_TO_SECTION: Record<string, AdminSection> = {
  stats: 'stats',
  journal: 'activity',
  destinations: 'destinations',
  events: 'events',
  users: 'users',
  reviews: 'reviews',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, MiniMapPickerComponent, AdminChartComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit, OnDestroy {
  @Output() exit = new EventEmitter<void>();

  section: AdminSection = 'stats';
  destinations: AdminDestination[] = [...ADMIN_DESTINATIONS_DATA];
  users: AdminUser[] = [];
  reviews: AdminReview[] = [...ADMIN_REVIEWS_DATA];
  activities = ACTIVITY_DATA;
  traffic = TRAFFIC_DATA;
  actionStyle = ACTION_STYLE;
  allAdmins = ALL_ADMINS;
  allActions = ALL_ACTIONS;
  statusColors = STATUS_COLORS;

  destQuery = '';
  destSortKey = 'views';
  destSortDir: 'asc' | 'desc' = 'desc';

  // --- EVENTS DYNAMIC STATE ---
  eventsList: AdminEvenement[] = [];
  eventsCounts = { TOUTES: 0, ACTIF: 0, BROUILLON: 0, ARCHIVE: 0 };
  eventsActiveTab: StatusTab = 'TOUTES';
  eventsLoading = false;
  eventsCurrentPage = 0;
  eventsPageSize = 10;
  eventsTotalPages = 1;
  eventsTotalElements = 0;
  eventsSearchQuery = '';
  eventsGenreFilter = 'Tous';
  eventsSelectedIds = new Set<number>();

  // Events Slide-Over Modal State
  showEventSlideOver = false;
  isEventCreating = false;
  editEvent: AdminEvenement | null = null;
  eventModalTab: 'info' | 'categories' | 'location' = 'info';
  isEventAiCorrecting = false;
  isUploadingEventPhotos = false;

  eventGenreSuggestions = EVENT_GENRES;

  // Destination autocomplete for Event attachment (ACTIF destinations only)
  eventDestSearchQuery = '';
  eventDestSuggestions: any[] = [];
  showEventDestSuggestions = false;
  eventDestSearchTimeout: any = null;
  selectedEventDest: any = null;

  // Event Photo Lightbox Fullscreen Preview
  eventPreviewPhotoUrl: string | null = null;
  eventPreviewPhotoIndex = 0;

  usersQuery = '';
  usersSortKey = 'dateCreation';
  usersSortDir: 'asc' | 'desc' = 'desc';
  usersStatutFilter = 'Tous';
  usersRoleFilter = 'Tous';
  usersDateFrom = '';
  usersDateTo = '';
  
  // Users pagination
  usersCurrentPage = 0;
  usersPageSize = 20;
  usersTotalPages = 1;
  usersTotalElements = 0;
  usersLoading = false;
  
  // Users stats
  userStats: UserStatsResponse | null = null;
  
  // Stats Dashboard (nouvelles propriétés)
  statsOverview: StatsOverview | null = null;
  statsDestByRegion: Record<string, number> = {};
  statsDestByType: Record<string, number> = {};
  statsRecentActivity: RecentActivity | null = null;
  statsLoading = false;

  // Frequentation & Consultation Stats
  frequentationPeriod: 'TODAY' | '7D' | '30D' | 'YEAR' = '30D';
  frequentationStats: FrequentationStats | null = null;
  frequentationLoading = false;
  
  // Reviews filters and pagination
  reviewsQuery = '';
  reviewsStatutFilter = 'Tous';
  reviewsSentimentFilter = 'Tous';
  reviewsDestinationQuery = ''; // User input in autocomplete
  reviewsDestinationFilter = ''; // Selected destination name for filtering
  destinationSuggestions: any[] = [];
  showDestinationSuggestions = false;
  destinationSearchTimeout: any = null;
  reviewsMinNote: number = 1;
  reviewsMaxNote: number = 5;
  reviewsDateFrom = '';
  reviewsDateTo = '';
  reviewsSortKey = 'dateCreation';
  reviewsSortDir: 'asc' | 'desc' = 'desc';
  reviewsCurrentPage = 0;
  reviewsPageSize = 20;
  reviewsTotalPages = 1;
  reviewsTotalElements = 0;
  reviewsLoading = false;
  isRetryingSentiment = false;
  reviewsList: ReviewDisplay[] = [];
  reviewStats: ReviewStatsResponse | null = null;
  selectedReviewIds = new Set<number>();
  selectedReviewDetail: ReviewDisplay | null = null;
  
  // User action confirmation modal
  showUserActionModal = false;
  userActionModalData: {
    user: AdminUser | null;
    action: 'toggle' | 'delete';
    title: string;
    message: string;
    confirmText: string;
    confirmClass: string;
  } = {
    user: null,
    action: 'toggle',
    title: '',
    message: '',
    confirmText: '',
    confirmClass: ''
  };
  
  activityActionFilter = 'Tous';
  activityAdminFilter = 'Tous';
  activityDateFrom = '';
  activityDateTo = '';
  activitySortKey = 'datetime';
  activitySortDir: 'asc' | 'desc' = 'desc';

  // --- JOURNAL D'ACTIVITE DYNAMIQUE ---
  journalEntries: JournalEntry[] = [];
  journalLoading = false;
  journalError: string | null = null;
  journalCurrentPage = 0;
  journalPageSize = 15;
  journalTotalPages = 1;
  journalTotalElements = 0;
  journalTypeActionFilter = 'Tous';
  journalEntiteTypeFilter = 'Tous';
  journalSearchQuery = '';
  journalDateFrom = '';
  journalDateTo = '';
  allJournalActions = ['Tous', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'MODERATION', 'CONNEXION'];
  allJournalEntites = ['Tous', 'DESTINATION', 'EVENEMENT', 'AVIS', 'UTILISATEUR', 'CONVERSATION', 'ITINERAIRE'];

  // --- MODERATION WORKFLOW STATE ---
  moderationList: ModerationDestination[] = [];
  activeTab: StatusTab = 'BROUILLON';
  counts = { TOUTES: 0, ACTIF: 0, BROUILLON: 0, ARCHIVE: 0 };
  brouillonsCount = 0;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalPages = 1;
  totalElements = 0;
  pageSizeOptions = [5, 10, 20, 50];

  // Filters for Brouillons tab
  modSearchQuery = '';
  modCategoryFilter = 'Tous';
  modRegionFilter = 'Tous';

  // Selection
  selectedIds = new Set<number>();

  // Modals & Slide-over
  showImportModal = false;
  importGouvernorat = 'Nabeul';
  isImporting = false;

  showSlideOver = false;
  modalTab: 'info' | 'categories' | 'location' = 'info';
  selectedDraft: ModerationDestination | null = null;
  editDraft: ModerationDestination | null = null; // Editable clone
  newPhotoUrl = '';
  isAiCorrecting = false;

  // Photo Lightbox Fullscreen Preview
  previewPhotoUrl: string | null = null;
  previewPhotoIndex = 0;

  openPhotoPreview(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editDraft?.photos || index < 0 || index >= this.editDraft.photos.length) return;
    this.previewPhotoIndex = index;
    this.previewPhotoUrl = this.editDraft.photos[index];
  }

  closePhotoPreview(): void {
    this.previewPhotoUrl = null;
  }

  prevPreviewPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editDraft?.photos || this.editDraft.photos.length === 0) return;
    this.previewPhotoIndex = (this.previewPhotoIndex - 1 + this.editDraft.photos.length) % this.editDraft.photos.length;
    this.previewPhotoUrl = this.editDraft.photos[this.previewPhotoIndex];
  }

  nextPreviewPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editDraft?.photos || this.editDraft.photos.length === 0) return;
    this.previewPhotoIndex = (this.previewPhotoIndex + 1) % this.editDraft.photos.length;
    this.previewPhotoUrl = this.editDraft.photos[this.previewPhotoIndex];
  }

  // Confirm modal
  confirmModal = {
    show: false,
    title: '',
    message: '',
    confirmText: '',
    confirmClass: '',
    action: () => {},
  };

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastSub?: Subscription;

  gouvernorats = GOUVERNORATS_LIST;
  categoryList = ['CULTUREL', 'BALNEAIRE', 'AVENTURE', 'ECOLOGIQUE', 'GASTRONOMIQUE', 'RELIGIEUX'];
  typeList = ['SITE_TOURISTIQUE', 'RESTAURANT', 'HEBERGEMENT', 'ACTIVITE', 'EVENEMENT'];

  navItems = [
    { id: 'stats' as AdminSection, label: 'Statistiques', route: 'stats' },
    { id: 'activity' as AdminSection, label: "Journal d'activité", route: 'journal' },
    { id: 'destinations' as AdminSection, label: 'Destinations', route: 'destinations', badge: 0 },
    { id: 'events' as AdminSection, label: 'Événements', route: 'events' },
    { id: 'users' as AdminSection, label: 'Utilisateurs', route: 'users' },
    { id: 'reviews' as AdminSection, label: 'Avis publiés', route: 'reviews', badge: 0 },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private authService: AuthService,
    private adminDestService: AdminDestinationService,
    private adminEventService: AdminEventService,
    private adminUserService: AdminUserService,
    private adminReviewService: AdminReviewService,
    private adminJournalService: AdminJournalService,
    private adminStatsService: AdminStatsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const initialUrl = this.router.url.split('?')[0];
    const initialSegments = initialUrl.split('/');
    const initialLast = initialSegments[initialSegments.length - 1] || 'stats';
    this.section = URL_TO_SECTION[initialLast] ?? (URL_TO_SECTION[this.route.snapshot.firstChild?.routeConfig?.path ?? 'stats'] ?? 'stats');

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = (event.urlAfterRedirects || event.url || '').split('?')[0];
      const segments = url.split('/');
      const last = segments[segments.length - 1] || 'stats';
      if (URL_TO_SECTION[last]) {
        this.section = URL_TO_SECTION[last];
      }
      
      // Load data on navigation
      if (this.section === 'destinations' && this.moderationList.length === 0) {
        this.loadModerationData();
      }
      if (this.section === 'events' && this.eventsList.length === 0) {
        this.loadEventsData();
        this.updateEventsCounts();
      }
      if (this.section === 'users' && this.users.length === 0) {
        this.loadUsers();
        this.loadUserStats();
      }
      if (this.section === 'reviews' && this.reviewsList.length === 0) {
        this.loadReviews();
        this.loadReviewStats();
      }
      if (this.section === 'activity') {
        this.loadJournal();
      }
      if (this.section === 'stats') {
        this.loadStatsData();
      }
    });

    if (this.section === 'activity') {
      this.loadJournal();
    }
    
    if (this.section === 'stats') {
      this.loadStatsData();
    }

    // Read initial filter state from URL query params (for destinations moderation)
    const qp = this.route.snapshot.queryParams;
    
    if (this.section === 'destinations') {
      if (qp['statut']) this.activeTab = qp['statut'] as StatusTab;
      if (qp['region']) this.modRegionFilter = qp['region'];
      if (qp['categorie']) this.modCategoryFilter = qp['categorie'];
      if (qp['search']) this.modSearchQuery = qp['search'];
      if (qp['page']) this.currentPage = parseInt(qp['page'], 10) || 0;
      if (qp['size']) this.pageSize = parseInt(qp['size'], 10) || 10;
    }
    
    // Read users filter state from URL
    if (this.section === 'users') {
      if (qp['statut']) this.usersStatutFilter = qp['statut'];
      if (qp['role']) this.usersRoleFilter = qp['role'];
      if (qp['search']) this.usersQuery = qp['search'];
      if (qp['dateFrom']) this.usersDateFrom = qp['dateFrom'];
      if (qp['dateTo']) this.usersDateTo = qp['dateTo'];
      if (qp['page']) this.usersCurrentPage = parseInt(qp['page'], 10) || 0;
      if (qp['size']) this.usersPageSize = parseInt(qp['size'], 10) || 20;
    }
    
    // Read reviews filter state from URL
    if (this.section === 'reviews') {
      if (qp['statut']) this.reviewsStatutFilter = qp['statut'];
      if (qp['sentiment']) this.reviewsSentimentFilter = qp['sentiment'];
      if (qp['destinationSearch']) {
        this.reviewsDestinationFilter = qp['destinationSearch'];
        this.reviewsDestinationQuery = qp['destinationSearch'];
      }
      if (qp['search']) this.reviewsQuery = qp['search'];
      if (qp['minNote']) this.reviewsMinNote = parseInt(qp['minNote'], 10) || 1;
      if (qp['maxNote']) this.reviewsMaxNote = parseInt(qp['maxNote'], 10) || 5;
      if (qp['dateFrom']) this.reviewsDateFrom = qp['dateFrom'];
      if (qp['dateTo']) this.reviewsDateTo = qp['dateTo'];
      if (qp['page']) this.reviewsCurrentPage = parseInt(qp['page'], 10) || 0;
      if (qp['size']) this.reviewsPageSize = parseInt(qp['size'], 10) || 20;
    }

    // Read events filter state from URL
    if (this.section === 'events') {
      if (qp['statut']) this.eventsActiveTab = qp['statut'] as StatusTab;
      if (qp['genre']) this.eventsGenreFilter = qp['genre'];
      if (qp['search']) this.eventsSearchQuery = qp['search'];
      if (qp['page']) this.eventsCurrentPage = parseInt(qp['page'], 10) || 0;
      if (qp['size']) this.eventsPageSize = parseInt(qp['size'], 10) || 10;
    }

    // Read journal filter state from URL
    if (this.section === 'activity') {
      if (qp['typeAction']) this.journalTypeActionFilter = qp['typeAction'];
      if (qp['entiteType']) this.journalEntiteTypeFilter = qp['entiteType'];
      if (qp['search']) this.journalSearchQuery = qp['search'];
      if (qp['dateFrom']) this.journalDateFrom = qp['dateFrom'];
      if (qp['dateTo']) this.journalDateTo = qp['dateTo'];
      if (qp['page']) this.journalCurrentPage = parseInt(qp['page'], 10) || 0;
      if (qp['size']) this.journalPageSize = parseInt(qp['size'], 10) || 15;
    }

    // Toast listener (destinations + events)
    this.toastSub = this.adminDestService.toast$.subscribe(t => (this.toast = t));
    const eventToastSub = this.adminEventService.toast$.subscribe(t => (this.toast = t));
    this.toastSub.add(eventToastSub);

    // Load data based on section
    if (this.section === 'destinations') {
      this.loadModerationData();
    }
    
    if (this.section === 'events') {
      this.loadEventsData();
      this.updateEventsCounts();
    }
    
    // Load users and stats if on users section
    if (this.section === 'users') {
      this.loadUsers();
      this.loadUserStats();
    }
    
    // Load reviews if on reviews section
    if (this.section === 'reviews') {
      this.loadReviews();
      this.loadReviewStats();
    }
  }

  ngOnDestroy(): void {
    this.toastSub?.unsubscribe();
  }

  /** Sync current filter state to URL query params (without navigation reload) */
  private syncUrlParams(): void {
    const queryParams: any = {};
    if (this.activeTab && this.activeTab !== 'TOUTES') queryParams.statut = this.activeTab;
    if (this.modRegionFilter && this.modRegionFilter !== 'Tous') queryParams.region = this.modRegionFilter;
    if (this.modCategoryFilter && this.modCategoryFilter !== 'Tous') queryParams.categorie = this.modCategoryFilter;
    if (this.modSearchQuery && this.modSearchQuery.trim()) queryParams.search = this.modSearchQuery.trim();
    if (this.currentPage > 0) queryParams.page = this.currentPage;
    if (this.pageSize !== 10) queryParams.size = this.pageSize;

    const url = this.router.createUrlTree(['/admin/destinations'], { queryParams }).toString();
    this.location.replaceState(url);
  }

  loadModerationData(): void {
    const statusParam = this.activeTab === 'TOUTES' ? undefined : (this.activeTab as DestinationStatut);
    this.adminDestService.getDestinations(
      statusParam,
      this.modRegionFilter,
      this.modCategoryFilter,
      this.modSearchQuery,
      this.currentPage,
      this.pageSize
    ).subscribe(res => {
      this.moderationList = res.items;
      this.totalPages = res.totalPages;
      this.totalElements = res.totalElements;
      this.currentPage = res.page;
      this.updateCounts();
      this.syncUrlParams();
    });
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.selectedIds.clear();
    this.loadModerationData();
  }

  changePage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.currentPage = newPage;
    this.selectedIds.clear();
    this.loadModerationData();
  }

  changePageSize(newSize: any): void {
    this.pageSize = Number(newSize);
    this.currentPage = 0;
    this.selectedIds.clear();
    this.loadModerationData();
  }

  get pagesArray(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get displayStart(): number {
    if (this.totalElements === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  get displayEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  updateCounts(): void {
    this.adminDestService.getCountsByStatut().subscribe(res => {
      this.counts = res;
      this.brouillonsCount = this.counts.BROUILLON;

      // Update sidebar badge for Destinations
      const destNav = this.navItems.find(n => n.id === 'destinations');
      if (destNav) {
        destNav.badge = this.brouillonsCount;
      }
    });
  }

  setTab(tab: StatusTab): void {
    this.activeTab = tab;
    this.currentPage = 0;
    this.selectedIds.clear();
    this.loadModerationData();
  }

  get currentAdmin(): AuthUser | null {
    return this.authService.currentUser;
  }

  get adminUserName(): string {
    const u = this.currentAdmin;
    if (!u) return 'Administrateur';
    const fullName = `${u.prenom || ''} ${u.nom || ''}`.trim();
    return fullName || u.email;
  }

  get adminUserRole(): string {
    const u = this.currentAdmin;
    if (!u) return 'Admin principal';
    return u.role === 'ADMIN' ? 'Admin principal' : 'Gestionnaire';
  }

  get adminUserInitials(): string {
    const u = this.currentAdmin;
    if (!u) return 'AD';
    const p = (u.prenom || '').trim().charAt(0).toUpperCase();
    const n = (u.nom || '').trim().charAt(0).toUpperCase();
    return (p + n) || (u.email ? u.email.substring(0, 2).toUpperCase() : 'AD');
  }

  onExit(): void {
    this.exit.emit();
    this.router.navigate(['/']);
    window.scrollTo(0, 0);
  }

  setSection(s: AdminSection): void {
    this.section = s;
    const item = this.navItems.find(n => n.id === s);
    if (item) {
      this.router.navigate(['/admin', item.route]);
    }

    if (s === 'destinations') {
      this.loadModerationData();
    }
    
    if (s === 'events') {
      this.loadEventsData();
      this.updateEventsCounts();
    }

    if (s === 'users') {
      this.loadUsers();
      this.loadUserStats();
    }

    if (s === 'reviews') {
      this.loadReviews();
      this.loadReviewStats();
    }
  }

  // --- FILTERED MODERATION LIST ---
  get filteredModerationList(): ModerationDestination[] {
    return this.moderationList;
  }

  resetModFilters(): void {
    this.modSearchQuery = '';
    this.modCategoryFilter = 'Tous';
    this.modRegionFilter = 'Tous';
    this.onFilterChange();
  }

  // --- BULK SELECTION ---
  isAllSelected(): boolean {
    const visible = this.filteredModerationList;
    return visible.length > 0 && visible.every(d => this.selectedIds.has(d.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.clear();
    } else {
      this.filteredModerationList.forEach(d => this.selectedIds.add(d.id));
    }
  }

  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  // --- SINGLE ACTIONS ---
  publishSingle(dest: ModerationDestination, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Publier la destination',
      message: `Publier "${dest.nom?.fr || 'cette destination'}" ? Elle sera immédiatement visible par tous les utilisateurs sur Visit Tunisia.`,
      confirmText: 'Publier',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      action: () => {
        // If slide-over editor is open for this destination, save full editDraft (including newly added photos) + set statut ACTIF
        if (this.editDraft && this.editDraft.id === dest.id) {
          this.editDraft.statut = 'ACTIF';
          this.adminDestService.updateDestination(dest.id, this.editDraft).subscribe(() => {
            this.loadModerationData();
            this.closeSlideOver();
          });
        } else {
          this.adminDestService.updateStatut(dest.id, 'ACTIF').subscribe(() => {
            this.loadModerationData();
            if (this.showSlideOver && this.selectedDraft?.id === dest.id) {
              this.closeSlideOver();
            }
          });
        }
      },
    };
  }

  unpublishSingle(dest: ModerationDestination, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Passer la destination en brouillon',
      message: `Passer "${dest.nom?.fr || 'cette destination'}" en brouillon ? Elle ne sera plus visible publiquement par les touristes.`,
      confirmText: 'Passer en brouillon',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      action: () => {
        if (this.editDraft && this.editDraft.id === dest.id) {
          this.editDraft.statut = 'BROUILLON';
          this.adminDestService.updateDestination(dest.id, this.editDraft).subscribe(() => {
            this.loadModerationData();
            this.closeSlideOver();
          });
        } else {
          this.adminDestService.updateStatut(dest.id, 'BROUILLON').subscribe(() => {
            this.loadModerationData();
            if (this.showSlideOver && this.selectedDraft?.id === dest.id) {
              this.closeSlideOver();
            }
          });
        }
      },
    };
  }

  deleteSingle(dest: ModerationDestination, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Supprimer la destination',
      message: `Êtes-vous sûr de vouloir supprimer définitivement "${dest.nom?.fr || 'cette destination'}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      action: () => {
        this.adminDestService.deleteDestination(dest.id).subscribe(() => {
          this.loadModerationData();
          if (this.showSlideOver && this.selectedDraft?.id === dest.id) {
            this.closeSlideOver();
          }
        });
      },
    };
  }

  // --- BULK ACTIONS ---
  bulkPublish(): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;
    this.confirmModal = {
      show: true,
      title: 'Publication groupée',
      message: `Publier les ${ids.length} destinations sélectionnées ?`,
      confirmText: 'Publier tout',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      action: () => {
        this.adminDestService.bulkUpdateStatut(ids, 'ACTIF').subscribe(() => {
          this.selectedIds.clear();
          this.loadModerationData();
        });
      },
    };
  }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;
    this.confirmModal = {
      show: true,
      title: 'Suppression groupée',
      message: `Supprimer définitivement les ${ids.length} destinations sélectionnées ? Cette action est irréversible.`,
      confirmText: 'Supprimer tout',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      action: () => {
        this.adminDestService.bulkDelete(ids).subscribe(() => {
          this.selectedIds.clear();
          this.loadModerationData();
        });
      },
    };
  }

  // --- IMPORT MODAL ---
  importStatusState: { status: string; progress: number; message: string; error?: string } = {
    status: 'NOT_STARTED',
    progress: 0,
    message: '',
  };

  openImportModal(): void {
    this.showImportModal = true;
    this.importStatusState = { status: 'NOT_STARTED', progress: 0, message: '' };
  }

  closeImportModal(): void {
    this.showImportModal = false;
  }

  runImport(): void {
    if (this.isImporting) return;
    this.isImporting = true;
    const gouvernorat = this.importGouvernorat;
    this.importStatusState = { status: 'IN_PROGRESS', progress: 10, message: 'Lancement du scraper Python...' };

    this.adminDestService.importDestinations(gouvernorat).subscribe({
      next: (res) => {
        this.setTab('BROUILLON');

        let pollsCount = 0;
        const maxPolls = 40; // 40 * 1.5s = 60 seconds max polling

        const intervalId = setInterval(() => {
          pollsCount++;

          this.adminDestService.getImportStatus(gouvernorat).subscribe(st => {
            if (st && st.status) {
              this.importStatusState = {
                status: st.status,
                progress: st.progress ?? 10,
                message: st.message || '',
                error: st.error,
              };

              if (st.status === 'COMPLETED') {
                clearInterval(intervalId);
                this.isImporting = false;
                this.loadModerationData();
                this.adminDestService.showToast(st.message || `✨ Import de ${gouvernorat} terminé !`, 'success');
              } else if (st.status === 'FAILED') {
                clearInterval(intervalId);
                this.isImporting = false;
                const errText = st.error || st.message || `Échec de l'import pour ${gouvernorat}`;
                this.adminDestService.showToast(errText, 'error');
              }
            }
          });

          // Always refresh data periodically
          this.loadModerationData();

          if (pollsCount >= maxPolls) {
            clearInterval(intervalId);
            this.isImporting = false;
          }
        }, 1500);
      },
      error: (err) => {
        this.isImporting = false;
        this.adminDestService.showToast(`Erreur lors du lancement de l'import`, 'error');
      }
    });
  }

  // --- SLIDE-OVER DRAWER ---
  openSlideOver(dest: ModerationDestination): void {
    this.selectedDraft = dest;
    this.modalTab = 'info';
    // Clone for edit
    this.editDraft = JSON.parse(JSON.stringify(dest));
    if (!this.editDraft!.nom) this.editDraft!.nom = { fr: '' };
    if (!this.editDraft!.description) this.editDraft!.description = { fr: '' };
    if (!this.editDraft!.categories) this.editDraft!.categories = [];
    if (!this.editDraft!.photos) this.editDraft!.photos = [];
    this.showSlideOver = true;
  }

  closeSlideOver(): void {
    this.showSlideOver = false;
    this.selectedDraft = null;
    this.editDraft = null;
  }

  saveDraftEdits(): void {
    if (!this.editDraft || !this.selectedDraft) return;
    this.adminDestService.updateDestination(this.selectedDraft.id, this.editDraft).subscribe(() => {
      this.loadModerationData();
      this.closeSlideOver();
    });
  }

  toggleCategory(cat: string): void {
    if (!this.editDraft) return;
    const cats = this.editDraft.categories || [];
    if (cats.includes(cat)) {
      this.editDraft.categories = cats.filter(c => c !== cat);
    } else {
      this.editDraft.categories = [...cats, cat];
    }
  }

  isUploadingPhotos = false;

  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files);
      input.value = '';
    }
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileUpload(event.dataTransfer.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private handleFileUpload(files: FileList): void {
    if (!this.editDraft) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      this.adminDestService.showToast('Veuillez sélectionner uniquement des images (JPG, PNG, WebP...)', 'error');
      return;
    }

    this.isUploadingPhotos = true;

    // Call service to upload to backend or fallback to data URL
    this.adminDestService.uploadPhotos(this.editDraft.id, validFiles).subscribe({
      next: (res) => {
        this.isUploadingPhotos = false;
        if (this.editDraft) {
          const current = this.editDraft.photos || [];
          this.editDraft.photos = [...current, ...res.urls];
          // Auto-persist uploaded photos to backend
          this.adminDestService.updateDestination(this.editDraft.id, this.editDraft).subscribe();
        }
      },
      error: () => {
        this.isUploadingPhotos = false;
      }
    });
  }

  setMainPhoto(index: number): void {
    if (!this.editDraft || !this.editDraft.photos || index <= 0 || index >= this.editDraft.photos.length) return;
    const photos = [...this.editDraft.photos];
    const [selected] = photos.splice(index, 1);
    photos.unshift(selected); // Put selected photo at index 0 (main photo)
    this.editDraft.photos = photos;
    this.adminDestService.updateDestination(this.editDraft.id, this.editDraft).subscribe();
    this.adminDestService.showToast('Photo principale mise à jour (Couverture ⭐)', 'success');
  }

  movePhoto(index: number, direction: 'left' | 'right'): void {
    if (!this.editDraft || !this.editDraft.photos) return;
    const photos = [...this.editDraft.photos];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const temp = photos[index];
    photos[index] = photos[targetIndex];
    photos[targetIndex] = temp;
    this.editDraft.photos = photos;
    this.adminDestService.updateDestination(this.editDraft.id, this.editDraft).subscribe();
  }

  removePhoto(index: number): void {
    if (!this.editDraft || !this.editDraft.photos) return;
    const removedUrl = this.editDraft.photos[index];
    this.editDraft.photos.splice(index, 1);
    this.adminDestService.updateDestination(this.editDraft.id, this.editDraft).subscribe();
    this.adminDestService.deletePhotoFile(removedUrl).subscribe();
  }

  formatDestinationType(type?: string): string {
    if (!type) return '—';
    const mapping: Record<string, string> = {
      'SITE_TOURISTIQUE': 'Site touristique',
      'RESTAURANT': 'Restaurant',
      'HEBERGEMENT': 'Hébergement',
      'ACTIVITE': 'Activité',
      'EVENEMENT': 'Événement'
    };
    return mapping[type] || type;
  }

  onLocationChange(pos: { latitude: number; longitude: number }): void {
    if (!this.editDraft) return;
    this.editDraft.latitude = pos.latitude;
    this.editDraft.longitude = pos.longitude;
  }

  // --- AI CORRECTION MOCK ---
  correctWithAi(): void {
    if (!this.editDraft || this.isAiCorrecting) return;
    this.isAiCorrecting = true;
    setTimeout(() => {
      this.isAiCorrecting = false;
      const currentDesc = this.editDraft?.description?.fr || '';
      if (!currentDesc || currentDesc.length < 20) {
        this.editDraft!.description.fr = `Découvrez une destination remarquable située dans la région de ${this.editDraft?.region || 'Tunisie'}, alliant patrimoine culturel d'exception et expérience touristique inoubliable pour tous les visiteurs.`;
      } else {
        this.editDraft!.description.fr = `${currentDesc} Une visite incontournable à ajouter absolument à votre itinéraire en Tunisie !`;
      }
      this.adminDestService.showToast('Description reformulée avec succès par l\'IA ✨', 'success');
    }, 1200);
  }

  // --- VALIDATION RULES FOR PUBLISH BUTTON ---
  getPublishValidationReason(dest: ModerationDestination | null): string | null {
    if (!dest) return 'Aucune destination sélectionnée.';
    const errors: string[] = [];
    if (!dest.nom?.fr?.trim()) errors.push('Nom FR manquant');
    if (!dest.description?.fr?.trim() || dest.description.fr.trim().length < 20) errors.push('Description FR trop courte (< 20 caractères)');
    if (dest.latitude == null || dest.longitude == null) errors.push('Coordonnées GPS manquantes');
    if (!dest.categories || dest.categories.length === 0) errors.push('Au moins 1 catégorie requise');

    return errors.length > 0 ? errors.join(' • ') : null;
  }

  isPublishDisabled(dest: ModerationDestination | null): boolean {
    return this.getPublishValidationReason(dest) !== null;
  }

  // --- HELPERS / FORMATTERS ---
  getCategoryStyle(cat: string): { bg: string; text: string } {
    return (CATEGORY_COLORS as Record<string, any>)[cat] || { bg: 'rgba(107,114,128,0.12)', text: '#4B5563' };
  }

  getAlerts(dest: ModerationDestination): { type: 'photo' | 'desc' | 'coords'; label: string }[] {
    const alerts: { type: 'photo' | 'desc' | 'coords'; label: string }[] = [];
    if (!dest.photos || dest.photos.length === 0) {
      alerts.push({ type: 'photo', label: 'Pas de photo' });
    }
    if (!dest.description?.fr || dest.description.fr.length < 50) {
      alerts.push({ type: 'desc', label: 'Description < 50 caractères' });
    }
    if (dest.latitude == null || dest.longitude == null) {
      alerts.push({ type: 'coords', label: 'Coordonnées manquantes' });
    }
    return alerts;
  }

  formatTimeAgo(isoDate: string): string {
    if (!isoDate) return 'Récemment';
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Il y a 30m';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  }

  dismissToast(): void {
    this.adminDestService.dismissToast();
  }

  // Legacy Stats
  get stats() {
    if (this.statsOverview) {
      return {
        totalViews: 0,
        totalDestinations: this.statsOverview.totalDestinations,
        activeEvents: this.statsOverview.totalEvents,
        totalUsers: this.statsOverview.totalUsers,
        pendingReviews: 0,
        totalReviews: this.statsOverview.totalReviews,
        touristCount: this.statsOverview.touristCount,
        adminCount: this.statsOverview.adminCount,
        pendingDestinations: this.statsOverview.pendingDestinations,
      };
    }
    return {
      totalViews: this.destinations.reduce((s, d) => s + d.views, 0),
      totalDestinations: this.destinations.length,
      activeEvents: this.eventsCounts.ACTIF,
      totalUsers: this.users.length,
      pendingReviews: this.reviews.filter(r => r.status === 'En attente').length,
      totalReviews: 0,
      touristCount: 0,
      adminCount: 0,
      pendingDestinations: 0,
    };
  }

  get filteredDestinations(): AdminDestination[] {
    return [...this.destinations]
      .filter(r => r.name.toLowerCase().includes(this.destQuery.toLowerCase()) || r.category.toLowerCase().includes(this.destQuery.toLowerCase()))
      .sort((a: any, b: any) => {
        const av = a[this.destSortKey]; const bv = b[this.destSortKey];
        return this.destSortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }

  // =========================================================================
  // === EVENTS MANAGEMENT (CRUD, FILTERS, VALIDATION, MODAL, PHOTOS) ===
  // =========================================================================

  loadEventsData(): void {
    this.eventsLoading = true;
    const statusParam = this.eventsActiveTab === 'TOUTES' ? undefined : this.eventsActiveTab;
    const genreParam = this.eventsGenreFilter !== 'Tous' ? this.eventsGenreFilter : undefined;
    const searchParam = this.eventsSearchQuery ? this.eventsSearchQuery.trim() : undefined;

    this.syncEventsUrlParams();

    this.adminEventService.getEvents(
      statusParam,
      genreParam,
      undefined,
      searchParam,
      this.eventsCurrentPage,
      this.eventsPageSize
    ).subscribe({
      next: (res) => {
        this.eventsList = res.items;
        this.eventsTotalPages = res.totalPages;
        this.eventsTotalElements = res.totalElements;
        this.eventsCurrentPage = res.page;
        this.eventsLoading = false;
      },
      error: (err) => {
        console.error('[Admin] Erreur lors du chargement des événements:', err);
        this.eventsLoading = false;
        this.toast = { message: 'Impossible de charger les événements depuis le serveur', type: 'error' };
      }
    });
  }

  updateEventsCounts(): void {
    this.adminEventService.getCountsByStatut().subscribe({
      next: (res) => {
        this.eventsCounts = res;
        const eventsNav = this.navItems.find(n => n.id === 'events');
        if (eventsNav) {
          eventsNav.badge = this.eventsCounts.BROUILLON;
        }
      },
      error: (err) => {
        console.error('[Admin] Erreur lors de la récupération des compteurs événements:', err);
      }
    });
  }

  setEventsTab(tab: StatusTab): void {
    this.eventsActiveTab = tab;
    this.eventsCurrentPage = 0;
    this.eventsSelectedIds.clear();
    this.loadEventsData();
  }

  onEventsFilterChange(): void {
    this.eventsCurrentPage = 0;
    this.eventsSelectedIds.clear();
    this.loadEventsData();
  }

  resetEventsFilters(): void {
    this.eventsSearchQuery = '';
    this.eventsGenreFilter = 'Tous';
    this.onEventsFilterChange();
  }

  changeEventsPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.eventsTotalPages) return;
    this.eventsCurrentPage = newPage;
    this.eventsSelectedIds.clear();
    this.loadEventsData();
  }

  changeEventsPageSize(newSize: any): void {
    this.eventsPageSize = Number(newSize);
    this.eventsCurrentPage = 0;
    this.eventsSelectedIds.clear();
    this.loadEventsData();
  }

  get eventsPagesArray(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, this.eventsCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.eventsTotalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get eventsDisplayStart(): number {
    if (this.eventsTotalElements === 0) return 0;
    return this.eventsCurrentPage * this.eventsPageSize + 1;
  }

  get eventsDisplayEnd(): number {
    return Math.min((this.eventsCurrentPage + 1) * this.eventsPageSize, this.eventsTotalElements);
  }

  private syncEventsUrlParams(): void {
    const queryParams: any = {};
    if (this.eventsActiveTab && this.eventsActiveTab !== 'TOUTES') queryParams.statut = this.eventsActiveTab;
    if (this.eventsGenreFilter && this.eventsGenreFilter !== 'Tous') queryParams.genre = this.eventsGenreFilter;
    if (this.eventsSearchQuery && this.eventsSearchQuery.trim()) queryParams.search = this.eventsSearchQuery.trim();
    if (this.eventsCurrentPage > 0) queryParams.page = this.eventsCurrentPage;
    if (this.eventsPageSize !== 10) queryParams.size = this.eventsPageSize;

    const url = this.router.createUrlTree(['/admin/events'], { queryParams }).toString();
    this.location.replaceState(url);
  }

  // --- EVENTS BULK SELECTION ---
  isAllEventsSelected(): boolean {
    return this.eventsList.length > 0 && this.eventsList.every(e => this.eventsSelectedIds.has(e.id));
  }

  toggleEventSelectAll(): void {
    if (this.isAllEventsSelected()) {
      this.eventsSelectedIds.clear();
    } else {
      this.eventsList.forEach(e => this.eventsSelectedIds.add(e.id));
    }
  }

  toggleEventSelect(id: number, event: Event): void {
    event.stopPropagation();
    if (this.eventsSelectedIds.has(id)) {
      this.eventsSelectedIds.delete(id);
    } else {
      this.eventsSelectedIds.add(id);
    }
  }

  // --- EVENTS SLIDE-OVER (CREATION & EDITION) ---

  openCreateEventSlideOver(): void {
    this.isEventCreating = true;
    this.eventModalTab = 'info';
    this.editEvent = {
      id: 0,
      nom: { fr: '', en: '', ar: '' },
      description: { fr: '', en: '', ar: '' },
      genre: 'Culturel',
      dateDebut: '',
      dateFin: '',
      statut: 'ACTIF', // Statut par défaut : ACTIF à la création manuelle par l'admin
      tarif: 0,
      photos: [],
      destinationId: 0,
      destinationNom: '',
      destinationRegion: '',
      lieuLibre: '',
      lienEvenement: '',
    };
    this.eventDestSearchQuery = '';
    this.selectedEventDest = null;
    this.eventDestSuggestions = [];
    this.showEventDestSuggestions = false;
    this.showEventSlideOver = true;
  }

  openEditEventSlideOver(ev: AdminEvenement): void {
    this.isEventCreating = false;
    this.eventModalTab = 'info';
    this.editEvent = JSON.parse(JSON.stringify(ev));
    if (!this.editEvent!.nom) this.editEvent!.nom = { fr: '' };
    if (!this.editEvent!.description) this.editEvent!.description = { fr: '' };
    if (!this.editEvent!.photos) this.editEvent!.photos = [];

    // Pre-populate destination search info
    this.eventDestSearchQuery = ev.destinationNom || '';
    if (ev.destinationId) {
      this.selectedEventDest = {
        id: ev.destinationId,
        nom: { fr: ev.destinationNom },
        region: ev.destinationRegion,
      };
    } else {
      this.selectedEventDest = null;
    }
    if (!this.editEvent!.lieuLibre) {
      this.editEvent!.lieuLibre = ev.lieuLibre || '';
    }
    if (!this.editEvent!.lienEvenement) {
      this.editEvent!.lienEvenement = ev.lienEvenement || '';
    }

    this.showEventSlideOver = true;
  }

  closeEventSlideOver(): void {
    this.showEventSlideOver = false;
    this.editEvent = null;
    this.selectedEventDest = null;
    this.eventDestSearchQuery = '';
    this.eventDestSuggestions = [];
  }

  saveEventEdits(): void {
    if (!this.editEvent) return;

    // Validation dates côté frontend (dateFin >= dateDebut)
    if (this.editEvent.dateDebut && this.editEvent.dateFin && this.editEvent.dateFin < this.editEvent.dateDebut) {
      this.toast = {
        message: 'La date de fin ne peut pas être antérieure à la date de début.',
        type: 'error'
      };
      return;
    }

    // Validation destination ou lieu libre
    const hasCatalogDest = !!(this.editEvent.destinationId && this.editEvent.destinationId > 0);
    const hasLieuLibre = !!(this.editEvent.lieuLibre && this.editEvent.lieuLibre.trim().length > 0);
    if (!hasCatalogDest && !hasLieuLibre) {
      this.toast = {
        message: 'Veuillez sélectionner une destination du catalogue ou indiquer un lieu personnalisé.',
        type: 'error'
      };
      return;
    }

    if (this.isEventCreating) {
      this.adminEventService.createEvent(this.editEvent).subscribe({
        next: () => {
          this.loadEventsData();
          this.updateEventsCounts();
          this.closeEventSlideOver();
        },
        error: (err) => {
          console.error('[Admin] Erreur création événement:', err);
          const msg = err.error?.message || 'Erreur lors de la création de l\'événement';
          this.toast = { message: msg, type: 'error' };
        }
      });
    } else {
      this.adminEventService.updateEvent(this.editEvent.id, this.editEvent).subscribe({
        next: () => {
          this.loadEventsData();
          this.updateEventsCounts();
          this.closeEventSlideOver();
        },
        error: (err) => {
          console.error('[Admin] Erreur mise à jour événement:', err);
          const msg = err.error?.message || 'Erreur lors de la mise à jour de l\'événement';
          this.toast = { message: msg, type: 'error' };
        }
      });
    }
  }

  publishEventSingle(ev: AdminEvenement, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Publier l\'événement',
      message: `Publier "${ev.nom?.fr || 'cet événement'}" ? Il sera immédiatement visible sur Visit Tunisia.`,
      confirmText: 'Publier',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      action: () => {
        this.adminEventService.updateStatut(ev.id, 'ACTIF').subscribe({
          next: () => {
            this.loadEventsData();
            this.updateEventsCounts();
            if (this.showEventSlideOver && this.editEvent?.id === ev.id) {
              this.closeEventSlideOver();
            }
          },
          error: (err) => {
            console.error('[Admin] Erreur publication événement:', err);
            const msg = err.error?.message || 'Erreur lors de la publication de l\'événement';
            this.toast = { message: msg, type: 'error' };
          }
        });
      },
    };
  }

  unpublishEventSingle(ev: AdminEvenement, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Passer l\'événement en brouillon',
      message: `Passer "${ev.nom?.fr || 'cet événement'}" en brouillon ? Il ne sera plus visible par les touristes.`,
      confirmText: 'Passer en brouillon',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      action: () => {
        this.adminEventService.updateStatut(ev.id, 'BROUILLON').subscribe({
          next: () => {
            this.loadEventsData();
            this.updateEventsCounts();
            if (this.showEventSlideOver && this.editEvent?.id === ev.id) {
              this.closeEventSlideOver();
            }
          },
          error: (err) => {
            console.error('[Admin] Erreur mise en brouillon événement:', err);
            const msg = err.error?.message || 'Erreur lors de la mise en brouillon de l\'événement';
            this.toast = { message: msg, type: 'error' };
          }
        });
      },
    };
  }

  deleteEventSingle(ev: AdminEvenement, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModal = {
      show: true,
      title: 'Supprimer définitivement l\'événement',
      message: `Êtes-vous sûr de vouloir supprimer définitivement "${ev.nom?.fr || 'cet événement'}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      action: () => {
        this.adminEventService.deleteEvent(ev.id).subscribe({
          next: () => {
            this.loadEventsData();
            this.updateEventsCounts();
            if (this.showEventSlideOver && this.editEvent?.id === ev.id) {
              this.closeEventSlideOver();
            }
          },
          error: (err) => {
            console.error('[Admin] Erreur suppression événement:', err);
            const msg = err.error?.message || 'Erreur lors de la suppression de l\'événement';
            this.toast = { message: msg, type: 'error' };
          }
        });
      },
    };
  }

  bulkPublishEvents(): void {
    const ids = Array.from(this.eventsSelectedIds);
    if (ids.length === 0) return;
    this.confirmModal = {
      show: true,
      title: 'Publication groupée',
      message: `Publier les ${ids.length} événements sélectionnés ?`,
      confirmText: '✅ Publier tout',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      action: () => {
        this.adminEventService.bulkUpdateStatut(ids, 'ACTIF').subscribe({
          next: () => {
            this.eventsSelectedIds.clear();
            this.loadEventsData();
            this.updateEventsCounts();
          },
          error: (err) => {
            console.error('[Admin] Erreur publication groupée:', err);
            const msg = err.error?.message || 'Erreur lors de la publication groupée';
            this.toast = { message: msg, type: 'error' };
          }
        });
      },
    };
  }

  bulkDeleteEvents(): void {
    const ids = Array.from(this.eventsSelectedIds);
    if (ids.length === 0) return;
    this.confirmModal = {
      show: true,
      title: 'Suppression groupée',
      message: `Supprimer définitivement les ${ids.length} événements sélectionnés ? Cette action est irréversible.`,
      confirmText: '🗑️ Supprimer tout',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      action: () => {
        this.adminEventService.bulkDelete(ids).subscribe({
          next: () => {
            this.eventsSelectedIds.clear();
            this.loadEventsData();
            this.updateEventsCounts();
          },
          error: (err) => {
            console.error('[Admin] Erreur suppression groupée:', err);
            const msg = err.error?.message || 'Erreur lors de la suppression groupée';
            this.toast = { message: msg, type: 'error' };
          }
        });
      },
    };
  }

  // --- DESTINATION AUTOCOMPLETE FOR EVENT ---
  onEventDestFocus(): void {
    this.searchEventDestinations(this.eventDestSearchQuery || '');
  }

  onEventDestSearchChange(query: string): void {
    if (this.eventDestSearchTimeout) {
      clearTimeout(this.eventDestSearchTimeout);
    }
    this.eventDestSearchTimeout = setTimeout(() => {
      this.searchEventDestinations(query || '');
    }, 200);
  }

  searchEventDestinations(query: string): void {
    const qParam = query ? `?q=${encodeURIComponent(query)}` : '';
    fetch(`http://localhost:8082/api/destinations/search${qParam}`)
      .then(res => res.json())
      .then(data => {
        this.eventDestSuggestions = data;
        this.showEventDestSuggestions = true;
      })
      .catch(err => {
        console.error('[Admin] Erreur recherche destinations pour événement:', err);
        this.eventDestSuggestions = [];
      });
  }

  selectEventDestination(dest: any): void {
    if (!this.editEvent) return;
    const nomFr = dest.nom?.fr || dest.nom?.en || dest.nom?.ar || '';
    this.editEvent.destinationId = dest.id;
    this.editEvent.destinationNom = nomFr;
    this.editEvent.destinationRegion = dest.region || '';
    this.editEvent.lieuLibre = '';
    this.selectedEventDest = dest;
    this.eventDestSearchQuery = nomFr;
    this.showEventDestSuggestions = false;
    this.eventDestSuggestions = [];
  }

  useCustomEventLocation(text?: string): void {
    if (!this.editEvent) return;
    const custom = (text !== undefined ? text : this.eventDestSearchQuery || '').trim();
    if (!custom) return;
    this.editEvent.destinationId = 0;
    this.editEvent.destinationNom = '';
    this.editEvent.destinationRegion = '';
    this.selectedEventDest = null;
    this.editEvent.lieuLibre = custom;
    this.eventDestSearchQuery = '';
    this.eventDestSuggestions = [];
    this.showEventDestSuggestions = false;
  }

  clearEventLieuLibre(): void {
    if (!this.editEvent) return;
    this.editEvent.lieuLibre = '';
  }

  clearEventDestination(): void {
    if (!this.editEvent) return;
    this.editEvent.destinationId = 0;
    this.editEvent.destinationNom = '';
    this.editEvent.destinationRegion = '';
    this.selectedEventDest = null;
    this.eventDestSearchQuery = '';
    this.eventDestSuggestions = [];
    this.showEventDestSuggestions = false;
  }

  onEventDestBlur(): void {
    setTimeout(() => {
      this.showEventDestSuggestions = false;
    }, 200);
  }

  // --- PHOTO MANAGEMENT FOR EVENT ---
  onEventPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleEventFileUpload(input.files);
      input.value = '';
    }
  }

  onEventPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleEventFileUpload(event.dataTransfer.files);
    }
  }

  private handleEventFileUpload(files: FileList): void {
    if (!this.editEvent) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      this.toast = { message: 'Veuillez sélectionner uniquement des images (JPG, PNG, WebP...)', type: 'error' };
      return;
    }

    this.isUploadingEventPhotos = true;

    if (!this.isEventCreating && this.editEvent.id > 0) {
      // Direct backend upload if event already exists
      this.adminEventService.uploadPhotos(this.editEvent.id, validFiles).subscribe({
        next: (res) => {
          this.isUploadingEventPhotos = false;
          if (this.editEvent) {
            const current = this.editEvent.photos || [];
            this.editEvent.photos = [...current, ...res.urls];
          }
        },
        error: (err) => {
          this.isUploadingEventPhotos = false;
          console.error('[Admin] Erreur upload photo événement:', err);
          this.toast = { message: 'Erreur lors du téléversement des photos', type: 'error' };
        }
      });
    } else {
      // Local preview URLs (Data URLs) before initial creation
      const readers = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(urls => {
        this.isUploadingEventPhotos = false;
        if (this.editEvent) {
          const current = this.editEvent.photos || [];
          this.editEvent.photos = [...current, ...urls];
        }
      });
    }
  }

  setMainEventPhoto(index: number): void {
    if (!this.editEvent || !this.editEvent.photos || index <= 0 || index >= this.editEvent.photos.length) return;
    const photos = [...this.editEvent.photos];
    const [selected] = photos.splice(index, 1);
    photos.unshift(selected);
    this.editEvent.photos = photos;
    this.toast = { message: 'Photo principale définie (Couverture ⭐)', type: 'success' };
  }

  moveEventPhoto(index: number, direction: 'left' | 'right'): void {
    if (!this.editEvent || !this.editEvent.photos) return;
    const photos = [...this.editEvent.photos];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const temp = photos[index];
    photos[index] = photos[targetIndex];
    photos[targetIndex] = temp;
    this.editEvent.photos = photos;
  }

  removeEventPhoto(index: number): void {
    if (!this.editEvent || !this.editEvent.photos) return;
    const removedUrl = this.editEvent.photos[index];
    this.editEvent.photos.splice(index, 1);
    if (!this.isEventCreating && removedUrl.startsWith('/api/uploads/')) {
      this.adminEventService.deletePhotoFile(removedUrl).subscribe();
    }
  }

  openEventPhotoPreview(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editEvent?.photos || index < 0 || index >= this.editEvent.photos.length) return;
    this.eventPreviewPhotoIndex = index;
    this.eventPreviewPhotoUrl = this.editEvent.photos[index];
  }

  closeEventPhotoPreview(): void {
    this.eventPreviewPhotoUrl = null;
  }

  prevEventPreviewPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editEvent?.photos || this.editEvent.photos.length === 0) return;
    this.eventPreviewPhotoIndex = (this.eventPreviewPhotoIndex - 1 + this.editEvent.photos.length) % this.editEvent.photos.length;
    this.eventPreviewPhotoUrl = this.editEvent.photos[this.eventPreviewPhotoIndex];
  }

  nextEventPreviewPhoto(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.editEvent?.photos || this.editEvent.photos.length === 0) return;
    this.eventPreviewPhotoIndex = (this.eventPreviewPhotoIndex + 1) % this.editEvent.photos.length;
    this.eventPreviewPhotoUrl = this.editEvent.photos[this.eventPreviewPhotoIndex];
  }

  // --- AI REFORMULATION FOR EVENT ---
  correctEventDescriptionWithAi(): void {
    if (!this.editEvent || this.isEventAiCorrecting) return;
    this.isEventAiCorrecting = true;
    setTimeout(() => {
      this.isEventAiCorrecting = false;
      const currentDesc = this.editEvent?.description?.fr || '';
      const eventName = this.editEvent?.nom?.fr || 'cet événement exceptionnel';
      const eventGenre = this.editEvent?.genre || 'Culturel';
      const destName = this.editEvent?.destinationNom || 'Tunisie';

      if (!currentDesc || currentDesc.length < 20) {
        this.editEvent!.description.fr = `Ne manquez pas ${eventName}, un événement ${eventGenre.toLowerCase()} incontournable se déroulant à ${destName}. Une expérience immersive et mémorable vous attend !`;
      } else {
        this.editEvent!.description.fr = `${currentDesc} Un rendez-vous majeur à ne pas rater sur votre agenda culturel !`;
      }
      this.toast = { message: 'Description de l\'événement reformulée avec succès par l\'IA ✨', type: 'success' };
    }, 1200);
  }

  // --- TEMPORAL & VALIDATION STATUS HELPERS ---

  getEventTemporalStatus(ev: AdminEvenement): { label: string; class: string } {
    if (!ev.dateDebut) return { label: 'Date non définie', class: 'bg-gray-100 text-gray-600' };
    const today = new Date().toISOString().split('T')[0];
    const debut = ev.dateDebut;
    const fin = ev.dateFin || ev.dateDebut;

    if (debut > today) {
      return { label: 'À venir', class: 'bg-blue-50 text-blue-700 border border-blue-200' };
    } else if (fin >= today) {
      return { label: 'En cours', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    } else {
      return { label: 'Terminé', class: 'bg-gray-100 text-gray-600 border border-gray-200' };
    }
  }

  getEventValidationErrors(ev: AdminEvenement | null): string[] {
    if (!ev) return ['Aucun événement'];
    const errors: string[] = [];

    if (!ev.nom?.fr?.trim()) {
      errors.push('Nom FR obligatoire');
    }
    const hasCatalogDest = !!(ev.destinationId && ev.destinationId > 0);
    const hasLieuLibre = !!(ev.lieuLibre && ev.lieuLibre.trim().length > 0);
    if (!hasCatalogDest && !hasLieuLibre) {
      errors.push('Lieu obligatoire (destination du catalogue ou lieu personnalisé)');
    }
    if (ev.dateDebut && ev.dateFin && ev.dateFin < ev.dateDebut) {
      errors.push('Date de fin antérieure à la date de début');
    }

    return errors;
  }

  isEventSaveDisabled(ev: AdminEvenement | null): boolean {
    return this.getEventValidationErrors(ev).length > 0;
  }

  formatEventDateDisplay(dateDebut?: string, dateFin?: string): string {
    if (!dateDebut && !dateFin) return 'Dates à définir';
    if (dateDebut && !dateFin) return this.formatDate(dateDebut);
    if (!dateDebut && dateFin) return `Jusqu'au ${this.formatDate(dateFin)}`;
    if (dateDebut && dateFin) {
      if (dateDebut === dateFin) return this.formatDate(dateDebut);
      return `${this.formatDate(dateDebut)} → ${this.formatDate(dateFin)}`;
    }
    return 'Dates à définir';
  }

  get filteredUsers(): AdminUser[] {
    // Users are now paginated server-side, just return them
    return this.users;
  }

  // === USERS MANAGEMENT ===
  
  loadUsers(): void {
    this.usersLoading = true;
    const statut = this.usersStatutFilter !== 'Tous' ? this.usersStatutFilter : undefined;
    const role = this.usersRoleFilter !== 'Tous' ? this.usersRoleFilter : undefined;
    const search = this.usersQuery || undefined;
    const dateFrom = this.usersDateFrom || undefined;
    const dateTo = this.usersDateTo || undefined;
    
    console.log('[Admin] Loading users with filters:', { statut, role, search, dateFrom, dateTo, page: this.usersCurrentPage, size: this.usersPageSize });
    
    // Sync filters to URL query params
    this.syncUsersUrlParams();
    
    this.adminUserService.getUsers(
      this.usersCurrentPage,
      this.usersPageSize,
      statut,
      role,
      search,
      this.usersSortKey,
      this.usersSortDir.toUpperCase(),
      dateFrom,
      dateTo
    ).subscribe({
      next: (response) => {
        this.users = response.content.map(u => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom,
          email: u.email,
          telephone: u.telephone,
          pays: u.pays,
          dateNaissance: u.dateNaissance,
          role: u.role,
          statut: u.statut,
          provider: u.provider,
          languePreferee: u.languePreferee,
          preferences: u.preferences,
          dateCreation: u.dateCreation,
          dateCreationFormatted: u.dateCreationFormatted
        }));
        this.usersTotalElements = response.totalElements;
        this.usersTotalPages = response.totalPages;
        this.usersLoading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.usersLoading = false;
        this.showToast('Erreur lors du chargement des utilisateurs', 'error');
      }
    });
  }
  
  loadUserStats(): void {
    this.adminUserService.getUserStats().subscribe({
      next: (stats) => {
        this.userStats = stats;
      },
      error: (err) => {
        console.error('Error loading user stats:', err);
      }
    });
  }
  
  onUsersFilterChange(): void {
    this.usersCurrentPage = 0; // Reset to first page
    this.loadUsers();
  }
  
  private syncUsersUrlParams(): void {
    console.log('[Admin] Syncing URL params...', { 
      statut: this.usersStatutFilter, 
      role: this.usersRoleFilter, 
      search: this.usersQuery,
      dateFrom: this.usersDateFrom,
      dateTo: this.usersDateTo,
      page: this.usersCurrentPage,
      size: this.usersPageSize
    });
    
    const queryParams: any = {};
    
    // Add filters to URL
    if (this.usersStatutFilter && this.usersStatutFilter !== 'Tous') {
      queryParams.statut = this.usersStatutFilter;
    }
    if (this.usersRoleFilter && this.usersRoleFilter !== 'Tous') {
      queryParams.role = this.usersRoleFilter;
    }
    if (this.usersQuery) {
      queryParams.search = this.usersQuery;
    }
    if (this.usersDateFrom) {
      queryParams.dateFrom = this.usersDateFrom;
    }
    if (this.usersDateTo) {
      queryParams.dateTo = this.usersDateTo;
    }
    if (this.usersCurrentPage > 0) {
      queryParams.page = this.usersCurrentPage;
    }
    if (this.usersPageSize !== 20) {
      queryParams.size = this.usersPageSize;
    }
    
    console.log('[Admin] Query params to set:', queryParams);
    
    // Update URL using location.replaceState (more reliable for query params)
    const url = this.router.createUrlTree(['/admin/users'], { queryParams }).toString();
    console.log('[Admin] Generated URL:', url);
    this.location.replaceState(url);
    console.log('[Admin] URL updated via location.replaceState');
  }
  
  onUsersPageChange(page: number): void {
    this.usersCurrentPage = page;
    this.loadUsers();
  }
  
  onUsersPageSizeChange(size: number): void {
    this.usersPageSize = size;
    this.usersCurrentPage = 0;
    this.loadUsers();
  }
  
  toggleUserStatus(user: AdminUser): void {
    const isActivating = user.statut === 'DESACTIVE';
    
    this.userActionModalData = {
      user: user,
      action: 'toggle',
      title: isActivating ? 'Réactiver ce compte' : 'Désactiver ce compte',
      message: isActivating 
        ? `Vous êtes sur le point de réactiver le compte de <strong>${user.prenom} ${user.nom}</strong>. L'utilisateur pourra à nouveau se connecter et utiliser l'application.`
        : `Vous êtes sur le point de désactiver le compte de <strong>${user.prenom} ${user.nom}</strong>. Ce compte sera désactivé, ses données seront conservées, mais l'utilisateur ne pourra plus se connecter.`,
      confirmText: isActivating ? 'Réactiver' : 'Désactiver',
      confirmClass: isActivating ? 'bg-[#6B8E4E] hover:bg-[#5A7A3F]' : 'bg-[#D97D45] hover:bg-[#C86D35]'
    };
    
    this.showUserActionModal = true;
  }
  
  confirmUserAction(): void {
    if (!this.userActionModalData.user) return;
    
    if (this.userActionModalData.action === 'toggle') {
      const user = this.userActionModalData.user;
      const newStatut = user.statut === 'ACTIF' ? 'DESACTIVE' : 'ACTIF';
      const action = newStatut === 'ACTIF' ? 'activer' : 'désactiver';
      
      this.adminUserService.updateUserStatus(user.id, newStatut).subscribe({
        next: (updated) => {
          user.statut = updated.statut;
          this.showToast(`Utilisateur ${action === 'activer' ? 'activé' : 'désactivé'} avec succès`, 'success');
          this.loadUserStats();
          this.closeUserActionModal();
        },
        error: (err) => {
          console.error('Error updating user status:', err);
          this.showToast(`Erreur lors de la modification du statut`, 'error');
          this.closeUserActionModal();
        }
      });
    } else if (this.userActionModalData.action === 'delete') {
      const user = this.userActionModalData.user;

      this.adminUserService.deleteUser(user.id).subscribe({
        next: () => {
          this.showToast('Utilisateur supprimé avec succès', 'success');
          this.loadUsers();
          this.loadUserStats();
          this.closeUserActionModal();
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          // Tente d'extraire le message détaillé du backend
          // (ex: "constraint violation", "still referenced", etc.) pour faciliter
          // le diagnostic au lieu d'afficher un message générique.
          const backendMessage =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            null;
          const detailSuffix = backendMessage ? ` (${backendMessage})` : '';
          this.showToast(`Erreur lors de la suppression${detailSuffix}`, 'error');
          this.closeUserActionModal();
        }
      });
    }
  }
  
  closeUserActionModal(): void {
    this.showUserActionModal = false;
    this.userActionModalData = {
      user: null,
      action: 'toggle',
      title: '',
      message: '',
      confirmText: '',
      confirmClass: ''
    };
  }
  
  deleteUser(user: AdminUser): void {
    this.userActionModalData = {
      user: user,
      action: 'delete',
      title: 'Supprimer définitivement ce compte',
      message: `Vous êtes sur le point de supprimer définitivement le compte de <strong>${user.prenom} ${user.nom}</strong>. <br><br><span class="text-red-600 font-semibold">Cette action est irréversible</span> et toutes les données associées à ce compte (avis, itinéraires, favoris) seront également supprimées.`,
      confirmText: 'Supprimer définitivement',
      confirmClass: 'bg-red-600 hover:bg-red-700'
    };
    
    this.showUserActionModal = true;
  }
  
  getProviderBadgeColor(provider: string): string {
    switch (provider) {
      case 'GOOGLE': return 'bg-red-100 text-red-700';
      case 'FACEBOOK': return 'bg-blue-100 text-blue-700';
      case 'LOCAL': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
  
  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'TOURISTE': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
  
  // ============ REVIEWS METHODS ============
  
  loadReviews(): void {
    this.reviewsLoading = true;
    this.syncReviewsUrlParams(); // Sync URL params
    
    console.log('[Admin] Loading reviews with filters');
    console.log('[Admin] reviewsStatutFilter value:', this.reviewsStatutFilter);
    console.log('[Admin] reviewsStatutFilter type:', typeof this.reviewsStatutFilter);
    
    // Build query params
    const params: any = {
      page: this.reviewsCurrentPage,
      size: this.reviewsPageSize,
      sort: `${this.reviewsSortKey},${this.reviewsSortDir}`
    };
    
    if (this.reviewsStatutFilter && this.reviewsStatutFilter !== 'Tous') {
      params.statut = this.reviewsStatutFilter;
      console.log('[Admin] Added statut to params:', params.statut);
    } else {
      console.log('[Admin] Statut filter skipped (value is "Tous" or empty)');
    }
    if (this.reviewsSentimentFilter && this.reviewsSentimentFilter !== 'Tous') {
      params.sentiment = this.reviewsSentimentFilter;
      console.log('[Admin] Added sentiment to params:', params.sentiment);
    }
    if (this.reviewsDestinationFilter) {
      params.destinationSearch = this.reviewsDestinationFilter;
      console.log('[Admin] Added destinationSearch to params:', params.destinationSearch);
    }
    if (this.reviewsMinNote !== undefined && this.reviewsMinNote !== null) {
      params.minNote = this.reviewsMinNote;
    }
    if (this.reviewsMaxNote !== undefined && this.reviewsMaxNote !== null) {
      params.maxNote = this.reviewsMaxNote;
    }
    if (this.reviewsQuery) {
      params.search = this.reviewsQuery;
    }
    if (this.reviewsDateFrom) {
      params.dateFrom = this.reviewsDateFrom;
    }
    if (this.reviewsDateTo) {
      params.dateTo = this.reviewsDateTo;
    }
    
    console.log('[Admin] Final params object being sent to backend:', params);
    console.log('[Admin] Params as JSON:', JSON.stringify(params, null, 2));
    
    this.adminReviewService.getReviews(params).subscribe({
      next: (response) => {
        console.log('[Admin] Raw response from backend:', response);
        console.log('[Admin] First review raw:', response.content[0]);
        
        this.reviewsList = response.content.map(r => {
          // Extract multilingual name (nom is an object {ar, en, fr})
          const getNameFromMultilingual = (nomObj: any): string => {
            if (!nomObj) return '';
            if (typeof nomObj === 'string') return nomObj;
            return nomObj.fr || nomObj.en || nomObj.ar || '';
          };

          console.log('[Admin] Raw review:', r);
          console.log('[Admin] User data:', r.utilisateur);
          console.log('[Admin] Destination data:', r.destination);
          console.log('[Admin] Event data:', r.evenement);

          const mapped = {
            id: r.avisId,
            note: r.note,
            commentaire: r.commentaire,
            sentimentLabel: r.sentimentLabel,
            sentimentScore: r.sentimentScore,
            statutModeration: r.statutModeration,
            dateCreation: r.dateCreation,
            dateCreationFormatted: this.formatDate(r.dateCreation),
            authorName: r.utilisateur ? `${r.utilisateur.prenom || ''} ${r.utilisateur.nom || ''}`.trim() : 'Anonyme',
            authorEmail: r.utilisateur?.email || '',
            destinationName: getNameFromMultilingual(r.destination?.nom) || getNameFromMultilingual(r.evenement?.nom) || '',
            destinationId: r.destination?.destinationId || 0,
            destinationAvgRating: r.destination?.noteAverage, // Add average rating
            evenementName: getNameFromMultilingual(r.evenement?.nom) || '',
            evenementId: r.evenement?.evenementId || 0,
            expanded: false // For "voir plus" functionality
          };
          console.log('[Admin] Mapped review:', mapped);
          return mapped;
        });
        
        this.reviewsTotalElements = response.totalElements;
        this.reviewsTotalPages = response.totalPages;
        this.reviewsLoading = false;
        console.log('[Admin] Final reviewsList:', this.reviewsList);
      },
      error: (err) => {
        console.error('Error loading reviews:', err);
        this.reviewsLoading = false;
        this.showToast('Erreur lors du chargement des avis', 'error');
      }
    });
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  loadReviewStats(): void {
    this.adminReviewService.getStats().subscribe({
      next: (stats) => {
        this.reviewStats = stats;
        // Update badge in nav
        const reviewsNav = this.navItems.find(item => item.id === 'reviews');
        if (reviewsNav) {
          reviewsNav.badge = stats.enAttente;
        }
        console.log('[Admin] Review stats loaded:', stats);
      },
      error: (err) => {
        console.error('Error loading review stats:', err);
      }
    });
  }

  retrySentimentAnalysis(): void {
    if (this.isRetryingSentiment) return;
    
    this.isRetryingSentiment = true;
    console.log('[Admin] Retrying sentiment analysis for reviews without sentiment');
    
    this.http.post<any>('http://localhost:8082/api/admin/reviews/retry-sentiment', {})
      .subscribe({
        next: (response) => {
          console.log('[Admin] Sentiment retry response:', response);
          this.showToast(response.message || 'Analyse lancée avec succès', 'success');
          this.isRetryingSentiment = false;
          
          // Reload reviews after a few seconds to show updated sentiments
          setTimeout(() => {
            this.loadReviews();
          }, 3000);
        },
        error: (err) => {
          console.error('[Admin] Error retrying sentiment analysis:', err);
          this.showToast('Erreur lors du lancement de l\'analyse', 'error');
          this.isRetryingSentiment = false;
        }
      });
  }
  
  // Destination autocomplete methods
  onDestinationSearchChange(query: string): void {
    // Clear previous timeout
    if (this.destinationSearchTimeout) {
      clearTimeout(this.destinationSearchTimeout);
    }
    
    // Reset suggestions if query is too short
    if (!query || query.length < 2) {
      this.destinationSuggestions = [];
      return;
    }
    
    // Debounce: wait 300ms before searching
    this.destinationSearchTimeout = setTimeout(() => {
      this.searchDestinations(query);
    }, 300);
  }
  
  searchDestinations(query: string): void {
    fetch(`http://localhost:8082/api/destinations/search?q=${encodeURIComponent(query)}`)
      .then(response => response.json())
      .then(data => {
        this.destinationSuggestions = data;
        this.showDestinationSuggestions = true;
      })
      .catch(err => {
        console.error('Error searching destinations:', err);
        this.destinationSuggestions = [];
      });
  }
  
  selectDestination(dest: any): void {
    const nomFr = dest.nom?.fr || dest.nom?.en || dest.nom?.ar || '';
    this.reviewsDestinationQuery = nomFr;
    this.reviewsDestinationFilter = nomFr;
    this.showDestinationSuggestions = false;
    this.destinationSuggestions = [];
    this.onReviewsFilterChange();
  }
  
  clearDestinationFilter(): void {
    this.reviewsDestinationQuery = '';
    this.reviewsDestinationFilter = '';
    this.destinationSuggestions = [];
    this.showDestinationSuggestions = false;
    this.onReviewsFilterChange();
  }
  
  onDestinationBlur(): void {
    // Delay hiding suggestions to allow click event to fire
    setTimeout(() => {
      this.showDestinationSuggestions = false;
    }, 200);
  }
  
  private syncReviewsUrlParams(): void {
    const queryParams: any = {};
    
    if (this.reviewsStatutFilter && this.reviewsStatutFilter !== 'Tous') {
      queryParams.statut = this.reviewsStatutFilter;
    }
    if (this.reviewsSentimentFilter && this.reviewsSentimentFilter !== 'Tous') {
      queryParams.sentiment = this.reviewsSentimentFilter;
    }
    if (this.reviewsDestinationFilter) {
      queryParams.destinationSearch = this.reviewsDestinationFilter;
    }
    if (this.reviewsMinNote !== undefined) {
      queryParams.minNote = this.reviewsMinNote;
    }
    if (this.reviewsMaxNote !== undefined) {
      queryParams.maxNote = this.reviewsMaxNote;
    }
    if (this.reviewsQuery) {
      queryParams.search = this.reviewsQuery;
    }
    if (this.reviewsDateFrom) {
      queryParams.dateFrom = this.reviewsDateFrom;
    }
    if (this.reviewsDateTo) {
      queryParams.dateTo = this.reviewsDateTo;
    }
    if (this.reviewsCurrentPage > 0) {
      queryParams.page = this.reviewsCurrentPage;
    }
    if (this.reviewsPageSize !== 20) {
      queryParams.size = this.reviewsPageSize;
    }
    
    const url = this.router.createUrlTree(['/admin/reviews'], { queryParams }).toString();
    this.location.replaceState(url);
  }
  
  onReviewsFilterChange(): void {
    this.reviewsCurrentPage = 0;
    this.loadReviews();
  }
  
  onReviewsNoteRangeChange(): void {
    // Ensure min is not greater than max
    if (this.reviewsMinNote > this.reviewsMaxNote) {
      this.reviewsMinNote = this.reviewsMaxNote;
    }
    this.onReviewsFilterChange();
  }
  
  onReviewsPageChange(page: number): void {
    this.reviewsCurrentPage = page;
    this.loadReviews();
  }
  
  onReviewsPageSizeChange(size: number): void {
    this.reviewsPageSize = size;
    this.reviewsCurrentPage = 0;
    this.loadReviews();
  }
  
  toggleReviewSelection(reviewId: number): void {
    if (this.selectedReviewIds.has(reviewId)) {
      this.selectedReviewIds.delete(reviewId);
    } else {
      this.selectedReviewIds.add(reviewId);
    }
  }
  
  selectAllReviews(event: any): void {
    if (event.target.checked) {
      this.reviewsList.forEach(r => this.selectedReviewIds.add(r.id));
    } else {
      this.selectedReviewIds.clear();
    }
  }
  
  approveReview(review: ReviewDisplay): void {
    this.adminReviewService.updateModerationStatus(review.id, 'VALIDE').subscribe({
      next: () => {
        this.showToast('Avis publié avec succès', 'success');
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error approving review:', err);
        // Check if it's a duplicate error
        if (err.error?.error === 'DUPLICATE_ACTIVE_REVIEW') {
          this.showToast(err.error.message, 'error');
        } else {
          this.showToast('Erreur lors de la publication', 'error');
        }
      }
    });
  }
  
  rejectReview(review: ReviewDisplay): void {
    if (!confirm('Voulez-vous vraiment masquer cet avis ?\n\nL\'avis ne sera plus visible publiquement.')) {
      return;
    }
    
    this.adminReviewService.updateModerationStatus(review.id, 'MASQUE').subscribe({
      next: () => {
        this.showToast('Avis masqué avec succès', 'success');
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error rejecting review:', err);
        this.showToast('Erreur lors du masquage', 'error');
      }
    });
  }
  
  deleteReview(review: ReviewDisplay): void {
    if (!confirm(`Voulez-vous vraiment supprimer cet avis de ${review.authorName} ?\n\nCette action est irréversible.`)) {
      return;
    }
    
    this.adminReviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.showToast('Avis supprimé avec succès', 'success');
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error deleting review:', err);
        this.showToast('Erreur lors de la suppression', 'error');
      }
    });
  }
  
  bulkApproveReviews(): void {
    const ids = Array.from(this.selectedReviewIds);
    if (ids.length === 0) return;
    
    this.adminReviewService.bulkModeration(ids, 'VALIDE').subscribe({
      next: () => {
        this.showToast(`${ids.length} avis publiés avec succès`, 'success');
        this.selectedReviewIds.clear();
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error bulk approving reviews:', err);
        this.showToast('Erreur lors de la publication en masse', 'error');
      }
    });
  }
  
  bulkRejectReviews(): void {
    const ids = Array.from(this.selectedReviewIds);
    if (ids.length === 0) return;
    
    if (!confirm(`Voulez-vous vraiment masquer ${ids.length} avis ?\n\nCes avis ne seront plus visibles publiquement.`)) {
      return;
    }
    
    this.adminReviewService.bulkModeration(ids, 'MASQUE').subscribe({
      next: () => {
        this.showToast(`${ids.length} avis masqués avec succès`, 'success');
        this.selectedReviewIds.clear();
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error bulk rejecting reviews:', err);
        this.showToast('Erreur lors du masquage en masse', 'error');
      }
    });
  }
  
  bulkDeleteReviews(): void {
    const ids = Array.from(this.selectedReviewIds);
    if (ids.length === 0) return;
    
    if (!confirm(`Voulez-vous vraiment supprimer ${ids.length} avis ?\n\nCette action est irréversible.`)) {
      return;
    }
    
    this.adminReviewService.bulkDelete(ids).subscribe({
      next: () => {
        this.showToast(`${ids.length} avis supprimés avec succès`, 'success');
        this.selectedReviewIds.clear();
        this.loadReviews();
        this.loadReviewStats();
      },
      error: (err) => {
        console.error('Error bulk deleting reviews:', err);
        this.showToast('Erreur lors de la suppression en masse', 'error');
      }
    });
  }
  
  getModerationBadgeColor(statut: string): { bg: string; text: string; dot: string } {
    switch (statut) {
      case 'EN_ATTENTE':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
      case 'VALIDE':
        return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
      case 'MASQUE':
        return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
    }
  }
  
  getModerationLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'VALIDE': return 'Publié';
      case 'MASQUE': return 'Masqué';
      default: return statut;
    }
  }
  
  getSentimentBadge(label: string | null): { bg: string; text: string; label: string } | null {
    if (!label) return null;
    
    switch (label.toUpperCase()) {
      case 'POSITIF':
        return { bg: 'bg-green-50', text: 'text-green-700', label: 'Positif' };
      case 'NEGATIF':
        return { bg: 'bg-red-50', text: 'text-red-700', label: 'Négatif' };
      case 'NEUTRE':
        return { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Neutre' };
      default:
        return null;
    }
  }
  
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  openReviewDetailModal(review: ReviewDisplay): void {
    this.selectedReviewDetail = review;
  }
  
  closeReviewDetailModal(): void {
    this.selectedReviewDetail = null;
  }
  
  confirmDeleteReview(review: ReviewDisplay): void {
    if (window.confirm('Cet avis sera définitivement supprimé. Confirmer ?')) {
      this.deleteReview(review);
      this.closeReviewDetailModal();
    }
  }
  
  getStarArray(note: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < note);
  }
  
  getStatutBadgeColor(statut: string): string {
    switch (statut) {
      case 'ACTIF': return 'bg-green-100 text-green-700';
      case 'DESACTIVE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
  
  getCountryFlag(countryName: string | undefined): string {
    if (!countryName) return '';
    
    // Direct mapping to flag emojis
    const countryFlags: Record<string, string> = {
      // French names
      'Tunisie': '🇹🇳',
      'France': '🇫🇷',
      'Algérie': '🇩🇿',
      'Maroc': '🇲🇦',
      'Libye': '🇱🇾',
      'Égypte': '🇪🇬',
      'Italie': '🇮🇹',
      'Espagne': '🇪🇸',
      'Allemagne': '🇩🇪',
      'Royaume-Uni': '🇬🇧',
      'États-Unis': '🇺🇸',
      'Canada': '🇨🇦',
      'Belgique': '🇧🇪',
      'Suisse': '🇨🇭',
      'Pays-Bas': '🇳🇱',
      'Portugal': '🇵🇹',
      'Turquie': '🇹🇷',
      'Émirats arabes unis': '🇦🇪',
      'Arabie saoudite': '🇸🇦',
      'Qatar': '🇶🇦',
      'Koweït': '🇰🇼',
      'Bahreïn': '🇧🇭',
      'Oman': '🇴🇲',
      'Liban': '🇱🇧',
      'Jordanie': '🇯🇴',
      'Palestine': '🇵🇸',
      'Syrie': '🇸🇾',
      'Irak': '🇮🇶',
      'Yémen': '🇾🇪',
      'Mauritanie': '🇲🇷',
      'Sénégal': '🇸🇳',
      'Mali': '🇲🇱',
      'Afrique du Sud': '🇿🇦',
      'Nigeria': '🇳🇬',
      'Chine': '🇨🇳',
      'Japon': '🇯🇵',
      'Corée du Sud': '🇰🇷',
      'Inde': '🇮🇳',
      'Pakistan': '🇵🇰',
      'Bangladesh': '🇧🇩',
      'Thaïlande': '🇹🇭',
      'Vietnam': '🇻🇳',
      'Malaisie': '🇲🇾',
      'Singapour': '🇸🇬',
      'Indonésie': '🇮🇩',
      'Philippines': '🇵🇭',
      'Australie': '🇦🇺',
      'Nouvelle-Zélande': '🇳🇿',
      'Russie': '🇷🇺',
      'Ukraine': '🇺🇦',
      'Pologne': '🇵🇱',
      'Roumanie': '🇷🇴',
      'Hongrie': '🇭🇺',
      'Tchéquie': '🇨🇿',
      'Croatie': '🇭🇷',
      'Serbie': '🇷🇸',
      'Grèce': '🇬🇷',
      'Suède': '🇸🇪',
      'Norvège': '🇳🇴',
      'Danemark': '🇩🇰',
      'Finlande': '🇫🇮',
      'Islande': '🇮🇸',
      'Irlande': '🇮🇪',
      'Autriche': '🇦🇹',
      'Mexique': '🇲🇽',
      'Brésil': '🇧🇷',
      'Argentine': '🇦🇷',
      'Chili': '🇨🇱',
      'Colombie': '🇨🇴',
      'Pérou': '🇵🇪',
      
      // English names
      'Tunisia': '🇹🇳',
      'Algeria': '🇩🇿',
      'Morocco': '🇲🇦',
      'Libya': '🇱🇾',
      'Egypt': '🇪🇬',
      'Italy': '🇮🇹',
      'Spain': '🇪🇸',
      'Germany': '🇩🇪',
      'United Kingdom': '🇬🇧',
      'United States': '🇺🇸',
      'Belgium': '🇧🇪',
      'Switzerland': '🇨🇭',
      'Netherlands': '🇳🇱',
      'Turkey': '🇹🇷',
      'UAE': '🇦🇪',
      'Saudi Arabia': '🇸🇦',
      'Kuwait': '🇰🇼',
      'Bahrain': '🇧🇭',
      'Lebanon': '🇱🇧',
      'Jordan': '🇯🇴',
      'Syria': '🇸🇾',
      'Iraq': '🇮🇶',
      'Yemen': '🇾🇪',
      'China': '🇨🇳',
      'Japan': '🇯🇵',
      'South Korea': '🇰🇷',
      'India': '🇮🇳',
      'Thailand': '🇹🇭',
      'Malaysia': '🇲🇾',
      'Singapore': '🇸🇬',
      'Indonesia': '🇮🇩',
      'Australia': '🇦🇺',
      'New Zealand': '🇳🇿',
      'Russia': '🇷🇺',
      'Poland': '🇵🇱',
      'Romania': '🇷🇴',
      'Hungary': '🇭🇺',
      'Czech Republic': '🇨🇿',
      'Croatia': '🇭🇷',
      'Serbia': '🇷🇸',
      'Greece': '🇬🇷',
      'Sweden': '🇸�',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Finland': '🇫🇮',
      'Iceland': '🇮🇸',
      'Ireland': '🇮🇪',
      'Austria': '🇦🇹',
      'Mexico': '🇲🇽',
      'Brazil': '🇧🇷',
      'Argentina': '🇦🇷',
      'Chile': '🇨🇱',
      'Colombia': '🇨🇴',
      'Peru': '🇵🇪',
      'South Africa': '🇿🇦'
    };
    
    return countryFlags[countryName] || '🌍';
  }

  get filteredActivities(): ActivityRow[] {
    return [...this.activities]
      .filter(r => {
        if (this.activityActionFilter !== 'Tous' && r.action !== this.activityActionFilter) return false;
        if (this.activityAdminFilter !== 'Tous' && r.admin !== this.activityAdminFilter) return false;
        if (this.activityDateFrom && r.datetime.slice(0, 10).split('/').reverse().join('-') < this.activityDateFrom) return false;
        if (this.activityDateTo && r.datetime.slice(0, 10).split('/').reverse().join('-') > this.activityDateTo) return false;
        return true;
      });
  }

  get pendingReviewsCount(): number { return this.reviews.filter(r => r.status === 'En attente').length; }

  deleteDestination(id: number): void { this.destinations = this.destinations.filter(d => d.id !== id); }

  sortDest(col: string): void { if (this.destSortKey === col) this.destSortDir = this.destSortDir === 'asc' ? 'desc' : 'asc'; else { this.destSortKey = col; this.destSortDir = 'desc'; } }

  getStatusColor(status: string): string { return (this.statusColors as Record<string, string>)[status] ?? '#9CA3AF'; }
  getActionStyle(action: string): { bg: string; color: string } { return (this.actionStyle as Record<string, any>)[action] ?? { bg: '#f0f0f0', color: '#666' }; }
  resetActivityFilters(): void { this.activityActionFilter = 'Tous'; this.activityAdminFilter = 'Tous'; this.activityDateFrom = ''; this.activityDateTo = ''; }

  // --- JOURNAL D'ACTIVITE REAL API METHODS ---
  loadJournal(): void {
    this.journalLoading = true;
    this.journalError = null;
    this.syncJournalUrlParams();

    this.adminJournalService.getJournal(
      this.journalTypeActionFilter,
      this.journalEntiteTypeFilter,
      this.journalSearchQuery,
      this.journalDateFrom,
      this.journalDateTo,
      this.journalCurrentPage,
      this.journalPageSize
    ).subscribe({
      next: (res) => {
        this.journalEntries = res.content || [];
        this.journalTotalElements = res.totalElements;
        this.journalTotalPages = res.totalPages;
        this.journalLoading = false;
      },
      error: (err) => {
        console.error('[ADMIN JOURNAL] Erreur de chargement du journal', err);
        this.journalError = 'Impossible de charger le journal d\'activité. Veuillez réessayer.';
        this.journalLoading = false;
      }
    });
  }

  // --- STATS DASHBOARD METHODS ---
  loadStatsData(): void {
    this.statsLoading = true;
    
    // Charger l'overview
    this.adminStatsService.getOverview().subscribe({
      next: (data) => {
        this.statsOverview = { ...data };
      },
      error: (err) => console.error('Erreur chargement stats overview:', err)
    });
    
    // Charger destinations par région — spread pour garantir une nouvelle référence → ngOnChanges
    this.adminStatsService.getDestinationsByRegion().subscribe({
      next: (data) => {
        this.statsDestByRegion = { ...data };
      },
      error: (err) => console.error('Erreur chargement stats by region:', err)
    });
    
    // Charger destinations par type — spread pour garantir une nouvelle référence → ngOnChanges
    this.adminStatsService.getDestinationsByType().subscribe({
      next: (data) => {
        this.statsDestByType = { ...data };
      },
      error: (err) => console.error('Erreur chargement stats by type:', err)
    });
    
    // Charger activité récente
    this.adminStatsService.getRecentActivity().subscribe({
      next: (data) => {
        this.statsRecentActivity = data;
        this.statsLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement recent activity:', err);
        this.statsLoading = false;
      }
    });

    // Charger statistiques de fréquentation
    this.loadFrequentationData();
  }

  loadFrequentationData(period?: 'TODAY' | '7D' | '30D' | 'YEAR'): void {
    if (period) {
      this.frequentationPeriod = period;
    }
    this.frequentationLoading = true;
    this.adminStatsService.getFrequentation(this.frequentationPeriod).subscribe({
      next: (data) => {
        this.frequentationStats = {
          ...data,
          dailyEvolution: { ...data.dailyEvolution }
        };
        this.frequentationLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement stats frequentation:', err);
        this.frequentationLoading = false;
      }
    });
  }

  onFrequentationPeriodChange(p: 'TODAY' | '7D' | '30D' | 'YEAR'): void {
    this.frequentationPeriod = p;
    this.loadFrequentationData(p);
  }

  onRegionChartClick(gouvernorat: string): void {
    if (!gouvernorat) return;
    this.setSection('destinations');
    this.modRegionFilter = gouvernorat;
    this.currentPage = 0;
    this.selectedIds.clear();
    this.loadModerationData();
    this.syncUrlParams();
    this.showToast(`Filtre appliqué : Gouvernorat "${gouvernorat}"`, 'success');
  }

  onTypeChartClick(type: string): void {
    if (!type) return;
    // Note: /admin/destinations filtre par catégorie (CULTUREL, etc.) et recherche textuelle
    this.setSection('destinations');
    this.modSearchQuery = type;
    this.currentPage = 0;
    this.selectedIds.clear();
    this.loadModerationData();
    this.syncUrlParams();
  }

  openDestinationFromTop(dest: TopDestination): void {
    if (!dest || !dest.destinationId) return;
    this.adminDestService.getDestination(dest.destinationId).subscribe(destination => {
      if (destination) {
        this.openSlideOver(destination);
      } else {
        // Fallback destination object conforming to ModerationDestination
        const fallback: ModerationDestination = {
          id: dest.destinationId,
          nom: { fr: dest.nom || '' },
          description: { fr: '' },
          type: 'SITE_TOURISTIQUE',
          region: dest.region || '',
          statut: 'ACTIF',
          qualityScore: 100,
          categories: [],
          photos: [],
          source: 'manuel',
          createdAt: new Date().toISOString()
        };
        this.openSlideOver(fallback);
      }
    });
  }

  exportTopDestinationsCsv(): void {
    if (!this.frequentationStats || !this.frequentationStats.topDestinations || this.frequentationStats.topDestinations.length === 0) {
      this.showToast('Aucune donnée de destination à exporter', 'error');
      return;
    }

    const headers = ['Rang', 'ID Destination', 'Nom Destination', 'Gouvernorat', 'Nombre de Vues'];
    const rows = this.frequentationStats.topDestinations.map((d, index) => [
      index + 1,
      d.destinationId,
      `"${(d.nom || '').replace(/"/g, '""')}"`,
      `"${(d.region || '').replace(/"/g, '""')}"`,
      d.viewsCount
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const periodLabel = this.frequentationPeriod.toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `rapport_destinations_consultees_${periodLabel}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Rapport CSV téléchargé avec succès', 'success');
  }

  getMaxRegionValue(): number {
    const values = Object.values(this.statsDestByRegion);
    return values.length > 0 ? Math.max(...values) : 1;
  }

  getMaxTypeValue(): number {
    const values = Object.values(this.statsDestByType);
    return values.length > 0 ? Math.max(...values) : 1;
  }

  onJournalFilterChange(): void {
    this.journalCurrentPage = 0;
    this.loadJournal();
  }

  resetJournalFilters(): void {
    this.journalTypeActionFilter = 'Tous';
    this.journalEntiteTypeFilter = 'Tous';
    this.journalSearchQuery = '';
    this.journalDateFrom = '';
    this.journalDateTo = '';
    this.journalCurrentPage = 0;
    this.loadJournal();
  }

  journalPageSizeOptions = [10, 15, 25, 50];

  changeJournalPage(p: number): void {
    if (p < 0 || (this.journalTotalPages > 0 && p >= this.journalTotalPages)) return;
    this.journalCurrentPage = p;
    this.loadJournal();
  }

  changeJournalPageSize(newSize: any): void {
    this.journalPageSize = Number(newSize);
    this.journalCurrentPage = 0;
    this.loadJournal();
  }

  get journalPagesArray(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, this.journalCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.journalTotalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get journalDisplayStart(): number {
    if (this.journalTotalElements === 0) return 0;
    return this.journalCurrentPage * this.journalPageSize + 1;
  }

  get journalDisplayEnd(): number {
    return Math.min((this.journalCurrentPage + 1) * this.journalPageSize, this.journalTotalElements);
  }

  journalPrevPage(): void {
    if (this.journalCurrentPage > 0) {
      this.journalCurrentPage--;
      this.loadJournal();
    }
  }

  journalNextPage(): void {
    if (this.journalCurrentPage < this.journalTotalPages - 1) {
      this.journalCurrentPage++;
      this.loadJournal();
    }
  }

  private syncJournalUrlParams(): void {
    const queryParams: any = {};
    if (this.journalTypeActionFilter && this.journalTypeActionFilter !== 'Tous') {
      queryParams.typeAction = this.journalTypeActionFilter;
    }
    if (this.journalEntiteTypeFilter && this.journalEntiteTypeFilter !== 'Tous') {
      queryParams.entiteType = this.journalEntiteTypeFilter;
    }
    if (this.journalSearchQuery && this.journalSearchQuery.trim()) {
      queryParams.search = this.journalSearchQuery.trim();
    }
    if (this.journalDateFrom) {
      queryParams.dateFrom = this.journalDateFrom;
    }
    if (this.journalDateTo) {
      queryParams.dateTo = this.journalDateTo;
    }
    if (this.journalCurrentPage > 0) {
      queryParams.page = this.journalCurrentPage;
    }
    if (this.journalPageSize !== 15) {
      queryParams.size = this.journalPageSize;
    }

    const url = this.router.createUrlTree(['/admin/journal'], { queryParams }).toString();
    this.location.replaceState(url);
  }

  getJournalActionBadge(action: string): { bg: string; color: string; border: string } {
    switch (action) {
      case 'CREATION':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' }; // Vert
      case 'MODIFICATION':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' }; // Bleu
      case 'SUPPRESSION':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }; // Rouge
      case 'MODERATION':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' }; // Orange/Ambre
      case 'CONNEXION':
        return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' }; // Violet
      case 'DECONNEXION':
        return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' }; // Gris
      default:
        return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
    }
  }

  getJournalEntiteBadge(entite: string): { bg: string; color: string } {
    switch (entite) {
      case 'DESTINATION':
        return { bg: '#E0F2FE', color: '#0369A1' };
      case 'EVENEMENT':
        return { bg: '#FDF2F8', color: '#DB2777' };
      case 'AVIS':
        return { bg: '#FEF3C7', color: '#B45309' };
      case 'UTILISATEUR':
        return { bg: '#F3E8FF', color: '#6D28D9' };
      case 'CONVERSATION':
        return { bg: '#ECFCCB', color: '#4D7C0F' };
      case 'ITINERAIRE':
        return { bg: '#CCFBF1', color: '#0F766E' };
      default:
        return { bg: '#F3F4F6', color: '#374151' };
    }
  }

  formatJournalDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
  
  private showToast(message: string, type: 'success' | 'error'): void {
    this.adminDestService.showToast(message, type);
  }

  getCountryCode(countryName: string | undefined): string {
    if (!countryName) return '';
    const trimmed = countryName.trim();
    if (trimmed.length === 2) return trimmed.toLowerCase();
    
    // Map country names to ISO 3166-1 alpha-2 codes (lowercase for flag-icons)
    const countryToCode: Record<string, string> = {
      // French names
      'Tunisie': 'tn', 'France': 'fr', 'Algérie': 'dz', 'Maroc': 'ma', 'Libye': 'ly',
      'Égypte': 'eg', 'Italie': 'it', 'Espagne': 'es', 'Allemagne': 'de', 'Royaume-Uni': 'gb',
      'États-Unis': 'us', 'Etats-Unis': 'us', 'Canada': 'ca', 'Belgique': 'be', 'Suisse': 'ch', 'Pays-Bas': 'nl',
      'Portugal': 'pt', 'Turquie': 'tr', 'Émirats arabes unis': 'ae', 'Arabie saoudite': 'sa',
      'Qatar': 'qa', 'Koweït': 'kw', 'Bahreïn': 'bh', 'Oman': 'om', 'Liban': 'lb',
      'Jordanie': 'jo', 'Palestine': 'ps', 'Syrie': 'sy', 'Irak': 'iq', 'Yémen': 'ye',
      'Mauritanie': 'mr', 'Sénégal': 'sn', 'Mali': 'ml', 'Afrique du Sud': 'za', 'Nigeria': 'ng',
      'Chine': 'cn', 'Japon': 'jp', 'Corée du Sud': 'kr', 'Inde': 'in', 'Pakistan': 'pk',
      'Bangladesh': 'bd', 'Thaïlande': 'th', 'Vietnam': 'vn', 'Malaisie': 'my', 'Singapour': 'sg',
      'Indonésie': 'id', 'Philippines': 'ph', 'Australie': 'au', 'Nouvelle-Zélande': 'nz',
      'Russie': 'ru', 'Ukraine': 'ua', 'Pologne': 'pl', 'Roumanie': 'ro', 'Hongrie': 'hu',
      'Tchéquie': 'cz', 'Croatie': 'hr', 'Serbie': 'rs', 'Grèce': 'gr', 'Suède': 'se',
      'Norvège': 'no', 'Danemark': 'dk', 'Finlande': 'fi', 'Islande': 'is', 'Irlande': 'ie',
      'Autriche': 'at', 'Mexique': 'mx', 'Brésil': 'br', 'Argentine': 'ar', 'Chili': 'cl',
      'Colombie': 'co', 'Pérou': 'pe',
      // English names
      'Tunisia': 'tn', 'Algeria': 'dz', 'Morocco': 'ma', 'Libya': 'ly', 'Egypt': 'eg',
      'Italy': 'it', 'Spain': 'es', 'Germany': 'de', 'United Kingdom': 'gb', 'United States': 'us',
      'Belgium': 'be', 'Switzerland': 'ch', 'Netherlands': 'nl', 'Turkey': 'tr', 'UAE': 'ae',
      'Saudi Arabia': 'sa', 'Kuwait': 'kw', 'Bahrain': 'bh', 'Lebanon': 'lb', 'Jordan': 'jo',
      'Syria': 'sy', 'Iraq': 'iq', 'Yemen': 'ye', 'China': 'cn', 'Japan': 'jp',
      'South Korea': 'kr', 'India': 'in', 'Thailand': 'th', 'Malaysia': 'my', 'Singapore': 'sg',
      'Indonesia': 'id', 'Australia': 'au', 'New Zealand': 'nz', 'Russia': 'ru', 'Poland': 'pl',
      'Romania': 'ro', 'Hungary': 'hu', 'Czech Republic': 'cz', 'Croatia': 'hr', 'Serbia': 'rs',
      'Greece': 'gr', 'Sweden': 'se', 'Norway': 'no', 'Denmark': 'dk', 'Finland': 'fi',
      'Iceland': 'is', 'Ireland': 'ie', 'Austria': 'at', 'Mexico': 'mx', 'Brazil': 'br',
      'Argentina': 'ar', 'Chile': 'cl', 'Colombia': 'co', 'Peru': 'pe', 'South Africa': 'za'
    };
    
    return countryToCode[countryName] || '';
  }
}