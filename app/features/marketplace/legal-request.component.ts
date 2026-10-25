import { Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MarketplaceService, LegalRequestCreated, LegalRequestInput } from '../../core/marketplace.service';

@Component({ selector: 'app-legal-request', imports: [FormsModule, RouterLink], templateUrl: './legal-request.component.html', styleUrl: './legal-request.component.css' })
export class LegalRequestComponent implements OnDestroy {
  private readonly service = inject(MarketplaceService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly successClickHandler = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.success-card .button') || !this.submitted) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.host.nativeElement.closest('.request-modal')) {
      this.host.nativeElement.dispatchEvent(new CustomEvent('request-completed', { bubbles: true }));
      return;
    }
    void this.router.navigate(['/legal-market']);
  };
  step = 1;
  submitted: LegalRequestCreated | null = null;
  error = '';
  accountRequired = false;
  clientFullName = '';
  clientEmail = '';
  clientPassword = '';
  clientPasswordConfirm = '';
  keepInformed = true;
  accountMode: 'create' | 'login' = 'create';
  loginEmail = '';
  loginPassword = '';
  categorySearch = '';
  readonly categories = [
    ['divorce-family-law', 'Divorce and Family Law', 'Divorce, child custody, maintenance and family disputes.', 'marketplace-family.png'],
    ['property-conveyancing', 'Property and Conveyancing', 'Buying, selling, property disputes and tenancy matters.', 'marketplace-property.png'],
    ['road-accident-fund', 'Road Accident Fund Claims', 'RAF claims, personal injury and accident-related matters.', 'marketplace-raf.png'],
    ['criminal-defence', 'Criminal Defence', 'Arrest, bail applications, criminal charges and court representation.', 'marketplace-criminal.png'],
    ['employment-labour-law', 'Employment and Labour Law', 'Unfair dismissal, workplace disputes and labour issues.', 'marketplace-employment.png'],
    ['contracts-agreements', 'Contracts and Agreements', 'Drafting, reviewing and disputes relating to contracts.', 'marketplace-contracts.png'],
    ['wills-estates', 'Wills and Estates', 'Wills, estates, inheritance disputes and deceased estates.', 'marketplace-wills.png'],
    ['business-commercial', 'Business and Commercial Law', 'Company law, commercial disputes and business advice.', 'marketplace-business.png'],
    ['consumer-protection', 'Consumer Protection', 'Consumer disputes, warranties and service provider issues.', 'marketplace-consumer.png'],
    ['debt-collection', 'Debt Collection', 'Recovering money owed and debt disputes.', 'marketplace-debt.png'],
    ['immigration-law', 'Immigration Law', 'Visas, permits and immigration-related matters.', 'marketplace-immigration.png'],
    ['civil-litigation', 'Civil Litigation', 'General legal disputes and court proceedings.', 'marketplace-civil.png']
  ];
  request: LegalRequestInput = { practiceAreaSlug: '', title: '', description: '', province: 'Gauteng', city: '', phone: '', suburb: '', budget: 'Not sure yet', consultationMethod: 'Online', urgency: 'Normal' };
  readonly citySuburbs: Record<string, string[]> = {
    Johannesburg: ['Braamfontein', 'Fourways', 'Midrand', 'Randburg', 'Rosebank', 'Sandton', 'Soweto'],
    Pretoria: ['Arcadia', 'Centurion', 'Hatfield', 'Menlyn', 'Montana', 'Mamelodi', 'Sunnyside'],
    Durban: ['Berea', 'Chatsworth', 'Glenwood', 'Morningside', 'Umhlanga', 'Westville'],
    'Cape Town': ['Bellville', 'Claremont', 'Constantia', 'Goodwood', 'Khayelitsha', 'Sea Point', 'Somerset West'],
    Bloemfontein: ['Bayswater', 'Brandwag', 'Dan Pienaar', 'Heuwelsig', 'Mangaung', 'Universitas'],
    Gqeberha: ['Central', 'Fairview', 'Newton Park', 'Summerstrand', 'Walmer'],
    'East London': ['Beacon Bay', 'Gonubie', 'Southernwood', 'Vincent'],
    Polokwane: ['Bendor', 'Flora Park', 'Ivy Park', 'Mankweng', 'Seshego'],
    Mbombela: ['Barberton', 'Cascades', 'Sonheuwel', 'West Acres'],
    Kimberley: ['Beaconsfield', 'Homestead', 'Klipdam', 'New Park']
  };

  constructor() {
    this.route.queryParamMap.subscribe((params) => { this.request.practiceAreaSlug = params.get('category') ?? this.request.practiceAreaSlug; });
    this.host.nativeElement.addEventListener('click', this.successClickHandler, true);
  }
  ngOnDestroy(): void { this.host.nativeElement.removeEventListener('click', this.successClickHandler, true); }
  get isAuthenticated(): boolean { return this.auth.isAuthenticated; }
  get selectedCategoryName(): string { return this.categories.find(([slug]) => slug === this.request.practiceAreaSlug)?.[1] ?? 'your legal matter'; }
  get suburbs(): string[] { return this.citySuburbs[this.request.city] ?? []; }
  get filteredCategories(): string[][] { const query = this.categorySearch.trim().toLowerCase(); return this.categories.filter((category) => !query || category[1].toLowerCase().includes(query) || category[2].toLowerCase().includes(query)); }
  selectCategory(slug: string): void { this.request.practiceAreaSlug = slug; }
  changeCity(): void { this.request.suburb = ''; }
  get canContinue(): boolean {
    if (this.step === 1) return !!this.request.practiceAreaSlug;
    if (this.step === 2) return !!this.request.title.trim() && !!this.request.description.trim();
    if (this.step === 3) return !!this.request.consultationMethod;
    if (this.step === 4) return !!this.request.province.trim() && !!this.request.city.trim() && !!this.request.phone.trim();
    return this.accountMode === 'create'
      ? !!this.clientFullName.trim() && !!this.clientEmail.trim() && this.clientPassword.length >= 8 && this.clientPassword === this.clientPasswordConfirm
      : !!this.loginEmail.trim() && !!this.loginPassword;
  }
  next(form?: NgForm): void { if (form?.invalid || !this.canContinue) return; this.error = ''; if (this.step < 4) this.step++; else if (this.step === 4 && !this.auth.isAuthenticated) this.step = 5; else this.submit(); }
  back(): void { this.error = ''; if (this.step > 1) this.step--; }
  submit(): void {
    this.error = '';
    this.accountRequired = false;
    const finishRequest = (): void => {
      this.service.createRequest(this.request).subscribe({
        next: (result) => this.submitted = result,
        error: (err) => this.error = err?.error?.detail ?? err?.error?.title ?? 'We could not submit your request. Please check the details and try again.'
      });
    };

    if (this.auth.isAuthenticated) {
      finishRequest();
      return;
    }

    if (this.accountMode === 'create') {
      this.auth.registerClient({ fullName: this.clientFullName.trim(), email: this.clientEmail.trim(), password: this.clientPassword, phone: this.request.phone })
        .subscribe({ next: () => finishRequest(), error: (err) => this.error = err?.error?.detail ?? err?.error?.title ?? 'We could not create your client account. Please check the details and try again.' });
      return;
    }

    this.auth.login(this.loginEmail.trim(), this.loginPassword).subscribe({
      next: (result) => 'token' in result ? finishRequest() : this.error = 'This account requires an authenticator code. Please sign in first, then submit your request.',
      error: (err) => this.error = err?.error?.detail ?? err?.error?.title ?? 'We could not sign you in. Please check your email and password.'
    });
  }
}
