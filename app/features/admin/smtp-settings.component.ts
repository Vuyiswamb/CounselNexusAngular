import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { SmtpSettingsService } from '../../core/api-services';
import { SmtpSettingsDto } from '../../core/api.models';

@Component({
  selector: 'app-smtp-settings',
  imports: [FormsModule, IconComponent],
  templateUrl: './smtp-settings.component.html',
  styleUrls: ['./smtp-settings.component.css'],
})
export class SmtpSettingsComponent implements OnInit {
  private api = inject(SmtpSettingsService);
  settings: SmtpSettingsDto = {
    host: '', port: 587, enableSsl: true, username: '', fromAddress: '',
    fromName: 'CounselNexus', hasPassword: false, isConfigured: false,
  };
  password = '';
  testRecipientEmail = '';
  loading = true;
  saving = false;
  testing = false;
  error = '';
  notice = '';

  get validTestRecipient(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.testRecipientEmail.trim());
  }

  ngOnInit(): void {
    this.api.get().subscribe({
      next: (value) => { this.settings = value; this.loading = false; },
      error: () => { this.error = 'Could not load SMTP settings. Confirm the API database schema is up to date.'; this.loading = false; },
    });
  }

  save(): void {
    this.error = '';
    this.notice = '';
    this.saving = true;
    this.api.save({
      host: this.settings.host ?? '', port: Number(this.settings.port), enableSsl: this.settings.enableSsl,
      username: this.settings.username || null, password: this.password || null,
      fromAddress: this.settings.fromAddress ?? '', fromName: this.settings.fromName || null,
    }).subscribe({
      next: (value) => {
        this.settings = value;
        this.password = '';
        this.notice = 'SMTP settings saved securely.';
        this.saving = false;
      },
      error: (err) => { this.error = err?.error?.title || 'Could not save SMTP settings.'; this.saving = false; },
    });
  }

  sendTest(): void {
    this.error = '';
    this.notice = '';
    this.testing = true;
    const recipientEmail = this.testRecipientEmail.trim();
    if (!this.validTestRecipient) {
      this.error = 'Enter a valid email address to receive the test message.';
      this.testing = false;
      return;
    }
    this.api.sendTest(recipientEmail).subscribe({
      next: (result) => { this.notice = result.message; this.testing = false; },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'SMTP test failed.'; this.testing = false; },
    });
  }
}
