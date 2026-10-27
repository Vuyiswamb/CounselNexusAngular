import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/auth.guard';
import { platformGuard } from './core/platform.guard';
import { workspaceGuard } from './core/workspace.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent),
    data: { page: 'home' },
  },
  {
    path: 'request-legal-help',
    loadComponent: () => import('./features/marketplace/legal-request.component').then((m) => m.LegalRequestComponent),
  },
  {
    path: 'legal-market',
    loadComponent: () => import('./features/marketplace/legal-market.component').then((m) => m.LegalMarketComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent),
    data: { page: 'about' },
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent),
    data: { page: 'services' },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent),
    data: { page: 'contact' },
  },
  {
    path: 'packages',
    loadComponent: () =>
      import('./features/packages/packages.component').then((m) => m.PackagesComponent),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/legal.component').then((m) => m.LegalComponent),
    data: { doc: 'terms' },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/legal.component').then((m) => m.LegalComponent),
    data: { doc: 'privacy' },
  },
  {
    path: 'cookies',
    loadComponent: () =>
      import('./features/legal/legal.component').then((m) => m.LegalComponent),
    data: { doc: 'cookies' },
  },
  {
    path: 'refunds',
    loadComponent: () =>
      import('./features/legal/legal.component').then((m) => m.LegalComponent),
    data: { doc: 'refunds' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'confirm-email',
    loadComponent: () => import('./features/auth/confirm-email.component').then((m) => m.ConfirmEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [workspaceGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/global-search.component').then((m) => m.GlobalSearchComponent),
      },
      {
        path: 'case-research',
        loadComponent: () =>
          import('./features/case-research/case-research.component').then((m) => m.CaseResearchComponent),
      },
      {
        path: 'firm/legal-market',
        loadComponent: () =>
          import('./features/marketplace/legal-market.component').then((m) => m.LegalMarketComponent),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contact-list.component').then((m) => m.ContactListComponent),
      },
      {
        path: 'contacts/new',
        loadComponent: () =>
          import('./features/contacts/contact-form.component').then((m) => m.ContactFormComponent),
      },
      {
        path: 'contacts/:id/edit',
        loadComponent: () =>
          import('./features/contacts/contact-form.component').then((m) => m.ContactFormComponent),
      },
      {
        path: 'contacts/:id',
        loadComponent: () =>
          import('./features/contacts/contact-detail.component').then((m) => m.ContactDetailComponent),
      },
      {
        path: 'matters',
        loadComponent: () =>
          import('./features/matters/matter-list.component').then((m) => m.MatterListComponent),
      },
      {
        path: 'matters/new',
        loadComponent: () =>
          import('./features/matters/matter-form.component').then((m) => m.MatterFormComponent),
      },
      {
        path: 'matters/:id/edit',
        loadComponent: () =>
          import('./features/matters/matter-form.component').then((m) => m.MatterFormComponent),
      },
      {
        path: 'matters/:id',
        loadComponent: () =>
          import('./features/matters/matter-detail.component').then((m) => m.MatterDetailComponent),
      },
      {
        path: 'admin',
        pathMatch: 'full',
        redirectTo: 'admin/users',
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./features/admin/user-list.component').then((m) => m.UserListComponent),
      },
      {
        path: 'admin/users/new',
        loadComponent: () =>
          import('./features/admin/user-form.component').then((m) => m.UserFormComponent),
      },
      {
        path: 'admin/roles',
        loadComponent: () =>
          import('./features/admin/role-list.component').then((m) => m.RoleListComponent),
      },
      {
        path: 'admin/settings',
        loadComponent: () =>
          import('./features/admin/firm-settings.component').then((m) => m.FirmSettingsComponent),
      },
      {
        path: 'admin/email',
        loadComponent: () =>
          import('./features/admin/smtp-settings.component').then((m) => m.SmtpSettingsComponent),
      },
      {
        path: 'diary',
        loadComponent: () =>
          import('./features/diary/diary.component').then((m) => m.DiaryComponent),
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./features/notes/notes.component').then((m) => m.NotesComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'fees',
        loadComponent: () =>
          import('./features/fees/time-entry-list.component').then((m) => m.TimeEntryListComponent),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/billing/billing.component').then((m) => m.BillingComponent),
      },
      {
        path: 'subscription',
        loadComponent: () =>
          import('./features/subscription/subscription.component').then((m) => m.SubscriptionComponent),
      },
      {
        path: 'trust',
        loadComponent: () =>
          import('./features/trust/trust.component').then((m) => m.TrustComponent),
      },
      {
        path: 'legal-accounting',
        loadComponent: () =>
          import('./features/legal-accounting/legal-accounting.component').then((m) => m.LegalAccountingComponent),
      },
      {
        path: 'payment-requisitions',
        loadComponent: () =>
          import('./features/payment-requisitions/payment-requisitions.component').then((m) => m.PaymentRequisitionsComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      { path: 'debt-collections', data: { operation: 'debt-collections' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'raf-claims', loadComponent: () => import('./features/raf/raf-claims.component').then((m) => m.RafClaimsComponent) },
      { path: 'evictions', data: { operation: 'evictions' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'drivers-appointments', data: { operation: 'drivers-appointments' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'summons-management', data: { operation: 'summons-management' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'platform/billing', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-control.component').then((m) => m.PlatformControlComponent) },
      { path: 'platform/packages', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-packages.component').then((m) => m.PlatformPackagesComponent) },
      { path: 'platform/assignments', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-assignments.component').then((m) => m.PlatformAssignmentsComponent) },
      { path: 'platform/transactions', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-transactions.component').then((m) => m.PlatformTransactionsComponent) },
      { path: 'platform/users', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-users.component').then((m) => m.PlatformUsersComponent) },
      { path: 'platform/gateways', canActivate: [platformGuard], loadComponent: () => import('./features/platform/platform-gateways.component').then((m) => m.PlatformGatewaysComponent) },
      { path: 'platform', pathMatch: 'full', redirectTo: 'platform/billing' },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
