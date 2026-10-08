import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactsService, MattersService, RafClaimsService } from '../../core/api-services';
import { ContactDto, MatterListItemDto, RafClaimDto, RafClaimRequest } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-raf-claims',
  imports: [FormsModule, IconComponent, DatePipe],
  templateUrl: './raf-claims.component.html',
  styleUrls: ['./raf-claims.component.css'],
})
export class RafClaimsComponent implements OnInit {
  private claimsApi = inject(RafClaimsService);
  private contactsApi = inject(ContactsService);
  private mattersApi = inject(MattersService);

  claims: RafClaimDto[] = [];
  clients: ContactDto[] = [];
  matters: MatterListItemDto[] = [];
  search = '';
  status = 'All statuses';
  claimType = 'All claim types';
  highRiskPrescription = false;
  showForm = false;
  loading = false;
  saving = false;
  error = '';

  readonly statuses = ['New', 'Under Investigation', 'Being Prepared', 'Lodged', 'Awaiting RAF Response', 'Under Litigation', 'Settlement Negotiation', 'Settled', 'Awaiting Payment', 'Paid', 'Closed'];
  readonly claimTypes = ['Personal Injury', 'Passenger Claim', 'Pedestrian Claim', 'Driver Claim', 'Cyclist Claim', 'Motorcycle Claim', 'Hit-and-Run / Unidentified Vehicle', 'Loss of Support', 'Funeral Expenses', 'Minor Claimant', 'Other RAF Claim'];
  form: RafClaimRequest = this.emptyForm();

  get newCount(): number { return this.claims.filter((claim) => claim.status === 'New').length; }
  get investigationCount(): number { return this.claims.filter((claim) => claim.status === 'Under Investigation').length; }
  get lodgedCount(): number { return this.claims.filter((claim) => claim.status === 'Lodged').length; }
  get completedCount(): number { return this.claims.filter((claim) => claim.status === 'Paid' || claim.status === 'Closed').length; }

  ngOnInit(): void {
    this.load();
    this.contactsApi.list({ type: 'Client', page: 1, pageSize: 200 }).subscribe({ next: (result) => (this.clients = result.items), error: () => undefined });
    this.mattersApi.list({ page: 1, pageSize: 200, status: 'Active' }).subscribe({ next: (result) => (this.matters = result.items.filter((matter) => this.isRafMatter(matter))), error: () => undefined });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.claimsApi.list({ search: this.search, status: this.status, claimType: this.claimType, highRiskPrescription: this.highRiskPrescription }).subscribe({
      next: (claims) => { this.claims = claims; this.loading = false; },
      error: () => { this.error = 'RAF claims could not be loaded. Apply Database/RafClaims.sql and ensure the API is running.'; this.loading = false; },
    });
  }

  openForm(): void { this.form = this.emptyForm(); this.showForm = true; }
  closeForm(): void { if (!this.saving) this.showForm = false; }

  save(): void {
    if (!this.form.matterId || !this.form.clientId || !this.form.claimNumber.trim() || !this.form.accidentDate) return;
    this.saving = true;
    this.claimsApi.create({ ...this.form, claimNumber: this.form.claimNumber.trim() }).subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: () => { this.saving = false; this.error = 'The RAF claim could not be saved.'; },
    });
  }

  matterLabel(id: string): string {
    const matter = this.matters.find((item) => item.id === id);
    return matter ? `${matter.reference} · ${matter.title}` : id;
  }

  clientLabel(id: string): string { return this.clients.find((client) => client.id === id)?.fullName || id; }

  private isRafMatter(matter: MatterListItemDto): boolean {
    const searchable = `${matter.practiceArea} ${matter.title} ${matter.reference}`.toLowerCase();
    return searchable.includes('raf') || searchable.includes('road accident fund') || searchable.includes('road accident');
  }

  prescriptionClass(date: string | null): string {
    if (!date) return '';
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return days <= 30 ? 'urgent' : days <= 180 ? 'warning' : 'safe';
  }

  prescriptionLabel(date: string | null): string {
    if (!date) return 'Not calculated';
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return days < 0 ? 'Expired' : `${days} days`;
  }

  private emptyForm(): RafClaimRequest {
    return { matterId: '', clientId: '', claimNumber: '', rafReference: '', claimType: this.claimTypes[0], accidentDate: '', prescriptionDate: '', claimAmount: null, status: 'New', nextAction: '' };
  }
}
