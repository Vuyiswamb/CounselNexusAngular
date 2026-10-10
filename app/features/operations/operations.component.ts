import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../shared/icon.component';
import { MatterDocumentsService, MattersService, PracticeOperationsService } from '../../core/api-services';
import { DocumentDto, MatterListItemDto, PracticeWorkflowRecordDto } from '../../core/api.models';

interface OperationRecord {
  id: string;
  reference: string;
  subject: string;
  person: string;
  date: string;
  status: string;
  amount?: string;
  matterId: string;
  matterLabel: string;
}

interface OperationConfig {
  key: string;
  title: string;
  description: string;
  singular: string;
  primaryLabel: string;
  columns: string[];
  statuses: string[];
}

const configs: Record<string, OperationConfig> = {
  'debt-collections': {
    key: 'debt-collections', title: 'Debt collections', singular: 'collection',
    description: 'Track demands, payment arrangements, recoveries and collection next steps.', primaryLabel: 'Debtor / matter',
    columns: ['Reference', 'Debtor / matter', 'Next action', 'Status', 'Amount'], statuses: ['New', 'Demand sent', 'Payment plan', 'Paid', 'Closed'],
  },
  evictions: {
    key: 'evictions', title: 'Evictions', singular: 'eviction',
    description: 'Manage notices, applications, court dates and possession milestones.', primaryLabel: 'Tenant / property',
    columns: ['Reference', 'Tenant / property', 'Next date', 'Status', 'Matter'], statuses: ['Intake', 'Notice issued', 'Court application', 'Order granted', 'Complete'],
  },
  'drivers-appointments': {
    key: 'drivers-appointments', title: "Driver's appointment report", singular: 'appointment',
    description: 'Review driver appointments, attendance, outcomes and follow-up actions.', primaryLabel: 'Driver',
    columns: ['Reference', 'Driver', 'Appointment date', 'Outcome', 'Matter'], statuses: ['Booked', 'Completed', 'Rescheduled', 'Cancelled'],
  },
  'summons-management': {
    key: 'summons-management', title: 'Summons management', singular: 'summons',
    description: 'Track drafting, issue, service, returns and defended summons matters.', primaryLabel: 'Defendant / matter',
    columns: ['Reference', 'Defendant / matter', 'Service date', 'Status', 'Next step'], statuses: ['Draft', 'Issued', 'Served', 'Returned', 'Defended', 'Closed'],
  },
};

@Component({
  selector: 'app-operations',
  imports: [FormsModule, IconComponent, DatePipe, DecimalPipe],
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.css'],
})
export class OperationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PracticeOperationsService);
  private mattersApi = inject(MattersService);
  config = configs['debt-collections'];
  records: OperationRecord[] = [];
  loading = false;
  error = '';
  search = '';
  statusFilter = 'All statuses';
  showForm = false;
  form: OperationRecord = this.emptyRecord();
  matters: MatterListItemDto[] = [];
  selectedSummons: OperationRecord | null = null;
  summonsDocuments: DocumentDto[] = [];
  documentsLoading = false;
  documentUploading = false;
  documentError = '';
  private documentsApi = inject(MatterDocumentsService);

  ngOnInit(): void {
    const key = this.route.snapshot.data['operation'] as string;
    this.config = configs[key] ?? configs['debt-collections'];
    this.form = this.emptyRecord();
    this.mattersApi.list({ status: 'Active', page: 1, pageSize: 200 }).subscribe({ next: (result) => { this.matters = result.items; this.load(); }, error: () => (this.error = 'Current matters could not be loaded.') });
    this.load();
  }

  get filteredRecords(): OperationRecord[] {
    const query = this.search.trim().toLowerCase();
    return this.records.filter((record) => {
      const matchesSearch = !query || Object.values(record).some((value) => String(value).toLowerCase().includes(query));
      return matchesSearch && (this.statusFilter === 'All statuses' || record.status === this.statusFilter);
    });
  }

  get activeCount(): number { return this.records.filter((record) => !['Closed', 'Complete', 'Paid'].includes(record.status)).length; }
  get completedCount(): number { return this.records.length - this.activeCount; }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.list(this.config.key, this.search, this.statusFilter).subscribe({
      next: (records) => { this.records = records.map((record) => this.toRecord(record)); this.loading = false; },
      error: () => { this.error = 'Records could not be loaded. Run Database/PracticeOperations.sql and restart the API.'; this.records = []; this.loading = false; },
    });
  }

  openForm(): void { this.form = this.emptyRecord(); this.showForm = true; }
  closeForm(): void { this.showForm = false; }

  save(): void {
    if (!this.form.subject.trim() || !this.form.person.trim()) return;
    if (this.config.key === 'debt-collections' && !this.form.matterId) { this.error = 'Select a current matter before saving the collection.'; return; }
    if (this.config.key === 'summons-management' && !this.form.matterId) { this.error = 'Select a current matter before saving the summons.'; return; }
    const request = { reference: this.form.reference || `${this.config.key.slice(0, 3).toUpperCase()}-${this.records.length + 1}`, personName: this.form.person, subject: this.form.subject, nextAction: this.form.date, status: this.form.status, amount: this.form.amount ? Number(this.form.amount.replace(/[^0-9.-]/g, '')) : null, notes: this.form.matterId ? `linkedMatterId:${this.form.matterId}` : null };
    this.api.create(this.config.key, request).subscribe({ next: () => { this.showForm = false; this.load(); }, error: () => (this.error = 'The record could not be saved.') });
  }

  private emptyRecord(): OperationRecord { return { id: '', reference: '', subject: '', person: '', date: '', status: this.config.statuses[0], amount: '', matterId: '', matterLabel: '' }; }

  private toRecord(record: PracticeWorkflowRecordDto): OperationRecord {
    const matterId = record.notes?.match(/linkedMatterId:([^\s]+)/)?.[1] || '';
    const matter = this.matters.find((item) => item.id === matterId);
    return { id: record.id, reference: record.reference, subject: matter ? `${matter.reference} - ${matter.title} | ${record.subject}` : record.subject, person: record.personName, date: record.nextAction || '', status: record.status, amount: record.amount == null ? '' : `R ${record.amount.toFixed(2)}`, matterId, matterLabel: matter ? `${matter.reference} - ${matter.title}` : '' };
  }

  openSummonsDocuments(record: OperationRecord): void {
    if (!record.matterId) { this.error = 'This summons is not linked to a current matter.'; return; }
    this.selectedSummons = record;
    this.summonsDocuments = [];
    this.documentError = '';
    this.documentsLoading = true;
    this.documentsApi.list(record.matterId).subscribe({
      next: (documents) => { this.summonsDocuments = documents.filter((document) => document.name.startsWith('Summons')); this.documentsLoading = false; },
      error: () => { this.documentError = 'Summons documents could not be loaded.'; this.documentsLoading = false; },
    });
  }

  closeSummonsDocuments(): void { this.selectedSummons = null; this.documentError = ''; }

  uploadSummonsDocuments(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length || !this.selectedSummons?.matterId || this.documentUploading) return;
    const oversized = files.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) { this.documentError = `${oversized.name} exceeds the 50 MB maximum file size.`; input.value = ''; return; }
    this.documentUploading = true;
    this.documentError = '';
    const uploads = files.map((file) => this.documentsApi.upload(this.selectedSummons!.matterId, new File([file], `Summons - ${file.name}`, { type: file.type })));
    forkJoin(uploads).subscribe({
      next: (documents) => { this.summonsDocuments = [...documents.reverse(), ...this.summonsDocuments]; this.documentUploading = false; input.value = ''; },
      error: () => { this.documentUploading = false; this.documentError = 'One or more summons documents could not be uploaded.'; input.value = ''; },
    });
  }

  downloadSummonsDocument(document: DocumentDto): void {
    this.documentsApi.download(document.id).subscribe({
      next: (blob) => { const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name.replace(/^Summons - /, ''); anchor.click(); URL.revokeObjectURL(url); },
      error: () => { this.documentError = 'The summons document could not be downloaded.'; },
    });
  }
}
