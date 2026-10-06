import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { UsersService } from '../../core/api-services';
import { UserDto } from '../../core/api.models';

/** Screen 10 — Users list (live API). */
@Component({
  selector: 'app-user-list',
  imports: [DatePipe, FormsModule, IconComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
})
export class UserListComponent implements OnInit {
  readonly roles = ['Partner', 'Attorney', 'Candidate Attorney', 'Paralegal', 'Practice Manager', 'SystemAdmin'];

  users: UserDto[] = [];
  search = '';
  loading = false;

  showCreate = false;
  newName = '';
  newEmail = '';
  newRole = 'Attorney';
  newPassword = '';
  createError = '';
  busy = false;

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
    this.busy = true;
    this.createError = '';
    this.api
      .create({
        fullName: this.newName.trim(),
        email: this.newEmail.trim(),
        role: this.newRole,
        password: this.newPassword,
        sendWelcomeEmail: false,
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
          this.createError = err?.error?.detail ?? 'Could not create the user.';
        },
      });
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
