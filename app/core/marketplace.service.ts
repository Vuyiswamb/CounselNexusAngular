import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from './api';
import { Observable } from 'rxjs';

export interface PublicPractitioner {
  id: string; displayName: string; organisationName: string; biography: string | null;
  yearsExperience: number | null; province: string | null; city: string | null;
  consultationMethods: string | null; verificationStatus: string; practiceAreas: string | null;
}

export interface LegalRequestInput {
  practiceAreaSlug: string; title: string; description: string; province: string; city: string; phone: string;
  suburb?: string; budget?: string; consultationMethod: 'Home' | 'Business' | 'Office' | 'Online' | 'PoliceStation' | 'Court'; urgency: 'Low' | 'Normal' | 'Urgent';
}

export interface LegalRequestCreated { id: string; reference: string; status: string; createdAtUtc: string; practiceArea: string; }
export interface LegalRequestListItem { id: string; reference: string; practiceArea: string; title: string; description: string; province: string; city: string; suburb: string | null; budget: string | null; consultationMethod: string; urgency: string; status: string; clientUserId: string | null; createdAtUtc: string; }
export interface LegalRequestOffer { offerId: string; requestId: string; firmId: string; firmName: string; proposedAmount: number; message: string; acceptsBudget: boolean; status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn' | string; createdAtUtc: string; respondedAtUtc: string | null; requesterName?: string | null; requesterEmail?: string | null; requesterPhone?: string | null; }
export interface LegalRequestOfferInput { proposedAmount: number; message: string; acceptsBudget: boolean; }

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  practitioners(filters: { practiceArea?: string; province?: string; city?: string } = {}): Observable<PublicPractitioner[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value) params = params.set(key, value);
    return this.http.get<PublicPractitioner[]>(`${this.baseUrl}/api/marketplace/practitioners`, { params });
  }

  createRequest(input: LegalRequestInput): Observable<LegalRequestCreated> {
    return this.http.post<LegalRequestCreated>(`${this.baseUrl}/api/marketplace/requests`, input);
  }

  requests(status = '', search = ''): Observable<LegalRequestListItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<LegalRequestListItem[]>(`${this.baseUrl}/api/marketplace/requests`, { params });
  }

  offers(requestId: string): Observable<LegalRequestOffer[]> {
    return this.http.get<LegalRequestOffer[]>(`${this.baseUrl}/api/marketplace/requests/${requestId}/offers`);
  }

  createOffer(requestId: string, input: LegalRequestOfferInput): Observable<LegalRequestOffer> {
    return this.http.post<LegalRequestOffer>(`${this.baseUrl}/api/marketplace/requests/${requestId}/offers`, input);
  }

  acceptOffer(offerId: string): Observable<LegalRequestOffer> {
    return this.http.post<LegalRequestOffer>(`${this.baseUrl}/api/marketplace/offers/${offerId}/accept`, {});
  }

  rejectOffer(offerId: string): Observable<LegalRequestOffer> {
    return this.http.post<LegalRequestOffer>(`${this.baseUrl}/api/marketplace/offers/${offerId}/reject`, {});
  }
}
