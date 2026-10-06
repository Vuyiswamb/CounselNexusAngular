import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorPopupComponent } from './shared/error-popup.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorPopupComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'CounselNexus';
}
