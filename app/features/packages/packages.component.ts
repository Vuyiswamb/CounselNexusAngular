import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Public package comparison page. Static content only; enquiries go through the existing contact and registration pages. */
@Component({
  selector: 'app-packages',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './packages.component.html',
  styleUrl: './packages.component.css',
})
export class PackagesComponent {}
