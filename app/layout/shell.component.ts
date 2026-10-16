import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
import { AuthService } from '../core/auth.service';
import { FirmSettingsService, UsersService } from '../core/api-services';
import { FirmSettingsDto } from '../core/api.models';

interface NavItem {
  section: string;
  label: string;
  icon: string;
  route: string;
  permission?: string;
  exact?: boolean;
}

/** App shell: firm-branded glass sidenav + topbar for authenticated screens. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, IconComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
})
export class ShellComponent implements OnInit {
  query = '';
  userMenuOpen = false;
  profileOpen = false;
  profileSection: 'profile' | 'security' = 'profile';
  profileName = '';
  currentPassword = '';
  newPassword = '';
  profileBusy = false;
  profileError = '';
  profileNotice = '';
  firm: FirmSettingsDto | null = null;

  nav: NavItem[] = [
    { section: 'OVERVIEW', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', permission: 'dashboard.read' },
    { section: 'OVERVIEW', label: 'Search', icon: 'search', route: '/search', permission: 'search.read' },
    { section: 'LEGAL RESEARCH', label: 'Case Research', icon: 'file', route: '/case-research', permission: 'search.read', exact: true },
    { section: 'MARKETPLACE', label: 'Legal Market Place', icon: 'scales', route: '/firm/legal-market', permission: 'legal-market', exact: true },
    { section: 'CLIENT INTAKE', label: 'Contacts', icon: 'contacts', route: '/contacts', permission: 'contacts.read' },
    { section: 'CLIENT INTAKE', label: 'Matters', icon: 'matters', route: '/matters', permission: 'matters.read' },
    { section: 'MATTER WORK', label: 'Notes', icon: 'notes', route: '/notes', permission: 'notes.read' },
    { section: 'MATTER WORK', label: 'Tasks', icon: 'tasks', route: '/tasks', permission: 'tasks.read' },
    { section: 'MATTER WORK', label: 'Legal Calendar & Court Diary', icon: 'diary', route: '/diary', permission: 'diary.read' },
    { section: 'MATTER WORK', label: 'RAF Claims', icon: 'file', route: '/raf-claims', permission: 'matters.read' },
    { section: 'MATTER WORK', label: 'Debt Collections', icon: 'billing', route: '/debt-collections', permission: 'matters.read' },
    { section: 'MATTER WORK', label: 'Evictions', icon: 'matters', route: '/evictions', permission: 'matters.read' },
    { section: 'MATTER WORK', label: 'Summons Management', icon: 'file', route: '/summons-management', permission: 'matters.read' },
    { section: 'TIME & FINANCE', label: 'Fees & Time', icon: 'fees', route: '/fees', permission: 'fees.read' },
    { section: 'TIME & FINANCE', label: 'Billing', icon: 'billing', route: '/billing', permission: 'billing.read' },
    { section: 'TIME & FINANCE', label: 'Trust Accounting', icon: 'trust', route: '/trust', permission: 'trust.read' },
    { section: 'MANAGEMENT', label: 'Reports', icon: 'reports', route: '/reports', permission: 'reports.read' },
    { section: 'MANAGEMENT', label: "Driver's Appointment Report", icon: 'reports', route: '/drivers-appointments', permission: 'reports.read' },
    { section: 'MANAGEMENT', label: 'Practice Setup', icon: 'admin', route: '/admin/settings', permission: 'admin.permissions' },
    { section: 'MANAGEMENT', label: 'Admin', icon: 'admin', route: '/admin/users', permission: 'admin.users' },
    { section: 'MANAGEMENT', label: 'Email Settings', icon: 'mail', route: '/admin/email', permission: 'admin.permissions' },
    { section: 'PLATFORM', label: 'Reports', icon: 'reports', route: '/reports', permission: 'platform.reports' },
    { section: 'PLATFORM', label: 'Billing', icon: 'billing', route: '/platform/billing', permission: 'platform.billing' },
    { section: 'PLATFORM', label: 'Subscription packages', icon: 'billing', route: '/platform/packages', permission: 'platform.billing' },
    { section: 'PLATFORM', label: 'Firm package assignments', icon: 'admin', route: '/platform/assignments', permission: 'platform.billing' },
    { section: 'PLATFORM', label: 'Subscription transactions', icon: 'billing', route: '/platform/transactions', permission: 'platform.billing' },
    { section: 'PLATFORM', label: 'Users', icon: 'contacts', route: '/platform/users', permission: 'platform.billing' },
    { section: 'PLATFORM', label: 'Payment Gateway', icon: 'admin', route: '/platform/gateways', permission: 'platform.gateways' },
  ];

  auth = inject(AuthService);
  private router = inject(Router);
  private firmSettings = inject(FirmSettingsService);
  private usersApi = inject(UsersService);

  get visibleNav(): NavItem[] {
    const isPlatformRole = this.auth.user()?.roles.some((role) => ['platformadmin', 'platformuser', 'superuser'].includes(role.toLowerCase())) ?? false;
    return this.nav
      .filter((item) => isPlatformRole ? item.section === 'PLATFORM' || item.label === 'Email Settings' : item.section !== 'PLATFORM')
      .map((item) => item.label === 'Email Settings' && this.auth.isPlatformAdmin() ? { ...item, permission: 'platform.email' } : item)
      .filter((item) => this.auth.hasPermission(item.permission));
  }

  ngOnInit(): void {
    this.firmSettings.firm$.subscribe((firm) => (this.firm = firm));
    this.firmSettings.get().subscribe({ next: (firm) => (this.firm = firm) });
  }

  get workspaceBackgroundUrl(): string | null {
    return this.firm?.workspaceBackgroundBase64 && this.firm.workspaceBackgroundContentType
      ? `url(data:${this.firm.workspaceBackgroundContentType};base64,${this.firm.workspaceBackgroundBase64})`
      : null;
  }

  goSearch(): void {
    const q = this.query.trim();
    this.router.navigate(['/search'], q ? { queryParams: { q } } : {});
  }

  signOut(): void {
    this.userMenuOpen = false;
    this.auth.logout();
  }

  openNavigation(route: string, event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void this.router.navigateByUrl(route);
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  openProfile(): void {
    this.profileSection = 'profile';
    this.profileName = this.auth.user()?.fullName ?? '';
    this.currentPassword = '';
    this.newPassword = '';
    this.profileError = '';
    this.profileNotice = '';
    this.profileOpen = true;
    this.userMenuOpen = false;
  }

  selectProfileSection(section: 'profile' | 'security'): void {
    this.profileSection = section;
    this.profileError = '';
    this.profileNotice = '';
  }

  saveProfile(): void {
    if (this.profileBusy) return;
    if (this.profileSection === 'profile' && !this.profileName.trim()) {
      this.profileError = 'Please enter your full name.';
      return;
    }
    if (this.profileSection === 'security' && (!this.currentPassword || !this.newPassword)) {
      this.profileError = 'Enter your current password and a new password.';
      return;
    }
    this.profileBusy = true; this.profileError = ''; this.profileNotice = '';

    if (this.profileSection === 'security') {
      this.usersApi.changeMyPassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
        next: () => { this.profileBusy = false; this.profileNotice = 'Password changed successfully.'; this.currentPassword = ''; this.newPassword = ''; },
        error: (err) => { this.profileBusy = false; this.profileError = err?.error?.detail ?? 'Could not change your password.'; },
      });
      return;
    }

    this.usersApi.updateMyProfile({ fullName: this.profileName.trim() }).subscribe({
      next: (updated) => {
        const current = this.auth.user();
        if (current) this.auth.updateProfile({ ...current, fullName: updated.fullName });
        this.profileBusy = false; this.profileNotice = 'Profile updated.';
      },
      error: (err) => { this.profileBusy = false; this.profileError = err?.error?.detail ?? 'Could not update your profile.'; },
    });
  }

  @HostListener('document:click', ['$event'])
  closeUserMenuOutside(event: MouseEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('.profile-menu')) this.userMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeUserMenuOnEscape(): void {
    this.userMenuOpen = false;
  }
}
