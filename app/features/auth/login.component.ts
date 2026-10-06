import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, LoginChallenge } from '../../core/auth.service';

/** Screen 1 — Login. Split layout: navy brand panel + sign-in card. */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  remember = false;
  showPassword = false;
  currentYear = new Date().getFullYear();
  requiresTwoFactor = false;
  twoFactorCode = '';
  busy = false;
  errorMessage = '';

  constructor(private router: Router, private auth: AuthService) {
    try {
      this.email = localStorage.getItem('cn.rememberedEmail') ?? '';
      this.remember = !!this.email;
    } catch {
      // Browser storage may be unavailable; sign-in itself does not depend on it.
    }
  }

  /** Exchange credentials for a JWT; ask for an authenticator code when 2FA is enabled. */
  signIn(): void {
    this.errorMessage = '';
    this.busy = true;
    this.auth.login(this.email, this.password, this.requiresTwoFactor ? this.twoFactorCode : undefined).subscribe({
      next: (response) => {
        this.busy = false;
        if (this.isChallenge(response)) {
          this.requiresTwoFactor = true;
          return;
        }
        try {
          if (this.remember) localStorage.setItem('cn.rememberedEmail', this.email);
          else localStorage.removeItem('cn.rememberedEmail');
        } catch {
          // Browser storage is optional.
        }
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.busy = false;
        this.errorMessage = error?.error?.detail ?? 'Unable to sign in. Check your details and try again.';
      },
    });
  }

  private isChallenge(response: unknown): response is LoginChallenge {
    return !!response && typeof response === 'object' && 'requiresTwoFactor' in response;
  }
}
