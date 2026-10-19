import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

interface GoogleRecaptcha {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
}

/**
 * Loads Google reCAPTCHA v3 and creates tokens for protected form submissions.
 * Never blocks a request: if Google cannot be reached, callers get null and carry on.
 */
@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly document = inject(DOCUMENT);
  private readonly siteKey: string = (environment as { recaptchaSiteKey?: string }).recaptchaSiteKey ?? '';
  private loading: Promise<GoogleRecaptcha | null> | null = null;

  /** Adds the reCAPTCHA script once, so Google can start scoring the visit early. */
  load(): Promise<GoogleRecaptcha | null> {
    if (this.loading) return this.loading;
    const win = this.document.defaultView as (Window & { grecaptcha?: GoogleRecaptcha }) | null;
    if (!this.siteKey || !win) return (this.loading = Promise.resolve(null));

    this.loading = new Promise((resolve) => {
      const done = () => (win.grecaptcha ? win.grecaptcha.ready(() => resolve(win.grecaptcha ?? null)) : resolve(null));
      if (win.grecaptcha) { done(); return; }
      const script = this.document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.siteKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = done;
      script.onerror = () => resolve(null);
      this.document.head.appendChild(script);
    });
    return this.loading;
  }

  /** Returns a reCAPTCHA token for the given action, or null after a short timeout. */
  async execute(action: string, timeoutMs = 4000): Promise<string | null> {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const token = (async () => {
      const grecaptcha = await this.load();
      if (!grecaptcha) return null;
      try { return await grecaptcha.execute(this.siteKey, { action }); } catch { return null; }
    })();
    return Promise.race([token, timeout]);
  }
}
