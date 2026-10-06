import { Injectable } from '@angular/core';
import { CaseResearchRequest, MatterListItemDto } from './api.models';

export interface CaseResearchMatch extends MatterListItemDto {
  similarity: number;
  matchingTerms: string[];
  outcomeSignal: string;
  outcomeNote: string;
}

/**
 * A small, deterministic matching model for the first research release.
 * It keeps client data in the browser and can later be replaced by an API
 * adapter backed by a licensed case-law provider or an approved LLM.
 */
@Injectable({ providedIn: 'root' })
export class CaseResearchModel {
  rank(request: CaseResearchRequest, matters: MatterListItemDto[]): CaseResearchMatch[] {
    const query = this.tokens([request.title, request.facts, request.legalIssues, request.jurisdiction]);
    const practiceArea = this.normalise(request.practiceArea);

    return matters
      .map((matter) => {
        const searchable = this.tokens([matter.title, matter.practiceArea, matter.clientName, matter.reference]);
        const matchingTerms = [...new Set(query.filter((term) => searchable.includes(term)))];
        const overlap = query.length ? matchingTerms.length / query.length : 0;
        const areaBoost = practiceArea && this.normalise(matter.practiceArea) === practiceArea ? 0.35 : 0;
        const titleBoost = this.titleMatch(request.title, matter.title) ? 0.15 : 0;
        const similarity = Math.min(99, Math.round((overlap * 0.5 + areaBoost + titleBoost) * 100));
        const outcomeSignal = matter.status === 'Closed' ? 'Closed matter' : matter.status === 'OnHold' ? 'On hold' : 'Ongoing';

        return {
          ...matter,
          similarity,
          matchingTerms,
          outcomeSignal,
          outcomeNote: matter.status === 'Closed'
            ? 'The matter is marked closed. Open the matter record to review its notes and documents for the recorded result.'
            : 'No final outcome is recorded because this matter is not closed.',
        };
      })
      .filter((matter) => matter.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  private tokens(values: Array<string | null | undefined>): string[] {
    const stopWords = new Set(['about', 'after', 'against', 'and', 'case', 'from', 'into', 'that', 'the', 'their', 'this', 'with']);
    return [...new Set(values.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !stopWords.has(word)) ?? [])];
  }

  private normalise(value: string): string { return value.trim().toLowerCase(); }

  private titleMatch(query: string, title: string): boolean {
    const queryTokens = this.tokens([query]);
    return queryTokens.length > 0 && queryTokens.some((token) => this.normalise(title).includes(token));
  }
}
