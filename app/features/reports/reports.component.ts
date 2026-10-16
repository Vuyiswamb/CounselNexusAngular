import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { PlatformService, ReportsService } from '../../core/api-services';
import { ActivityReportItemDto, OverdueInvoiceDto, PlatformFirmReportDto, TrustBalanceReportDto, WorkInProgressDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../core/auth.service';

type ReportTab = 'work' | 'overdue' | 'trust' | 'activity';

@Component({
  selector: 'app-reports',
  imports: [DatePipe, DecimalPipe, IconComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit {
  private api = inject(ReportsService);
  private platformApi = inject(PlatformService);
  private auth = inject(AuthService);
  platformFirms: PlatformFirmReportDto[] = [];
  work: WorkInProgressDto[] = [];
  overdue: OverdueInvoiceDto[] = [];
  trust: TrustBalanceReportDto[] = [];
  activity: ActivityReportItemDto[] = [];
  tab: ReportTab = 'work';
  loading = true;
  error = '';

  get totalWork(): number { return this.work.reduce((sum, row) => sum + row.total, 0); }
  get trustTotal(): number { return this.trust.reduce((sum, row) => sum + row.balance, 0); }
  get maxWork(): number { return Math.max(1, ...this.work.map((row) => row.total)); }
  get isPlatformAdmin(): boolean { return this.auth.isPlatformAdmin(); }
  get platformMonthlyValue(): number { return this.platformFirms.reduce((sum, firm) => sum + (firm.monthlyPrice ?? 0), 0); }
  get platformPaidTotal(): number { return this.platformFirms.reduce((sum, firm) => sum + (firm.paidTotal ?? 0), 0); }
  get platformActiveCount(): number { return this.platformFirms.filter((firm) => firm.subscriptionStatus === 'Active').length; }

  ngOnInit(): void { this.isPlatformAdmin ? this.loadPlatform() : this.load(); }

  loadPlatform(): void {
    this.loading = true; this.error = '';
    this.platformApi.firmReports().subscribe({
      next: (firms) => { this.platformFirms = firms; this.loading = false; },
      error: (err) => { this.error = err?.status === 403 ? 'Platform administrator access is required.' : 'Could not load firm reports.'; this.loading = false; },
    });
  }

  load(): void {
    this.loading = true; this.error = '';
    const since = new Date(); since.setDate(since.getDate() - 30);
    forkJoin({
      work: this.api.workInProgress().pipe(catchError(() => of([] as WorkInProgressDto[]))),
      overdue: this.api.overdueInvoices().pipe(catchError(() => of([] as OverdueInvoiceDto[]))),
      trust: this.api.trustBalances().pipe(catchError(() => of([] as TrustBalanceReportDto[]))),
      activity: this.api.activity(since).pipe(catchError(() => of([] as ActivityReportItemDto[]))),
    }).subscribe({
      next: (data) => { this.work = data.work; this.overdue = data.overdue; this.trust = data.trust; this.activity = data.activity; this.loading = false; },
      error: () => { this.error = 'Could not load reports. Check your report permissions.'; this.loading = false; },
    });
  }

  select(tab: ReportTab): void { this.tab = tab; }
}
