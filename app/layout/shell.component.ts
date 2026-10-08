import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
import { AuthService } from '../core/auth.service';
import { FirmSettingsService } from '../core/api-services';
import { FirmSettingsDto } from '../core/api.models';

interface NavItem {
  section: string;
  label: string;
  icon: string;
  route: string;
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
  firm: FirmSettingsDto | null = null;

  nav: NavItem[] = [
    { section: 'OVERVIEW', label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { section: 'OVERVIEW', label: 'Search', icon: 'search', route: '/search' },
    { section: 'LEGAL RESEARCH', label: 'Case Research', icon: 'file', route: '/case-research', exact: true },
    { section: 'CLIENT INTAKE', label: 'Contacts', icon: 'contacts', route: '/contacts' },
    { section: 'CLIENT INTAKE', label: 'Matters', icon: 'matters', route: '/matters' },
    { section: 'MATTER WORK', label: 'Notes', icon: 'notes', route: '/notes' },
    { section: 'MATTER WORK', label: 'Tasks', icon: 'tasks', route: '/tasks' },
    { section: 'MATTER WORK', label: 'Legal Calendar & Court Diary', icon: 'diary', route: '/diary' },
    { section: 'MATTER WORK', label: 'RAF Claims', icon: 'file', route: '/raf-claims' },
    { section: 'MATTER WORK', label: 'Debt Collections', icon: 'billing', route: '/debt-collections' },
    { section: 'MATTER WORK', label: 'Evictions', icon: 'matters', route: '/evictions' },
    { section: 'MATTER WORK', label: 'Summons Management', icon: 'file', route: '/summons-management' },
    { section: 'TIME & FINANCE', label: 'Fees & Time', icon: 'fees', route: '/fees' },
    { section: 'TIME & FINANCE', label: 'Billing', icon: 'billing', route: '/billing' },
    { section: 'TIME & FINANCE', label: 'Trust Accounting', icon: 'trust', route: '/trust' },
    { section: 'MANAGEMENT', label: 'Reports', icon: 'reports', route: '/reports' },
    { section: 'MANAGEMENT', label: "Driver's Appointment Report", icon: 'reports', route: '/drivers-appointments' },
    { section: 'MANAGEMENT', label: 'Practice Setup', icon: 'admin', route: '/admin/settings' },
    { section: 'MANAGEMENT', label: 'Admin', icon: 'admin', route: '/admin/users' },
    { section: 'MANAGEMENT', label: 'Email Settings', icon: 'mail', route: '/admin/email' },
  ];

  auth = inject(AuthService);
  private router = inject(Router);
  private firmSettings = inject(FirmSettingsService);

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

  @HostListener('document:click', ['$event'])
  closeUserMenuOutside(event: MouseEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('.profile-menu')) this.userMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeUserMenuOnEscape(): void {
    this.userMenuOpen = false;
  }
}
