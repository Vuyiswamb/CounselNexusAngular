import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type LegalDoc = 'terms' | 'privacy' | 'cookies';

/** Public legal pages (Terms and Conditions, Privacy Policy, Cookie Policy). Static content only. */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.css',
})
export class LegalComponent {
  readonly doc: LegalDoc = (inject(ActivatedRoute).snapshot.data['doc'] as LegalDoc) ?? 'terms';
}
