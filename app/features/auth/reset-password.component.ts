import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./forgot-password.component.css', './reset-password.component.css'],
})
export class ResetPasswordComponent {
  currentYear = new Date().getFullYear();
  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  busy = false;
  complete = false;
  errorMessage = '';

  constructor(private route: ActivatedRoute, private auth: AuthService) {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.email || !this.token) this.errorMessage = 'This password reset link is incomplete. Request a new one.';
  }

  resetPassword(): void {
    this.busy = true;
    this.errorMessage = '';
    this.auth.resetPassword({ email: this.email, token: this.token, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.busy = false;
        this.complete = true;
      },
      error: (error) => {
        this.busy = false;
        this.errorMessage = error?.error?.detail ?? 'This reset link is invalid or expired. Request a new one.';
      },
    });
  }
}
