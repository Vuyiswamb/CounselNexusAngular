import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FirmSubscriptionService } from '../../core/api-services';
import { PlatformPaymentDto, PlatformSubscriptionDto } from '../../core/api.models';

@Component({
  selector: 'app-subscription',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.css',
})
export class SubscriptionComponent implements OnInit {
  private api = inject(FirmSubscriptionService);
  subscription: PlatformSubscriptionDto | null = null;
  payments: PlatformPaymentDto[] = [];
  loading = true;
  error = '';

  get isActive(): boolean { return this.subscription?.status?.toLowerCase() === 'active'; }
  get statusClass(): string { return this.isActive ? 'active' : (this.subscription?.status?.toLowerCase() || 'unknown'); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({ subscription: this.api.current(), payments: this.api.payments() }).subscribe({
      next: (result) => { this.subscription = result.subscription; this.payments = result.payments; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.detail || err?.error?.title || 'Your subscription details could not be loaded.';
        this.loading = false;
      },
    });
  }
}
