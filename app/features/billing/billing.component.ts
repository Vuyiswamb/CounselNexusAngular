import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FirmSettingsService, InvoicesService, MattersService } from '../../core/api-services';
import { FirmSettingsDto, InvoiceDto, MatterListItemDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-billing',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, IconComponent],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.css'],
})
export class BillingComponent implements OnInit {
  invoices: InvoiceDto[] = [];
  matters: MatterListItemDto[] = [];
  firm?: FirmSettingsDto;
  selectedInvoice?: InvoiceDto;
  loading = false;
  saving = false;
  issuingId = '';
  showDraftForm = false;
  error = '';
  search = '';
  statusFilter = '';
  matterId = '';
  invoiceDate = this.today();
  dueDate = this.addDays(this.invoiceDate, 30);
  taxRate = 0;

  private invoicesApi = inject(InvoicesService);
  private mattersApi = inject(MattersService);
  private firmApi = inject(FirmSettingsService);
  private auth = inject(AuthService);

  ngOnInit(): void {
    this.load();
    this.mattersApi.list({ pageSize: 100 }).subscribe({
      next: (result) => { this.matters = result.items; },
      error: () => { this.error = 'Matters could not be loaded for invoice preparation.'; },
    });
    this.firmApi.get().subscribe({ next: (firm) => { this.firm = firm; } });
  }

  get filteredInvoices(): InvoiceDto[] {
    const query = this.search.trim().toLowerCase();
    return this.invoices.filter((invoice) => {
      const statusMatch = !this.statusFilter || invoice.status === this.statusFilter;
      const matterText = invoice.lines.map((line) => `${line.matterReference} ${line.matterTitle}`).join(' ');
      const queryMatch = !query || `${invoice.number} ${invoice.clientName} ${matterText}`.toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });
  }

  get draftCount(): number { return this.invoices.filter((invoice) => invoice.status === 'Draft').length; }
  get draftTotal(): number { return this.invoices.filter((invoice) => invoice.status === 'Draft').reduce((sum, invoice) => sum + invoice.total, 0); }
  get outstandingTotal(): number { return this.invoices.filter((invoice) => invoice.status === 'Issued' || invoice.status === 'PartPaid').reduce((sum, invoice) => sum + invoice.total, 0); }
  get overdueCount(): number { const today = this.today(); return this.invoices.filter((invoice) => (invoice.status === 'Issued' || invoice.status === 'PartPaid') && invoice.dueDate < today).length; }
  get canIssue(): boolean { return this.auth.user()?.roles.some((role) => ['SystemAdmin', 'Partner', 'Bookkeeper'].includes(role)) ?? false; }
  get letterheadUrl(): string | null { return this.firm?.letterheadBase64 && this.firm.letterheadContentType ? `data:${this.firm.letterheadContentType};base64,${this.firm.letterheadBase64}` : null; }
  get logoUrl(): string | null { return this.firm?.logoBase64 && this.firm.logoContentType ? `data:${this.firm.logoContentType};base64,${this.firm.logoBase64}` : null; }

  load(): void {
    this.loading = true;
    this.error = '';
    this.invoicesApi.list().subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        if (this.selectedInvoice) this.selectedInvoice = invoices.find((invoice) => invoice.id === this.selectedInvoice?.id);
        this.loading = false;
      },
      error: (error) => { this.error = error?.status === 403 ? 'You do not have permission to view billing.' : 'Invoices could not be loaded.'; this.loading = false; },
    });
  }

  openDraftForm(): void {
    this.error = '';
    this.matterId = '';
    this.invoiceDate = this.today();
    this.dueDate = this.addDays(this.invoiceDate, 30);
    this.taxRate = 0;
    this.showDraftForm = true;
  }

  createDraft(): void {
    if (this.saving || !this.matterId || !this.invoiceDate || !this.dueDate || this.dueDate < this.invoiceDate) return;
    this.saving = true;
    this.error = '';
    this.invoicesApi.createDraft({ matterId: this.matterId, invoiceDate: this.invoiceDate, dueDate: this.dueDate, taxRate: this.taxRate }).subscribe({
      next: (invoice) => { this.saving = false; this.showDraftForm = false; this.selectedInvoice = invoice; this.load(); },
      error: (error) => {
        this.saving = false;
        this.error = error?.status === 403 ? 'You do not have permission to prepare invoices.' : error?.error?.detail || error?.error || 'Invoice draft could not be created. The matter may not have any unbilled fees or disbursements.';
      },
    });
  }

  issue(invoice: InvoiceDto): void {
    if (!this.canIssue || invoice.status !== 'Draft' || this.issuingId) return;
    if (!window.confirm(`Issue invoice ${invoice.number} for ${invoice.currency} ${invoice.total.toFixed(2)}? Issued invoices are treated as final.`)) return;
    this.issuingId = invoice.id;
    this.error = '';
    this.invoicesApi.issue(invoice.id).subscribe({
      next: (updated) => { this.issuingId = ''; this.selectedInvoice = updated; this.load(); },
      error: (error) => { this.issuingId = ''; this.error = error?.status === 403 ? 'You do not have permission to issue invoices.' : error?.error?.detail || error?.error || 'Invoice could not be issued.'; },
    });
  }

  statusClass(status: string): string {
    return status === 'Paid' ? 'badge-green' : status === 'Draft' ? 'badge-blue' : status === 'Voided' ? 'badge-gray' : status === 'PartPaid' ? 'badge-amber' : 'badge-red';
  }

  printInvoice(): void { window.print(); }

  private today(): string { return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
  private addDays(date: string, days: number): string { const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + days); return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`; }
}
