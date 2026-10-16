import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

const platformRoutes = new Set([
  'admin/email',
  'platform',
  'platform/billing',
  'platform/packages',
  'platform/assignments',
  'platform/transactions',
  'platform/users',
  'platform/gateways',
  'reports',
]);

/** Keeps the platform account inside its platform-control workspace. */
export const workspaceGuard: CanActivateChildFn = (child: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isClientUser()) return router.parseUrl('/legal-market');
  if (!auth.isPlatformAdmin()) return true;
  const path = child.routeConfig?.path ?? '';
  return platformRoutes.has(path) ? true : router.parseUrl('/platform/billing');
};
