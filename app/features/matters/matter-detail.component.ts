import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService, FirmSettingsService, InvoicesService, MatterDocumentsService, MatterNotesService, MattersService, TimeEntriesService } from '../../core/api-services';
import { DocumentDto, FirmSettingsDto, InvoiceDto, MatterDetailDto, NoteDto, NoteKind, TimeEntryDto, matterStatusUi } from '../../core/api.models';
import { MockDataService } from '../../core/mock-data.service';
import { TaskListComponent } from '../tasks/task-list.component';

/** Screen 8 — Matter workspace: header + tabs.
 *  Overview + Parties from the live API; Notes/Diary/Fees/Disbursements/
 *  Documents/Tasks/Invoices/Trust stay mock until those modules ship. */
@Component({
  selector: 'app-matter-detail',
  imports: [RouterLink, IconComponent, DatePipe, DecimalPipe, FormsModule, TaskListComponent],
  templateUrl: './matter-detail.component.html',
  styleUrls: ['./matter-detail.component.css'],
})
export class MatterDetailComponent implements OnInit, OnDestroy {
  matter?: MatterDetailDto;
  firm?: FirmSettingsDto;
  invoices: InvoiceDto[] = [];
  selectedInvoice?: InvoiceDto;
  invoiceLoading = false;
  invoiceSaving = false;
  invoiceSending = false;
  invoiceError = '';
  invoiceNotice = '';
  notes: NoteDto[] = [];
  notesLoading = false;
  noteSaving = false;
  noteError = '';
  showNoteForm = false;
  noteSubject = '';
  noteBody = '';
  noteKind: NoteKind = 'Note';
  includeArchivedNotes = false;
  timeEntries: TimeEntryDto[] = [];
  documents: DocumentDto[] = [];
  documentsLoading = false;
  documentUploading = false;
  documentError = '';
  timeLoading = false;
  timeSaving = false;
  archiveSaving = false;
  archiveError = '';
  timeError = '';
  timeSearch = '';
  timeStatusFilter: 'all' | 'billed' | 'unbilled' = 'all';
  timeDescription = '';
  timeWorkDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  timeHours: number | null = null;
  timeRate: number | null = null;
  timerSeconds = 0;
  timerRunning = false;
  voiceListening = false;
  voiceStarting = false;
  voiceError = '';
  microphones: MediaDeviceInfo[] = [];
  selectedMicrophoneId = '';
  microphoneTesting = false;
  microphoneLevel = 0;
  microphoneError = '';
  recordingUrl = '';
  savedRecordingUrl = '';
  private audioRecorder?: MediaRecorder;
  private recordingChunks: Blob[] = [];
  private timerStartedAt = 0;
  private timerHandle?: ReturnType<typeof setInterval>;
  private recognition: any;
  private microphoneStream?: MediaStream;
  private microphoneContext?: AudioContext;
  private microphoneAnalyser?: AnalyserNode;
  private microphoneLevelHandle?: number;
  timeRateCategory: 'partner' | 'feeEarner' | 'paralegal' | 'assistant' | 'custom' = 'feeEarner';
  readonly rateCategories = [
    { value: 'partner', label: 'Partner', firmField: 'partnerHourlyRate' },
    { value: 'feeEarner', label: 'Fee earner', firmField: 'feeEarnerHourlyRate' },
    { value: 'paralegal', label: 'Paralegal', firmField: 'paralegalHourlyRate' },
    { value: 'assistant', label: 'Legal assistant', firmField: 'legalAssistantHourlyRate' },
    { value: 'custom', label: 'Custom rate', firmField: null },
  ] as const;
  activeTab = 'overview';
  loading = false;

  readonly tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'parties', label: 'Parties' },
    { key: 'notes', label: 'Notes' },
    { key: 'diary', label: 'Diary' },
    { key: 'fees', label: 'Fees' },
    { key: 'disbursements', label: 'Disbursements' },
    { key: 'documents', label: 'Documents' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'trust', label: 'Trust' },
  ];

  private api = inject(MattersService);
  private firmApi = inject(FirmSettingsService);
  private invoicesApi = inject(InvoicesService);
  private contactsApi = inject(ContactsService);
  private timeApi = inject(TimeEntriesService);
  private documentsApi = inject(MatterDocumentsService);
  private notesApi = inject(MatterNotesService);
  private mock = inject(MockDataService); // tabs without backends yet
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnDestroy(): void {
    this.pauseTimeTimer(false);
    this.stopTimeDictation();
    this.stopMicrophoneTest();
    this.stopAudioRecording();
    this.revokeRecordingUrl();
  }

  ngOnInit(): void {
    this.firmApi.get().subscribe({
      next: (firm) => { this.firm = firm; this.updateTimeRate(); },
    });
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading = true;
    this.api.get(id).subscribe({
      next: (m) => {
        this.matter = m;
        this.loading = false;
        this.loadInvoices(m.id);
        this.loadTimeEntries(m.id);
        this.loadNotes(m.id);
        this.loadDocuments(m.id);
      },
      error: () => (this.loading = false),
    });
  }

  get letterheadUrl(): string | null {
    return this.firm?.letterheadBase64 && this.firm.letterheadContentType
      ? `data:${this.firm.letterheadContentType};base64,${this.firm.letterheadBase64}`
      : null;
  }

  get logoUrl(): string | null {
    return this.firm?.logoBase64 && this.firm.logoContentType
      ? `data:${this.firm.logoContentType};base64,${this.firm.logoBase64}`
      : null;
  }

  loadInvoices(matterId: string): void {
    this.invoiceLoading = true;
    this.invoiceError = '';
    this.invoicesApi.list(matterId).subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        if (this.selectedInvoice) {
          this.selectedInvoice = invoices.find((invoice) => invoice.id === this.selectedInvoice?.id);
        }
        this.invoiceLoading = false;
      },
      error: () => {
        this.invoiceError = 'Invoices could not be loaded. Check your billing access and try again.';
        this.invoiceLoading = false;
      },
    });
  }

  createDraftInvoice(): void {
    if (!this.matter || this.invoiceSaving) return;
    this.invoiceSaving = true;
    this.invoiceError = '';
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
    this.invoicesApi.createDraft({
      matterId: this.matter.id,
      invoiceDate: dateOnly(invoiceDate),
      dueDate: dateOnly(dueDate),
      taxRate: 0,
    }).subscribe({
      next: (invoice) => {
        this.invoiceSaving = false;
        this.selectedInvoice = invoice;
        this.loadInvoices(this.matter!.id);
      },
      error: (error) => {
        this.invoiceSaving = false;
        this.invoiceError = error?.error?.detail ?? error?.error ?? 'Could not create a draft. This process may have no unbilled time or disbursements.';
      },
    });
  }

  sendInvoice(): void {
    if (!this.selectedInvoice || this.invoiceSending || this.selectedInvoice.status !== 'Issued') return;
    this.contactsApi.get(this.selectedInvoice.clientId).subscribe({
      next: (client) => {
        if (!client.email) {
          this.invoiceError = 'This client does not have an email address. Add one to the contact before sending the invoice.';
          return;
        }
        if (window.confirm(`Send invoice ${this.selectedInvoice?.number} to ${client.fullName} at ${client.email}?`)) this.sendInvoiceRequest();
      },
      error: () => { this.invoiceError = 'The client email address could not be loaded.'; },
    });
  }

  private sendInvoiceRequest(): void {
    if (!this.selectedInvoice) return;
    this.invoiceSending = true;
    this.invoiceError = '';
    this.invoiceNotice = '';
    this.invoicesApi.send(this.selectedInvoice.id).subscribe({
      next: (invoice) => {
        this.selectedInvoice = invoice;
        this.invoiceSending = false;
        this.invoiceNotice = `Invoice ${invoice.number} was sent to the client.`;
        this.loadInvoices(this.matter?.id ?? '');
      },
      error: (error) => {
        this.invoiceSending = false;
        this.invoiceError = error?.status === 404
          ? 'Sending invoices is not enabled on the current API yet.'
          : error?.error?.detail ?? error?.error ?? 'The invoice could not be sent to the client.';
      },
    });
  }

  loadTimeEntries(matterId: string): void {
    this.timeLoading = true;
    this.timeError = '';
    this.timeApi.list(matterId).subscribe({
      next: (entries) => { this.timeEntries = entries; this.timeLoading = false; },
      error: () => { this.timeError = 'Time entries could not be loaded. Check your fee access and try again.'; this.timeLoading = false; },
    });
  }

  loadNotes(matterId: string): void {
    this.notesLoading = true;
    this.noteError = '';
    this.notesApi.list(matterId, this.includeArchivedNotes).subscribe({
      next: (notes) => { this.notes = notes; this.notesLoading = false; },
      error: () => { this.noteError = 'Notes could not be loaded. Check your notes access and try again.'; this.notesLoading = false; },
    });
  }

  loadDocuments(matterId: string): void {
    this.documentsLoading = true;
    this.documentError = '';
    this.documentsApi.list(matterId).subscribe({
      next: (documents) => { this.documents = documents; this.documentsLoading = false; },
      error: (error) => {
        this.documentError = error?.error?.detail || error?.error?.title || 'Documents could not be loaded.';
        this.documentsLoading = false;
      },
    });
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.matter || this.documentUploading) return;
    if (file.size > 50 * 1024 * 1024) {
      this.documentError = 'The maximum document size is 50 MB.';
      return;
    }
    this.documentUploading = true;
    this.documentError = '';
    this.documentsApi.upload(this.matter.id, file).subscribe({
      next: (document) => {
        this.documents = [document, ...this.documents];
        this.documentUploading = false;
      },
      error: (error) => {
        this.documentError = error?.error?.detail || error?.error?.title ||
          (typeof error?.error === 'string' ? error.error : '') || 'Document upload failed.';
        this.documentUploading = false;
      },
    });
  }

  downloadDocument(doc: DocumentDto): void {
    this.documentsApi.download(doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = doc.name;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.documentError = 'The document could not be downloaded.'; },
    });
  }

  deleteDocument(document: DocumentDto): void {
    if (!window.confirm(`Delete ${document.name}?`)) return;
    this.documentsApi.delete(document.id).subscribe({
      next: () => { this.documents = this.documents.filter(item => item.id !== document.id); },
      error: () => { this.documentError = 'The document could not be deleted.'; },
    });
  }

  formatDocumentSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  setIncludeArchivedNotes(include: boolean): void {
    this.includeArchivedNotes = include;
    if (this.matter) this.loadNotes(this.matter.id);
  }

  archiveNote(note: NoteDto): void {
    if (!this.matter || note.archiveDate) return;
    this.notesApi.archive(note.id).subscribe({
      next: () => this.loadNotes(this.matter!.id),
      error: (error) => { this.noteError = error?.error?.detail || 'This note could not be archived.'; },
    });
  }

  restoreNote(note: NoteDto): void {
    if (!this.matter || !note.archiveDate) return;
    this.notesApi.restore(note.id).subscribe({
      next: () => this.loadNotes(this.matter!.id),
      error: (error) => { this.noteError = error?.error?.detail || 'This note could not be restored.'; },
    });
  }

  openAddNote(): void {
    this.activeTab = 'notes';
    this.showNoteForm = true;
    this.noteError = '';
  }

  archiveMatter(): void {
    if (!this.matter || this.archiveSaving || this.matter.archiveDate) return;
    if (!window.confirm(`Archive matter ${this.matter.reference}? It will be hidden from the normal matters list.`)) return;
    this.archiveSaving = true;
    this.archiveError = '';
    this.api.archive(this.matter.id).subscribe({
      next: () => this.router.navigate(['/matters']),
      error: (error) => {
        this.archiveSaving = false;
        this.archiveError = error?.error?.detail || 'This matter could not be archived.';
      },
    });
  }

  restoreMatter(): void {
    if (!this.matter || this.archiveSaving || !this.matter.archiveDate) return;
    this.archiveSaving = true;
    this.archiveError = '';
    this.api.restore(this.matter.id).subscribe({
      next: () => this.api.get(this.matter!.id).subscribe({
        next: (matter) => { this.matter = matter; this.archiveSaving = false; },
        error: () => { this.archiveSaving = false; this.archiveError = 'Matter restored, but its details could not be refreshed.'; },
      }),
      error: (error) => {
        this.archiveSaving = false;
        this.archiveError = error?.error?.detail || 'This matter could not be restored.';
      },
    });
  }

  cancelNote(): void {
    this.showNoteForm = false;
    this.noteSubject = '';
    this.noteBody = '';
    this.noteKind = 'Note';
    this.noteError = '';
  }

  saveNote(): void {
    if (!this.matter || this.noteSaving || !this.noteSubject.trim() || !this.noteBody.trim()) return;
    this.noteSaving = true;
    this.noteError = '';
    this.notesApi.create({
      matterId: this.matter.id,
      kind: this.noteKind,
      subject: this.noteSubject.trim(),
      body: this.noteBody.trim(),
    }).subscribe({
      next: (note) => {
        this.notes = [note, ...this.notes];
        this.noteSaving = false;
        this.cancelNote();
      },
      error: (error) => {
        this.noteSaving = false;
        this.noteError = error?.error?.detail || error?.error?.title || (typeof error?.error === 'string' ? error.error : '') || 'Could not save the note. Check your notes permission and try again.';
      },
    });
  }

  recordTime(): void {
    if (!this.matter || this.timeSaving || !this.timeDescription.trim() || !this.timeHours || this.timeRate == null) return;
    this.timeSaving = true;
    this.timeError = '';
    this.timeApi.create({
      matterId: this.matter.id,
      feeEarnerId: this.matter.feeEarnerId,
      workDate: this.timeWorkDate,
      description: this.timeDescription.trim(),
      hours: this.timeHours,
      rate: this.timeRate,
    }).subscribe({
      next: () => {
        this.savedRecordingUrl = this.recordingUrl;
        this.timeDescription = '';
        this.timeHours = null;
        this.timeSaving = false;
        this.loadTimeEntries(this.matter!.id);
      },
      error: (error) => {
        this.timeSaving = false;
        this.timeError = error?.error?.detail ?? error?.error ?? 'Time could not be recorded. Check that the date, hours and rate are valid.';
      },
    });
  }

  get timeTimerLabel(): string {
    const seconds = this.timerSeconds;
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  toggleTimeTimer(): void {
    if (this.timerRunning) {
      this.pauseTimeTimer(true);
      return;
    }
    this.timerStartedAt = Date.now() - this.timerSeconds * 1000;
    this.timerRunning = true;
    this.timerHandle = setInterval(() => { this.timerSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000); }, 250);
  }

  resetTimeTimer(): void {
    this.pauseTimeTimer(false);
    this.timerSeconds = 0;
  }

  private pauseTimeTimer(useElapsed: boolean): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = undefined;
    if (this.timerRunning) this.timerSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000);
    this.timerRunning = false;
    if (useElapsed && this.timerSeconds > 0) this.timeHours = Math.max(0.01, Math.round((this.timerSeconds / 3600) * 100) / 100);
  }

  toggleTimeDictation(): void {
    if (this.voiceListening) {
      this.stopTimeDictation();
      return;
    }
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      this.voiceError = 'Voice dictation is not available in this browser. Type the work description instead.';
      return;
    }
    this.voiceError = '';
    this.voiceStarting = true;
    this.requestMicrophoneAndStart(Speech);
  }

  async prepareMicrophone(): Promise<void> {
    this.microphoneError = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await this.loadMicrophones();
    } catch {
      this.microphoneError = 'Microphone permission was denied. Allow access in your browser settings and try again.';
    }
  }

  async loadMicrophones(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.microphones = devices.filter((device) => device.kind === 'audioinput');
    if (!this.selectedMicrophoneId && this.microphones.length) this.selectedMicrophoneId = this.microphones[0].deviceId;
  }

  async testMicrophone(): Promise<void> {
    if (this.microphoneTesting) {
      this.stopMicrophoneTest();
      return;
    }
    this.microphoneError = '';
    try {
      if (!this.microphones.length) await this.prepareMicrophone();
      const audio = this.selectedMicrophoneId ? { deviceId: { exact: this.selectedMicrophoneId } } : true;
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio });
      await this.loadMicrophones();
      this.microphoneContext = new AudioContext();
      this.microphoneAnalyser = this.microphoneContext.createAnalyser();
      this.microphoneAnalyser.fftSize = 256;
      this.microphoneContext.createMediaStreamSource(this.microphoneStream).connect(this.microphoneAnalyser);
      this.microphoneTesting = true;
      this.readMicrophoneLevel();
    } catch {
      this.stopMicrophoneTest();
      this.microphoneError = 'The selected microphone could not be started. Check that it is connected and allowed in the browser.';
    }
  }

  private readMicrophoneLevel(): void {
    if (!this.microphoneTesting || !this.microphoneAnalyser) return;
    const values = new Uint8Array(this.microphoneAnalyser.frequencyBinCount);
    this.microphoneAnalyser.getByteTimeDomainData(values);
    const peak = values.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0);
    this.microphoneLevel = Math.min(100, Math.round((peak / 128) * 100));
    this.microphoneLevelHandle = window.requestAnimationFrame(() => this.readMicrophoneLevel());
  }

  stopMicrophoneTest(): void {
    if (this.microphoneLevelHandle) window.cancelAnimationFrame(this.microphoneLevelHandle);
    this.microphoneLevelHandle = undefined;
    this.microphoneStream?.getTracks().forEach((track) => track.stop());
    this.microphoneStream = undefined;
    void this.microphoneContext?.close();
    this.microphoneContext = undefined;
    this.microphoneAnalyser = undefined;
    this.microphoneTesting = false;
    this.microphoneLevel = 0;
  }

  private async requestMicrophoneAndStart(Speech: any): Promise<void> {
    try {
      let stream: MediaStream | undefined;
      if (navigator.mediaDevices?.getUserMedia) {
        const audio = this.selectedMicrophoneId ? { deviceId: { exact: this.selectedMicrophoneId } } : true;
        stream = await navigator.mediaDevices.getUserMedia({ audio });
        await this.loadMicrophones();
      }
    if (stream) this.startAudioRecording(stream);
    this.recognition = new Speech();
    this.recognition.lang = 'en-ZA';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      const phrases: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) phrases.push(event.results[index][0].transcript.trim());
      }
      if (phrases.length) this.timeDescription = `${this.timeDescription.trim()}${this.timeDescription.trim() ? ' ' : ''}${phrases.join(' ')}`;
    };
    this.recognition.onerror = () => {
      this.stopAudioRecording();
      this.voiceError = 'Microphone dictation stopped. Check microphone permission and try again.';
      this.voiceListening = false;
      this.voiceStarting = false;
    };
    this.recognition.onend = () => { this.stopAudioRecording(); this.voiceListening = false; this.voiceStarting = false; };
    this.voiceListening = true;
    this.voiceStarting = false;
    try { this.recognition.start(); }
    catch { this.voiceListening = false; this.voiceError = 'Microphone could not start. Check browser permission and try again.'; }
    } catch {
      this.voiceStarting = false;
      this.voiceListening = false;
      this.voiceError = 'Microphone permission was denied. Allow microphone access in the browser and try again.';
    }
  }

  private stopTimeDictation(): void {
    if (this.recognition && this.voiceListening) this.recognition.stop();
    this.stopAudioRecording();
    this.voiceListening = false;
    this.recognition = undefined;
  }

  private startAudioRecording(stream: MediaStream): void {
    if (!('MediaRecorder' in window)) return;
    this.revokeRecordingUrl();
    this.recordingChunks = [];
    this.audioRecorder = new MediaRecorder(stream);
    this.audioRecorder.ondataavailable = (event) => { if (event.data.size) this.recordingChunks.push(event.data); };
    this.audioRecorder.onstop = () => {
      if (!this.recordingChunks.length) return;
      const blob = new Blob(this.recordingChunks, { type: this.audioRecorder?.mimeType || 'audio/webm' });
      this.recordingUrl = URL.createObjectURL(blob);
      this.recordingChunks = [];
    };
    this.audioRecorder.start();
  }

  private stopAudioRecording(): void {
    if (this.audioRecorder?.state === 'recording') this.audioRecorder.stop();
    this.audioRecorder = undefined;
  }

  private revokeRecordingUrl(): void {
    if (this.recordingUrl) URL.revokeObjectURL(this.recordingUrl);
    this.recordingUrl = '';
  }

  updateTimeRate(): void {
    const field = this.rateCategories.find((category) => category.value === this.timeRateCategory)?.firmField;
    if (!field || !this.firm) {
      this.timeRate = null;
      return;
    }
    const configuredRate = this.firm[field];
    this.timeRate = configuredRate > 0 ? configuredRate : null;
  }

  openWorkflowStep(tab: string): void {
    if (this.tabs.some((item) => item.key === tab)) this.activeTab = tab;
  }

  editMatter(): void {
    if (this.matter && !this.matter.archiveDate) {
      this.router.navigate(['/matters', this.matter.id, 'edit']);
    }
  }

  get timeUnbilledTotal(): number {
    return this.timeEntries.filter((entry) => !entry.isBilled).reduce((sum, entry) => sum + entry.amount, 0);
  }

  printInvoice(): void {
    window.print();
  }

  statusUi(s: string): string {
    return s === 'OnHold' ? 'On Hold' : s;
  }

  // ---------- mock-backed tabs (filtered by reference) ----------

  private get ref(): string {
    return this.matter?.reference ?? '';
  }

  get diary() { return this.mock.diaryEvents.filter((e) => e.matterRef === this.ref); }
  get fees() { return this.timeEntries; }

  get filteredFees(): TimeEntryDto[] {
    const query = this.timeSearch.trim().toLowerCase();
    return this.timeEntries.filter((entry) => {
      const matchesSearch = !query || `${entry.description} ${entry.feeEarnerName} ${entry.workDate}`.toLowerCase().includes(query);
      const matchesStatus = this.timeStatusFilter === 'all' || (this.timeStatusFilter === 'billed' ? entry.isBilled : !entry.isBilled);
      return matchesSearch && matchesStatus;
    });
  }
  get disbursements() { return this.mock.disbursements.filter((d) => d.matterRef === this.ref); }
  get trustTxns() { return this.mock.trustTxns.filter((t) => t.matterRef === this.ref); }

  get unbilledFees(): number {
    return this.timeUnbilledTotal;
  }

  get trustBalance(): number {
    return this.trustTxns.reduce((sum, t) => sum + t.amount, 0);
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  partyBadge(role: string): string {
    const map: Record<string, string> = {
      Client: 'badge-blue',
      Opponent: 'badge-red',
      Court: 'badge-purple',
      Expert: 'badge-teal',
    };
    return map[role] ?? 'badge-gray';
  }

  invoiceBadge(status: string): string {
    const map: Record<string, string> = {
      Draft: 'badge-gray',
      Sent: 'badge-blue',
      Paid: 'badge-green',
      Overdue: 'badge-red',
    };
    return map[status] ?? 'badge-gray';
  }
}
