import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../core/api-services';
import { PlatformFirmDto, PlatformTransactionDto } from '../../core/api.models';

@Component({ selector: 'app-platform-transactions', imports: [DatePipe, DecimalPipe, FormsModule], templateUrl: './platform-transactions.component.html', styleUrls: ['./platform-control.component.css'] })
export class PlatformTransactionsComponent implements OnInit {
  private api = inject(PlatformService);
  firms: PlatformFirmDto[] = [];
  transactions: PlatformTransactionDto[] = [];
  firmId = ''; status = ''; from = ''; to = ''; error = '';
  ngOnInit(): void { this.api.firms().subscribe({ next: (rows) => (this.firms = rows) }); this.load(); }
  load(): void { this.api.transactions({ firmId: this.firmId || undefined, status: this.status || undefined, fromUtc: this.from || undefined, toUtc: this.to || undefined }).subscribe({ next: (rows) => (this.transactions = rows), error: () => (this.error = 'Could not load subscription transactions.') }); }
}
