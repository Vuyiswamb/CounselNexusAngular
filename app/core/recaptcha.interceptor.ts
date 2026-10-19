import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { RecaptchaService } from './recaptcha.service';

/** Public form submissions that get a reCAPTCHA v3 token, with the action name reported to Google. */
const PROTECTED: Array<{ pattern: RegExp; action: string }> = [
  { pattern: /\/api\/v1\/auth\/login$/, action: 'login' },
  { pattern: /\/api\/v1\/auth\/register$/, action: 'register' },
  { pattern: /\/api\/v1\/auth\/register-client$/, action: 'register_client' },
  { pattern: /\/api\/v1\/auth\/forgot-password$/, action: 'forgot_password' },
  { pattern: /\/api\/v1\/auth\/reset-password$/, action: 'reset_password' },
  { pattern: /\/api\/marketplace\/requests$/, action: 'legal_request' },
  { pattern: /\/api\/v1\/subscriptions\/checkout$/, action: 'checkout' },
];

/**
 * Adds a `recaptchaToken` field to the JSON body of protected form posts.
 * The API can verify it with the secret key on the server; until then the field is simply ignored.
 * If no token can be obtained, the request is sent unchanged so forms keep working.
 */
export const recaptchaInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'POST') return next(req);
  const url = req.url.split('?')[0];
  const match = PROTECTED.find((item) => item.pattern.test(url));
  const body = req.body;
  const isPlainObject = !!body && typeof body === 'object' && Object.getPrototypeOf(body) === Object.prototype;
  if (!match || !isPlainObject) return next(req);

  return from(inject(RecaptchaService).execute(match.action)).pipe(
    switchMap((token) => next(token ? req.clone({ body: { ...(body as Record<string, unknown>), recaptchaToken: token } }) : req)),
  );
};
