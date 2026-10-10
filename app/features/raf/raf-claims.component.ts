import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactsService, MatterDocumentsService, MattersService, RafClaimsService } from '../../core/api-services';
import { ContactDto, DocumentDto, MatterListItemDto, RafClaimDto, RafClaimRequest } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';
import { forkJoin } from 'rxjs';

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
  private documentsApi = inject(MatterDocumentsService);

  claims: RafClaimDto[] = [];
  clients: ContactDto[] = [];
  matters: MatterListItemDto[] = [];
  search = '';
  status = 'All statuses';
  claimType = 'All claim types';
  highRiskPrescription = false;
  showForm = false;
  editingClaimId: string | null = null;
  loading = false;
  saving = false;
  error = '';
  medicalReports: DocumentDto[] = [];
  medicalReportsLoading = false;
  medicalReportUploading = false;
  medicalReportError = '';
  supportingDocuments: DocumentDto[] = [];
  supportingDocumentUploading = false;
  supportingDocumentError = '';
  activeProcessStep = 0;
  validationMessage = '';
  readonly processSteps = ['Claim Details', 'Medical Reports', 'Documents', 'Review & Submit'];

  readonly statuses = ['New', 'Under Investigation', 'Being Prepared', 'Medical Evidence', 'Lodged', 'Awaiting RAF Response', 'Under Litigation', 'Settlement Negotiation', 'Settled', 'Awaiting Payment', 'Paid', 'Closed', 'Rejected', 'Withdrawn'];
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

  openForm(): void { this.editingClaimId = null; this.form = this.emptyForm(); this.medicalReports = []; this.medicalReportError = ''; this.activeProcessStep = 0; this.showForm = true; setTimeout(() => this.enableMultipleMedicalUpload()); }

  editClaim(claim: RafClaimDto): void {
    this.editingClaimId = claim.id;
    this.form = {
      matterId: claim.matterId,
      clientId: claim.clientId,
      claimNumber: claim.claimNumber,
      rafReference: claim.rafReference,
      claimType: claim.claimType,
      accidentDate: this.dateInputValue(claim.accidentDate),
      prescriptionDate: this.dateInputValue(claim.prescriptionDate),
      claimAmount: claim.claimAmount,
      settlementAmount: claim.settlementAmount,
      nextAction: claim.nextAction,
      nextActionDate: this.dateInputValue(claim.nextActionDate),
      status: claim.status,
      responsibleAttorneyId: claim.responsibleAttorneyId,
    };
    this.loadMedicalReports(claim.matterId);
    this.activeProcessStep = 0;
    this.showForm = true;
    setTimeout(() => this.enableMultipleMedicalUpload());
  }

  closeForm(): void { if (!this.saving) { this.showForm = false; this.editingClaimId = null; } }

  save(): void {
    if (!this.validateClaimDetails()) return;
    this.clearValidationState();
    this.saving = true;
    const request: RafClaimRequest = {
      ...this.form,
      claimNumber: this.form.claimNumber.trim(),
      rafReference: this.nullIfBlank(this.form.rafReference),
      prescriptionDate: this.form.prescriptionDate || null,
      claimAmount: this.nullIfNumber(this.form.claimAmount),
      settlementAmount: this.nullIfNumber(this.form.settlementAmount),
      nextAction: this.nullIfBlank(this.form.nextAction),
      nextActionDate: this.form.nextActionDate || null,
    };
    const saveRequest = this.editingClaimId ? this.claimsApi.update(this.editingClaimId, request) : this.claimsApi.create(request);
    saveRequest.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: (error) => {
        this.saving = false;
        const detail = error?.error?.detail || error?.error?.title || error?.error?.message;
        this.error = detail || `The RAF claim could not be ${this.editingClaimId ? 'updated' : 'saved'}.`;
      },
    });
  }

  statusLabel(status: string): string { return status; }

  get currentStepIndex(): number { return this.statuses.indexOf(this.form.status); }

  selectStatus(status: string): void { this.form.status = status; }

  private enableMultipleMedicalUpload(): void {
    const input = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]')).find((item) => item.accept.includes('.pdf'));
    if (input) input.multiple = true;
  }

  selectProcessStep(index: number): void {
    if (index > 0 && !this.validateClaimDetails()) return;
    this.clearValidationState();
    this.activeProcessStep = index;
  }

  nextProcessStep(): void {
    if (this.activeProcessStep === 0 && !this.validateClaimDetails()) return;
    this.clearValidationState();
    this.activeProcessStep = Math.min(this.processSteps.length - 1, this.activeProcessStep + 1);
  }

  previousProcessStep(): void { this.activeProcessStep = Math.max(0, this.activeProcessStep - 1); }

  private validateClaimDetails(): boolean {
    const required: Array<{ name: keyof RafClaimRequest; label: string }> = [
      { name: 'clientId', label: 'Existing client' },
      { name: 'matterId', label: 'Existing RAF matter' },
      { name: 'claimNumber', label: 'Claim number' },
      { name: 'accidentDate', label: 'Accident date' },
    ];
    const missing = required.find((field) => !String(this.form[field.name] ?? '').trim());
    if (!missing) return true;
    this.validationMessage = `${missing.label} is required before continuing.`;
    this.activeProcessStep = 0;
    setTimeout(() => {
      const control = document.querySelector<HTMLElement>(`.raf-wizard [name="${missing.name}"]`);
      const wizard = document.querySelector<HTMLElement>('.raf-wizard');
      wizard?.classList.add('has-validation-error');
      control?.classList.remove('field-missing');
      void control?.offsetWidth;
      control?.classList.add('field-missing');
      control?.focus();
      control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return false;
  }

  private clearValidationState(): void {
    this.validationMessage = '';
    document.querySelector('.raf-wizard')?.classList.remove('has-validation-error');
    document.querySelectorAll('.raf-wizard .field-missing').forEach((control) => control.classList.remove('field-missing'));
  }

  private nullIfBlank(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private nullIfNumber(value: number | null | undefined): number | null {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
  }

  loadMedicalReports(matterId: string): void {
    this.medicalReports = [];
    this.supportingDocuments = [];
    this.medicalReportError = '';
    this.supportingDocumentError = '';
    if (!matterId) return;
    this.medicalReportsLoading = true;
    this.documentsApi.list(matterId).subscribe({
      next: (documents) => {
        this.medicalReports = documents.filter((document) => document.name.startsWith('Medical Report'));
        this.supportingDocuments = documents.filter((document) => !document.name.startsWith('Medical Report'));
        this.medicalReportsLoading = false;
      },
      error: () => { this.medicalReportsLoading = false; this.medicalReportError = 'Medical reports could not be loaded.'; },
    });
  }

  uploadSupportingDocuments(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || !this.form.matterId || this.supportingDocumentUploading) return;
    const oversized = files.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) { this.supportingDocumentError = `${oversized.name} exceeds the 50 MB maximum file size.`; return; }
    this.supportingDocumentUploading = true;
    this.supportingDocumentError = '';
    const uploads = files.map((file) => this.documentsApi.upload(this.form.matterId, new File([file], `Supporting Document [${this.fileType(file)}] - ${file.name}`, { type: file.type })));
    forkJoin(uploads).subscribe({
      next: (documents) => { this.supportingDocuments = [...documents.reverse(), ...this.supportingDocuments]; this.supportingDocumentUploading = false; },
      error: () => { this.supportingDocumentUploading = false; this.supportingDocumentError = 'One or more documents could not be uploaded.'; },
    });
  }

  downloadSupportingDocument(document: DocumentDto): void {
    this.documentsApi.download(document.id).subscribe({
      next: (blob) => { const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name.replace(/^Supporting Document \[[^\]]+\] - /, ''); anchor.click(); URL.revokeObjectURL(url); },
      error: () => { this.supportingDocumentError = 'The document could not be downloaded.'; },
    });
  }

  uploadMedicalReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || !this.form.matterId || this.medicalReportUploading) return;
    const oversized = files.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) { this.medicalReportError = `${oversized.name} exceeds the 50 MB maximum file size.`; return; }
    this.medicalReportUploading = true;
    this.medicalReportError = '';
    const uploads = files.map((file) => this.documentsApi.upload(this.form.matterId, new File([file], `Medical Report [${this.fileType(file)}] - ${file.name}`, { type: file.type })));
    forkJoin(uploads).subscribe({
      next: (documents) => { this.medicalReports = [...documents.reverse(), ...this.medicalReports]; this.medicalReportUploading = false; },
      error: () => { this.medicalReportUploading = false; this.medicalReportError = 'One or more medical reports could not be uploaded.'; },
    });
  }

  downloadMedicalReport(document: DocumentDto): void {
    this.documentsApi.download(document.id).subscribe({
      next: (blob) => { const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name.replace(/^Medical Report \[[^\]]+\] - /, '').replace(/^Medical Report - /, ''); anchor.click(); URL.revokeObjectURL(url); },
      error: () => { this.medicalReportError = 'The medical report could not be downloaded.'; },
    });
  }

  fileType(file: File): string {
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || file.type.split('/').pop()?.toUpperCase() || 'FILE';
  }

  formatDocumentSize(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

  statusClass(status: string): string {
    return status === 'Paid' || status === 'Closed' ? 'status status-complete'
      : status === 'Rejected' || status === 'Withdrawn' ? 'status status-negative'
        : status === 'Under Investigation' || status === 'Under Litigation' ? 'status status-active'
          : 'status';
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

  private dateInputValue(value: string | null): string { return value ? value.substring(0, 10) : ''; }
}
