import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatterNotesService, MattersService } from '../../core/api-services';
import { MatterListItemDto, NoteDto, NoteKind } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-notes',
  imports: [DatePipe, FormsModule, IconComponent],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css'],
})
export class NotesComponent implements OnInit {
  private mattersApi = inject(MattersService);
  private notesApi = inject(MatterNotesService);
  matters: MatterListItemDto[] = [];
  notes: NoteDto[] = [];
  matterId = '';
  kind: NoteKind = 'Note';
  subject = '';
  body = '';
  privileged = false;
  includeArchived = false;
  loading = true;
  saving = false;
  error = '';

  ngOnInit(): void {
    this.mattersApi.list({ pageSize: 100 }).subscribe({
      next: (result) => {
        this.matters = result.items;
        this.matterId = this.matters[0]?.id ?? '';
        this.loading = false;
        if (this.matterId) this.loadNotes();
      },
      error: () => { this.error = 'Could not load matters. Check your matter permissions.'; this.loading = false; },
    });
  }

  loadNotes(): void {
    if (!this.matterId) { this.notes = []; return; }
    this.loading = true;
    this.error = '';
    this.notesApi.list(this.matterId, this.includeArchived).subscribe({
      next: (items) => { this.notes = items; this.loading = false; },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not load matter notes.'; this.loading = false; },
    });
  }

  save(): void {
    const subject = this.subject.trim();
    const body = this.body.trim();
    if (!this.matterId || !subject || !body || this.saving) return;
    this.saving = true;
    this.error = '';
    this.notesApi.create({ matterId: this.matterId, kind: this.kind, subject, body, isPrivileged: this.privileged }).subscribe({
      next: () => { this.subject = ''; this.body = ''; this.privileged = false; this.saving = false; this.loadNotes(); },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not save the note.'; this.saving = false; },
    });
  }

  archive(note: NoteDto): void {
    const action = note.archiveDate ? this.notesApi.restore(note.id) : this.notesApi.archive(note.id);
    action.subscribe({ next: () => this.loadNotes(), error: () => { this.error = 'Could not update this note.'; } });
  }
}
