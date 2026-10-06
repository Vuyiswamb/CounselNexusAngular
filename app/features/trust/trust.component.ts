import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MattersService, TrustService } from '../../core/api-services';
import { MatterListItemDto, TrustTransactionDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-trust',
  imports: [DatePipe, DecimalPipe, FormsModule, IconComponent],
  templateUrl: './trust.component.html',
  styleUrls: ['./trust.component.css'],
})
export class TrustComponent implements OnInit {
  private mattersApi = inject(MattersService);
  private trustApi = inject(TrustService);
  matters: MatterListItemDto[] = [];
  rows: TrustTransactionDto[] = [];
  matterId = '';
  targetMatterId = '';
  movementType: 'Receipt' | 'Payment' | 'Transfer' = 'Receipt';
  amount: number | null = null;
  reference = '';
  description = '';
  loading = true;
  saving = false;
  error = '';
  notice = '';

  get balance(): number { return this.rows.length ? this.rows[this.rows.length - 1].matterBalance : 0; }
  get selectedMatterName(): string { return this.matters.find((matter) => matter.id === this.matterId)?.clientName ?? 'Select a matter to view its ledger'; }

  ngOnInit(): void {
    this.mattersApi.list({ pageSize: 100 }).subscribe({
      next: (result) => { this.matters = result.items; this.matterId = this.matters[0]?.id ?? ''; this.loading = false; this.load(); },
      error: () => { this.error = 'Could not load matters for the trust ledger.'; this.loading = false; },
    });
  }

  load(): void {
    if (!this.matterId) { this.rows = []; return; }
    this.loading = true; this.error = '';
    this.trustApi.list(this.matterId).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not load this matter trust ledger.'; this.loading = false; },
    });
  }

  post(): void {
    if (!this.matterId || !this.amount || this.amount <= 0 || !this.reference.trim() || this.saving) return;
    this.saving = true; this.error = ''; this.notice = '';
    const common = { amount: Number(this.amount), reference: this.reference.trim(), description: this.description.trim() || null };
    const request$: Observable<unknown> = this.movementType === 'Receipt'
      ? this.trustApi.receipt({ ...common, matterId: this.matterId })
      : this.movementType === 'Payment'
        ? this.trustApi.payment({ ...common, matterId: this.matterId })
        : this.trustApi.transfer({ ...common, fromMatterId: this.matterId, toMatterId: this.targetMatterId });
    if (this.movementType === 'Transfer' && (!this.targetMatterId || this.targetMatterId === this.matterId)) {
      this.error = 'Choose a different destination matter.'; this.saving = false; return;
    }
    request$.subscribe({
      next: () => { this.notice = `${this.movementType} recorded.`; this.amount = null; this.reference = ''; this.description = ''; this.saving = false; this.load(); },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || (typeof err?.error === 'string' ? err.error : '') || `Could not record the ${this.movementType.toLowerCase()}.`; this.saving = false; },
    });
  }

  reverse(row: TrustTransactionDto): void {
    const reason = prompt(`Reason for reversing ${row.reference}:`);
    if (reason === null) return;
    this.trustApi.reverse(row.id, reason.trim()).subscribe({
      next: () => { this.notice = 'Reversing transaction posted.'; this.load(); },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not reverse this transaction.'; },
    });
  }

  alreadyReversed(row: TrustTransactionDto): boolean {
    return !!row.reversesTransactionId || this.rows.some((candidate) => candidate.reversesTransactionId === row.id);
  }
}
