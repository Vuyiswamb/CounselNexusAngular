import { Component, OnInit, inject } from '@angular/core';
import { RolesService, UsersService } from '../../core/api-services';
import { RoleDto, UserDto } from '../../core/api.models';

/** Screen 11 — Roles list (live API). */
@Component({
  selector: 'app-role-list',
  imports: [],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css'],
})
export class RoleListComponent implements OnInit {
  roles: RoleDto[] = [];
  loading = false;

  private api = inject(RolesService);
  private usersApi = inject(UsersService);
  private users: UserDto[] = [];

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
}
