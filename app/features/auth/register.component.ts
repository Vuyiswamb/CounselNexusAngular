import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  firmName = '';
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  busy = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  constructor(private auth: AuthService, private router: Router) {}

  register(): void {
    this.errorMessage = '';
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'The passwords do not match.';
      return;
    }

    this.busy = true;
    this.auth.register({
      firmName: this.firmName.trim(),
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim() || undefined,
    }).subscribe({
      next: () => {
        this.busy = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.busy = false;
        this.errorMessage = error?.error?.detail ?? 'We could not create your account. Please try again.';
      },
    });
  }
}
