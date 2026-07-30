import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { DsToastService, DsToast } from './toast.service';
import { DsIconComponent } from '../icon/icon.component';
import { cn } from '../../utils/class-merge';

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

const TOAST_ICONS: Record<DsToast['type'], string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info'
};

@Component({
  selector: 'ds-toast',
  standalone: true,
  imports: [CommonModule, DsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px) scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(24px)' }))
      ])
    ])
  ],
  template: `
    <div class="ds-toast-container" [class]="'ds-toast-container--' + position">
      @for (toast of service.toasts(); track toast.id) {
        <div
          class="ds-toast"
          [class]="'ds-toast--' + toast.type"
          @toastAnimation
          role="alert"
          [attr.aria-live]="'assertive'"
        >
          <div class="ds-toast__content">
            <div class="ds-toast__icon-wrapper">
              <ds-icon [name]="TOAST_ICONS[toast.type]" [size]="20"></ds-icon>
            </div>
            <div class="ds-toast__body">
              <span class="ds-toast__title">{{ toast.title }}</span>
              @if (toast.message) {
                <span class="ds-toast__message">{{ toast.message }}</span>
              }
            </div>
            <div class="ds-toast__actions">
              @if (toast.action) {
                <button
                  type="button"
                  class="ds-toast__action-btn"
                  (click)="toast.action!.callback(); service.remove(toast.id)"
                >
                  {{ toast.action.label }}
                </button>
              }
              <button
                type="button"
                class="ds-toast__close-btn"
                (click)="service.remove(toast.id)"
                aria-label="Fechar"
              >
                <ds-icon name="x" [size]="16"></ds-icon>
              </button>
            </div>
          </div>
          @if (toast.duration && toast.duration > 0) {
            <div class="ds-toast__progress">
              <span class="ds-toast__progress-bar" [style.animation-duration.ms]="toast.duration"></span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ds-toast-container { position: fixed; z-index: var(--ds-z-index-toast, 9999); display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none; padding: 1rem; max-height: 100vh; overflow-y: auto; }
    .ds-toast-container--top-right { top: 0; right: 0; align-items: flex-end; }
    .ds-toast-container--top-left { top: 0; left: 0; align-items: flex-start; }
    .ds-toast-container--bottom-right { bottom: 0; right: 0; align-items: flex-end; flex-direction: column-reverse; }
    .ds-toast-container--bottom-left { bottom: 0; left: 0; align-items: flex-start; flex-direction: column-reverse; }
    .ds-toast-container--top-center { top: 0; left: 50%; transform: translateX(-50%); align-items: center; }
    .ds-toast-container--bottom-center { bottom: 0; left: 50%; transform: translateX(-50%); align-items: center; flex-direction: column-reverse; }
    .ds-toast { pointer-events: auto; display: flex; flex-direction: column; min-width: 20rem; max-width: 28rem; border-radius: var(--ds-color-semantic-border-radius-lg, 8px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); overflow: hidden; font-family: var(--ds-typography-font-family-sans); }
    .ds-toast--success { background: var(--ds-color-semantic-success-50, #f0fdf4); border-left: 4px solid var(--ds-color-semantic-success-500, #22c55e); }
    .ds-toast--error { background: var(--ds-color-semantic-danger-50, #fef2f2); border-left: 4px solid var(--ds-color-semantic-danger-500, #ef4444); }
    .ds-toast--warning { background: var(--ds-color-semantic-warning-50, #fffbeb); border-left: 4px solid var(--ds-color-semantic-warning-500, #f59e0b); }
    .ds-toast--info { background: var(--ds-color-semantic-info-50, #eff6ff); border-left: 4px solid var(--ds-color-semantic-info-500, #3b82f6); }
    .ds-toast__content { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; }
    .ds-toast__icon-wrapper { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .ds-toast--success .ds-toast__icon-wrapper { color: var(--ds-color-semantic-success-500); }
    .ds-toast--error .ds-toast__icon-wrapper { color: var(--ds-color-semantic-danger-500); }
    .ds-toast--warning .ds-toast__icon-wrapper { color: var(--ds-color-semantic-warning-500); }
    .ds-toast--info .ds-toast__icon-wrapper { color: var(--ds-color-semantic-info-500); }
    .ds-toast__body { flex: 1; display: flex; flex-direction: column; gap: 0.125rem; }
    .ds-toast__title { font-size: 0.875rem; font-weight: 600; color: var(--ds-color-semantic-text-primary); }
    .ds-toast__message { font-size: 0.8125rem; color: var(--ds-color-semantic-text-secondary); line-height: 1.4; }
    .ds-toast__actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .ds-toast__action-btn { border: none; background: transparent; font-size: 0.8125rem; font-weight: 600; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--ds-color-semantic-text-link); }
    .ds-toast__action-btn:hover { background: var(--ds-color-semantic-surface-100); }
    .ds-toast__close-btn { display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; padding: 0.25rem; border-radius: 4px; color: var(--ds-color-semantic-text-muted); }
    .ds-toast__close-btn:hover { color: var(--ds-color-semantic-text-primary); background: var(--ds-color-semantic-surface-100); }
    .ds-toast__progress { height: 3px; background: transparent; position: relative; }
    .ds-toast__progress-bar { display: block; height: 100%; width: 100%; background: currentColor; opacity: 0.2; animation: ds-toast-progress linear forwards; transform-origin: left; }
    .ds-toast--success .ds-toast__progress-bar { color: var(--ds-color-semantic-success-500); }
    .ds-toast--error .ds-toast__progress-bar { color: var(--ds-color-semantic-danger-500); }
    .ds-toast--warning .ds-toast__progress-bar { color: var(--ds-color-semantic-warning-500); }
    .ds-toast--info .ds-toast__progress-bar { color: var(--ds-color-semantic-info-500); }
    @keyframes ds-toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `]
})
export class DsToastComponent {
  /** Position of the toast container on the screen */
  @Input() position: ToastPosition = 'top-right';
  /** Enable auto-close after duration */
  @Input() autoClose = true;
  /** Duration in ms before auto-close (when autoClose is true) */
  @Input() closeDuration = 4000;
  /** Maximum number of visible toasts */
  @Input() maxToasts = 5;

  service = inject(DsToastService);
  cn = cn;

  readonly TOAST_ICONS = TOAST_ICONS;
}
