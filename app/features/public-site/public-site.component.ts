import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

type PublicPage = 'home' | 'about' | 'services' | 'contact';

@Component({
  selector: 'app-public-site',
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './public-site.component.html',
  styleUrl: './public-site.component.css',
})
export class PublicSiteComponent implements OnInit {
  page: PublicPage = 'home';
  contactName = '';
  contactEmail = '';
  contactMessage = '';
  contactPrepared = false;

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const page = data['page'] as PublicPage | undefined;
      this.page = page && ['home', 'about', 'services', 'contact'].includes(page) ? page : 'home';
    });
  }

  prepareContactEmail(): void {
    const subject = encodeURIComponent(`CounselNexus enquiry from ${this.contactName}`);
    const body = encodeURIComponent(
      `Name: ${this.contactName}\nEmail: ${this.contactEmail}\n\n${this.contactMessage}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.contactPrepared = true;
  }
}
