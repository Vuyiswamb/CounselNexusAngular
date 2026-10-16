import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PlatformService } from '../../core/api-services';
import { PlatformFirmDto, PlatformPackageDto } from '../../core/api.models';

@Component({
  selector: 'app-platform-assignments',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './platform-assignments.component.html',
  styleUrls: ['./platform-assignments.component.css', './platform-control.component.css'],
})
export class PlatformAssignmentsComponent implements OnInit {
  private api = inject(PlatformService);
  firms: PlatformFirmDto[] = [];
  packages: PlatformPackageDto[] = [];
  selectedFirmId = '';
  selectedPackageId = '';
  busy = false;
  loading = true;
  error = '';
  notice = '';

  get selectedFirm(): PlatformFirmDto | undefined {
    return this.firms.find((firm) => firm.id === this.selectedFirmId);
  }
  get selectedPackage(): PlatformPackageDto | undefined {
    return this.packages.find((item) => item.id === this.selectedPackageId);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.notice = '';
    let completed = 0;
    const finish = () => { if (++completed === 2) this.loading = false; };
    this.api.firms().subscribe({ next: (rows) => { this.firms = rows; if (!this.selectedFirmId && rows.length) this.selectedFirmId = rows[0].id; this.syncCurrentPackage(); finish(); }, error: () => { this.error = 'Could not load law firms.'; finish(); } });
    this.api.packages().subscribe({ next: (rows) => { this.packages = rows; this.syncCurrentPackage(); finish(); }, error: () => { this.error = 'Could not load subscription packages.'; finish(); } });
  }

  onFirmChange(): void { this.syncCurrentPackage(); }

  private syncCurrentPackage(): void {
    const firm = this.selectedFirm;
    if (!firm || !this.packages.length) return;
    const current = this.packages.find((item) => item.name === firm.planName || item.code === firm.planName);
    if (current) this.selectedPackageId = current.id;
  }

  assign(): void {
    if (!this.selectedFirmId || !this.selectedPackageId || this.busy) return;
    this.busy = true;
    this.error = '';
    this.notice = '';
    this.api.assignPackage(this.selectedFirmId, this.selectedPackageId).subscribe({
      next: () => { this.busy = false; this.notice = 'Subscription package assigned to the law firm.'; },
      error: () => { this.busy = false; this.error = 'Could not assign the package to the law firm.'; },
    });
  }
}
