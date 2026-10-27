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
  permissions: string[];
  emailConfirmed?: boolean;
  emailConfirmationDeadline?: string;
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

export interface RegisterClientRequest {
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

  register(request: RegisterFirmRequest, autoLogin = true): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/v1/auth/register`, request)
      .pipe(tap((response) => { if (autoLogin) this.storeSession(response); }));
  }

  registerClient(request: RegisterClientRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/v1/auth/register-client`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  confirmEmail(userId: string, token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/v1/auth/confirm-email`, { userId, token });
  }

  resendEmailConfirmation(email = this.user()?.email ?? ''): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/v1/auth/resend-confirmation`, { email });
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

  /** Returns whether the current user may access a module/action. */
  hasPermission(permission?: string): boolean {
    if (!permission) return true;
    const current = this.user();
    if (!current) return false;
    if (this.user()?.roles.some((role) => ['platformadmin', 'platformuser', 'superuser'].includes(role.toLowerCase()))) {
      return ['platform.email', 'platform.control', 'platform.reports', 'platform.billing', 'platform.gateways'].includes(permission);
    }
    if (current.roles.some((role) => role.toLowerCase() === 'systemadmin')) return true;
    return current.permissions.includes(permission);
  }

  isPlatformAdmin(): boolean {
    return this.user()?.roles.some((role) => role.toLowerCase() === 'platformadmin') ?? false;
  }

  isClientUser(): boolean {
    const roles = this.user()?.roles.map((role) => role.replace(/[\s_-]/g, '').toLowerCase()) ?? [];
    const clientRole = roles.some((role) => ['client', 'clientuser', 'requester', 'customer'].includes(role));
    const firmRole = roles.some((role) => ['partner', 'feeearner', 'lawyer', 'attorney', 'legalfirm', 'firmadmin', 'systemadmin'].includes(role));
    return clientRole && !firmRole && !this.isPlatformAdmin();
  }

  updateProfile(user: CurrentUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  private restore(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as Partial<CurrentUser>;
      return {
        id: stored.id ?? '',
        fullName: stored.fullName ?? '',
        email: stored.email ?? '',
        roles: stored.roles ?? [],
        permissions: this.permissionsFromToken(localStorage.getItem(TOKEN_KEY)),
        ...this.emailConfirmationFromToken(localStorage.getItem(TOKEN_KEY)),
      };
    } catch {
      return null;
    }
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    const user: CurrentUser = { ...response.user, permissions: this.permissionsFromToken(response.token), ...this.emailConfirmationFromToken(response.token) };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  private permissionsFromToken(token: string | null): string[] {
    if (!token) return [];
    try {
      const encoded = token.split('.')[1];
      if (!encoded) return [];
      const payload = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
      const claims = JSON.parse(atob(padded)) as { permission?: string | string[] };
      const permissions = claims.permission;
      return Array.isArray(permissions) ? permissions : permissions ? [permissions] : [];
    } catch {
      return [];
    }
  }

  private emailConfirmationFromToken(token: string | null): Pick<CurrentUser, 'emailConfirmed' | 'emailConfirmationDeadline'> {
    if (!token) return {};
    try {
      const encoded = token.split('.')[1];
      if (!encoded) return {};
      const payload = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
      const claims = JSON.parse(atob(padded)) as { email_confirmed?: string | boolean; email_confirmation_deadline?: string };
      return {
        emailConfirmed: claims.email_confirmed === true || claims.email_confirmed === 'true',
        emailConfirmationDeadline: claims.email_confirmation_deadline,
      };
    } catch {
      return {};
    }
  }
}
