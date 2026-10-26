import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactsService } from '../core/api-services';
import { ContactDto } from '../core/api.models';

@Component({
  selector: 'app-client-picker',
  imports: [FormsModule],
  templateUrl: './client-picker.component.html',
  styleUrls: ['./client-picker.component.css'],
})
export class ClientPickerComponent implements OnInit {
  @Input() showSelector = true;
  @Output() clientSelected = new EventEmitter<ContactDto>();
  clients: ContactDto[] = [];
  selectedId = '';
  creating = false;
  saving = false;
  error = '';
  newClientName = '';
  newClientEmail = '';
  newClientPhone = '';
  private contactsApi = inject(ContactsService);

  ngOnInit(): void { this.loadClients(); }
  loadClients(): void {
    this.contactsApi.list({ type: 'Client', page: 1, pageSize: 200 }).subscribe({ next: (result) => { this.clients = result.items; }, error: () => { this.error = 'Clients could not be loaded.'; } });
  }
  selectClient(): void { const client = this.clients.find((item) => item.id === this.selectedId); if (client) this.clientSelected.emit(client); }
  openCreate(): void { this.creating = true; this.error = ''; this.newClientName = ''; this.newClientEmail = ''; this.newClientPhone = ''; }
  cancelCreate(): void { this.creating = false; this.error = ''; }
  createClient(): void {
    const fullName = this.newClientName.trim();
    if (this.saving) return;
    if (!fullName) { this.error = 'Client name and surname are required.'; return; }
    this.saving = true; this.error = '';
    this.contactsApi.create({ fullName, type: 'Client', email: this.newClientEmail.trim() || null, phone: this.newClientPhone.trim() || null, address: null, notes: null, status: 'Active' }).subscribe({
      next: (client) => { this.clients = [client, ...this.clients]; this.selectedId = client.id; this.creating = false; this.saving = false; this.clientSelected.emit(client); },
      error: (err) => { this.saving = false; this.error = err?.error?.detail ?? 'The client could not be created.'; },
    });
  }
}
