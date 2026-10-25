import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
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
  private host = inject(ElementRef<HTMLElement>);
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
      error: (err) => {
        this.error = err?.status === 403
          ? 'You do not have access to the Matters module. Ask a Practice Administrator to enable Matters access before using the trust ledger.'
          : err?.status === 401
            ? 'Your session has expired. Please sign in again to load the trust ledger.'
            : 'The matter list could not be loaded. Please refresh and try again.';
        this.loading = false;
      },
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

  post(form?: NgForm): void {
    if (this.saving) return;
    if (this.movementType === 'Transfer') form?.controls['targetMatterId']?.setErrors(this.targetMatterId && this.targetMatterId !== this.matterId ? null : { required: true });
    if (form?.invalid || !this.matterId || !this.amount || this.amount <= 0 || !this.reference.trim()) {
      this.error = 'Complete the required trust movement fields before posting.';
      this.focusFirstInvalidControl();
      return;
    }
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

  private focusFirstInvalidControl(): void {
    requestAnimationFrame(() => {
      const control = (this.host.nativeElement as HTMLElement).querySelector('.movement-card input.ng-invalid, .movement-card select.ng-invalid, .movement-card textarea.ng-invalid') as HTMLElement | null;
      if (!control) return;
      control.focus();
      control.classList.remove('cn-validation-shake');
      void control.offsetWidth;
      control.classList.add('cn-validation-shake');
      window.setTimeout(() => control.classList.remove('cn-validation-shake'), 500);
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
