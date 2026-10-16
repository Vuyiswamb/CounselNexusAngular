import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformGatewaySettingsService } from '../../core/api-services';
import { PlatformGatewaySettingsDto } from '../../core/api.models';

@Component({
  selector: 'app-platform-gateways',
  imports: [FormsModule],
  templateUrl: './platform-gateways.component.html',
  styleUrls: ['./platform-gateways.component.css'],
})
export class PlatformGatewaysComponent implements OnInit {
  private api = inject(PlatformGatewaySettingsService);
  settings: PlatformGatewaySettingsDto = {
    payFastEnabled: false,
    sandbox: { enabled: false, merchantId: '', merchantKey: '', passphrase: '', processUrl: 'https://sandbox.payfast.co.za/eng/process', returnUrl: 'https://www.counselnexus.co.za/login?payment=success', cancelUrl: 'https://www.counselnexus.co.za/packages?payment=cancelled' },
    live: { enabled: false, merchantId: '', merchantKey: '', passphrase: '', processUrl: 'https://www.payfast.co.za/eng/process', returnUrl: 'https://www.counselnexus.co.za/login?payment=success', cancelUrl: 'https://www.counselnexus.co.za/packages?payment=cancelled' },
    smsEnabled: false, smsProvider: '', smsBaseUrl: '', smsApiKeyConfigured: false, smsApiSecretConfigured: false, smsFrom: '',
  };
  loading = true;
  saving = false;
  savingEnvironment: 'Sandbox' | 'Live' | null = null;
  error = '';
  notice = '';

  ngOnInit(): void { this.load(); }

  dismissMessage(): void { this.notice = ''; this.error = ''; }

  load(): void {
    this.loading = true; this.error = ''; this.notice = '';
    this.api.get().subscribe({
      next: (value) => { this.settings = value; this.loading = false; },
      error: () => { this.error = 'Could not load gateway settings.'; this.loading = false; },
    });
  }

  saveEnvironment(sandbox: boolean): void {
    const environment = sandbox ? 'Sandbox' as const : 'Live' as const;
    const selected = sandbox ? this.settings.sandbox : this.settings.live;
    this.saving = true; this.savingEnvironment = environment; this.error = ''; this.notice = '';
    this.api.save({
      environment,
      payFastEnabled: this.settings.payFastEnabled,
      environmentEnabled: selected.enabled,
      payFastMerchantId: selected.merchantId || null,
      payFastMerchantKey: selected.merchantKey || null,
      payFastPassphrase: selected.passphrase || null,
      payFastProcessUrl: selected.processUrl || null,
      payFastReturnUrl: selected.returnUrl || null,
      payFastCancelUrl: selected.cancelUrl || null,
      smsEnabled: this.settings.smsEnabled,
      smsProvider: this.settings.smsProvider || null,
      smsBaseUrl: this.settings.smsBaseUrl || null,
      smsApiKey: null,
      smsApiSecret: null,
      smsFrom: this.settings.smsFrom || null,
    }).subscribe({
      next: (value) => { this.settings = value; this.notice = `${environment} PayFast settings saved. The other environment was not changed.`; this.saving = false; this.savingEnvironment = null; },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not save gateway settings.'; this.saving = false; this.savingEnvironment = null; },
    });
  }
}
