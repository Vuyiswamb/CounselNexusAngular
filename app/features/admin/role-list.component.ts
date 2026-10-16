import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RolesService, UsersService } from '../../core/api-services';
import { PermissionDto, RoleDto, UserDto } from '../../core/api.models';

/** Screen 11 — Roles list (live API). */
@Component({
  selector: 'app-role-list',
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css'],
})
export class RoleListComponent implements OnInit {
  roles: RoleDto[] = [];
  loading = false;

  private api = inject(RolesService);
  private usersApi = inject(UsersService);
  private users: UserDto[] = [];
  selectedRole: RoleDto | null = null;
  permissions: PermissionDto[] = [];
  showPermissions = false;
  saving = false;
  error = '';

  ngOnInit(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (r) => {
        this.roles = r;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
    this.usersApi.list().subscribe((u) => (this.users = u));
  }

  userCount(roleName: string): number {
    return this.users.filter((u) => u.roles.includes(roleName)).length;
  }

  editPermissions(role: RoleDto): void {
    this.selectedRole = role;
    this.showPermissions = true;
    this.error = '';
    this.api.permissions(role.id).subscribe({
      next: (permissions) => this.permissions = permissions,
      error: () => this.error = 'Could not load permissions for this role.',
    });
  }

  savePermissions(): void {
    if (!this.selectedRole || this.saving) return;
    this.saving = true;
    this.api.savePermissions(this.selectedRole.id, this.permissions.filter((p) => p.isAssigned).map((p) => p.id)).subscribe({
      next: (permissions) => { this.permissions = permissions; this.saving = false; this.showPermissions = false; },
      error: (err) => { this.error = err?.error?.detail ?? 'Could not save permissions.'; this.saving = false; },
    });
  }
}
