import { Component, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';

/** Website language picker shown in the public top bar, before "Client log in". */
@Component({
  selector: 'app-language-switcher',
  template: `
    <label class="cn-topbar-lang" aria-label="Website language">
      <span aria-hidden="true">{{ language.language === 'af' ? 'Taal' : 'Language' }}</span>
      <select [value]="language.language" (change)="changeLanguage($any($event.target).value)">
        <option value="en">English</option>
        <option value="af">Afrikaans</option>
      </select>
    </label>
  `,
})
export class LanguageSwitcherComponent {
  readonly language = inject(LanguageService);

  changeLanguage(value: string): void {
    this.language.setLanguage(value === 'af' ? 'af' : 'en');
  }
}
