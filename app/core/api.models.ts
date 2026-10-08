/** Types mirroring the CounselNexus API DTOs (C# → JSON). */

export type ContactType = 'Client' | 'Opponent' | 'Court' | 'Expert';
export type EntityStatus = 'Active' | 'Inactive';
export type MatterStatus = 'Active' | 'OnHold' | 'Closed';
export type PartyRole = 'Client' | 'Opponent' | 'Court' | 'Expert';
export type WorkStatus = 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
export type WorkPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ContactDto {
  id: string;
  fullName: string;
  type: ContactType;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: EntityStatus;
}

export interface ContactUpsertRequest {
  fullName: string;
  type: ContactType;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: EntityStatus;
}

export interface MatterListItemDto {
  id: string;
  reference: string;
  title: string;
  clientId: string;
  clientName: string;
  practiceArea: string;
  status: MatterStatus;
  feeEarnerId: string;
  feeEarnerName: string;
  openDate: string;
}

export interface PartyDto {
  contactId: string;
  contactName: string;
  role: PartyRole;
}

export interface MatterDetailDto extends MatterListItemDto {
  description: string | null;
  parties: PartyDto[];
  archiveDate: string | null;
  archiveUserId: string | null;
}

export interface MatterUpsertRequest {
  reference?: string | null;
  title: string;
  practiceArea: string;
  status: MatterStatus;
  openDate: string;
  description?: string | null;
  clientId: string;
  feeEarnerId: string;
  parties?: PartyDto[] | null;
}

export interface CaseResearchRequest {
  title: string;
  facts: string;
  legalIssues: string;
  practiceArea: string;
  jurisdiction: string;
  desiredOutcome: string;
}

export interface CaseResearchAiResponse {
  model: string;
  answer: string;
  scopeNotice: string;
  sources: Array<{ name: string; court: string; url: string }>;
  authorities: LegalCaseSearchResult[];
}

export interface LegalCaseSearchResult {
  id: string;
  sourceName: string;
  sourceUrl: string;
  citation: string | null;
  caseNumber: string | null;
  title: string;
  court: string;
  jurisdiction: string;
  dateIssued: string | null;
  outcomeSummary: string | null;
  relevance: number;
}

export interface LegalCaseDocumentDto {
  id: string;
  caseId: string;
  fileName: string;
  contentType: string;
  fileLength: number;
  createdAtUtc: string;
}

export interface PracticeWorkflowRecordDto {
  id: string;
  firmId: string;
  moduleKey: string;
  reference: string;
  personName: string;
  subject: string;
  nextAction: string | null;
  status: string;
  amount: number | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface PracticeWorkflowSaveRequest {
  reference: string;
  personName: string;
  subject: string;
  nextAction?: string | null;
  status: string;
  amount?: number | null;
  notes?: string | null;
}

export interface RafClaimDto {
  id: string;
  firmId: string | null;
  matterId: string;
  clientId: string;
  claimNumber: string;
  rafReference: string | null;
  claimType: string;
  accidentDate: string;
  prescriptionDate: string | null;
  claimAmount: number | null;
  settlementAmount: number | null;
  nextAction: string | null;
  nextActionDate: string | null;
  status: string;
  responsibleAttorneyId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface RafClaimRequest {
  matterId: string;
  clientId: string;
  claimNumber: string;
  rafReference?: string | null;
  claimType: string;
  accidentDate: string;
  prescriptionDate?: string | null;
  claimAmount?: number | null;
  settlementAmount?: number | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  status: string;
  responsibleAttorneyId?: string | null;
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  lastLoginAtUtc: string | null;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: string;
  password: string;
  sendWelcomeEmail: boolean;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
}

export interface DocumentDto {
  id: string;
  matterId: string;
  name: string;
  contentType: string;
  length: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedAtUtc: string;
}

export interface FirmSettingsDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  tagline: string | null;
  brandPrimaryColor: string;
  brandAccentColor: string;
  logoBase64: string | null;
  logoContentType: string | null;
  letterheadBase64: string | null;
  letterheadContentType: string | null;
  workspaceBackgroundBase64: string | null;
  workspaceBackgroundContentType: string | null;
  partnerHourlyRate: number;
  feeEarnerHourlyRate: number;
  paralegalHourlyRate: number;
  legalAssistantHourlyRate: number;
}

export type FirmSettingsUpdate = Omit<FirmSettingsDto, 'id'>;

export interface InvoiceLineDto {
  id: string;
  matterId: string;
  matterReference: string;
  matterTitle: string;
  timeEntryId: string | null;
  disbursementId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  lines: InvoiceLineDto[];
}

export interface CreateDraftInvoiceRequest {
  matterId: string;
  invoiceDate: string;
  dueDate: string;
  taxRate: number;
}

export interface TimeEntryDto {
  id: string;
  matterId: string;
  matterReference: string;
  matterTitle: string;
  feeEarnerId: string;
  feeEarnerName: string;
  workDate: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  isBilled: boolean;
  invoiceId: string | null;
  reversesTimeEntryId: string | null;
}

export interface TimeEntryRequest {
  matterId: string;
  feeEarnerId?: string | null;
  workDate: string;
  description: string;
  hours: number;
  rate: number;
}

export type NoteKind = 'Note' | 'FileNote';

export interface NoteDto {
  id: string;
  matterId: string;
  kind: NoteKind;
  subject: string;
  body: string;
  authorId: string;
  authorName: string;
  isPrivileged: boolean;
  createdAtUtc: string;
  archiveDate: string | null;
  archiveUserId: string | null;
}

export interface NoteRequest {
  matterId: string;
  kind: NoteKind;
  subject: string;
  body: string;
  isPrivileged?: boolean;
}

export interface TaskDto {
  id: string;
  matterId: string;
  matterReference: string;
  title: string;
  description: string | null;
  status: WorkStatus;
  priority: WorkPriority;
  assignedToId: string;
  assignedToName: string;
  dueAtUtc: string | null;
  completedAtUtc: string | null;
}

export interface TaskRequest {
  matterId: string;
  title: string;
  description?: string | null;
  status: WorkStatus;
  priority: WorkPriority;
  assignedToId: string;
  dueAtUtc?: string | null;
}

export interface DiaryEventDto {
  id: string;
  matterId: string | null;
  matterReference: string | null;
  title: string;
  description: string | null;
  kind: string;
  startsAtUtc: string;
  endsAtUtc: string;
  allDay: boolean;
  ownerId: string;
  ownerName: string;
  reminderAtUtc: string | null;
}

export interface DiaryEventRequest {
  matterId: string | null;
  title: string;
  description?: string | null;
  kind: 'Event' | 'Hearing' | 'Limitation' | 'Reminder';
  startsAtUtc: string;
  endsAtUtc: string;
  allDay: boolean;
  ownerId?: string | null;
  reminderAtUtc?: string | null;
}

export interface TrustTransactionDto {
  id: string;
  matterId: string;
  kind: 'Receipt' | 'Payment' | 'Transfer';
  transferDirection: 'None' | 'In' | 'Out';
  amount: number;
  reference: string;
  description: string | null;
  transferGroupId: string | null;
  reversesTransactionId: string | null;
  createdAtUtc: string;
  createdByName: string;
  matterBalance: number;
}

export interface TrustMovementRequest {
  matterId: string;
  amount: number;
  reference: string;
  description?: string | null;
}

export interface TrustTransferRequest {
  fromMatterId: string;
  toMatterId: string;
  amount: number;
  reference: string;
  description?: string | null;
}

export interface WorkInProgressDto {
  matterId: string;
  matterReference: string;
  matterTitle: string;
  clientName: string;
  unbilledFees: number;
  unbilledDisbursements: number;
  total: number;
}

export interface OverdueInvoiceDto {
  invoiceId: string;
  number: string;
  clientName: string;
  dueDate: string;
  balanceDue: number;
  daysOverdue: number;
}

export interface TrustBalanceReportDto {
  matterId: string;
  matterReference: string;
  matterTitle: string;
  clientName: string;
  balance: number;
}

export interface ActivityReportItemDto {
  id: string;
  actorName: string;
  category: string;
  action: string;
  entityName: string;
  entityId: string;
  detailsJson: string | null;
  createdAtUtc: string;
}

export interface DashboardSummaryDto {
  activeMatters: number;
  activeContacts: number;
  openTasks: number;
  overdueTasks: number;
  diaryEventsToday: number;
  unbilledFees: number;
  unbilledDisbursements: number;
  draftInvoices: number;
}

export interface SmtpSettingsDto {
  host: string | null;
  port: number;
  enableSsl: boolean;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
  hasPassword: boolean;
  isConfigured: boolean;
}

export interface SmtpSettingsUpdateRequest {
  host: string;
  port: number;
  enableSsl: boolean;
  username: string | null;
  password: string | null;
  fromAddress: string;
  fromName: string | null;
}

/** Map API 'OnHold' to the UI's 'On Hold' label. */
export function matterStatusUi(s: MatterStatus): string {
  return s === 'OnHold' ? 'On Hold' : s;
}
