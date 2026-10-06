export type ContactType = 'Client' | 'Opponent' | 'Court' | 'Expert';
export type EntityStatus = 'Active' | 'Inactive';
export type MatterStatus = 'Active' | 'On Hold' | 'Closed';

export interface Contact {
  id: number;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  address?: string;
  status: EntityStatus;
  notes?: string;
  avatarColor: string;
}

export interface Matter {
  id: number;
  reference: string;
  title: string;
  clientId: number;
  clientName: string;
  practiceArea: string;
  status: MatterStatus;
  feeEarner: string;
  opened: string;
  description: string;
}

export interface MatterParty {
  matterRef: string;
  role: 'Client' | 'Opponent' | 'Court' | 'Expert';
  name: string;
}

export interface NoteItem {
  id: number;
  matterRef?: string;
  contactId?: number;
  author: string;
  date: string;
  text: string;
}

export interface DiaryEventItem {
  id: number;
  time: string;
  date: string;
  title: string;
  matterRef: string;
  color: string;
}

export interface TimeEntry {
  id: number;
  matterRef: string;
  date: string;
  description: string;
  feeEarner: string;
  hours: number;
  rate: number;
  billed: boolean;
}

export interface Disbursement {
  id: number;
  matterRef: string;
  date: string;
  description: string;
  amount: number;
  billed: boolean;
}

export interface DocItem {
  id: number;
  name: string;
  matterRef: string;
  kind: 'pdf' | 'docx' | 'other';
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskItem {
  id: number;
  matterRef: string;
  title: string;
  due: string;
  done: boolean;
}

export interface Invoice {
  id: number;
  matterRef: string;
  number: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

export interface TrustTxn {
  id: number;
  matterRef: string;
  date: string;
  type: 'Receipt' | 'Payment' | 'Transfer';
  reference: string;
  amount: number; // + in, - out
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  status: EntityStatus;
  lastLogin: string;
}

export interface RoleDef {
  name: string;
  description: string;
}
