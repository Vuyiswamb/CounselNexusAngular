import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  currentYear = new Date().getFullYear();
  email = '';
  busy = false;
  errorMessage = '';
  message = '';
  developmentResetUrl = '';

  constructor(private auth: AuthService) {}

  sendResetLink(): void {
    this.busy = true;
    this.errorMessage = '';
    this.message = '';
    this.developmentResetUrl = '';
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: (response) => {
        this.busy = false;
        this.message = response.message;
        this.developmentResetUrl = response.developmentResetUrl ?? '';
      },
      error: (error) => {
        this.busy = false;
        this.errorMessage = error?.error?.detail ?? 'We could not process the request. Please try again.';
      },
    });
  }
}
