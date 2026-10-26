import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { LegalRequestOffer, MarketplaceService, LegalRequestListItem } from '../../core/marketplace.service';
import { LegalRequestComponent } from './legal-request.component';
import { AuthService } from '../../core/auth.service';
import * as L from 'leaflet';
import { LanguageSwitcherComponent } from '../../shared/language-switcher.component';

const suburbCoordinates: Record<string, [number, number]> = {
  sandton: [-26.1076, 28.0567], randburg: [-26.0937, 27.9949], rosebank: [-26.1467, 28.0364], fourways: [-26.0267, 28.0106],
  midrand: [-25.9895, 28.1284], soweto: [-26.2485, 27.854], braamfontein: [-26.1929, 28.0305],
  arcadia: [-25.7461, 28.2116], centurion: [-25.8603, 28.1894], hatfield: [-25.7463, 28.235], menlyn: [-25.783, 28.275],
  mamelodi: [-25.7047, 28.379], sunnyside: [-25.7619, 28.204], umhlanga: [-29.726, 31.084], glenwood: [-29.891, 30.999],
  berea: [-29.8587, 31.006], morningside: [-29.817, 31.021], westville: [-29.836, 30.926], chatsworth: [-29.918, 30.88],
  bellville: [-33.9002, 18.629], claremont: [-33.981, 18.465], constantia: [-34.025, 18.447], goodwood: [-33.901, 18.551],
  'sea point': [-33.918, 18.386], 'somerset west': [-34.084, 18.843], khayelitsha: [-34.039, 18.677],
  'dan pienaar': [-29.092, 26.188], brandwag: [-29.116, 26.196], bayswater: [-29.083, 26.187], mangaung: [-29.198, 26.105],
  summerstrand: [-33.999, 25.672], walmer: [-33.978, 25.605], 'newton park': [-33.962, 25.574],
  'beacon bay': [-32.963, 28.101], gonubie: [-32.94, 28.01], 'southernwood': [-32.997, 27.904],
  bendor: [-23.865, 29.47], seshego: [-23.858, 29.39], mankweng: [-23.887, 29.72],
  cascades: [-25.454, 30.973], 'west acres': [-25.475, 30.958], barberton: [-25.788, 31.053],
  beaconsfield: [-28.75, 24.76], 'new park': [-28.72, 24.75]
};

const requestMarkerIcon = L.icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52"><path d="M21 1C9.95 1 1 9.95 1 21c0 14.8 20 29 20 29s20-14.2 20-29C41 9.95 32.05 1 21 1Z" fill="#176cf0" stroke="#fff" stroke-width="3"/><circle cx="21" cy="21" r="7" fill="#fff"/></svg>')}`,
  iconSize: [42, 52],
  iconAnchor: [21, 50],
  popupAnchor: [0, -48]
});

@Component({ selector: 'app-legal-market', imports: [LanguageSwitcherComponent, FormsModule, DatePipe, DecimalPipe, RouterLink, NgComponentOutlet], templateUrl: './legal-market.component.html', styleUrl: './legal-market.component.css' })
export class LegalMarketComponent implements AfterViewInit, OnDestroy {
  private readonly marketplace = inject(MarketplaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly firmWorkspace = this.route.snapshot.routeConfig?.path === 'firm/legal-market';
  requests: LegalRequestListItem[] = [];
  private allRequests: LegalRequestListItem[] = [];
  loading = true;
  error = '';
  errorDetail = '';
  status = '';
  search = '';
  province = '';
  city = '';
  consultationType = '';
  mapOpen = true;
  readonly southAfricanCities: Record<string, string[]> = {
    'Eastern Cape': ['Bhisho', 'East London', 'Gqeberha', 'Mthatha', 'Kariega', 'Qonce'],
    'Free State': ['Bloemfontein', 'Botshabelo', 'Welkom', 'Phuthaditjhaba', 'Sasolburg'],
    Gauteng: ['Johannesburg', 'Pretoria', 'Centurion', 'Soweto', 'Midrand', 'Germiston', 'Vanderbijlpark'],
    'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay', 'Newcastle', 'Ladysmith', 'Umhlanga'],
    Limpopo: ['Polokwane', 'Thohoyandou', 'Tzaneen', 'Mokopane', 'Musina'],
    Mpumalanga: ['Mbombela', 'eMalahleni', 'Secunda', 'Middelburg', 'White River'],
    'Northern Cape': ['Kimberley', 'Upington', 'Kuruman', 'De Aar', 'Springbok'],
    'North West': ['Mahikeng', 'Rustenburg', 'Klerksdorp', 'Potchefstroom', 'Brits'],
    'Western Cape': ['Cape Town', 'Stellenbosch', 'George', 'Paarl', 'Bellville', 'Worcester', 'Somerset West'],
  };
  get provinces(): string[] { return Object.keys(this.southAfricanCities); }
  get cities(): string[] { return this.province ? this.southAfricanCities[this.province] ?? [] : []; }
  requestModalOpen = false;
  selectedRequest: LegalRequestListItem | null = null;
  responseState: 'idle' | 'login' | 'firm' | 'ready' | 'submitted' = 'idle';
  offers: LegalRequestOffer[] = [];
  offersLoading = false;
  offerError = '';
  offerAmount: number | null = null;
  offerMessage = '';
  acceptsBudget = false;
  offerSubmitting = false;
  readonly requestComponent = LegalRequestComponent;
  @ViewChild('marketMap') private mapElement?: ElementRef<HTMLDivElement>;
  private map?: L.Map;
  private markers = L.layerGroup();
  private mapResizeObserver?: ResizeObserver;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly requestCompletedHandler = (): void => {
    this.requestModalOpen = false;
    this.load();
  };
  private refreshButton?: HTMLButtonElement;
  private openedRequestFromQuery = false;

  constructor() { this.load(); }
  ngAfterViewInit(): void {
    this.initialiseMap();
    this.host.nativeElement.addEventListener('request-completed', this.requestCompletedHandler);
    const actions = (this.host.nativeElement as HTMLElement).querySelector('.request-toolbar-actions');
    if (actions && !actions.querySelector('.market-refresh-button')) {
      this.refreshButton = document.createElement('button');
      this.refreshButton.type = 'button';
      this.refreshButton.className = 'market-refresh-button';
      this.refreshButton.textContent = '↻ Refresh';
      this.refreshButton.addEventListener('click', () => this.load());
      actions.appendChild(this.refreshButton);
    }
  }
  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('request-completed', this.requestCompletedHandler);
    this.refreshButton?.remove();
    this.mapResizeObserver?.disconnect(); this.map?.remove();
  }
  openRequestModal(): void { this.requestModalOpen = true; }
  closeRequestModal(): void {
    // The backdrop also receives a click, but only the explicit close button
    // should dismiss an in-progress request.
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement?.classList.contains('modal-close')) return;
    this.requestModalOpen = false;
  }
  openRequestDetails(request: LegalRequestListItem): void {
    this.selectedRequest = request;
    this.responseState = 'idle';
    this.offers = [];
    this.offerError = '';
    this.offerAmount = null;
    this.offerMessage = '';
    this.acceptsBudget = false;
    if (this.auth.isAuthenticated) this.loadOffers(request.id);
  }
  closeRequestDetails(): void {
    this.selectedRequest = null;
    this.responseState = 'idle';
  }
  letMeHelp(): void {
    if (!this.auth.isAuthenticated) {
      if (this.selectedRequest) {
        void this.router.navigate(['/login'], { queryParams: { returnUrl: '/firm/legal-market', requestId: this.selectedRequest.id } });
      }
      return;
    }
    if (!this.canRespondToRequests) {
      this.responseState = 'firm';
      return;
    }
    if (!this.firmWorkspace && this.selectedRequest) {
      void this.router.navigate(['/firm/legal-market'], { queryParams: { requestId: this.selectedRequest.id } });
      return;
    }
    this.responseState = 'ready';
  }
  get isRequester(): boolean { return this.auth.isClientUser(); }
  get acceptedOffer(): LegalRequestOffer | undefined { return this.offers.find((offer) => offer.status === 'Accepted'); }
  get canRespondToRequests(): boolean {
    const roles = this.auth.user()?.roles ?? [];
    return roles.some((role) => ['partner', 'feeearner', 'lawyer', 'attorney', 'legalfirm', 'firmadmin', 'systemadmin'].includes(role.replace(/[\s_-]/g, '').toLowerCase()));
  }
  submitOffer(): void {
    if (!this.selectedRequest || !this.offerAmount || this.offerAmount <= 0 || !this.offerMessage.trim()) {
      this.offerError = 'Enter the charge and a message for the requester.';
      return;
    }
    this.offerSubmitting = true;
    this.offerError = '';
    this.marketplace.createOffer(this.selectedRequest.id, {
      proposedAmount: this.offerAmount,
      message: this.offerMessage.trim(),
      acceptsBudget: this.acceptsBudget
    }).subscribe({
      next: (offer) => {
        this.offers = [offer, ...this.offers.filter((item) => item.offerId !== offer.offerId)];
        this.responseState = 'submitted';
        this.offerSubmitting = false;
      },
      error: (error) => {
        this.offerError = error?.error?.detail ?? 'The offer could not be sent. Please try again.';
        this.offerSubmitting = false;
      }
    });
  }
  loadOffers(requestId: string): void {
    this.offersLoading = true;
    this.marketplace.offers(requestId).subscribe({
      next: (offers) => { this.offers = offers; this.offersLoading = false; },
      error: () => { this.offers = []; this.offersLoading = false; }
    });
  }
  respondToOffer(offer: LegalRequestOffer, decision: 'accept' | 'reject'): void {
    const action = decision === 'accept' ? this.marketplace.acceptOffer(offer.offerId) : this.marketplace.rejectOffer(offer.offerId);
    action.subscribe({
      next: (updated) => {
        this.offers = this.offers.map((item) => item.offerId === updated.offerId ? updated : item);
        if (decision === 'accept') this.offers = this.offers.map((item) => item.offerId === updated.offerId ? item : ({ ...item, status: item.status === 'Pending' ? 'Rejected' : item.status }));
      },
      error: (error) => { this.offerError = error?.error?.detail ?? 'Your response could not be saved. Please try again.'; }
    });
  }
  toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    if (this.mapOpen) {
      window.setTimeout(() => this.map?.invalidateSize({ pan: false }), 50);
      window.setTimeout(() => this.map?.invalidateSize({ pan: false }), 250);
    }
  }
  categoryIcon(practiceArea: string): string {
    const value = practiceArea.toLowerCase();
    if (value.includes('family') || value.includes('divorce')) return '👥';
    if (value.includes('property')) return '⌂';
    if (value.includes('employment') || value.includes('labour')) return '▣';
    if (value.includes('road') || value.includes('accident')) return '▰';
    if (value.includes('criminal')) return '⚖';
    return '▤';
  }
  changeProvince(): void { this.city = ''; this.applyFilters(); }
  applyFilters(): void {
    const search = this.search.trim().toLowerCase();
    this.requests = this.allRequests.filter((request) => {
      const matchesSearch = !search || [request.reference, request.title, request.description, request.city, request.province].some((value) => value.toLowerCase().includes(search));
      return matchesSearch && (!this.province || request.province === this.province) && (!this.city || request.city === this.city) && (!this.consultationType || request.consultationMethod === this.consultationType);
    });
    this.refreshMapMarkers();
  }
  load(): void {
    this.loading = true;
    this.error = '';
    this.errorDetail = '';
    this.marketplace.requests(this.status, this.search).subscribe({
      next: (rows) => {
        this.allRequests = rows;
        this.applyFilters();
        const requestId = this.route.snapshot.queryParamMap.get('requestId');
        if (!this.openedRequestFromQuery && requestId) {
          const request = rows.find((item) => item.id.toLowerCase() === requestId.toLowerCase());
          if (request) {
            this.openedRequestFromQuery = true;
            this.openRequestDetails(request);
            if (this.canRespondToRequests) this.responseState = 'ready';
          }
        }
      },
      error: (response: HttpErrorResponse) => {
        this.error = 'We could not load legal requests right now.';
        this.errorDetail = response.status === 404
          ? 'The marketplace API endpoint is not available on the configured server.'
          : 'Please check your connection and try again.';
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
  private initialiseMap(): void {
    if (!this.mapElement) return;
    const southAfricaBounds = L.latLngBounds([-34.9, 16.25], [-22.0, 32.95]);
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: false,
      attributionControl: true,
      maxBounds: southAfricaBounds,
      maxBoundsViscosity: 1,
      minZoom: 4,
      maxZoom: 19
    }).fitBounds(southAfricaBounds, { padding: [10, 10] });
    L.control.zoom({ position: 'topright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc', maxZoom: 19, crossOrigin: true,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.markers.addTo(this.map);
    this.refreshMapMarkers();
    this.mapResizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.mapResizeObserver.observe(this.mapElement.nativeElement);
    window.requestAnimationFrame(() => this.map?.invalidateSize({ pan: false }));
    window.setTimeout(() => this.map?.invalidateSize({ pan: false }), 200);
    window.setTimeout(() => this.map?.invalidateSize({ pan: false }), 800);
    window.setTimeout(() => this.map?.invalidateSize({ pan: false }), 1600);
  }
  private refreshMapMarkers(): void {
    if (!this.map) return;
    this.markers.clearLayers();
    const grouped = new Map<string, { latitude: number; longitude: number; requests: LegalRequestListItem[] }>();
    for (const request of this.requests) {
      const point = this.cityCoordinates(request.city, request.province, request.suburb);
      if (!point) continue;
      const key = `${point.latitude},${point.longitude}`;
      const group = grouped.get(key) ?? { ...point, requests: [] };
      group.requests.push(request);
      grouped.set(key, group);
    }
    for (const group of grouped.values()) {
      const marker = L.marker([group.latitude, group.longitude], { icon: requestMarkerIcon, title: `${group.requests.length} legal request${group.requests.length === 1 ? '' : 's'}` });
      const rows = group.requests.map((request) => `<strong>${this.escapeHtml(request.title)}</strong><br><span>${this.escapeHtml(request.practiceArea)} · ${this.escapeHtml(request.urgency)}</span>`).join('<hr>');
      marker.bindPopup(`<div class="map-popup">${rows}</div>`);
      marker.addTo(this.markers);
    }
  }
  private cityCoordinates(city: string, province: string, suburb?: string | null): { latitude: number; longitude: number } | null {
    const suburbKey = suburb?.trim().toLowerCase() ?? '';
    const suburbPoint = suburbCoordinates[suburbKey];
    if (suburbPoint) return { latitude: suburbPoint[0], longitude: suburbPoint[1] };
    const key = city.trim().toLowerCase();
    const known: Record<string, [number, number]> = {
      'cape town': [-33.9249, 18.4241], 'johannesburg': [-26.2041, 28.0473], 'pretoria': [-25.7479, 28.2293], 'durban': [-29.8587, 31.0218],
      'bloemfontein': [-29.0852, 26.1596], 'gqeberha': [-33.9608, 25.6022], 'east london': [-33.0153, 27.9116], 'mbombela': [-25.4753, 30.9694],
      'polokwane': [-23.9045, 29.4689], 'kimberley': [-28.7282, 24.7499], 'mahikeng': [-25.8652, 25.6442], 'pietermaritzburg': [-29.6006, 30.3794],
      'george': [-33.963, 22.4617], 'stellenbosch': [-33.9321, 18.8602], 'paarl': [-33.7342, 18.9621], 'bellville': [-33.8996, 18.6298],
      'soweto': [-26.2485, 27.854], 'centurion': [-25.8603, 28.1894], 'midrand': [-25.9992, 28.1263], 'germiston': [-26.2259, 28.1709],
      'vanderbijlpark': [-26.7117, 27.8379], 'richards bay': [-28.7807, 32.0383], 'newcastle': [-27.7579, 29.9318], 'rustenburg': [-25.6676, 27.2421],
      'klerksdorp': [-26.8521, 26.6667], 'potchefstroom': [-26.7157, 27.097], 'welkom': [-27.9774, 26.7351], 'upington': [-28.4572, 21.2425],
      'thohoyandou': [-22.9456, 30.4849], 'tzaanen': [-23.8333, 30.1667], 'emalahleni': [-25.8713, 29.2332], 'middelburg': [-25.7751, 29.4648]
    };
    const coordinates = known[key];
    if (coordinates) return { latitude: coordinates[0], longitude: coordinates[1] };
    const provinceCenters: Record<string, [number, number]> = { Gauteng: [-26.2708, 28.1123], 'Western Cape': [-33.2278, 21.8569], 'KwaZulu-Natal': [-28.5306, 30.8958], Limpopo: [-23.4013, 29.4179], Mpumalanga: [-25.5653, 30.5279], 'Free State': [-28.4541, 26.7968], 'Eastern Cape': [-32.2968, 26.4194], 'Northern Cape': [-29.0467, 21.8569], 'North West': [-26.6639, 25.2838] };
    const fallback = provinceCenters[province];
    return fallback ? { latitude: fallback[0], longitude: fallback[1] } : null;
  }
  private escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character)); }
}
