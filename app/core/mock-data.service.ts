import { Injectable } from '@angular/core';
import {
  Contact, DiaryEventItem, Disbursement, DocItem, Invoice, Matter, MatterParty,
  NoteItem, RoleDef, TaskItem, TimeEntry, TrustTxn, UserAccount,
} from './models';

/**
 * Temporary in-memory data for the UI-first build.
 * Every method here maps 1:1 onto a future /api/v1 endpoint —
 * swap this service for an HttpClient-backed one without touching components.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  readonly currentUser = { name: 'John Doe', role: 'Partner', initials: 'JD' };

  contacts: Contact[] = [
    { id: 1, name: 'John Smith', type: 'Client', email: 'john@smith.co.za', phone: '082 123 4567', address: '123 Main Road\nSandton\nJohannesburg 2196', status: 'Active', notes: 'Long standing client. Prefers email contact.', avatarColor: '#2563eb' },
    { id: 2, name: 'ABC Attorneys', type: 'Opponent', email: 'info@abcattorneys.co.za', phone: '011 234 5678', status: 'Active', avatarColor: '#dc2626' },
    { id: 3, name: 'High Court - Johannesburg', type: 'Court', email: 'registry@judiciary.org.za', phone: '011 335 0000', status: 'Active', avatarColor: '#7c3aed' },
    { id: 4, name: 'Maria Santos', type: 'Expert', email: 'maria@santos.co.za', phone: '082 987 6543', status: 'Active', avatarColor: '#0d9488' },
    { id: 5, name: 'David Thompson', type: 'Client', email: 'david@thompson.co.za', phone: '082 555 1212', status: 'Active', avatarColor: '#ea580c' },
  ];

  matters: Matter[] = [
    { id: 1, reference: 'SMIT001', title: 'Smith v Jones', clientId: 1, clientName: 'John Smith', practiceArea: 'Litigation', status: 'Active', feeEarner: 'John Doe', opened: '12 Jan 2024', description: 'Breach of contract claim for damages.' },
    { id: 2, reference: 'NKOS001', title: 'Nkosana Divorce', clientId: 0, clientName: 'Nkosana M', practiceArea: 'Family', status: 'Active', feeEarner: 'Sarah Klein', opened: '02 Feb 2024', description: 'Divorce proceedings and settlement.' },
    { id: 3, reference: 'EVAN001', title: 'Evans Property', clientId: 0, clientName: 'Robert Evans', practiceArea: 'Conveyancing', status: 'Active', feeEarner: 'John Doe', opened: '18 Feb 2024', description: 'Transfer of residential property.' },
    { id: 4, reference: 'JONB001', title: 'Jones Contract', clientId: 0, clientName: 'Jones Ltd', practiceArea: 'Commercial', status: 'Active', feeEarner: 'Michael Brown', opened: '03 Mar 2024', description: 'Commercial contract drafting and review.' },
    { id: 5, reference: 'WILL001', title: 'Williams Estate', clientId: 0, clientName: 'Peter Williams', practiceArea: 'Estates', status: 'On Hold', feeEarner: 'Sarah Klein', opened: '21 Mar 2024', description: 'Estate administration and winding up.' },
  ];

  parties: MatterParty[] = [
    { matterRef: 'SMIT001', role: 'Client', name: 'John Smith' },
    { matterRef: 'SMIT001', role: 'Opponent', name: 'ABC Attorneys' },
    { matterRef: 'SMIT001', role: 'Court', name: 'High Court - Johannesburg' },
    { matterRef: 'SMIT001', role: 'Expert', name: 'Maria Santos' },
  ];

  notes: NoteItem[] = [
    { id: 1, matterRef: 'SMIT001', contactId: 1, author: 'John Doe', date: '18 Jun 2024', text: 'Client called to discuss settlement offer from opponent. Advised on risks of rejecting.' },
    { id: 2, matterRef: 'SMIT001', contactId: 1, author: 'Sarah Klein', date: '14 Jun 2024', text: 'Reviewed opponent\'s plea. Counterclaim lacks supporting documentation.' },
    { id: 3, matterRef: 'SMIT001', contactId: 1, author: 'John Doe', date: '10 Jun 2024', text: 'Attended consultation with counsel. Merits opinion positive on breach, quantum needs expert input.' },
    { id: 4, contactId: 1, author: 'John Doe', date: '05 Jun 2024', text: 'General file review — keep client updated monthly.' },
  ];

  diaryEvents: DiaryEventItem[] = [
    { id: 1, time: '09:00', date: '20 Jun 2024', title: 'Meeting with Client - Smith', matterRef: 'SMIT001', color: '#2563eb' },
    { id: 2, time: '11:00', date: '20 Jun 2024', title: 'Court Appearance', matterRef: 'NKOS001', color: '#dc2626' },
    { id: 3, time: '14:00', date: '20 Jun 2024', title: 'Teleconference - Opponent', matterRef: 'JONB001', color: '#d97706' },
    { id: 4, time: '16:00', date: '20 Jun 2024', title: 'Prepare heads of argument', matterRef: 'EVAN001', color: '#0d9488' },
  ];

  timeEntries: TimeEntry[] = [
    { id: 1, matterRef: 'SMIT001', date: '19 Jun 2024', description: 'Drafting particulars of claim', feeEarner: 'John Doe', hours: 2.5, rate: 1800, billed: false },
    { id: 2, matterRef: 'SMIT001', date: '18 Jun 2024', description: 'Telephone attendance on client', feeEarner: 'John Doe', hours: 0.5, rate: 1800, billed: false },
    { id: 3, matterRef: 'SMIT001', date: '17 Jun 2024', description: 'Perusing opponent\'s plea', feeEarner: 'Sarah Klein', hours: 1.2, rate: 1500, billed: true },
    { id: 4, matterRef: 'SMIT001', date: '14 Jun 2024', description: 'Consultation with counsel', feeEarner: 'John Doe', hours: 1.8, rate: 1800, billed: true },
    { id: 5, matterRef: 'SMIT001', date: '12 Jun 2024', description: 'Legal research - breach of contract', feeEarner: 'Sarah Klein', hours: 2.0, rate: 1500, billed: false },
  ];

  disbursements: Disbursement[] = [
    { id: 1, matterRef: 'SMIT001', date: '15 Jun 2024', description: 'Court filing fees', amount: 850, billed: false },
    { id: 2, matterRef: 'SMIT001', date: '11 Jun 2024', description: 'Sheriff service fees', amount: 420, billed: true },
    { id: 3, matterRef: 'SMIT001', date: '06 Jun 2024', description: 'Counsel\'s fees - merits opinion', amount: 5500, billed: false },
  ];

  documents: DocItem[] = [
    { id: 1, name: 'Pleadings - Smith v Jones.pdf', matterRef: 'SMIT001', kind: 'pdf', uploadedBy: 'John Doe', uploadedAt: '18 Jun 2024' },
    { id: 2, name: 'Letter to Smith - 12 May 2024.docx', matterRef: 'SMIT001', kind: 'docx', uploadedBy: 'Sarah Klein', uploadedAt: '12 May 2024' },
    { id: 3, name: 'Settlement Agreement - Smith.pdf', matterRef: 'SMIT001', kind: 'pdf', uploadedBy: 'John Doe', uploadedAt: '02 May 2024' },
    { id: 4, name: 'Summons - issued.pdf', matterRef: 'SMIT001', kind: 'pdf', uploadedBy: 'John Doe', uploadedAt: '28 Apr 2024' },
  ];

  tasks: TaskItem[] = [
    { id: 1, matterRef: 'SMIT001', title: 'Serve plea on opponent', due: '24 Jun 2024', done: false },
    { id: 2, matterRef: 'SMIT001', title: 'Brief counsel for trial', due: '01 Jul 2024', done: false },
    { id: 3, matterRef: 'SMIT001', title: 'Confirm expert availability', due: '18 Jun 2024', done: true },
  ];

  invoices: Invoice[] = [
    { id: 1, matterRef: 'SMIT001', number: 'INV-0042', date: '31 May 2024', amount: 8640, status: 'Paid' },
    { id: 2, matterRef: 'SMIT001', number: 'INV-0058', date: '20 Jun 2024', amount: 5920, status: 'Draft' },
  ];

  trustTxns: TrustTxn[] = [
    { id: 1, matterRef: 'SMIT001', date: '10 Jun 2024', type: 'Receipt', reference: 'TR-1001', amount: 50000 },
    { id: 2, matterRef: 'SMIT001', date: '14 Jun 2024', type: 'Payment', reference: 'TP-2014', amount: -5500 },
    { id: 3, matterRef: 'SMIT001', date: '18 Jun 2024', type: 'Receipt', reference: 'TR-1008', amount: 20000 },
  ];

  users: UserAccount[] = [
    { id: 1, name: 'John Doe', email: 'john@firm.co.za', role: 'Partner', status: 'Active', lastLogin: '20 Jun 2024 08:15' },
    { id: 2, name: 'Sarah Klein', email: 'sarah@firm.co.za', role: 'FeeEarner', status: 'Active', lastLogin: '19 Jun 2024 16:22' },
    { id: 3, name: 'Michael Brown', email: 'michael@firm.co.za', role: 'Bookkeeper', status: 'Active', lastLogin: '19 Jun 2024 14:03' },
  ];

  roles: RoleDef[] = [
    { name: 'SystemAdmin', description: 'Full system access' },
    { name: 'Partner', description: 'Full access except system settings' },
    { name: 'FeeEarner', description: 'Day to day matter and fee work' },
    { name: 'Bookkeeper', description: 'Billing and trust processing' },
    { name: 'Reception', description: 'Limited access (contacts, diary, basic viewing)' },
  ];

  firm = {
    name: 'Demo Law Inc.',
    phone: '011 123 4567',
    email: 'info@demolaw.co.za',
    address: '1 Legal Street\nSandton\nJohannesburg 2196',
  };

  dashboard = {
    activeMatters: 5,
    todayEvents: 12,
    unbilledFeesCount: 8,
    unbilledFeesAmount: 12450.0,
    trustMatters: 3,
    trustBalance: 85000.0,
  };

  /** Hours recorded per day: [Mon..Sun] */
  hoursThisWeek = [3, 4, 6, 7, 5, 3, 2];
  hoursLastWeek = [2, 3, 5, 6, 4, 2, 1];

  readonly practiceAreas = ['Litigation', 'Family', 'Conveyancing', 'Commercial', 'Estates'];
  readonly feeEarners = ['John Doe', 'Sarah Klein', 'Michael Brown'];
  readonly contactTypes = ['Client', 'Opponent', 'Court', 'Expert'];

  // ---------- lookups ----------
  contactById(id: number): Contact | undefined {
    return this.contacts.find((c) => c.id === id);
  }

  matterByRef(ref: string): Matter | undefined {
    return this.matters.find((m) => m.reference === ref);
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  // ---------- mutations (in-memory only) ----------
  addContact(c: Omit<Contact, 'id' | 'avatarColor'>): Contact {
    const palette = ['#2563eb', '#dc2626', '#7c3aed', '#0d9488', '#ea580c', '#db2777'];
    const contact: Contact = {
      ...c,
      id: Math.max(...this.contacts.map((x) => x.id), 0) + 1,
      avatarColor: palette[this.contacts.length % palette.length],
    };
    this.contacts = [...this.contacts, contact];
    return contact;
  }

  addMatter(m: Omit<Matter, 'id'>): Matter {
    const matter: Matter = { ...m, id: Math.max(...this.matters.map((x) => x.id), 0) + 1 };
    this.matters = [...this.matters, matter];
    return matter;
  }

  addUser(u: Omit<UserAccount, 'id' | 'status' | 'lastLogin'>): UserAccount {
    const user: UserAccount = {
      ...u,
      id: Math.max(...this.users.map((x) => x.id), 0) + 1,
      status: 'Active',
      lastLogin: '—',
    };
    this.users = [...this.users, user];
    return user;
  }

  // ---------- global search ----------
  search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return { matters: [], contacts: [], documents: [] };
    return {
      matters: this.matters.filter((m) => m.reference.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) || m.clientName.toLowerCase().includes(q)),
      contacts: this.contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
      documents: this.documents.filter((d) => d.name.toLowerCase().includes(q)),
    };
  }
}
