import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService } from '../../core/api-services';
import { ContactDto, ContactType, ContactUpsertRequest, EntityStatus } from '../../core/api.models';
import * as XLSX from 'xlsx';

/** Screen 4 — Contacts list with search, filters and pagination (live API). */
@Component({
  selector: 'app-contact-list',
  imports: [FormsModule, IconComponent],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.css'],
})
export class ContactListComponent implements OnInit {
  readonly contactTypes: ContactType[] = ['Client', 'Opponent', 'Court', 'Expert'];

  contacts: ContactDto[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 20;
  loading = false;

  search = '';
  typeFilter: ContactType | '' = '';
  statusFilter: EntityStatus | '' = '';
  importing = false;
  importMessage = '';

  private api = inject(ContactsService);
  private router = inject(Router);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .list({
        search: this.search.trim() || undefined,
        type: this.typeFilter,
        status: this.statusFilter,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (r) => {
          this.contacts = r.items;
          this.total = r.total;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  go(page: number): void {
    this.page = page;
    this.load();
  }

  badgeFor(status: string): string {
    return status === 'Active' ? 'badge-green' : 'badge-gray';
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  avatarColor(type: string): string {
    const map: Record<string, string> = {
      Client: '#2563eb',
      Opponent: '#dc2626',
      Court: '#7c3aed',
      Expert: '#0d9488',
    };
    return map[type] ?? '#64748b';
  }

  open(c: ContactDto): void {
    this.router.navigate(['/contacts', c.id]);
  }

  newContact(): void {
    this.router.navigate(['/contacts/new']);
  }

  downloadImportTemplate(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Full Name', 'Type', 'Email', 'Phone', 'Address', 'Notes', 'Status'],
      ['Jane Example', 'Client', 'jane@example.com', '+27 11 123 4567', '1 Example Street, Pretoria', 'Important contact', 'Active'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const url = URL.createObjectURL(new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts-import-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }

  importContacts(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      this.importMessage = 'Please choose an Excel (.xlsx) or CSV file.';
      return;
    }

    this.importing = true;
    this.importMessage = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
          .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value)])));
        const contacts = rows
          .map((row) => this.contactFromRow(row))
          .filter((contact): contact is ContactUpsertRequest => !!contact);

        if (!contacts.length) {
          this.importing = false;
          this.importMessage = 'The CSV contains no contacts with a full name.';
          return;
        }

        this.createImportedContacts(contacts, 0, 0);
      } catch {
        this.importing = false;
        this.importMessage = 'Could not read that CSV. Use a header row with Full Name, Type, Email, Phone, Address, Notes and Status.';
      }
    };
    reader.onerror = () => {
      this.importing = false;
      this.importMessage = 'Could not read that file.';
    };
    reader.readAsArrayBuffer(file);
  }

  private createImportedContacts(contacts: ContactUpsertRequest[], index: number, created: number): void {
    if (index >= contacts.length) {
      this.importing = false;
      this.importMessage = `${created} contact${created === 1 ? '' : 's'} imported successfully.`;
      this.load();
      return;
    }

    this.api.create(contacts[index]).subscribe({
      next: () => this.createImportedContacts(contacts, index + 1, created + 1),
      error: () => {
        this.importing = false;
        this.importMessage = `Imported ${created} of ${contacts.length} contacts. The remaining rows could not be saved.`;
        this.load();
      },
    });
  }

  private contactFromRow(row: Record<string, string>): ContactUpsertRequest | null {
    const fullName = row['full name'] || row['fullname'] || row['name'];
    if (!fullName?.trim()) return null;
    const type = this.contactTypes.includes(row['type'] as ContactType) ? row['type'] as ContactType : 'Client';
    const status = row['status'] === 'Inactive' ? 'Inactive' : 'Active';
    return {
      fullName: fullName.trim(),
      type,
      email: row['email']?.trim() || null,
      phone: row['phone']?.trim() || null,
      address: row['address']?.trim() || null,
      notes: row['notes']?.trim() || null,
      status: status as EntityStatus,
    };
  }

  private parseCsv(text: string): Array<Record<string, string>> {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(value.trim()); value = ''; continue; }
      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(value.trim());
        if (row.some((cell) => cell)) rows.push(row);
        row = []; value = ''; continue;
      }
      value += char;
    }
    if (value || row.length) { row.push(value.trim()); rows.push(row); }
    const headers = (rows.shift() ?? []).map((header) => header.trim().toLowerCase());
    return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
  }
}
