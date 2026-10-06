import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { API_BASE_URL } from './api';
import { ErrorPopupService } from './error-popup.service';

/** Attaches the JWT to every API request; on 401 signs the user out. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const baseUrl = inject(API_BASE_URL);
  const errors = inject(ErrorPopupService);

  if (req.url.startsWith(baseUrl)) {
    const token = auth.token;
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(req).pipe(
    catchError((err) => {
      if (err?.status === 401 && auth.isAuthenticated) {
        // Token expired/invalid — drop the session and bounce to login.
        auth.logout();
        router.navigate(['/login']);
      }
      if (err?.status !== 401 && err?.status !== 404) {
        const message = (typeof err?.error === 'string' ? err.error : null) ||
          err?.error?.detail || err?.error?.title || err?.error?.message ||
          (err?.status === 0 ? 'The API could not be reached. Check that the server is running.' :
            `The request failed${err?.status ? ` (HTTP ${err.status})` : ''}.`);
        errors.show(message, err?.status === 422 ? 'Please check your input' : 'Request failed');
      }
      return throwError(() => err);
    }),
  );
};
