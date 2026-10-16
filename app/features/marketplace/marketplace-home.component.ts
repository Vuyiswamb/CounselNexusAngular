import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceService, PublicPractitioner } from '../../core/marketplace.service';

@Component({
  selector: 'app-marketplace-home', imports: [RouterLink], templateUrl: './marketplace-home.component.html', styleUrl: './marketplace-home.component.css'
})
export class MarketplaceHomeComponent {
  private readonly marketplace = inject(MarketplaceService);
  readonly categories = [
    ['Divorce & Family Law', 'divorce-family-law'], ['Criminal Defence', 'criminal-defence'],
    ['Employment & Labour', 'employment-labour-law'], ['Property & Conveyancing', 'property-conveyancing'],
    ['Wills & Estates', 'wills-estates'], ['Contracts & Agreements', 'contracts-agreements']
  ];
  practitioners: PublicPractitioner[] = [];
  loading = true;

  constructor() { this.marketplace.practitioners().subscribe({ next: (rows) => this.practitioners = rows, error: () => this.loading = false, complete: () => this.loading = false }); }
}
