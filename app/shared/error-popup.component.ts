import { Component, inject } from '@angular/core';
import { ErrorPopupService } from '../core/error-popup.service';

@Component({
  selector: 'app-error-popup',
  standalone: true,
  template: `
    <div class="error-popups" aria-live="assertive" aria-atomic="false">
      @for (error of popup.errors(); track error.id) {
        <div class="error-popup" role="alert">
          <div class="error-popup-icon" aria-hidden="true">!</div>
          <div class="error-popup-content">
            <strong>{{ error.title }}</strong>
            <p>{{ error.message }}</p>
          </div>
          <button type="button" class="error-popup-close" aria-label="Dismiss error"
            (click)="popup.dismiss(error.id)">×</button>
        </div>
      }
    </div>
  `,
})
export class ErrorPopupComponent {
  readonly popup = inject(ErrorPopupService);
}
