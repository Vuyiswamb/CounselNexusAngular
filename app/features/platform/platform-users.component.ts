import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../core/api-services';
import { PlatformUserDto } from '../../core/api.models';

@Component({ selector: 'app-platform-users', imports: [FormsModule, DatePipe], templateUrl: './platform-users.component.html', styleUrls: ['./platform-control.component.css'] })
export class PlatformUsersComponent implements OnInit {
  private api = inject(PlatformService);
  users: PlatformUserDto[] = [];
  name = ''; email = ''; password = ''; busy = false; error = ''; search = '';
  modalUser: PlatformUserDto | null = null; modalMode: 'view' | 'edit' = 'view'; editName = ''; editEmail = ''; resetBusyId = ''; notice = ''; modalNotice = ''; modalError = '';
  get filteredUsers(): PlatformUserDto[] { const query = this.search.trim().toLowerCase(); return query ? this.users.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(query)) : this.users; }
  ngOnInit(): void { this.load(); }
  load(): void { this.error = ''; this.api.platformUsers().subscribe({ next: (rows) => (this.users = rows), error: (err) => (this.error = err?.error?.detail || 'Could not load platform users.') }); }
  create(): void {
    if (this.busy || !this.name.trim() || !this.email.trim() || !this.password) return;
    this.busy = true;
    this.api.createPlatformUser({ fullName: this.name.trim(), email: this.email.trim(), password: this.password }).subscribe({ next: (user) => { this.users = [...this.users, user].sort((a, b) => a.fullName.localeCompare(b.fullName)); this.name = ''; this.email = ''; this.password = ''; this.busy = false; this.notice = 'Platform user created.'; }, error: (err) => { this.error = err?.error?.detail || 'Could not create the platform user.'; this.busy = false; } });
  }
  view(user: PlatformUserDto): void { this.modalUser = user; this.modalMode = 'view'; this.error = ''; this.notice = ''; this.modalNotice = ''; this.modalError = ''; }
  edit(user: PlatformUserDto): void { this.modalUser = user; this.modalMode = 'edit'; this.editName = user.fullName; this.editEmail = user.email; this.error = ''; this.notice = ''; this.modalNotice = ''; this.modalError = ''; }
  closeModal(): void { this.modalUser = null; this.editName = ''; this.editEmail = ''; this.modalNotice = ''; this.modalError = ''; }
  saveEdit(): void {
    if (!this.modalUser || !this.editName.trim() || !this.editEmail.trim() || this.busy) return;
    this.busy = true;
    this.api.updatePlatformUser(this.modalUser.id, { fullName: this.editName.trim(), email: this.editEmail.trim() }).subscribe({
      next: (updated) => { this.users = this.users.map((user) => user.id === updated.id ? updated : user); this.modalUser = updated; this.modalMode = 'view'; this.busy = false; this.modalNotice = 'User details updated.'; },
      error: (err) => { this.modalError = err?.error?.detail || 'Could not update the platform user.'; this.busy = false; },
    });
  }
  sendReset(user: PlatformUserDto): void {
    if (this.resetBusyId) return;
    this.resetBusyId = user.id; this.error = ''; this.notice = ''; this.modalError = ''; this.modalNotice = '';
    this.api.sendPlatformUserPasswordReset(user.id).subscribe({
      next: (result) => { this.resetBusyId = ''; this.modalNotice = result.message; },
      error: (err) => { this.resetBusyId = ''; this.modalError = err?.error?.detail || 'Could not send the password reset email.'; },
    });
  }
}
