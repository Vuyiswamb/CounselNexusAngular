import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Base URL of the CounselNexus API for the selected Angular build environment. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

export const TOKEN_KEY = 'cn.token';
export const USER_KEY = 'cn.user';
