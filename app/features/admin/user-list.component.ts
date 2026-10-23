import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { UsersService } from '../../core/api-services';
import { UserDto, UserPermissionDto } from '../../core/api.models';

/** Screen 10 — Users list (live API). */
@Component({
  selector: 'app-user-list',
  imports: [DatePipe, FormsModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
})
export class UserListComponent implements OnInit {
  /** Values must match the roles seeded by the API. */
  readonly roles = ['Partner', 'FeeEarner', 'Bookkeeper', 'Reception', 'SystemAdmin'];

  users: UserDto[] = [];
  search = '';
  loading = false;

  showCreate = false;
  showEdit = false;
  editUser: UserDto | null = null;
  editRole = '';
  editError = '';
  editBusy = false;
  newName = '';
  newEmail = '';
  newRole = 'FeeEarner';
  newPassword = '';
  createError = '';
  busy = false;
  showAccess = false;
  accessUser: UserDto | null = null;
  accessBusy = false;
  accessError = '';
  permissions: UserPermissionDto[] = [];
  moduleRows: Array<{ key: string; label: string; permissions: UserPermissionDto[]; allowed: boolean }> = [];
  modulesBusy = false;

  private api = inject(UsersService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list(this.search.trim() || undefined).subscribe({
      next: (u) => {
        this.users = u;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  create(): void {
    if (this.busy || !this.newName.trim() || !this.newEmail.trim() || !this.newPassword) {
      this.createError = 'All fields are required.';
      return;
    }
    if (this.newPassword.length < 8 || !/[a-z]/.test(this.newPassword) || !/[A-Z]/.test(this.newPassword) || !/[0-9]/.test(this.newPassword)) {
      this.createError = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
      return;
    }
    this.busy = true;
    this.createError = '';
    this.api
      .create({
        fullName: this.newName.trim(),
        email: this.newEmail.trim(),
        role: this.newRole,
        password: this.newPassword,
        sendWelcomeEmail: true,
      })
      .subscribe({
        next: () => {
          this.showCreate = false;
          this.busy = false;
          this.newName = this.newEmail = this.newPassword = '';
          this.load();
        },
        error: (err) => {
          this.busy = false;
          this.createError = this.apiError(err, 'Could not create the user.');
        },
      });
  }

  openEdit(user: UserDto): void {
    this.editUser = user;
    this.editRole = user.roles[0] || this.roles[0];
    this.editError = '';
    this.showEdit = true;
  }

  saveEdit(): void {
    if (!this.editUser || !this.editRole || this.editBusy) return;
    this.editBusy = true;
    this.editError = '';
    const userId = this.editUser.id;
    this.api.setRole(userId, { role: this.editRole }).subscribe({
      next: () => {
        this.users = this.users.map((user) => user.id === userId ? { ...user, roles: [this.editRole] } : user);
        this.showEdit = false;
        this.editUser = null;
        this.editBusy = false;
      },
      error: (err) => {
        this.editError = this.apiError(err, 'Could not update the user role.');
        this.editBusy = false;
      },
    });
  }

  private apiError(error: any, fallback: string): string {
    const body = error?.error;
    if (body?.detail) return body.detail;
    if (body?.errors) {
      const messages = Object.values(body.errors as Record<string, string[]>).flat();
      if (messages.length) return messages.join(' ');
    }
    return fallback;
  }

  openAccess(user: UserDto): void {
    this.accessUser = user;
    this.showAccess = true;
    this.accessBusy = false;
    this.accessError = '';
    this.modulesBusy = true;
    this.api.permissions(user.id).subscribe({
      next: (permissions) => { this.permissions = permissions; this.buildModuleRows(); this.modulesBusy = false; },
      error: () => { this.accessError = 'Could not load this user\'s module access.'; this.modulesBusy = false; },
    });
  }

  saveAccess(): void {
    if (!this.accessUser || this.accessBusy) return;
    this.accessBusy = true;
    const allowed = this.moduleRows.filter((m) => m.allowed).flatMap((m) => m.permissions.map((p) => p.id));
    const denied = this.moduleRows.filter((m) => !m.allowed).flatMap((m) => m.permissions.map((p) => p.id));
    this.api.savePermissions(this.accessUser.id, { allowedPermissionIds: allowed, deniedPermissionIds: denied }).subscribe({
      next: () => { this.accessBusy = false; this.showAccess = false; },
      error: (err) => { this.accessError = err?.error?.detail ?? 'Could not save module access.'; this.accessBusy = false; },
    });
  }

  get allModulesAllowed(): boolean { return this.moduleRows.length > 0 && this.moduleRows.every((module) => module.allowed); }

  setAllModules(allowed: boolean): void { this.moduleRows.forEach((module) => (module.allowed = allowed)); }

  private buildModuleRows(): void {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard', search: 'Search & Case Research', contacts: 'Contacts', matters: 'Matters', notes: 'Notes',
      diary: 'Legal Calendar & Court Diary', tasks: 'Tasks', fees: 'Fees & Time', billing: 'Billing', trust: 'Trust Accounting',
      reports: 'Reports', admin: 'Administration', documents: 'Documents',
    };
    const groups = new Map<string, UserPermissionDto[]>();
    for (const permission of this.permissions) {
      const key = permission.key.split('.')[0];
      if (labels[key]) groups.set(key, [...(groups.get(key) ?? []), permission]);
    }
    this.moduleRows = Array.from(groups, ([key, permissions]) => ({
      key, label: labels[key], permissions, allowed: permissions.some((permission) => permission.isAllowed),
    }));
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
