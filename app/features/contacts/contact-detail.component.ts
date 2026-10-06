import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService } from '../../core/api-services';
import { ContactDto, MatterListItemDto, matterStatusUi } from '../../core/api.models';
import { MockDataService } from '../../core/mock-data.service';

/** Screen 5 — Contact details: header, tabs, Contact Information + Quick Actions.
 *  Contact + matters from the live API; notes/documents still mock (no backend yet). */
@Component({
  selector: 'app-contact-detail',
  imports: [RouterLink, IconComponent],
  templateUrl: './contact-detail.component.html',
  styleUrls: ['./contact-detail.component.css'],
})
export class ContactDetailComponent implements OnInit {
  contact?: ContactDto;
  matters: MatterListItemDto[] = [];
  activeTab = 'overview';
  loading = false;

  private api = inject(ContactsService);
  private mock = inject(MockDataService); // notes/documents only
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading = true;
    this.api.get(id).subscribe({
      next: (c) => {
        this.contact = c;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
    this.api.matters(id).subscribe((m) => (this.matters = m));
  }

  get tabs() {
    return [
      { key: 'overview', label: 'Overview', count: null },
      { key: 'matters', label: 'Matters', count: this.matters.length },
      { key: 'notes', label: 'Notes', count: this.contactNotes.length },
      { key: 'documents', label: 'Documents', count: this.contactDocuments.length },
    ];
  }

  get typeBadge(): string {
    const map: Record<string, string> = {
      Client: 'badge-blue',
      Opponent: 'badge-red',
      Court: 'badge-purple',
      Expert: 'badge-teal',
    };
    return map[this.contact?.type ?? ''] ?? 'badge-gray';
  }

  get avatarColor(): string {
    const map: Record<string, string> = {
      Client: '#2563eb',
      Opponent: '#dc2626',
      Court: '#7c3aed',
      Expert: '#0d9488',
    };
    return map[this.contact?.type ?? ''] ?? '#64748b';
  }

  /** Mock notes for this contact name (Notes module not built yet). */
  get contactNotes() {
    return this.contact ? this.mock.notes.filter((n) => n.contactId === 1 && this.contact?.fullName === 'John Smith') : [];
  }

  /** Mock documents for this contact's matters. */
  get contactDocuments() {
    if (!this.contact) return [];
    const refs = new Set(this.matters.map((m) => m.reference));
    return this.mock.documents.filter((d) => refs.has(d.matterRef));
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  statusUi(s: string): string {
    return s === 'OnHold' ? 'On Hold' : s;
  }

  go(path: string): void {
    this.router.navigateByUrl(path);
  }
}
