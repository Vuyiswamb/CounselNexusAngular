import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BehaviorSubject, tap } from 'rxjs';
import { API_BASE_URL } from './api';
import {
  ContactDto, ContactUpsertRequest, ContactType, CreateDraftInvoiceRequest, EntityStatus, InvoiceDto, MatterDetailDto,
  MatterListItemDto, MatterStatus, MatterUpsertRequest, PagedResult, RoleDto,
  UserDto, CreateUserRequest, TimeEntryDto, TimeEntryRequest, NoteDto, NoteRequest,
  TaskDto, TaskRequest, DashboardSummaryDto, DiaryEventDto,
  DiaryEventRequest, TrustTransactionDto, TrustMovementRequest, TrustTransferRequest,
  WorkInProgressDto, OverdueInvoiceDto, TrustBalanceReportDto, ActivityReportItemDto,
    SmtpSettingsDto, SmtpSettingsUpdateRequest, PlatformGatewaySettingsDto, PlatformGatewaySettingsUpdateRequest, DocumentDto,
  FirmSettingsDto, FirmSettingsUpdate,
  CaseResearchAiResponse, CaseResearchRequest, LegalCaseDocumentDto, LegalCaseSearchResult,
  PracticeWorkflowRecordDto, PracticeWorkflowSaveRequest,
  RafClaimDto, RafClaimRequest,
  PermissionDto, MatterAccessDto, MatterAccessUpdateRequest, UserPermissionDto, UserPermissionsUpdateRequest, UpdateProfileRequest, ChangePasswordRequest,
  PlatformFirmDto, PlatformFirmReportDto, PlatformUserDto, CreatePlatformUserRequest, UpdatePlatformUserRequest, PlatformSubscriptionDto, PlatformPaymentDto, PlatformPaymentRequest, PlatformTransactionDto, PlatformComponentDto, PlatformPackageDto, PlatformPackageRequest,
} from './api.models';

/** Thin typed wrappers over the /api/v1 endpoints. */
@Injectable({ providedIn: 'root' })
export class ContactsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/contacts`;

  list(params: {
    search?: string;
    type?: ContactType | '';
    status?: EntityStatus | '';
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<ContactDto>> {
    const q: Record<string, string> = {};
    if (params.search) q['search'] = params.search;
    if (params.type) q['type'] = params.type;
    if (params.status) q['status'] = params.status;
    q['page'] = String(params.page ?? 1);
    q['pageSize'] = String(params.pageSize ?? 50);
    return this.http.get<PagedResult<ContactDto>>(this.base, { params: q });
  }

  get(id: string): Observable<ContactDto> {
    return this.http.get<ContactDto>(`${this.base}/${id}`);
  }

  create(body: ContactUpsertRequest): Observable<ContactDto> {
    return this.http.post<ContactDto>(this.base, body);
  }

  update(id: string, body: ContactUpsertRequest): Observable<ContactDto> {
    return this.http.put<ContactDto>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  matters(id: string): Observable<MatterListItemDto[]> {
    return this.http.get<MatterListItemDto[]>(`${this.base}/${id}/matters`);
  }
}

@Injectable({ providedIn: 'root' })
export class MattersService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/matters`;

  list(params: {
    search?: string;
    status?: MatterStatus | '';
    feeEarnerId?: string;
    practiceArea?: string;
    includeArchived?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<MatterListItemDto>> {
    const q: Record<string, string> = {};
    if (params.search) q['search'] = params.search;
    if (params.status) q['status'] = params.status;
    if (params.feeEarnerId) q['feeEarnerId'] = params.feeEarnerId;
    if (params.practiceArea) q['practiceArea'] = params.practiceArea;
    if (params.includeArchived) q['includeArchived'] = 'true';
    q['page'] = String(params.page ?? 1);
    q['pageSize'] = String(params.pageSize ?? 50);
    return this.http.get<PagedResult<MatterListItemDto>>(this.base, { params: q });
  }

  get(id: string): Observable<MatterDetailDto> {
    return this.http.get<MatterDetailDto>(`${this.base}/${id}`);
  }

  create(body: MatterUpsertRequest): Observable<MatterDetailDto> {
    return this.http.post<MatterDetailDto>(this.base, body);
  }

  update(id: string, body: MatterUpsertRequest): Observable<MatterDetailDto> {
    return this.http.put<MatterDetailDto>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  archive(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/archive`, {});
  }

  restore(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/restore`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class CaseResearchApiService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/case-research`;
  private legalBase = `${inject(API_BASE_URL)}/api/v1/legal-research`;

  research(request: CaseResearchRequest & { internalMatters: Array<{ reference: string; title: string; practiceArea: string; status: string }> }): Observable<CaseResearchAiResponse> {
    return this.http.post<CaseResearchAiResponse>(this.base, request);
  }

  searchCorpus(query: string, court?: string, take = 20): Observable<LegalCaseSearchResult[]> {
    const params: Record<string, string> = { query, take: String(take) };
    if (court) params['court'] = court;
    return this.http.get<LegalCaseSearchResult[]>(`${this.legalBase}/cases/search`, { params });
  }

  listDocuments(caseId: string): Observable<LegalCaseDocumentDto[]> {
    return this.http.get<LegalCaseDocumentDto[]>(`${this.legalBase}/cases/${caseId}/documents`);
  }

  downloadDocument(caseId: string, documentId: string): Observable<Blob> {
    return this.http.get(`${this.legalBase}/cases/${caseId}/documents/${documentId}/download`, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class PracticeOperationsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/practice-operations`;

  list(moduleKey: string, search = '', status = ''): Observable<PracticeWorkflowRecordDto[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (status && status !== 'All statuses') params['status'] = status;
    return this.http.get<PracticeWorkflowRecordDto[]>(`${this.base}/${moduleKey}`, { params });
  }

  create(moduleKey: string, request: PracticeWorkflowSaveRequest): Observable<PracticeWorkflowRecordDto> {
    return this.http.post<PracticeWorkflowRecordDto>(`${this.base}/${moduleKey}`, request);
  }
}

@Injectable({ providedIn: 'root' })
export class RafClaimsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/raf/claims`;

  list(params: { search?: string; status?: string; claimType?: string; highRiskPrescription?: boolean } = {}): Observable<RafClaimDto[]> {
    const query: Record<string, string> = {};
    if (params.search) query['search'] = params.search;
    if (params.status && params.status !== 'All statuses') query['status'] = params.status;
    if (params.claimType && params.claimType !== 'All claim types') query['claimType'] = params.claimType;
    if (params.highRiskPrescription) query['highRiskPrescription'] = 'true';
    return this.http.get<RafClaimDto[]>(this.base, { params: query });
  }

  get(id: string): Observable<RafClaimDto> { return this.http.get<RafClaimDto>(`${this.base}/${id}`); }
  create(request: RafClaimRequest): Observable<RafClaimDto> { return this.http.post<RafClaimDto>(this.base, request); }
  update(id: string, request: RafClaimRequest): Observable<RafClaimDto> { return this.http.put<RafClaimDto>(`${this.base}/${id}`, request); }
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/users`;

  list(search?: string): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.base, {
      params: search ? { search } : {},
    });
  }

  create(body: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(this.base, body);
  }

  matterAccess(userId: string): Observable<MatterAccessDto[]> {
    return this.http.get<MatterAccessDto[]>(`${this.base.replace('/users', '/admin/users')}/${userId}/matter-access`);
  }

  saveMatterAccess(userId: string, body: MatterAccessUpdateRequest): Observable<MatterAccessDto[]> {
    return this.http.put<MatterAccessDto[]>(`${this.base.replace('/users', '/admin/users')}/${userId}/matter-access`, body);
  }

  permissions(userId: string): Observable<UserPermissionDto[]> {
    return this.http.get<UserPermissionDto[]>(`${this.base.replace('/users', '/admin/users')}/${userId}/permissions`);
  }

  savePermissions(userId: string, body: UserPermissionsUpdateRequest): Observable<UserPermissionDto[]> {
    return this.http.put<UserPermissionDto[]>(`${this.base.replace('/users', '/admin/users')}/${userId}/permissions`, body);
  }

  updateMyProfile(body: UpdateProfileRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/me/profile`, body);
  }

  changeMyPassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/me/password`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/roles`;

  list(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.base);
  }

  permissions(roleId: string): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.base.replace('/roles', '/admin/roles')}/${roleId}/permissions`);
  }

  savePermissions(roleId: string, permissionIds: string[]): Observable<PermissionDto[]> {
    return this.http.put<PermissionDto[]>(`${this.base.replace('/roles', '/admin/roles')}/${roleId}/permissions`, { permissionIds });
  }
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/platform`;

  firms(): Observable<PlatformFirmDto[]> { return this.http.get<PlatformFirmDto[]>(`${this.base}/firms`); }
  firmReports(): Observable<PlatformFirmReportDto[]> { return this.http.get<PlatformFirmReportDto[]>(`${this.base}/reports/firms`); }
  users(firmId: string): Observable<PlatformUserDto[]> { return this.http.get<PlatformUserDto[]>(`${this.base}/firms/${firmId}/users`); }
  platformUsers(): Observable<PlatformUserDto[]> { return this.http.get<PlatformUserDto[]>(`${this.base}/users`); }
  createPlatformUser(request: CreatePlatformUserRequest): Observable<PlatformUserDto> { return this.http.post<PlatformUserDto>(`${this.base}/users`, request); }
  updatePlatformUser(userId: string, request: UpdatePlatformUserRequest): Observable<PlatformUserDto> { return this.http.put<PlatformUserDto>(`${this.base}/users/${userId}`, request); }
  sendPlatformUserPasswordReset(userId: string): Observable<{ message: string }> { return this.http.post<{ message: string }>(`${this.base}/users/${userId}/password-reset`, {}); }
  setFirmStatus(firmId: string, enabled: boolean): Observable<void> { return this.http.patch<void>(`${this.base}/firms/${firmId}/status`, { enabled }); }
  subscription(firmId: string): Observable<PlatformSubscriptionDto> { return this.http.get<PlatformSubscriptionDto>(`${this.base}/firms/${firmId}/subscription`); }
  payments(firmId: string): Observable<PlatformPaymentDto[]> { return this.http.get<PlatformPaymentDto[]>(`${this.base}/firms/${firmId}/payments`); }
  addPayment(firmId: string, request: PlatformPaymentRequest): Observable<PlatformPaymentDto> { return this.http.post<PlatformPaymentDto>(`${this.base}/firms/${firmId}/payments`, request); }
  transactions(filters: { firmId?: string; status?: string; fromUtc?: string; toUtc?: string } = {}): Observable<PlatformTransactionDto[]> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
    return this.http.get<PlatformTransactionDto[]>(`${this.base}/transactions`, { params });
  }
  components(): Observable<PlatformComponentDto[]> { return this.http.get<PlatformComponentDto[]>(`${this.base}/subscription-components`); }
  packages(): Observable<PlatformPackageDto[]> { return this.http.get<PlatformPackageDto[]>(`${this.base}/subscription-packages`); }
  createPackage(request: PlatformPackageRequest): Observable<{ id: string }> { return this.http.post<{ id: string }>(`${this.base}/subscription-packages`, request); }
  updatePackage(planId: string, request: PlatformPackageRequest): Observable<void> { return this.http.put<void>(`${this.base}/subscription-packages/${planId}`, request); }
  setPackageComponents(planId: string, componentIds: string[]): Observable<void> { return this.http.put<void>(`${this.base}/subscription-packages/${planId}/components`, { componentIds }); }
  assignPackage(firmId: string, planId: string): Observable<void> { return this.http.patch<void>(`${this.base}/firms/${firmId}/subscription/package`, { planId }); }
}

@Injectable({ providedIn: 'root' })
export class PublicPackagesService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/public/packages`;

  list(): Observable<PlatformPackageDto[]> {
    return this.http.get<PlatformPackageDto[]>(this.base);
  }
}

@Injectable({ providedIn: 'root' })
export class SubscriptionCheckoutService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/subscriptions`;

  checkout(planId: string, months: number, email: string): Observable<import('./api.models').SubscriptionCheckoutResponse> {
    return this.http.post<import('./api.models').SubscriptionCheckoutResponse>(`${this.base}/checkout`, { planId, months, email });
  }
}

@Injectable({ providedIn: 'root' })
export class SmtpSettingsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/admin/smtp-settings`;

  get(): Observable<SmtpSettingsDto> {
    return this.http.get<SmtpSettingsDto>(this.base);
  }

  save(body: SmtpSettingsUpdateRequest): Observable<SmtpSettingsDto> {
    return this.http.put<SmtpSettingsDto>(this.base, body);
  }

  sendTest(recipientEmail: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/test`, { recipientEmail });
  }
}

@Injectable({ providedIn: 'root' })
export class PlatformGatewaySettingsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/platform/gateways`;
  get(): Observable<PlatformGatewaySettingsDto> { return this.http.get<PlatformGatewaySettingsDto>(this.base); }
  save(body: PlatformGatewaySettingsUpdateRequest): Observable<PlatformGatewaySettingsDto> { return this.http.put<PlatformGatewaySettingsDto>(this.base, body); }
}

@Injectable({ providedIn: 'root' })
export class FirmSettingsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/firms/current`;
  private currentFirm = new BehaviorSubject<FirmSettingsDto | null>(null);
  readonly firm$ = this.currentFirm.asObservable();

  get(): Observable<FirmSettingsDto> {
    return this.http.get<FirmSettingsDto>(this.base).pipe(tap((firm) => this.currentFirm.next(firm)));
  }

  save(body: FirmSettingsUpdate): Observable<FirmSettingsDto> {
    return this.http.put<FirmSettingsDto>(this.base, body).pipe(tap((firm) => this.currentFirm.next(firm)));
  }
}

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/invoices`;

  list(matterId?: string): Observable<InvoiceDto[]> {
    return this.http.get<InvoiceDto[]>(this.base, { params: matterId ? { matterId } : {} });
  }

  get(id: string): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${this.base}/${id}`);
  }

  createDraft(request: CreateDraftInvoiceRequest): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.base}/draft`, request);
  }

  issue(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.base}/${id}/issue`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class TimeEntriesService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1`;

  list(matterId?: string): Observable<TimeEntryDto[]> {
    return this.http.get<TimeEntryDto[]>(matterId
      ? `${this.base}/matters/${matterId}/time-entries`
      : `${this.base}/time-entries`);
  }

  create(request: TimeEntryRequest): Observable<TimeEntryDto> {
    return this.http.post<TimeEntryDto>(`${this.base}/time-entries`, request);
  }

  update(id: string, request: TimeEntryRequest): Observable<TimeEntryDto> {
    return this.http.put<TimeEntryDto>(`${this.base}/time-entries/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/time-entries/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class MatterDocumentsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1`;

  list(matterId: string): Observable<DocumentDto[]> {
    return this.http.get<DocumentDto[]>(`${this.base}/matters/${matterId}/documents`);
  }

  upload(matterId: string, file: File): Observable<DocumentDto> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DocumentDto>(`${this.base}/matters/${matterId}/documents`, form);
  }

  download(documentId: string): Observable<Blob> {
    return this.http.get(`${this.base}/documents/${documentId}/download`, { responseType: 'blob' });
  }

  delete(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/documents/${documentId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class MatterNotesService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1`;

  list(matterId: string, includeArchived = false): Observable<NoteDto[]> {
    return this.http.get<NoteDto[]>(`${this.base}/matters/${matterId}/notes`, {
      params: includeArchived ? { includeArchived: 'true' } : {},
    });
  }

  create(request: NoteRequest): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.base}/notes`, request);
  }

  archive(noteId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/notes/${noteId}/archive`, {});
  }

  restore(noteId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/notes/${noteId}/restore`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/tasks`;

  list(matterId?: string, assignedToId?: string): Observable<TaskDto[]> {
    const params: Record<string, string> = {};
    if (matterId) params['matterId'] = matterId;
    if (assignedToId) params['assignedToId'] = assignedToId;
    return this.http.get<TaskDto[]>(this.base, { params });
  }

  create(request: TaskRequest): Observable<TaskDto> {
    return this.http.post<TaskDto>(this.base, request);
  }

  update(id: string, request: TaskRequest): Observable<TaskDto> {
    return this.http.put<TaskDto>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1`;

  summary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.base}/dashboard/summary`);
  }

  diary(fromUtc: Date, toUtc: Date): Observable<DiaryEventDto[]> {
    return this.http.get<DiaryEventDto[]>(`${this.base}/diary`, {
      params: { fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString() },
    });
  }
}

@Injectable({ providedIn: 'root' })
export class DiaryService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/diary`;

  list(fromUtc: Date, toUtc: Date): Observable<DiaryEventDto[]> {
    return this.http.get<DiaryEventDto[]>(this.base, {
      params: { fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString() },
    });
  }

  create(request: DiaryEventRequest): Observable<DiaryEventDto> {
    return this.http.post<DiaryEventDto>(this.base, request);
  }

  update(id: string, request: DiaryEventRequest): Observable<DiaryEventDto> {
    return this.http.put<DiaryEventDto>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class TrustService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1`;

  list(matterId: string): Observable<TrustTransactionDto[]> {
    return this.http.get<TrustTransactionDto[]>(`${this.base}/matters/${matterId}/trust-transactions`);
  }

  receipt(request: TrustMovementRequest): Observable<TrustTransactionDto> {
    return this.http.post<TrustTransactionDto>(`${this.base}/trust-transactions/receipts`, request);
  }

  payment(request: TrustMovementRequest): Observable<TrustTransactionDto> {
    return this.http.post<TrustTransactionDto>(`${this.base}/trust-transactions/payments`, request);
  }

  transfer(request: TrustTransferRequest): Observable<{ transferGroupId: string }> {
    return this.http.post<{ transferGroupId: string }>(`${this.base}/trust-transactions/transfers`, request);
  }

  reverse(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/trust-transactions/${id}/reverse`, { reason });
  }
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${inject(API_BASE_URL)}/api/v1/reports`;

  workInProgress(): Observable<WorkInProgressDto[]> {
    return this.http.get<WorkInProgressDto[]>(`${this.base}/work-in-progress`);
  }

  overdueInvoices(): Observable<OverdueInvoiceDto[]> {
    return this.http.get<OverdueInvoiceDto[]>(`${this.base}/overdue-invoices`);
  }

  trustBalances(): Observable<TrustBalanceReportDto[]> {
    return this.http.get<TrustBalanceReportDto[]>(`${this.base}/trust-balances`);
  }

  activity(fromUtc?: Date, take = 100): Observable<ActivityReportItemDto[]> {
    const params: Record<string, string> = { take: String(take) };
    if (fromUtc) params['fromUtc'] = fromUtc.toISOString();
    return this.http.get<ActivityReportItemDto[]>(`${this.base}/activity`, { params });
  }
}
