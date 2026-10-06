import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaseResearchModel, CaseResearchMatch } from '../../core/case-research.model';
import { CaseResearchApiService, MattersService } from '../../core/api-services';
import { CaseResearchAiResponse, LegalCaseDocumentDto, LegalCaseSearchResult } from '../../core/api.models';
import { IconComponent } from '../../shared/icon.component';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-case-research',
  imports: [FormsModule, IconComponent],
  templateUrl: './case-research.component.html',
  styleUrls: ['./case-research.component.css'],
})
export class CaseResearchComponent implements OnInit {
  private mattersApi = inject(MattersService);
  private aiApi = inject(CaseResearchApiService);
  private model = inject(CaseResearchModel);

  request = {
    title: '', facts: '', legalIssues: '', practiceArea: '', jurisdiction: '', desiredOutcome: '',
  };
  matches: CaseResearchMatch[] = [];
  matterCount = 0;
  loading = false;
  searched = false;
  error = '';
  ai: CaseResearchAiResponse | null = null;
  chatInput = '';
  chatSending = false;
  researchStatus = 'Ready';
  selectedFileName = '';
  documentsRequested = false;
  documentAuthorities: LegalCaseSearchResult[] = [];
  documentsByCase: Record<string, LegalCaseDocumentDto[]> = {};
  loadingDocuments = new Set<string>();
  chatMessages: ChatMessage[] = [{
    role: 'assistant',
    text: 'Tell me what happened in the case. Include the parties, important dates, agreements, notices, and the legal question you need researched.',
  }];

  ngOnInit(): void { this.loadMatterCount(); }

  research(): void {
    if (!this.request.facts.trim() && !this.request.legalIssues.trim() && !this.request.title.trim()) {
      this.error = 'Add a case title, facts, or legal issues before researching.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.mattersApi.list({ page: 1, pageSize: 200, includeArchived: true }).subscribe({
      next: (result) => {
        this.matterCount = result.total;
        this.matches = this.model.rank(this.request, result.items);
        this.searched = true;
        this.ai = null;
        this.researchStatus = 'Searching the South African case database...';
        this.aiApi.research({
          ...this.request,
          internalMatters: result.items.map((matter) => ({
            reference: matter.reference,
            title: matter.title,
            practiceArea: matter.practiceArea,
            status: matter.status,
          })),
        }).subscribe({
          next: (answer) => {
            this.ai = answer;
            this.documentAuthorities = Array.isArray(answer.authorities) ? answer.authorities : [];
            this.loadCaseDocuments(this.documentAuthorities);
            if (this.documentsRequested && this.documentAuthorities.length === 0) this.searchForDocuments();
            if (this.chatSending) this.chatMessages.push({ role: 'assistant', text: answer.answer });
            this.chatSending = false;
            this.researchStatus = 'Ready';
            this.loading = false;
          },
          error: (error) => {
            this.error = error.status === 503
              ? 'The AI Server is not reachable. Start the AI Server and try again.'
              : 'The internal matches loaded, but the AI Server could not complete the analysis.';
            if (this.chatSending) this.chatMessages.push({ role: 'assistant', text: this.error });
            this.chatSending = false;
            this.researchStatus = 'Ready';
            this.loading = false;
          },
        });
      },
      error: () => {
        this.error = 'Research could not load the firm matters. Check your connection and try again.';
        this.loading = false;
      },
    });
  }

  sendChat(): void {
    const message = this.chatInput.trim();
    if (!message || this.chatSending) return;
    this.chatMessages.push({ role: 'user', text: message });
    this.chatInput = '';
    if (/\b(document|documents|judgment|judgement|download|attachment|case file)\b/i.test(message)) this.documentsRequested = true;
    this.request.facts = [this.request.facts, message].filter(Boolean).join('\n\n');
    this.chatSending = true;
    this.researchStatus = 'Reading the case details...';
    this.research();
  }

  usePrompt(prompt: string): void { this.chatInput = prompt; }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFileName = input.files?.[0]?.name ?? '';
  }

  loadCaseDocuments(authorities: LegalCaseSearchResult[] | null | undefined): void {
    const records = Array.isArray(authorities) ? authorities : [];
    for (const authority of records) {
      if (this.documentsByCase[authority.id] || this.loadingDocuments.has(authority.id)) continue;
      this.loadingDocuments.add(authority.id);
      this.aiApi.listDocuments(authority.id).subscribe({
        next: (documents) => { this.documentsByCase[authority.id] = documents; this.loadingDocuments.delete(authority.id); },
        error: () => { this.documentsByCase[authority.id] = []; this.loadingDocuments.delete(authority.id); },
      });
    }
  }

  private searchForDocuments(): void {
    const query = [this.request.title, this.request.practiceArea, this.request.legalIssues, this.request.facts]
      .filter(Boolean).join(' ').replace(/\b(download|documents?|judg(e)?ment|attachments?|case file)\b/gi, '').trim().slice(0, 500);
    if (!query) return;
    this.researchStatus = 'Finding related judgments and documents...';
    this.aiApi.searchCorpus(query, undefined, 10).subscribe({
      next: (authorities) => {
        this.documentAuthorities = authorities;
        this.loadCaseDocuments(authorities);
        if (authorities.length === 0) {
          this.chatMessages.push({ role: 'assistant', text: 'I could not find a verified stored judgment or document for this matter. No download is available yet. Add the case document to the South African research corpus, or open a verified source link when one is provided.' });
        }
        this.researchStatus = 'Ready';
      },
      error: () => { this.researchStatus = 'Ready'; },
    });
  }

  downloadCaseDocument(authority: LegalCaseSearchResult, caseDocument: LegalCaseDocumentDto): void {
    this.aiApi.downloadDocument(authority.id, caseDocument.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = caseDocument.fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.error = `The document ${caseDocument.fileName} could not be downloaded.`; },
    });
  }

  formatDocumentSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatMessage(text: string): string {
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br>');
    return safe
      .replace(/(?:^|<br>)\s*(?:\*\*|__)(.+?)(?:\*\*|__)(?=<br>|$)/g, '<h3>$1</h3>')
      .replace(/(?:^|<br>)\s*#{1,3}\s+(.+?)(?=<br>|$)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_match, label: string, url: string) =>
        /^https?:\/\/example\.com(?:\/|$)/i.test(url)
          ? `<span class="unverified-document">${label} — no verified document available</span>`
          : `<a href="${url}" target="_blank" rel="noopener">${label}</a>`)
      .replace(/(^|<br>)(\d+)\.\s/g, '$1<span class="answer-list-number">$2.</span> ')
      .replace(/(^|<br>)[-•]\s/g, '$1<span class="answer-list-bullet">•</span> ')
      .replace(/\*{1,3}/g, '');
  }

  clear(): void {
    this.request = { title: '', facts: '', legalIssues: '', practiceArea: '', jurisdiction: '', desiredOutcome: '' };
    this.matches = [];
    this.searched = false;
    this.error = '';
    this.ai = null;
    this.chatInput = '';
    this.chatSending = false;
    this.researchStatus = 'Ready';
    this.selectedFileName = '';
    this.documentsRequested = false;
    this.documentAuthorities = [];
    this.documentsByCase = {};
    this.loadingDocuments.clear();
    this.chatMessages = [{ role: 'assistant', text: 'Tell me what happened in the case. Include the parties, important dates, agreements, notices, and the legal question you need researched.' }];
  }

  private loadMatterCount(): void {
    this.mattersApi.list({ page: 1, pageSize: 1 }).subscribe({ next: (result) => (this.matterCount = result.total) });
  }
}
