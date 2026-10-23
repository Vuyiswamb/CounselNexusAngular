import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PublicPackagesService, SubscriptionCheckoutService } from '../../core/api-services';
import { PlatformPackageDto } from '../../core/api.models';

/** Public package comparison page backed by the packages managed in Platform Control. */
@Component({
  selector: 'app-packages',
  imports: [RouterLink, RouterLinkActive, CurrencyPipe, FormsModule],
  templateUrl: './packages.component.html',
  styleUrl: './packages.component.css',
})
export class PackagesComponent implements OnInit {
  packages: PlatformPackageDto[] = [];
  loading = true;
  error = '';
  checkoutError = '';
  selectedPackage: PlatformPackageDto | null = null;
  months = 1;
  checkoutBusy = false;
  checkoutPointerDown = false;
  renewalMode = false;
  checkoutEmail = '';
  private packagesApi = inject(PublicPackagesService);
  private checkoutApi = inject(SubscriptionCheckoutService);
  readonly auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.renewalMode = params.get('renew') === '1';
      const planId = params.get('planId');
      const months = Number(params.get('months') ?? 1);
      if (planId) {
        this.months = Number.isFinite(months) && months >= 1 && months <= 36 ? months : 1;
        const selected = this.packages.find((item) => item.id === planId);
        if (selected) this.choosePackage(selected);
      }
    });
    this.loadPackages();
  }

  loadPackages(): void {
    this.loading = true;
    this.error = '';
    this.packagesApi.list().subscribe({
      next: (packages) => {
        this.packages = packages.filter((item) => item.isActive); this.loading = false;
        const planId = this.route.snapshot.queryParamMap.get('planId');
        const selected = this.packages.find((item) => item.id === planId);
        if (selected) this.choosePackage(selected);
      },
      error: () => { this.loading = false; this.error = 'Packages are temporarily unavailable. Please contact us for current pricing.'; },
    });
  }

  packageDescription(item: PlatformPackageDto): string {
    return `${item.name} gives your firm access to the CounselNexus features included in this package.`;
  }

  choosePackage(item: PlatformPackageDto): void {
    if (this.renewalMode && item.code.toUpperCase() === 'TRIAL') {
      this.checkoutError = 'Your trial has expired. Please choose a paid package.';
      return;
    }
    this.selectedPackage = item;
    this.months = 1;
    this.checkoutEmail = this.auth.user()?.email ?? '';
    this.checkoutError = '';
  }

  closeCheckout(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    if (this.checkoutPointerDown || window.getSelection()?.toString()) {
      this.checkoutPointerDown = false;
      return;
    }
    if (!this.checkoutBusy) this.selectedPackage = null;
  }

  continueCheckout(): void {
    this.checkoutError = '';
    if (!this.selectedPackage) return;
    if (!Number.isInteger(Number(this.months)) || Number(this.months) < 1 || Number(this.months) > 36) {
      this.checkoutError = 'Choose a payment period between 1 and 36 months.';
      return;
    }
    if (!this.checkoutEmail.trim()) {
      this.checkoutError = 'Enter the email address registered for your firm.';
      return;
    }
    this.checkoutBusy = true;
    this.checkoutApi.checkout(this.selectedPackage.id, this.months, this.checkoutEmail.trim()).subscribe({
      next: (checkout) => {
        this.checkoutBusy = false;
        const approvedActions = new Set([
          'https://sandbox.payfast.co.za/eng/process',
          'https://www.payfast.co.za/eng/process',
        ]);
        if (!approvedActions.has(checkout.action)) {
          this.checkoutError = 'The payment gateway returned an unapproved checkout destination.';
          return;
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = checkout.action;
        form.enctype = 'application/x-www-form-urlencoded';
        form.acceptCharset = 'UTF-8';
        form.style.display = 'none';
        Object.entries(checkout.fields).forEach(([name, value]) => {
          const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
        });
        document.body.appendChild(form); form.submit();
      },
      error: (error) => {
        this.checkoutBusy = false;
        this.checkoutError = error?.error?.detail ?? 'We could not start the payment. Please check the gateway settings and try again.';
      },
    });
  }
}
