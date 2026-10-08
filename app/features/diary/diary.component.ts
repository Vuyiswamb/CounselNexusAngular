import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DiaryService, MattersService } from '../../core/api-services';
import { DiaryEventDto, DiaryEventRequest, MatterListItemDto } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

@Component({
  selector: 'app-diary',
  imports: [DatePipe, FormsModule, IconComponent],
  templateUrl: './diary.component.html',
  styleUrls: ['./diary.component.css'],
})
export class DiaryComponent implements OnInit {
  private diaryApi = inject(DiaryService);
  private mattersApi = inject(MattersService);
  private router = inject(Router);
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
  calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  get monthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  get todayKey(): string {
    return this.dateKey(new Date());
  }

  get calendarDays(): CalendarDay[] {
    const first = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, key: this.dateKey(date), inMonth: date.getMonth() === this.calendarMonth.getMonth() };
    });
  }

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

  previousMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
  }

  today(): void {
    const now = new Date();
    this.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  eventsOn(day: CalendarDay): DiaryEventDto[] {
    return this.events.filter((event) => this.dateKey(new Date(event.startsAtUtc)) === day.key);
  }

  mattersOn(day: CalendarDay): MatterListItemDto[] {
    return this.matters.filter((matter) => matter.openDate?.slice(0, 10) === day.key);
  }

  openMatter(matter: MatterListItemDto): void {
    void this.router.navigate(['/matters', matter.id]);
  }

  reminders(): DiaryEventDto[] {
    return this.events.filter((event) => event.reminderAtUtc).sort((a, b) => (a.reminderAtUtc ?? '').localeCompare(b.reminderAtUtc ?? '')).slice(0, 5);
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

  private dateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
