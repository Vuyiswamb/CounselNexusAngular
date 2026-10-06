import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../core/auth.service';
import { FirmSettingsService, MattersService, TimeEntriesService, UsersService } from '../../core/api-services';
import { FirmSettingsDto, MatterListItemDto, TimeEntryDto, TimeEntryRequest, UserDto } from '../../core/api.models';

@Component({
  selector: 'app-time-entry-list',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, IconComponent],
  templateUrl: './time-entry-list.component.html',
  styleUrls: ['./time-entry-list.component.css'],
})
export class TimeEntryListComponent implements OnInit, OnDestroy {
  entries: TimeEntryDto[] = [];
  matters: MatterListItemDto[] = [];
  users: UserDto[] = [];
  firm?: FirmSettingsDto;
  loading = false;
  saving = false;
  showForm = false;
  editingId = '';
  error = '';
  search = '';
  matterFilter = '';
  billedFilter: '' | 'billed' | 'unbilled' = 'unbilled';
  matterId = '';
  feeEarnerId = '';
  description = '';
  workDate = this.today();
  hours: number | null = null;
  rate: number | null = null;
  rateCategory: 'partner' | 'feeEarner' | 'paralegal' | 'assistant' | 'custom' = 'feeEarner';
  elapsedSeconds = 0;
  timerRunning = false;
  voiceListening = false;
  voiceError = '';
  private timerStartedAt = 0;
  private timerHandle?: ReturnType<typeof setInterval>;
  private recognition: any;
  private api = inject(TimeEntriesService);
  private mattersApi = inject(MattersService);
  private usersApi = inject(UsersService);
  private firmApi = inject(FirmSettingsService);
  private auth = inject(AuthService);

  ngOnInit(): void {
    this.load();
    this.mattersApi.list({ pageSize: 100 }).subscribe({
      next: (result) => { this.matters = result.items; },
      error: () => { this.error = 'Matters could not be loaded for time recording.'; },
    });
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users = users;
        this.feeEarnerId = users.find((user) => user.id === this.auth.user()?.id)?.id ?? users[0]?.id ?? '';
      },
      error: () => { this.error = 'Firm users could not be loaded for fee earner selection.'; },
    });
    this.firmApi.get().subscribe({ next: (firm) => { this.firm = firm; this.updateRate(); } });
  }

  ngOnDestroy(): void { this.stopTimer(false); this.stopVoice(); }

  get filteredEntries(): TimeEntryDto[] {
    const query = this.search.trim().toLowerCase();
    return this.entries.filter((entry) => {
      const matterMatches = !this.matterFilter || entry.matterId === this.matterFilter;
      const billingMatches = !this.billedFilter || (this.billedFilter === 'billed' ? entry.isBilled : !entry.isBilled);
      const queryMatches = !query || `${entry.description} ${entry.matterReference} ${entry.matterTitle} ${entry.feeEarnerName}`.toLowerCase().includes(query);
      return matterMatches && billingMatches && queryMatches;
    });
  }

  get unbilledTotal(): number { return this.entries.filter((entry) => !entry.isBilled).reduce((sum, entry) => sum + entry.amount, 0); }
  get unbilledHours(): number { return this.entries.filter((entry) => !entry.isBilled).reduce((sum, entry) => sum + entry.hours, 0); }
  get timerLabel(): string {
    const seconds = Math.floor(this.elapsedSeconds);
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.list().subscribe({
      next: (entries) => { this.entries = entries; this.loading = false; },
      error: (error) => { this.error = error?.status === 403 ? 'You do not have permission to view fees and time.' : 'Time entries could not be loaded.'; this.loading = false; },
    });
  }

  openNew(): void {
    this.editingId = '';
    this.matterId = '';
    this.description = '';
    this.workDate = this.today();
    this.hours = null;
    this.rateCategory = 'feeEarner';
    this.updateRate();
    this.elapsedSeconds = 0;
    this.showForm = true;
    this.error = '';
  }

  edit(entry: TimeEntryDto): void {
    if (entry.isBilled || entry.reversesTimeEntryId) return;
    this.editingId = entry.id;
    this.matterId = entry.matterId;
    this.feeEarnerId = entry.feeEarnerId;
    this.description = entry.description;
    this.workDate = entry.workDate;
    this.hours = entry.hours;
    this.rate = entry.rate;
    this.rateCategory = 'custom';
    this.showForm = true;
    this.error = '';
  }

  save(): void {
    if (this.saving || !this.matterId || !this.feeEarnerId || !this.description.trim() || !this.hours || this.rate == null) return;
    this.saving = true;
    this.error = '';
    const request: TimeEntryRequest = {
      matterId: this.matterId,
      feeEarnerId: this.feeEarnerId,
      workDate: this.workDate,
      description: this.description.trim(),
      hours: this.hours,
      rate: this.rate,
    };
    const operation = this.editingId ? this.api.update(this.editingId, request) : this.api.create(request);
    operation.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: (error) => {
        this.saving = false;
        this.error = error?.status === 403 ? 'You do not have permission to record time.' : error?.error?.detail || error?.error || 'The time entry could not be saved.';
      },
    });
  }

  remove(entry: TimeEntryDto): void {
    if (entry.isBilled || entry.reversesTimeEntryId || !window.confirm('Remove this unbilled time entry? This action will be recorded in the audit history.')) return;
    this.api.delete(entry.id).subscribe({
      next: () => this.load(),
      error: (error) => { this.error = error?.error?.detail || 'The time entry could not be removed.'; },
    });
  }

  updateRate(): void {
    const field = ({ partner: 'partnerHourlyRate', feeEarner: 'feeEarnerHourlyRate', paralegal: 'paralegalHourlyRate', assistant: 'legalAssistantHourlyRate', custom: null } as const)[this.rateCategory];
    this.rate = field && this.firm && this.firm[field] > 0 ? this.firm[field] : null;
  }

  toggleTimer(): void {
    if (this.timerRunning) { this.stopTimer(true); return; }
    this.timerStartedAt = Date.now() - this.elapsedSeconds * 1000;
    this.timerRunning = true;
    this.timerHandle = setInterval(() => { this.elapsedSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000); }, 250);
  }

  private stopTimer(fillHours: boolean): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = undefined;
    if (this.timerRunning) this.elapsedSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000);
    this.timerRunning = false;
    if (fillHours && this.elapsedSeconds > 0) this.hours = Math.max(0.01, Math.round((this.elapsedSeconds / 3600) * 100) / 100);
  }

  resetTimer(): void { this.stopTimer(false); this.elapsedSeconds = 0; }

  toggleVoice(): void {
    if (this.voiceListening) { this.stopVoice(); return; }
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) { this.voiceError = 'Voice dictation is not available in this browser. Type the description instead.'; return; }
    this.voiceError = '';
    this.recognition = new Speech();
    this.recognition.lang = 'en-ZA';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      const phrases: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) phrases.push(event.results[index][0].transcript.trim());
      }
      if (phrases.length) this.description = `${this.description.trim()}${this.description.trim() ? ' ' : ''}${phrases.join(' ')}`;
    };
    this.recognition.onerror = () => { this.voiceError = 'Microphone dictation stopped. Check microphone permission and try again.'; this.voiceListening = false; };
    this.recognition.onend = () => { this.voiceListening = false; };
    this.voiceListening = true;
    try { this.recognition.start(); }
    catch { this.voiceListening = false; this.voiceError = 'Microphone could not start. Check browser permission and try again.'; }
  }

  private stopVoice(): void {
    if (this.recognition && this.voiceListening) this.recognition.stop();
    this.voiceListening = false;
    this.recognition = undefined;
  }

  private today(): string { return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
}
