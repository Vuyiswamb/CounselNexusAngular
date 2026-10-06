import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { catchError, forkJoin, of } from 'rxjs';
import { ReportsService } from '../../core/api-services';
import { ActivityReportItemDto, OverdueInvoiceDto, TrustBalanceReportDto, WorkInProgressDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

type ReportTab = 'work' | 'overdue' | 'trust' | 'activity';

@Component({
  selector: 'app-reports',
  imports: [DatePipe, DecimalPipe, IconComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit {
  private api = inject(ReportsService);
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

  ngOnInit(): void { this.load(); }

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
