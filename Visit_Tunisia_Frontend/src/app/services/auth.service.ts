import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthUser, LoginRequest, LoginResponse, RegisterRequest, GoogleAuthRequest, CompleteProfileRequest, ApiResponse } from '../data/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8082/api/auth';
  private userSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  user$ = this.userSubject.asObservable();

  // Reference to FavoriteService (injected lazily to avoid circular dependency)
  private favoriteServiceRef?: any;

  constructor(private http: HttpClient) {}

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('vt_token');
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem('vt_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(data: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  googleAuth(idToken: string): Observable<LoginResponse> {
    const payload: GoogleAuthRequest = { idToken };
    return this.http.post<LoginResponse>(`${this.apiUrl}/google`, payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  completeProfile(data: CompleteProfileRequest): Observable<LoginResponse> {
    return this.http.put<LoginResponse>(`${this.apiUrl}/complete-profile`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, nouveauMotDePasse: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/reset-password`, { token, nouveauMotDePasse });
  }

  changePassword(ancienMotDePasse: string, nouveauMotDePasse: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/change-password`, { ancienMotDePasse, nouveauMotDePasse });
  }

  verifyEmail(data: { email: string; code: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-email`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  resendVerificationCode(data: { email: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/resend-verification`, data);
  }

  /**
   * Déclenche l'envoi d'un code de vérification à un email.
   * Utilisé quand l'utilisateur arrive sur /verify-email sans avoir de code
   * frais en cours (ex: redirection depuis le login d'un compte bloqué).
   */
  sendVerificationCode(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/send-verification`, { email });
  }

  logout(): void {
    localStorage.removeItem('vt_token');
    localStorage.removeItem('vt_user');
    this.userSubject.next(null);
    
    // Clear favorites on logout (lazy injection to avoid circular dependency)
    if (this.favoriteServiceRef) {
      this.favoriteServiceRef.clearFavorites();
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() != null && this.currentUser != null;
  }

  setFavoriteService(favoriteService: any): void {
    this.favoriteServiceRef = favoriteService;
  }

  setUser(user: AuthUser): void {
    localStorage.setItem('vt_user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  private handleAuthSuccess(res: LoginResponse): void {
    // Ne pas sauvegarder le token si la vérification d'email est requise
    if (res.emailVerificationRequired) {
      // L'utilisateur devra d'abord vérifier son email
      return;
    }
    
    if (res.token) {
      localStorage.setItem('vt_token', res.token);
    }
    if (res.utilisateur) {
      localStorage.setItem('vt_user', JSON.stringify(res.utilisateur));
      this.userSubject.next(res.utilisateur);
    }
  }
}
