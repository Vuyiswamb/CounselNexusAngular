import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiaryService, MattersService } from '../../core/api-services';
import { DiaryEventDto, DiaryEventRequest, MatterListItemDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-diary',
  imports: [DatePipe, FormsModule, IconComponent],
  templateUrl: './diary.component.html',
  styleUrls: ['./diary.component.css'],
})
export class DiaryComponent implements OnInit {
  private diaryApi = inject(DiaryService);
  private mattersApi = inject(MattersService);
  events: DiaryEventDto[] = [];
  matters: MatterListItemDto[] = [];
  loading = true;
  saving = false;
  error = '';
  editingId = '';
  title = '';
  matterId = '';
  kind: DiaryEventRequest['kind'] = 'Event';
  description = '';
  startsLocal = this.localValue(new Date(Date.now() + 60 * 60 * 1000));
  endsLocal = this.localValue(new Date(Date.now() + 2 * 60 * 60 * 1000));
  allDay = false;
  reminderLocal = '';
  readonly rangeStart = new Date();
  readonly rangeEnd = new Date(Date.now() + 90 * 86400000);

  ngOnInit(): void {
    this.mattersApi.list({ pageSize: 100 }).subscribe({
      next: (result) => { this.matters = result.items; this.load(); },
      error: () => { this.error = 'Could not load matters for diary entries.'; this.load(); },
    });
  }

  load(): void {
    this.loading = true;
    this.diaryApi.list(this.rangeStart, this.rangeEnd).subscribe({
      next: (items) => { this.events = items; this.loading = false; },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not load diary events.'; this.loading = false; },
    });
  }

  save(): void {
    const start = new Date(this.startsLocal);
    const end = new Date(this.endsLocal);
    if (!this.title.trim() || !this.startsLocal || !this.endsLocal || end <= start || this.saving) {
      this.error = end <= start ? 'The end time must be after the start time.' : 'Enter an event title and date.';
      return;
    }
    const request: DiaryEventRequest = {
      matterId: this.matterId || null,
      title: this.title.trim(), description: this.description.trim() || null,
      kind: this.kind, startsAtUtc: start.toISOString(), endsAtUtc: end.toISOString(),
      allDay: this.allDay, ownerId: null,
      reminderAtUtc: this.reminderLocal ? new Date(this.reminderLocal).toISOString() : null,
    };
    this.saving = true;
    this.error = '';
    const request$ = this.editingId ? this.diaryApi.update(this.editingId, request) : this.diaryApi.create(request);
    request$.subscribe({
      next: () => { this.resetForm(); this.saving = false; this.load(); },
      error: (err) => { this.error = err?.error?.detail || err?.error?.title || 'Could not save this diary event.'; this.saving = false; },
    });
  }

  edit(item: DiaryEventDto): void {
    this.editingId = item.id; this.title = item.title; this.description = item.description ?? '';
    this.matterId = item.matterId ?? ''; this.kind = item.kind as DiaryEventRequest['kind'];
    this.startsLocal = this.localValue(new Date(item.startsAtUtc)); this.endsLocal = this.localValue(new Date(item.endsAtUtc));
    this.allDay = item.allDay; this.reminderLocal = item.reminderAtUtc ? this.localValue(new Date(item.reminderAtUtc)) : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  remove(item: DiaryEventDto): void {
    if (!confirm(`Delete “${item.title}” from the diary?`)) return;
    this.diaryApi.delete(item.id).subscribe({ next: () => this.load(), error: () => { this.error = 'Could not delete this event.'; } });
  }

  resetForm(): void {
    this.editingId = ''; this.title = ''; this.description = ''; this.matterId = '';
    this.kind = 'Event'; this.allDay = false; this.reminderLocal = '';
    this.startsLocal = this.localValue(new Date(Date.now() + 60 * 60 * 1000));
    this.endsLocal = this.localValue(new Date(Date.now() + 2 * 60 * 60 * 1000));
  }

  private localValue(value: Date): string {
    const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 16);
  }
}
