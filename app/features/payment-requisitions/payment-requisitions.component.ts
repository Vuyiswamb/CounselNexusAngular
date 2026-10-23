import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { MattersService, PaymentRequisitionsService } from '../../core/api-services';
import { MatterListItemDto, PaymentPriority, PaymentRequisitionDto, PaymentRequisitionListDto, PaymentRequisitionRequest, PaymentRequisitionStatus, PaymentSource } from '../../core/api.models';

@Component({ selector: 'app-payment-requisitions', imports: [FormsModule, DatePipe, DecimalPipe, CurrencyPipe, IconComponent], templateUrl: './payment-requisitions.component.html', styleUrls: ['./payment-requisitions.component.css'] })
export class PaymentRequisitionsComponent implements OnInit {
  private api = inject(PaymentRequisitionsService);
  private mattersApi = inject(MattersService);
  dashboard?: import('../../core/api.models').PaymentRequisitionDashboardDto;
  rows: PaymentRequisitionListDto[] = [];
  matters: MatterListItemDto[] = [];
  selected?: PaymentRequisitionDto;
  loading = false; saving = false; error = ''; notice = '';
  search = ''; statusFilter = '';
  showForm = false; actionBusy = false; actionError = '';
  actionComments = ''; paymentReference = ''; bankReference = ''; paymentDate = this.today();
  categories = ['Advocate fees', "Sheriff's fees", 'Court fees', 'Correspondent attorney fees', 'Expert witness fees', 'Settlement payments', 'Client refunds', 'Conveyancing disbursements', 'Operational expenses', 'Other authorised expenses'];
  priorities: PaymentPriority[] = ['Normal', 'Urgent', 'Critical'];
  sources: PaymentSource[] = ['Business', 'Trust'];
  statuses: PaymentRequisitionStatus[] = ['Draft', 'Submitted', 'Verification', 'PendingApproval', 'Approved', 'PaymentProcessing', 'Paid', 'Reconciled', 'Returned', 'Rejected', 'Cancelled', 'PaymentFailed'];
  form: PaymentRequisitionRequest = this.emptyForm();

  ngOnInit(): void { this.load(); this.mattersApi.list({ status: 'Active', page: 1, pageSize: 200 }).subscribe({ next: result => this.matters = result.items }); }
  load(): void { this.loading = true; this.error = ''; this.api.dashboard().subscribe({ next: value => this.dashboard = value }); this.api.list({ search: this.search, status: this.statusFilter, pageSize: 100 }).subscribe({ next: value => { this.rows = value.items; this.loading = false; }, error: err => { this.error = err?.error?.detail || 'Payment requisitions could not be loaded.'; this.loading = false; } }); }
  openCreate(): void { this.form = this.emptyForm(); this.selected = undefined; this.error = ''; this.notice = ''; this.showForm = true; }
  closeForm(): void { this.showForm = false; }
  addItem(): void { this.form.items.push({ description: '', category: this.form.category, amount: 0, vatAmount: 0 }); }
  removeItem(index: number): void { if (this.form.items.length > 1) this.form.items.splice(index, 1); }
  total(form = this.form): number { return form.items.reduce((sum, item) => sum + Number(item.amount || 0) + Number(item.vatAmount || 0), 0); }
  save(): void {
    if (this.saving || !this.form.beneficiaryName.trim() || !this.form.motivation.trim() || !this.form.items.length) return;
    this.saving = true; this.error = '';
    const request = { ...this.form, items: this.form.items.map(item => ({ ...item, amount: Number(item.amount), vatAmount: Number(item.vatAmount) })) };
    const call = this.selected ? this.api.update(this.selected.id, request) : this.api.create(request);
    call.subscribe({ next: value => { this.saving = false; this.showForm = false; this.selected = value; this.notice = `${value.number} saved as a draft.`; this.load(); }, error: err => { this.saving = false; this.error = err?.error?.detail || err?.error || 'The requisition could not be saved.'; } });
  }
  open(row: PaymentRequisitionListDto): void { this.api.get(row.id).subscribe({ next: value => { this.selected = value; this.actionComments = ''; this.actionError = ''; } }); }
  editSelected(): void { if (!this.selected) return; this.form = { department: this.selected.department, matterId: this.selected.matterId, clientId: this.selected.clientId, dueDate: this.selected.dueDate, priority: this.selected.priority, motivation: this.selected.motivation, category: this.selected.category, beneficiaryName: this.selected.beneficiaryName, beneficiaryAccountReference: this.selected.beneficiaryAccountReference, currency: this.selected.currency, source: this.selected.source, costCentre: this.selected.costCentre, paymentReference: this.selected.paymentReference, items: this.selected.items.map(item => ({ description: item.description, category: item.category, amount: item.amount, vatAmount: item.vatAmount })) }; this.showForm = true; }
  submit(): void { if (this.selected) this.run(this.api.submit(this.selected.id), 'Requisition submitted.'); }
  verify(decision: string): void { if (this.selected) this.run(this.api.verify(this.selected.id, decision, this.actionComments), `Verification ${decision}.`); }
  approve(): void { if (this.selected) this.run(this.api.approve(this.selected.id, this.actionComments), 'Requisition approved.'); }
  reject(): void { if (this.selected) this.run(this.api.reject(this.selected.id, this.actionComments), 'Requisition rejected.'); }
  process(): void { if (this.selected) this.run(this.api.process(this.selected.id, this.paymentReference, this.actionComments), 'Payment prepared.'); }
  confirmPayment(): void { if (this.selected) this.run(this.api.confirmPayment(this.selected.id, { paymentReference: this.paymentReference, paymentDateUtc: this.paymentDate ? `${this.paymentDate}T00:00:00Z` : undefined, method: 'EFT', bankConfirmationReference: this.bankReference, notes: this.actionComments }), 'Payment confirmation recorded.'); }
  reconcile(): void { if (this.selected) this.run(this.api.reconcile(this.selected.id, this.actionComments), 'Payment reconciled.'); }
  private run(request: import('rxjs').Observable<PaymentRequisitionDto>, message: string): void { if (this.actionBusy) return; this.actionBusy = true; this.actionError = ''; request.subscribe({ next: value => { this.selected = value; this.actionBusy = false; this.notice = message; this.actionComments = ''; this.load(); }, error: err => { this.actionBusy = false; this.actionError = err?.error?.detail || err?.error || 'The workflow action could not be completed.'; } }); }
  statusClass(status: string): string { return `status-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`; }
  private emptyForm(): PaymentRequisitionRequest { return { department: '', matterId: null, clientId: null, dueDate: null, priority: 'Normal', motivation: '', category: this.categories[0], beneficiaryName: '', beneficiaryAccountReference: '', currency: 'ZAR', source: 'Business', costCentre: '', paymentReference: '', items: [{ description: '', category: this.categories[0], amount: 0, vatAmount: 0 }] }; }
  private today(): string { return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
}
