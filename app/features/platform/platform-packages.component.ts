import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PlatformService } from '../../core/api-services';
import { PlatformComponentDto, PlatformPackageDto } from '../../core/api.models';

@Component({
  selector: 'app-platform-packages',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './platform-packages.component.html',
  styleUrls: ['./platform-packages.component.css', './platform-control.component.css'],
})
export class PlatformPackagesComponent implements OnInit {
  private api = inject(PlatformService);
  packages: PlatformPackageDto[] = [];
  components: PlatformComponentDto[] = [];
  selectedPackageId = '';
  selectedComponentIds: string[] = [];
  code = '';
  name = '';
  price = 0;
  currency = 'ZAR';
  busy = false;
  packageSaveBusy = false;
  error = '';

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.components().subscribe({ next: (rows) => (this.components = rows) });
    this.api.packages().subscribe({ next: (rows) => { this.packages = rows; if (rows.length && !this.selectedPackageId) this.select(rows[0]); }, error: () => (this.error = 'Could not load subscription packages.') });
  }
  select(item: PlatformPackageDto): void {
    this.selectedPackageId = item.id;
    this.code = item.code;
    this.name = item.name;
    this.price = item.monthlyPrice;
    this.currency = item.currency;
    this.selectedComponentIds = item.components.map((component) => component.id);
    this.error = '';
  }
  hasComponent(id: string): boolean { return this.selectedComponentIds.includes(id); }
  get allComponentsSelected(): boolean { return this.components.length > 0 && this.components.every((component) => this.hasComponent(component.id)); }
  selectAllComponents(): void { this.selectedComponentIds = this.components.map((component) => component.id); }
  clearAllComponents(): void { this.selectedComponentIds = []; }
  toggleComponent(id: string): void { this.selectedComponentIds = this.hasComponent(id) ? this.selectedComponentIds.filter((item) => item !== id) : [...this.selectedComponentIds, id]; }
  create(): void {
    if (this.busy || !this.code.trim() || !this.name.trim()) return;
    this.busy = true;
    this.api.createPackage({ code: this.code.trim(), name: this.name.trim(), monthlyPrice: Number(this.price) || 0, currency: this.currency, isActive: true }).subscribe({ next: () => { this.code = ''; this.name = ''; this.price = 0; this.busy = false; this.load(); }, error: (err) => { this.error = err?.error?.title || 'Could not create subscription package.'; this.busy = false; } });
  }
  saveChanges(): void {
    if (!this.selectedPackageId || this.packageSaveBusy || !this.code.trim() || !this.name.trim()) return;
    this.packageSaveBusy = true;
    this.error = '';
    forkJoin({
      package: this.api.updatePackage(this.selectedPackageId, { code: this.code.trim(), name: this.name.trim(), monthlyPrice: Number(this.price) || 0, currency: this.currency, isActive: true }),
      components: this.api.setPackageComponents(this.selectedPackageId, this.selectedComponentIds),
    }).subscribe({
      next: () => { this.packageSaveBusy = false; this.load(); },
      error: (err) => { this.error = err?.error?.title || 'Could not save package changes.'; this.packageSaveBusy = false; },
    });
  }
}
