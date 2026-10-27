import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService, LoginChallenge } from '../../core/auth.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher.component';

/** Screen 1 — Login. Split layout: navy brand panel + sign-in card. */
@Component({
  selector: 'app-login',
  imports: [LanguageSwitcherComponent, FormsModule, RouterLink],
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
  paymentRequired = false;
  paymentEmailLocked = false;
  paymentSuccess = false;
  confirmationResendBusy = false;
  confirmationResendNotice = '';

  constructor(private router: Router, private auth: AuthService, private route: ActivatedRoute) {
    const paymentEmail = this.route.snapshot.queryParamMap.get('email')?.trim();
    this.paymentSuccess = this.route.snapshot.queryParamMap.get('payment') === 'success';
    if (paymentEmail) {
      this.email = paymentEmail;
      this.paymentEmailLocked = true;
      this.remember = true;
    }

    try {
      if (!this.paymentEmailLocked) {
        this.email = localStorage.getItem('cn.rememberedEmail') ?? '';
        this.remember = !!this.email;
      }
    } catch {
      // Browser storage may be unavailable; sign-in itself does not depend on it.
    }
  }

  /** Exchange credentials for a JWT; ask for an authenticator code when 2FA is enabled. */
  signIn(form: NgForm): void {
    if (form.invalid) return;
    this.errorMessage = '';
    this.paymentRequired = false;
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
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const requestId = this.route.snapshot.queryParamMap.get('requestId');
        const planId = this.route.snapshot.queryParamMap.get('planId');
        const months = this.route.snapshot.queryParamMap.get('months');
        if (returnUrl === '/firm/legal-market' && !this.auth.isClientUser()) {
          void this.router.navigate(['/firm/legal-market'], { queryParams: requestId ? { requestId } : {} });
        } else if (returnUrl === '/packages') {
          void this.router.navigate(['/packages'], { queryParams: planId ? { planId, months: months ?? 1 } : {} });
        } else {
          void this.router.navigate([this.auth.isClientUser() ? '/legal-market' : '/dashboard']);
        }
      },
      error: (error) => {
        this.busy = false;
        if (error?.status === 402) {
          this.paymentRequired = true;
          this.errorMessage = error?.error?.detail ?? 'Your subscription has ended. Choose a package to renew your workspace.';
          return;
        }
        if (error?.status === 403 && error?.error?.title === 'Email confirmation expired') {
          this.confirmationResendNotice = '';
        }
        this.errorMessage = error?.error?.detail ?? 'Unable to sign in. Check your details and try again.';
      },
    });
  }

  resendConfirmation(): void {
    if (this.confirmationResendBusy || !this.email.trim()) return;
    this.confirmationResendBusy = true;
    this.confirmationResendNotice = '';
    this.auth.resendEmailConfirmation(this.email.trim()).subscribe({
      next: (result) => { this.confirmationResendBusy = false; this.confirmationResendNotice = result.message; },
      error: () => { this.confirmationResendBusy = false; this.confirmationResendNotice = 'We could not send the confirmation email. Please try again later.'; },
    });
  }

  private isChallenge(response: unknown): response is LoginChallenge {
    return !!response && typeof response === 'object' && 'requiresTwoFactor' in response;
  }
}
