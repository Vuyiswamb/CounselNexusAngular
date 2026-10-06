import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/mock-data.service';

/** Screen 11 — New User form. */
@Component({
  selector: 'app-user-form',
  imports: [RouterLink, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
})
export class UserFormComponent {
  name = '';
  email = '';
  role: string;
  password = '';
  sendWelcome = false;

  constructor(
    public data: MockDataService,
    private router: Router,
  ) {
    this.role = data.roles[2]?.name ?? 'FeeEarner';
  }

  save(): void {
    if (!this.name.trim() || !this.email.trim()) return;
    this.data.addUser({ name: this.name.trim(), email: this.email.trim(), role: this.role });
    this.router.navigate(['/admin/users']);
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
}
