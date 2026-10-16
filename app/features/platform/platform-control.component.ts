import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PlatformService } from '../../core/api-services';
import { PlatformFirmDto, PlatformPaymentDto, PlatformSubscriptionDto, PlatformUserDto } from '../../core/api.models';

@Component({
  selector: 'app-platform-control',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './platform-control.component.html',
  styleUrls: ['./platform-control.component.css'],
})
export class PlatformControlComponent implements OnInit {
  private api = inject(PlatformService);
  firms: PlatformFirmDto[] = [];
  selected: PlatformFirmDto | null = null;
  users: PlatformUserDto[] = [];
  subscription: PlatformSubscriptionDto | null = null;
  payments: PlatformPaymentDto[] = [];
  search = '';
  loading = true;
  error = '';
  showPayment = false;
  paymentAmount: number | null = null;
  paymentReference = '';
  paymentNotes = '';
  paymentBusy = false;
  statusBusy = false;
  detailLoading = false;
  private detailRequest = 0;

  get filteredFirms(): PlatformFirmDto[] {
    const query = this.search.trim().toLowerCase();
    return query ? this.firms.filter((firm) => `${firm.name} ${firm.email ?? ''}`.toLowerCase().includes(query)) : this.firms;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.firms().subscribe({
      next: (firms) => {
        const selectedId = this.selected?.id;
        this.firms = firms;
        this.loading = false;
        if (selectedId) {
          const refreshed = firms.find((firm) => firm.id === selectedId) ?? null;
          this.selected = refreshed;
          if (refreshed) this.loadFirmDetails(refreshed);
        }
      },
      error: (err) => { this.error = err?.status === 403 ? 'Platform administrator access is required.' : 'Could not load law firms.'; this.loading = false; },
    });
  }

  selectFirm(firm: PlatformFirmDto | null): void {
    if (firm?.id === this.selected?.id) return;
    this.selected = firm;
    if (firm) this.loadFirmDetails(firm);
  }

  private loadFirmDetails(firm: PlatformFirmDto): void {
    const request = ++this.detailRequest;
    let completed = 0;
    this.detailLoading = true;
    const finish = () => {
      if (request === this.detailRequest && ++completed === 3) this.detailLoading = false;
    };
    this.api.users(firm.id).pipe(finalize(finish)).subscribe({ next: (users) => { if (request === this.detailRequest) this.users = users; } });
    this.api.subscription(firm.id).pipe(finalize(finish)).subscribe({ next: (subscription) => { if (request === this.detailRequest) { this.subscription = subscription; this.paymentAmount = subscription.monthlyPrice; } } });
    this.api.payments(firm.id).pipe(finalize(finish)).subscribe({ next: (payments) => { if (request === this.detailRequest) this.payments = payments; } });
  }

  toggleFirmStatus(): void {
    if (!this.selected || this.statusBusy) return;
    const enabled = !this.selected.isEnabled;
    this.statusBusy = true;
    this.api.setFirmStatus(this.selected.id, enabled).subscribe({
      next: () => { this.selected = this.selected ? { ...this.selected, isEnabled: enabled } : null; this.firms = this.firms.map((firm) => firm.id === this.selected?.id ? { ...firm, isEnabled: enabled } : firm); this.statusBusy = false; },
      error: () => { this.error = 'Could not update the law firm status.'; this.statusBusy = false; },
    });
  }

  addPayment(): void {
    if (!this.selected || !this.subscription || !this.paymentAmount || this.paymentBusy) return;
    this.paymentBusy = true;
    this.api.addPayment(this.selected.id, {
      firmSubscriptionId: this.subscription.id, amount: this.paymentAmount, currency: this.subscription.currency,
      status: 'Paid', paidAtUtc: new Date().toISOString(), externalReference: this.paymentReference.trim() || null, notes: this.paymentNotes.trim() || null,
    }).subscribe({
      next: (payment) => { this.payments = [payment, ...this.payments]; this.paymentAmount = this.subscription?.monthlyPrice ?? null; this.paymentReference = ''; this.paymentNotes = ''; this.paymentBusy = false; this.showPayment = false; },
      error: () => (this.paymentBusy = false),
    });
  }
}
