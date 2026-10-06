import { InjectionToken } from '@angular/core';

/** Base URL of the CounselNexus API. Override via environment files later. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:5101',
});

export const TOKEN_KEY = 'cn.token';
export const USER_KEY = 'cn.user';
