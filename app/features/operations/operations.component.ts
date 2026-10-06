import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { PracticeOperationsService } from '../../core/api-services';
import { PracticeWorkflowRecordDto } from '../../core/api.models';

interface OperationRecord {
  id: string;
  reference: string;
  subject: string;
  person: string;
  date: string;
  status: string;
  amount?: string;
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
  imports: [FormsModule, IconComponent],
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.css'],
})
export class OperationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PracticeOperationsService);
  config = configs['debt-collections'];
  records: OperationRecord[] = [];
  loading = false;
  error = '';
  search = '';
  statusFilter = 'All statuses';
  showForm = false;
  form: OperationRecord = this.emptyRecord();

  ngOnInit(): void {
    const key = this.route.snapshot.data['operation'] as string;
    this.config = configs[key] ?? configs['debt-collections'];
    this.form = this.emptyRecord();
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
    const request = { reference: this.form.reference || `${this.config.key.slice(0, 3).toUpperCase()}-${this.records.length + 1}`, personName: this.form.person, subject: this.form.subject, nextAction: this.form.date, status: this.form.status, amount: this.form.amount ? Number(this.form.amount.replace(/[^0-9.-]/g, '')) : null };
    this.api.create(this.config.key, request).subscribe({ next: () => { this.showForm = false; this.load(); }, error: () => (this.error = 'The record could not be saved.') });
  }

  private emptyRecord(): OperationRecord { return { id: '', reference: '', subject: '', person: '', date: '', status: this.config.statuses[0], amount: '' }; }

  private toRecord(record: PracticeWorkflowRecordDto): OperationRecord { return { id: record.id, reference: record.reference, subject: record.subject, person: record.personName, date: record.nextAction || '', status: record.status, amount: record.amount == null ? '' : `R ${record.amount.toFixed(2)}` }; }
}
