import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ClientPickerComponent } from '../../shared/client-picker.component';
import { ContactsService, MattersService, UsersService } from '../../core/api-services';
import { ContactDto, MatterDetailDto, MatterStatus, PartyDto, UserDto } from '../../core/api.models';

/** Screen 9 — New Matter: Matter Information + Client and Parties panel (live API). */
@Component({
  selector: 'app-matter-form',
  imports: [RouterLink, FormsModule, IconComponent, ClientPickerComponent],
  templateUrl: './matter-form.component.html',
  styleUrls: ['./matter-form.component.css'],
})
export class MatterFormComponent implements OnInit {
  readonly practiceAreas = ['Litigation', 'Family', 'Conveyancing', 'Commercial', 'Estates', 'RAF Claim'];

  reference = '';
  title = '';
  practiceArea = this.practiceAreas[0];
  status: MatterStatus = 'Active';
  feeEarnerId = '';
  openDate = new Date().toISOString().slice(0, 10);
  description = '';
  clientId = '';

  clients: ContactDto[] = [];
  contacts: ContactDto[] = [];
  users: UserDto[] = [];
  busy = false;
  loadingMatter = false;
  error = '';
  matterId = '';
  private partyLinks: PartyDto[] = [];
  partyDialogOpen = false;
  partyContactId = '';
  partyRole: PartyDto['role'] = 'Opponent';
  feeEarnerDialogOpen = false;
  newFeeEarnerName = '';
  newFeeEarnerEmail = '';
  newFeeEarnerPassword = '';
  feeEarnerBusy = false;
  feeEarnerError = '';

  private api = inject(MattersService);
  private contactsApi = inject(ContactsService);
  private usersApi = inject(UsersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  get isEdit(): boolean { return !!this.matterId; }
  get parties(): PartyDto[] { return this.partyLinks.filter((party) => party.role !== 'Client'); }

  selectClient(client: ContactDto): void {
    this.clientId = client.id;
    if (!this.clients.some((item) => item.id === client.id)) this.clients = [client, ...this.clients];
    this.error = '';
  }

  ngOnInit(): void {
    // Only Client-type contacts can instruct a matter.
    this.contactsApi.list({ type: 'Client', pageSize: 100 }).subscribe((r) => (this.clients = r.items));
    this.contactsApi.list({ pageSize: 200 }).subscribe((r) => (this.contacts = r.items));
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

  save(form?: NgForm): void {
    if (this.busy) return;
    this.error = '';
    if (form?.invalid || !this.title.trim() || !this.clientId || !this.feeEarnerId) {
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

  openPartyDialog(): void {
    this.partyContactId = '';
    this.partyRole = 'Opponent';
    this.partyDialogOpen = true;
  }

  closePartyDialog(): void { this.partyDialogOpen = false; }

  addParty(): void {
    const contact = this.contacts.find((item) => item.id === this.partyContactId);
    if (!contact) return;
    this.partyLinks = [...this.partyLinks.filter((party) => party.contactId !== contact.id), { contactId: contact.id, contactName: contact.fullName, role: this.partyRole }];
    this.closePartyDialog();
    this.error = '';
  }

  removeParty(party: PartyDto): void {
    this.partyLinks = this.partyLinks.filter((item) => !(item.contactId === party.contactId && item.role === party.role));
  }

  openFeeEarnerDialog(): void {
    this.newFeeEarnerName = '';
    this.newFeeEarnerEmail = '';
    this.newFeeEarnerPassword = '';
    this.feeEarnerError = '';
    this.feeEarnerDialogOpen = true;
  }

  closeFeeEarnerDialog(): void {
    if (!this.feeEarnerBusy) this.feeEarnerDialogOpen = false;
  }

  createFeeEarner(): void {
    if (this.feeEarnerBusy) return;
    if (!this.newFeeEarnerName.trim() || !this.newFeeEarnerEmail.trim() || !this.newFeeEarnerPassword) {
      this.feeEarnerError = 'Full name, email and password are required.';
      return;
    }
    if (this.newFeeEarnerPassword.length < 8 || !/[a-z]/.test(this.newFeeEarnerPassword) || !/[A-Z]/.test(this.newFeeEarnerPassword) || !/[0-9]/.test(this.newFeeEarnerPassword)) {
      this.feeEarnerError = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
      return;
    }
    this.feeEarnerBusy = true;
    this.feeEarnerError = '';
    this.usersApi.create({ fullName: this.newFeeEarnerName.trim(), email: this.newFeeEarnerEmail.trim(), role: 'FeeEarner', password: this.newFeeEarnerPassword, sendWelcomeEmail: true }).subscribe({
      next: (user) => {
        this.users = [...this.users, user].sort((a, b) => a.fullName.localeCompare(b.fullName));
        this.feeEarnerId = user.id;
        this.feeEarnerBusy = false;
        this.feeEarnerDialogOpen = false;
      },
      error: (err) => {
        this.feeEarnerBusy = false;
        this.feeEarnerError = err?.error?.detail ?? 'Could not create the fee earner.';
      },
    });
  }
}
