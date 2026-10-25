import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ContactsService } from '../../core/api-services';
import { ContactDto, ContactType, EntityStatus } from '../../core/api.models';

/** Screen 6 — New Contact: two-column form (Basic / Additional Information). Live API. */
@Component({
  selector: 'app-contact-form',
  imports: [RouterLink, FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css'],
})
export class ContactFormComponent implements OnInit {
  readonly contactTypes: ContactType[] = ['Client', 'Opponent', 'Court', 'Expert'];

  name = '';
  type: ContactType = 'Client';
  email = '';
  phone = '';
  status: EntityStatus = 'Active';
  address = '';
  notes = '';
  busy = false;
  loadingContact = false;
  error = '';
  contactId = '';

  private api = inject(ContactsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  get isEdit(): boolean { return !!this.contactId; }

  ngOnInit(): void {
    this.contactId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.contactId) return;

    this.loadingContact = true;
    this.api.get(this.contactId).subscribe({
      next: (contact) => { this.populate(contact); this.loadingContact = false; },
      error: (err) => {
        this.loadingContact = false;
        this.error = err?.error?.detail ?? 'Could not load the contact.';
      },
    });
  }

  private populate(contact: ContactDto): void {
    this.name = contact.fullName;
    this.type = contact.type;
    this.email = contact.email ?? '';
    this.phone = contact.phone ?? '';
    this.status = contact.status;
    this.address = contact.address ?? '';
    this.notes = contact.notes ?? '';
  }

  save(form?: NgForm): void {
    if (this.busy) return;
    this.error = '';
    if (form?.invalid || !this.name.trim()) {
      this.error = 'Full name is required.';
      return;
    }
    this.busy = true;
    const request = {
        fullName: this.name.trim(),
        type: this.type,
        email: this.email.trim() || null,
        phone: this.phone.trim() || null,
        address: this.address.trim() || null,
        notes: this.notes.trim() || null,
        status: this.status,
      };
    const operation = this.isEdit ? this.api.update(this.contactId, request) : this.api.create(request);
    operation
      .subscribe({
        next: (c) => this.router.navigate(['/contacts', c.id]),
        error: (err) => {
          this.busy = false;
          this.error = err?.error?.detail ?? 'Could not save the contact.';
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/contacts']);
  }
}
