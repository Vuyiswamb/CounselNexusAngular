import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { recaptchaInterceptor } from './core/recaptcha.interceptor';
import { RecaptchaService } from './core/recaptcha.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([recaptchaInterceptor, authInterceptor])),
    provideAppInitializer(() => { void inject(RecaptchaService).load(); }),
  ],
};
