import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService, MattersService, UsersService } from '../../core/api-services';
import { ContactDto, MatterDetailDto, MatterStatus, PartyDto, UserDto } from '../../core/api.models';

/** Screen 9 — New Matter: Matter Information + Client and Parties panel (live API). */
@Component({
  selector: 'app-matter-form',
  imports: [RouterLink, FormsModule, IconComponent],
  templateUrl: './matter-form.component.html',
  styleUrls: ['./matter-form.component.css'],
})
export class MatterFormComponent implements OnInit {
  readonly practiceAreas = ['Litigation', 'Family', 'Conveyancing', 'Commercial', 'Estates'];

  reference = '';
  title = '';
  practiceArea = this.practiceAreas[0];
  status: MatterStatus = 'Active';
  feeEarnerId = '';
  openDate = new Date().toISOString().slice(0, 10);
  description = '';
  clientId = '';

  clients: ContactDto[] = [];
  users: UserDto[] = [];
  busy = false;
  loadingMatter = false;
  error = '';
  matterId = '';
  private partyLinks: PartyDto[] = [];

  private api = inject(MattersService);
  private contactsApi = inject(ContactsService);
  private usersApi = inject(UsersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  get isEdit(): boolean { return !!this.matterId; }

  ngOnInit(): void {
    // Only Client-type contacts can instruct a matter.
    this.contactsApi.list({ type: 'Client', pageSize: 100 }).subscribe((r) => (this.clients = r.items));
    this.usersApi.list().subscribe((u) => {
      this.users = u;
      if (!this.feeEarnerId && u.length) this.feeEarnerId = u[0].id;
    });

    this.matterId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.matterId) {
      this.loadingMatter = true;
      this.api.get(this.matterId).subscribe({
        next: (matter) => { this.populate(matter); this.loadingMatter = false; },
        error: (err) => {
          this.loadingMatter = false;
          this.error = err?.status === 403
            ? 'You do not have permission to view this matter.'
            : err?.error?.detail ?? 'Could not load the matter details.';
        },
      });
    }
  }

  private populate(matter: MatterDetailDto): void {
    this.reference = matter.reference;
    this.title = matter.title;
    this.practiceArea = matter.practiceArea;
    this.status = matter.status;
    this.feeEarnerId = matter.feeEarnerId;
    this.openDate = matter.openDate;
    this.description = matter.description ?? '';
    this.clientId = matter.clientId;
    this.partyLinks = matter.parties;
  }

  save(): void {
    if (this.busy) return;
    this.error = '';
    if (!this.title.trim() || !this.clientId || !this.feeEarnerId) {
      this.error = 'Title, client and fee earner are required.';
      return;
    }
    this.busy = true;
    const clientParties = this.partyLinks.filter((party) => party.role !== 'Client');
    const parties = [...clientParties, { contactId: this.clientId, contactName: '', role: 'Client' as const }];
    const request = {
        reference: this.reference.trim() || null,
        title: this.title.trim(),
        practiceArea: this.practiceArea,
        status: this.status,
        openDate: this.openDate,
        description: this.description.trim() || null,
        clientId: this.clientId,
        feeEarnerId: this.feeEarnerId,
        parties,
      };
    const operation = this.isEdit
      ? this.api.update(this.matterId, request)
      : this.api.create(request);
    operation.subscribe({
        next: (m) => this.router.navigate(['/matters', m.id]),
        error: (err) => {
          this.busy = false;
          this.error = err?.status === 403
            ? 'You do not have permission to change matter details. Ask your firm administrator to grant the matters.write permission.'
            : err?.error?.detail ?? 'Could not save the matter.';
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/matters']);
  }
}
