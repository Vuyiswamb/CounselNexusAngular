import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { LegalAccountingService } from '../../core/api-services';
import { LedgerAccountDto, TrialBalanceRowDto } from '../../core/api.models';

@Component({
  selector: 'app-legal-accounting',
  imports: [FormsModule, DatePipe, DecimalPipe, IconComponent],
  templateUrl: './legal-accounting.component.html',
  styleUrls: ['./legal-accounting.component.css'],
})
export class LegalAccountingComponent implements OnInit {
  private api = inject(LegalAccountingService);
  private host = inject(ElementRef<HTMLElement>);
  @ViewChild('journalForm') journalForm?: NgForm;
  accounts: LedgerAccountDto[] = [];
  trialBalance: TrialBalanceRowDto[] = [];
  selectedAccount?: LedgerAccountDto;
  ledger: import('../../core/api.models').LedgerEntryDto[] = [];
  entryDate = new Date().toISOString().slice(0, 10);
  description = '';
  debitAccountId = '';
  creditAccountId = '';
  amount: number | null = null;
  lineDescription = '';
  loading = true;
  saving = false;
  error = '';
  notice = '';

  get totalDebits(): number { return this.trialBalance.reduce((sum, row) => sum + row.debits, 0); }
  get totalCredits(): number { return this.trialBalance.reduce((sum, row) => sum + row.credits, 0); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.accounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.debitAccountId ||= accounts.find((account) => account.accountType === 'Expense')?.id ?? accounts[0]?.id ?? '';
        this.creditAccountId ||= accounts.find((account) => account.accountType === 'Asset')?.id ?? accounts[1]?.id ?? '';
        this.api.trialBalance().subscribe({ next: (rows) => { this.trialBalance = rows; this.loading = false; }, error: () => { this.error = 'The trial balance could not be loaded.'; this.loading = false; } });
      },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Legal accounting could not be loaded.'; this.loading = false; },
    });
  }

  showLedger(account: LedgerAccountDto): void {
    this.selectedAccount = account;
    this.api.ledger(account.id).subscribe({ next: (rows) => (this.ledger = rows), error: () => (this.error = 'The account ledger could not be loaded.') });
  }

  closeLedger(): void { this.selectedAccount = undefined; this.ledger = []; }

  reverseEntry(entry: import('../../core/api.models').LedgerEntryDto): void {
    if (!confirm(`Post a reversal for ${entry.entryNumber}?`)) return;
    this.api.reverseJournal(entry.journalEntryId).subscribe({
      next: (result) => { this.notice = `Reversal ${result.entryNumber} posted.`; this.closeLedger(); this.load(); },
      error: (err) => (this.error = err?.error?.detail || err?.error?.title || 'The journal reversal could not be posted.'),
    });
  }

  postJournal(form?: NgForm): void {
    if (this.saving) return;
    const validationForm = form ?? this.journalForm;
    validationForm?.controls['description']?.setErrors(this.description.trim() ? null : { required: true });
    validationForm?.controls['amount']?.setErrors(this.amount && this.amount > 0 ? null : { required: true });
    validationForm?.controls['debitAccount']?.setErrors(this.debitAccountId ? null : { required: true });
    validationForm?.controls['creditAccount']?.setErrors(this.creditAccountId && this.creditAccountId !== this.debitAccountId ? null : { required: true });
    if (validationForm?.invalid || !this.description.trim() || !this.debitAccountId || !this.creditAccountId || !this.amount || this.amount <= 0 || this.debitAccountId === this.creditAccountId) {
      this.error = this.debitAccountId === this.creditAccountId && this.debitAccountId ? 'Debit and credit accounts must be different.' : 'Complete all required journal fields before posting.';
      this.focusFirstInvalidControl();
      return;
    }
    this.saving = true; this.error = ''; this.notice = '';
    this.api.postJournal({ entryDate: this.entryDate, description: this.description.trim(), lines: [
      { ledgerAccountId: this.debitAccountId, description: this.lineDescription.trim() || null, debit: Number(this.amount), credit: 0 },
      { ledgerAccountId: this.creditAccountId, description: this.lineDescription.trim() || null, debit: 0, credit: Number(this.amount) },
    ] }).subscribe({
      next: (result) => { this.notice = `Journal ${result.entryNumber} posted successfully.`; this.description = ''; this.lineDescription = ''; this.amount = null; this.saving = false; this.load(); },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || (typeof err?.error === 'string' ? err.error : '') || 'The journal could not be posted.'; this.saving = false; },
    });
  }

  private focusFirstInvalidControl(): void {
    requestAnimationFrame(() => {
      const selector = !this.description.trim()
        ? '.journal-card input[name="description"]'
        : !this.amount || this.amount <= 0
          ? '.journal-card input[name="amount"]'
          : !this.debitAccountId
            ? '.journal-card select[name="debitAccount"]'
            : !this.creditAccountId || this.creditAccountId === this.debitAccountId
              ? '.journal-card select[name="creditAccount"]'
              : '.journal-card input[name="entryDate"]';
      const control = (this.host.nativeElement as HTMLElement).querySelector(selector) as HTMLElement | null;
      if (!control) return;
      control.focus();
      control.classList.remove('cn-validation-shake');
      void control.offsetWidth;
      control.classList.add('cn-validation-shake');
      window.setTimeout(() => control.classList.remove('cn-validation-shake'), 500);
    });
  }
}
