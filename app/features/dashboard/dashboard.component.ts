import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../core/auth.service';
import { DashboardService, TasksService, TimeEntriesService } from '../../core/api-services';
import { DashboardSummaryDto, DiaryEventDto, TaskDto, TimeEntryDto } from '../../core/api.models';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private dashboardApi = inject(DashboardService);
  private tasksApi = inject(TasksService);
  private timeApi = inject(TimeEntriesService);
  readonly auth = inject(AuthService);
  readonly language = inject(LanguageService);

  summary: DashboardSummaryDto | null = null;
  diary: DiaryEventDto[] = [];
  tasks: TaskDto[] = [];
  timeEntries: TimeEntryDto[] = [];
  loading = true;
  error = '';
  readonly today = new Date();
  get todayLabel(): string {
    return new Intl.DateTimeFormat(this.locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(this.today);
  }

  get locale(): string { return this.language.language === 'af' ? 'af-ZA' : 'en-ZA'; }

  get weekDays(): string[] {
    const monday = new Date(this.today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(this.locale, { weekday: 'short' }).format(date);
    });
  }

  get greeting(): string {
    const hour = this.today.getHours();
    if (this.language.language === 'af') return hour < 12 ? 'Goeiemôre' : hour < 17 ? 'Goeiemiddag' : 'Goeienaand';
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }

  get unbilledTotal(): number {
    return (this.summary?.unbilledFees ?? 0) + (this.summary?.unbilledDisbursements ?? 0);
  }

  get upcomingEvents(): DiaryEventDto[] {
    const now = Date.now();
    return this.diary
      .filter((event) => new Date(event.endsAtUtc).getTime() >= now)
      .sort((a, b) => Date.parse(a.startsAtUtc) - Date.parse(b.startsAtUtc))
      .slice(0, 5);
  }

  get dueTasks(): TaskDto[] {
    return this.tasks
      .filter((task) => (task.status === 'Open' || task.status === 'InProgress') && task.dueAtUtc)
      .sort((a, b) => Date.parse(a.dueAtUtc!) - Date.parse(b.dueAtUtc!))
      .slice(0, 5);
  }

  get weekHours(): number[] { return this.hoursForWeek(0); }
  get previousWeekHours(): number[] { return this.hoursForWeek(1); }
  get maxHours(): number { return Math.max(...this.weekHours, ...this.previousWeekHours, 1); }
  get totalWeekHours(): number { return this.weekHours.reduce((sum, hours) => sum + hours, 0); }

  get taskCounts(): { open: number; inProgress: number; completed: number; total: number } {
    const open = this.tasks.filter((task) => task.status === 'Open').length;
    const inProgress = this.tasks.filter((task) => task.status === 'InProgress').length;
    const completed = this.tasks.filter((task) => task.status === 'Completed').length;
    return { open, inProgress, completed, total: open + inProgress + completed };
  }

  get taskRing(): string {
    const { open, inProgress, completed, total } = this.taskCounts;
    if (!total) return 'conic-gradient(#e3e8f0 0% 100%)';
    const openEnd = open / total * 100;
    const progressEnd = openEnd + inProgress / total * 100;
    return `conic-gradient(#3478f6 0% ${openEnd}%, #8a5cf6 ${openEnd}% ${progressEnd}%, #31b878 ${progressEnd}% 100%)`;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);

    forkJoin({
      summary: this.dashboardApi.summary(),
      diary: this.dashboardApi.diary(from, to).pipe(catchError(() => of([] as DiaryEventDto[]))),
      tasks: this.tasksApi.list().pipe(catchError(() => of([] as TaskDto[]))),
      timeEntries: this.timeApi.list().pipe(catchError(() => of([] as TimeEntryDto[]))),
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.diary = data.diary;
        this.tasks = data.tasks;
        this.timeEntries = data.timeEntries;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.status === 403
          ? (this.language.language === 'af' ? 'Jou rekening het nie toestemming om kontroleskerminligting te sien nie.' : 'Your account does not have permission to view dashboard information.')
          : (this.language.language === 'af' ? 'Kontroleskerminligting kon nie gelaai word nie. Probeer asseblief weer.' : 'Dashboard information could not be loaded. Please try again.');
        this.loading = false;
      },
    });
  }

  eventTime(value: string, allDay: boolean): string {
    return allDay ? (this.language.language === 'af' ? 'Heeldag' : 'All day') : new Intl.DateTimeFormat(this.locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  eventDate(value: string): string {
    const date = new Date(value);
    if (date.toDateString() === this.today.toDateString()) return this.language.language === 'af' ? 'Vandag' : 'Today';
    const tomorrow = new Date(this.today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return this.language.language === 'af' ? 'Môre' : 'Tomorrow';
    return new Intl.DateTimeFormat(this.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  taskDue(value: string | null): string {
    if (!value) return this.language.language === 'af' ? 'Geen sperdatum' : 'No due date';
    const due = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    if (dueDay.getTime() < today.getTime()) return this.language.language === 'af' ? 'Agterstallig' : 'Overdue';
    if (dueDay.toDateString() === today.toDateString()) return this.language.language === 'af' ? 'Vandag' : 'Today';
    return new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'short' }).format(due);
  }

  barHeight(hours: number): number { return hours > 0 ? Math.max(5, hours / this.maxHours * 100) : 0; }

  private hoursForWeek(weeksAgo: number): number[] {
    const currentMonday = new Date(this.today);
    currentMonday.setHours(0, 0, 0, 0);
    currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7) - weeksAgo * 7);
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const values = Array(7).fill(0) as number[];

    for (const entry of this.timeEntries) {
      const [year, month, day] = entry.workDate.split('-').map(Number);
      const workDate = new Date(year, month - 1, day);
      if (workDate >= currentMonday && workDate < nextMonday) {
        values[(workDate.getDay() + 6) % 7] += entry.hours;
      }
    }
    return values;
  }
}
