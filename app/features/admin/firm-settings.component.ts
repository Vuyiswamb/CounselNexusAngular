import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { FirmSettingsService } from '../../core/api-services';
import { FirmSettingsDto, FirmSettingsUpdate } from '../../core/api.models';

@Component({
  selector: 'app-firm-settings',
  imports: [RouterLink, RouterLinkActive, FormsModule, IconComponent],
  templateUrl: './firm-settings.component.html',
  styleUrls: ['./firm-settings.component.css'],
})
export class FirmSettingsComponent implements OnInit {
  private api = inject(FirmSettingsService);
  firm: FirmSettingsDto = {
    id: '', name: '', phone: null, email: null, address: null, website: null, tagline: null,
    brandPrimaryColor: '#2563EB', brandAccentColor: '#7C3AED', logoBase64: null, logoContentType: null,
    letterheadBase64: null, letterheadContentType: null,
    workspaceBackgroundBase64: null, workspaceBackgroundContentType: null,
    partnerHourlyRate: 0, feeEarnerHourlyRate: 0, paralegalHourlyRate: 0, legalAssistantHourlyRate: 0,
  };
  loading = true;
  saving = false;
  error = '';
  saved = false;

  ngOnInit(): void {
    this.api.get().subscribe({
      next: (firm) => { this.firm = firm; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.detail || err?.error?.message || err?.error?.title || 'Could not load this firm’s settings.';
        this.loading = false;
      },
    });
  }

  get logoUrl(): string | null {
    return this.firm.logoBase64 && this.firm.logoContentType
      ? `data:${this.firm.logoContentType};base64,${this.firm.logoBase64}`
      : null;
  }

  get letterheadUrl(): string | null {
    return this.firm.letterheadBase64 && this.firm.letterheadContentType
      ? `data:${this.firm.letterheadContentType};base64,${this.firm.letterheadBase64}`
      : null;
  }

  get workspaceBackgroundUrl(): string | null {
    return this.firm.workspaceBackgroundBase64 && this.firm.workspaceBackgroundContentType
      ? `data:${this.firm.workspaceBackgroundContentType};base64,${this.firm.workspaceBackgroundBase64}`
      : null;
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error = 'Choose a PNG, JPEG, or WebP logo.';
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.error = 'Logo files must be 2 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      this.firm.logoBase64 = dataUrl.split(',')[1] ?? null;
      this.firm.logoContentType = file.type;
    };
    reader.onerror = () => { this.error = 'Could not read that logo file.'; };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.firm.logoBase64 = null;
    this.firm.logoContentType = null;
  }

  onLetterheadSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error = 'Choose a PNG, JPEG, or WebP letterhead image.';
      input.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.error = 'Letterhead images must be 4 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      this.firm.letterheadBase64 = dataUrl.split(',')[1] ?? null;
      this.firm.letterheadContentType = file.type;
    };
    reader.onerror = () => { this.error = 'Could not read that letterhead image.'; };
    reader.readAsDataURL(file);
  }

  removeLetterhead(): void {
    this.firm.letterheadBase64 = null;
    this.firm.letterheadContentType = null;
  }

  onWorkspaceBackgroundSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error = 'Choose a PNG, JPEG, or WebP workspace image.';
      input.value = '';
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      this.error = 'Workspace images must be 6 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      this.firm.workspaceBackgroundBase64 = dataUrl.split(',')[1] ?? null;
      this.firm.workspaceBackgroundContentType = file.type;
    };
    reader.onerror = () => { this.error = 'Could not read that workspace image.'; };
    reader.readAsDataURL(file);
  }

  removeWorkspaceBackground(): void {
    this.firm.workspaceBackgroundBase64 = null;
    this.firm.workspaceBackgroundContentType = null;
  }

  save(): void {
    this.error = '';
    this.saved = false;
    this.saving = true;
    const body: FirmSettingsUpdate = {
      name: this.firm.name, phone: this.firm.phone, email: this.firm.email,
      address: this.firm.address, website: this.firm.website, tagline: this.firm.tagline,
      brandPrimaryColor: this.firm.brandPrimaryColor, brandAccentColor: this.firm.brandAccentColor,
      logoBase64: this.firm.logoBase64, logoContentType: this.firm.logoContentType,
      letterheadBase64: this.firm.letterheadBase64,
      letterheadContentType: this.firm.letterheadContentType,
      workspaceBackgroundBase64: this.firm.workspaceBackgroundBase64,
      workspaceBackgroundContentType: this.firm.workspaceBackgroundContentType,
      partnerHourlyRate: this.firm.partnerHourlyRate,
      feeEarnerHourlyRate: this.firm.feeEarnerHourlyRate,
      paralegalHourlyRate: this.firm.paralegalHourlyRate,
      legalAssistantHourlyRate: this.firm.legalAssistantHourlyRate,
    };
    this.api.save(body).subscribe({
      next: (firm) => { this.firm = firm; this.saved = true; this.saving = false; },
      error: (err) => {
        this.error = err?.error?.detail || err?.error?.message || err?.error?.title || 'Could not save firm branding.';
        this.saving = false;
      },
    });
  }
}
