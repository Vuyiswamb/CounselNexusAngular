import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user()?.roles.some((role) => ['platformadmin', 'platformuser', 'superuser'].includes(role.toLowerCase()))
    ? true
    : router.parseUrl('/dashboard');
};
