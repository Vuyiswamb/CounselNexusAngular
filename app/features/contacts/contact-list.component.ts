import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService } from '../../core/api-services';
import { ContactDto, ContactType, EntityStatus } from '../../core/api.models';

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
}
