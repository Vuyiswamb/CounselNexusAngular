import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from './api';

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  user: { id: string; fullName: string; email: string; roles: string[] };
}

export interface LoginChallenge {
  requiresTwoFactor: true;
}

export interface RegisterFirmRequest {
  firmName: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  developmentResetUrl?: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

/** JWT session: login/logout, token storage, current user signal. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = inject(API_BASE_URL);

  /** Signed-in user, or null. Reactive for the shell's user chip. */
  readonly user = signal<CurrentUser | null>(this.restore());

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  login(email: string, password: string, twoFactorCode?: string): Observable<LoginResponse | LoginChallenge> {
    return this.http
      .post<LoginResponse | LoginChallenge>(`${this.baseUrl}/api/v1/auth/login`, { email, password, twoFactorCode })
      .pipe(
        tap((res) => { if ('token' in res) this.storeSession(res); }),
      );
  }

  register(request: RegisterFirmRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/v1/auth/register`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.baseUrl}/api/v1/auth/forgot-password`, { email });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/v1/auth/reset-password`, request);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  initials(): string {
    const name = this.user()?.fullName ?? '';
    return (
      name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'
    );
  }

  private restore(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.user.set(response.user);
  }
}
