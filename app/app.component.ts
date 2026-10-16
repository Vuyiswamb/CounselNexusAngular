import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorPopupComponent } from './shared/error-popup.component';
import { LanguageService } from './core/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorPopupComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'CounselNexus';
  readonly language = inject(LanguageService);

  ngOnInit(): void { this.language.start(); }

  changeLanguage(value: string): void {
    this.language.setLanguage(value === 'af' ? 'af' : 'en');
  }
}
