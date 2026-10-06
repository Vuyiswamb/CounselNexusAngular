import { Component, Input, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../core/auth.service';
import { MattersService, TasksService, UsersService } from '../../core/api-services';
import { MatterListItemDto, TaskDto, TaskRequest, UserDto, WorkPriority, WorkStatus } from '../../core/api.models';

@Component({
  selector: 'app-task-list',
  imports: [FormsModule, DatePipe, IconComponent, RouterLink],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css'],
})
export class TaskListComponent implements OnInit {
  @Input() matterId?: string;
  @Input() compact = false;

  tasks: TaskDto[] = [];
  users: UserDto[] = [];
  matters: MatterListItemDto[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingId = '';
  error = '';
  search = '';
  statusFilter: WorkStatus | '' = '';
  assignmentFilter = '';
  title = '';
  description = '';
  selectedMatterId = '';
  assignedToId = '';
  priority: WorkPriority = 'Normal';
  status: WorkStatus = 'Open';
  dueLocal = '';

  readonly statuses: WorkStatus[] = ['Open', 'InProgress', 'Completed', 'Cancelled'];
  readonly priorities: WorkPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

  private api = inject(TasksService);
  private usersApi = inject(UsersService);
  private mattersApi = inject(MattersService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.matterId ||= this.route.snapshot.queryParamMap.get('matterId') || undefined;
    this.selectedMatterId = this.matterId ?? '';
    this.assignmentFilter = '';

    this.usersApi.list().subscribe({
      next: (users) => {
        this.users = users;
        if (!this.assignedToId && users.length) this.assignedToId = users.find((u) => u.id === this.auth.user()?.id)?.id ?? users[0].id;
      },
      error: () => { this.error = 'Could not load firm users for task assignment.'; },
    });
    if (!this.matterId) {
      this.mattersApi.list({ pageSize: 100 }).subscribe({
        next: (result) => { this.matters = result.items; },
        error: () => { this.error = 'Could not load matters for task creation.'; },
      });
    }
    this.load();
  }

  get visibleTasks(): TaskDto[] {
    const query = this.search.trim().toLowerCase();
    return this.tasks.filter((task) => {
      const statusMatch = !this.statusFilter || task.status === this.statusFilter;
      const queryMatch = !query || `${task.title} ${task.description ?? ''} ${task.matterReference} ${task.assignedToName}`.toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });
  }

  get openCount(): number { return this.tasks.filter((task) => task.status === 'Open' || task.status === 'InProgress').length; }
  get overdueCount(): number { return this.tasks.filter((task) => task.dueAtUtc && new Date(task.dueAtUtc) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled').length; }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.list(this.matterId, this.assignmentFilter || undefined).subscribe({
      next: (tasks) => { this.tasks = tasks; this.loading = false; },
      error: (error) => { this.error = error?.status === 403 ? 'You do not have permission to view tasks.' : 'Tasks could not be loaded.'; this.loading = false; },
    });
  }

  openNew(): void {
    this.resetForm();
    this.selectedMatterId = this.matterId ?? '';
    this.showForm = true;
  }

  edit(task: TaskDto): void {
    this.editingId = task.id;
    this.title = task.title;
    this.description = task.description ?? '';
    this.selectedMatterId = task.matterId;
    this.assignedToId = task.assignedToId;
    this.priority = task.priority;
    this.status = task.status;
    this.dueLocal = task.dueAtUtc ? this.toLocalInput(task.dueAtUtc) : '';
    this.error = '';
    this.showForm = true;
  }

  cancelForm(): void { this.resetForm(); }

  save(): void {
    if (this.saving || !this.title.trim() || !this.selectedMatterId || !this.assignedToId) return;
    this.saving = true;
    this.error = '';
    const request: TaskRequest = {
      matterId: this.selectedMatterId,
      title: this.title.trim(),
      description: this.description.trim() || null,
      status: this.status,
      priority: this.priority,
      assignedToId: this.assignedToId,
      dueAtUtc: this.dueLocal ? new Date(this.dueLocal).toISOString() : null,
    };
    const operation = this.editingId ? this.api.update(this.editingId, request) : this.api.create(request);
    operation.subscribe({
      next: () => { this.saving = false; this.resetForm(); this.load(); },
      error: (error) => {
        this.saving = false;
        this.error = error?.status === 403 ? 'You do not have permission to change tasks.' : error?.error?.detail || error?.error || 'The task could not be saved.';
      },
    });
  }

  toggleComplete(task: TaskDto): void {
    const status: WorkStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    this.api.update(task.id, {
      matterId: task.matterId, title: task.title, description: task.description,
      status, priority: task.priority, assignedToId: task.assignedToId, dueAtUtc: task.dueAtUtc,
    }).subscribe({
      next: () => this.load(),
      error: (error) => { this.error = error?.status === 403 ? 'You do not have permission to update tasks.' : 'Task status could not be changed.'; },
    });
  }

  remove(task: TaskDto): void {
    if (!window.confirm(`Delete task “${task.title}”? It will be removed from active task lists.`)) return;
    this.api.delete(task.id).subscribe({
      next: () => this.load(),
      error: (error) => { this.error = error?.status === 403 ? 'You do not have permission to delete tasks.' : 'Task could not be deleted.'; },
    });
  }

  statusLabel(status: WorkStatus): string { return status === 'InProgress' ? 'In progress' : status; }
  statusClass(status: WorkStatus): string {
    return status === 'Completed' ? 'badge-green' : status === 'InProgress' ? 'badge-blue' : status === 'Cancelled' ? 'badge-gray' : 'badge-amber';
  }
  priorityClass(priority: WorkPriority): string {
    return priority === 'Urgent' ? 'priority-urgent' : priority === 'High' ? 'priority-high' : priority === 'Low' ? 'priority-low' : 'priority-normal';
  }
  isOverdue(task: TaskDto): boolean {
    return !!task.dueAtUtc && new Date(task.dueAtUtc) < new Date() && task.status !== 'Completed' && task.status !== 'Cancelled';
  }

  openMatter(task: TaskDto): void { this.router.navigate(['/matters', task.matterId]); }

  private toLocalInput(value: string): string {
    const date = new Date(value);
    const pad = (number: number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private resetForm(): void {
    this.showForm = false;
    this.editingId = '';
    this.title = '';
    this.description = '';
    this.selectedMatterId = this.matterId ?? '';
    this.assignedToId ||= this.users[0]?.id ?? '';
    this.priority = 'Normal';
    this.status = 'Open';
    this.dueLocal = '';
    this.error = '';
  }
}
