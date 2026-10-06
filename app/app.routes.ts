import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/public-site/public-site.component').then((m) => m.PublicSiteComponent),
    data: { page: 'home' },
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
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
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
        path: 'trust',
        loadComponent: () =>
          import('./features/trust/trust.component').then((m) => m.TrustComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      { path: 'debt-collections', data: { operation: 'debt-collections' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'evictions', data: { operation: 'evictions' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'drivers-appointments', data: { operation: 'drivers-appointments' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
      { path: 'summons-management', data: { operation: 'summons-management' }, loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent) },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
