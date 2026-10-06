import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactsService } from '../../core/api-services';
import { ContactType, EntityStatus } from '../../core/api.models';

/** Screen 6 — New Contact: two-column form (Basic / Additional Information). Live API. */
@Component({
  selector: 'app-contact-form',
  imports: [RouterLink, FormsModule],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css'],
})
export class ContactFormComponent {
  readonly contactTypes: ContactType[] = ['Client', 'Opponent', 'Court', 'Expert'];

  name = '';
  type: ContactType = 'Client';
  email = '';
  phone = '';
  status: EntityStatus = 'Active';
  address = '';
  notes = '';
  busy = false;
  error = '';

  private api = inject(ContactsService);
  private router = inject(Router);

  save(): void {
    if (this.busy || !this.name.trim()) return;
    this.busy = true;
    this.error = '';
    this.api
      .create({
        fullName: this.name.trim(),
        type: this.type,
        email: this.email.trim() || null,
        phone: this.phone.trim() || null,
        address: this.address.trim() || null,
        notes: this.notes.trim() || null,
        status: this.status,
      })
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
