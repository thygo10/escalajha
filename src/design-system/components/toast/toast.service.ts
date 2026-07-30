import { Injectable, signal } from '@angular/core';

export interface DsToastAction {
  label: string;
  callback: () => void;
}

export interface DsToast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: DsToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class DsToastService {
  /** Reactive list of active toasts */
  toasts = signal<DsToast[]>([]);

  /** Displays a toast notification and returns its id */
  show(toast: Omit<DsToast, 'id'>): string {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const id = 'toast-' + Date.now() + '-' + randomArray[0].toString(36);
    const newToast: DsToast = {
      id,
      duration: 4000,
      ...toast
    };

    this.toasts.update(list => [...list, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => this.remove(id), newToast.duration);
    }

    return id;
  }

  /** Convenience method for success toast */
  success(title: string, message?: string): string {
    return this.show({ type: 'success', title, message });
  }

  /** Convenience method for error toast */
  error(title: string, message?: string): string {
    return this.show({ type: 'error', title, message });
  }

  /** Convenience method for info toast */
  info(title: string, message?: string): string {
    return this.show({ type: 'info', title, message });
  }

  /** Convenience method for warning toast */
  warning(title: string, message?: string): string {
    return this.show({ type: 'warning', title, message });
  }

  /** Removes a toast by id */
  remove(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Clears all active toasts */
  clear(): void {
    this.toasts.set([]);
  }
}
