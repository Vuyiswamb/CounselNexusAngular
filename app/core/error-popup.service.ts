import { Injectable, signal } from '@angular/core';

export interface ErrorPopup {
  id: number;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorPopupService {
  readonly errors = signal<ErrorPopup[]>([]);
  private nextId = 1;

  show(message: string, title = 'Something went wrong'): void {
    const id = this.nextId++;
    this.errors.update(items => [...items, { id, title, message }]);
    window.setTimeout(() => this.dismiss(id), 7000);
  }

  dismiss(id: number): void {
    this.errors.update(items => items.filter(item => item.id !== id));
  }
}
