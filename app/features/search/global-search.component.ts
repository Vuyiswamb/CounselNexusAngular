import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { ContactsService, MattersService } from '../../core/api-services';
import { ContactDto, MatterListItemDto, matterStatusUi } from '../../core/api.models';

/** Screen 12 — Global search across contacts + matters (live API). */
@Component({
  selector: 'app-global-search',
  imports: [FormsModule, IconComponent],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css'],
})
export class GlobalSearchComponent {
  query = '';
  contacts: ContactDto[] = [];
  matters: MatterListItemDto[] = [];

  private contactsApi = inject(ContactsService);
  private mattersApi = inject(MattersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor() {
    this.route.queryParamMap.subscribe((p) => {
      const q = p.get('q');
      if (q) {
        this.query = q;
        this.run();
      }
    });
  }

  run(): void {
    const q = this.query.trim();
    if (!q) {
      this.contacts = [];
      this.matters = [];
      return;
    }
    this.contactsApi.list({ search: q, pageSize: 10 }).subscribe((r) => (this.contacts = r.items));
    this.mattersApi.list({ search: q, pageSize: 10 }).subscribe((r) => (this.matters = r.items));
  }

  openContact(c: ContactDto): void {
    this.router.navigate(['/contacts', c.id]);
  }

  openMatter(m: MatterListItemDto): void {
    this.router.navigate(['/matters', m.id]);
  }

  initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  statusUi(s: string): string {
    return s === 'OnHold' ? 'On Hold' : s;
  }
}
