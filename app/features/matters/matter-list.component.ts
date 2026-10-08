import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { MattersService, UsersService } from '../../core/api-services';
import { MatterListItemDto, MatterStatus, UserDto, matterStatusUi } from '../../core/api.models';

/** Screen 7 — Matters list with status / fee-earner / practice-area filters (live API). */
@Component({
  selector: 'app-matter-list',
  imports: [FormsModule, IconComponent],
  templateUrl: './matter-list.component.html',
  styleUrls: ['./matter-list.component.css'],
})
export class MatterListComponent implements OnInit {
  readonly practiceAreas = ['Litigation', 'Family', 'Conveyancing', 'Commercial', 'Estates', 'RAF Claim'];

  matters: MatterListItemDto[] = [];
  users: UserDto[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 20;
  loading = false;
  showArchived = false;

  search = '';
  statusFilter: MatterStatus | '' = '';
  earnerFilter = '';
  areaFilter = '';

  private api = inject(MattersService);
  private usersApi = inject(UsersService);
  private router = inject(Router);

  ngOnInit(): void {
    this.load();
    this.usersApi.list().subscribe((u) => (this.users = u));
  }

  load(): void {
    this.loading = true;
    this.api
      .list({
        search: this.search.trim() || undefined,
        status: this.statusFilter,
        feeEarnerId: this.earnerFilter || undefined,
        practiceArea: this.areaFilter || undefined,
        includeArchived: this.showArchived,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (r) => {
          this.matters = r.items;
          this.total = r.total;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  go(page: number): void {
    this.page = page;
    this.load();
  }

  statusUi(s: MatterStatus): string {
    return matterStatusUi(s);
  }

  badgeFor(status: string): string {
    if (status === 'Active') return 'badge-green';
    if (status === 'OnHold') return 'badge-amber';
    return 'badge-gray';
  }

  open(m: MatterListItemDto): void {
    this.router.navigate(['/matters', m.id]);
  }

  newMatter(): void {
    this.router.navigate(['/matters/new']);
  }
}
