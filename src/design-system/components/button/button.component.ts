import { Component, Input, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DsSpinnerComponent } from '../spinner/spinner.component';
import { DsIconComponent } from '../icon/icon.component';
import { cn } from '../../utils/class-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost' | 'outline' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'ds-button',
  standalone: true,
  imports: [CommonModule, DsSpinnerComponent, DsIconComponent],
  template: `
    <button
      [type]="type"
      [disabled]="_disabled || _loading"
      [class]="computedClasses()"
      (click)="onClick($event)"
      (keydown)="handleKeydown($event)"
    >
      <span class="ds-button__content" [class.ds-button__content--loading]="_loading">
        @if (_loading) {
          <ds-spinner size="sm" class="ds-button__spinner"></ds-spinner>
        } @else if (icon && iconPosition === 'start') {
          <ds-icon [name]="icon" [size]="iconSize" class="ds-button__icon"></ds-icon>
        }
        <span class="ds-button__text">
          <ng-content></ng-content>
        </span>
        @if (icon && iconPosition === 'end') {
          <ds-icon [name]="icon" [size]="iconSize" class="ds-button__icon"></ds-icon>
        }
      </span>
      @if (badge !== undefined && badge !== null && badge !== '') {
        <span class="ds-button__badge">{{ badge }}</span>
      }
    </button>
  `,
  styles: [`
    .ds-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ds-spacing-2);
      font-family: var(--ds-typography-font-family-sans);
      font-weight: var(--ds-typography-font-weight-semibold);
      border: none;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      position: relative;
      overflow: hidden;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ds-button:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    .ds-button:focus-visible { outline: none; box-shadow: var(--ds-shadow-focus); }
    .ds-button__content { display: flex; align-items: center; justify-content: center; gap: var(--ds-spacing-2); width: 100%; }
    .ds-button__content--loading { pointer-events: none; }
    .ds-button__spinner, .ds-button__icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .ds-button__text { display: flex; align-items: center; }
    .ds-button__badge {
      position: absolute; top: calc(var(--ds-spacing-1) * -1); right: calc(var(--ds-spacing-1) * -1);
      min-width: 1.25rem; height: 1.25rem; padding: 0 var(--ds-spacing-1);
      border-radius: var(--ds-border-radius-full); background: var(--ds-color-semantic-danger-600); color: #ffffff;
      font-size: 0.75rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .ds-button--primary { background: var(--ds-color-semantic-primary-950); color: var(--ds-color-semantic-primary-contrast); }
    .ds-button--primary:hover:not(:disabled) { background: var(--ds-color-semantic-primary-900); box-shadow: var(--ds-shadow-button-hover); }
    .ds-button--primary:active:not(:disabled) { background: var(--ds-color-semantic-primary-800); }
    .ds-button--secondary { background: var(--ds-color-semantic-surface-100); color: var(--ds-color-semantic-text-primary); border: 1px solid var(--ds-color-semantic-border-default); }
    .ds-button--secondary:hover:not(:disabled) { background: var(--ds-color-semantic-surface-200); border-color: var(--ds-color-semantic-border-dark); }
    .ds-button--success { background: var(--ds-color-semantic-success-600); color: #ffffff; }
    .ds-button--success:hover:not(:disabled) { background: var(--ds-color-semantic-success-700); }
    .ds-button--warning { background: var(--ds-color-semantic-warning-500); color: var(--ds-color-semantic-text-primary); }
    .ds-button--warning:hover:not(:disabled) { background: var(--ds-color-semantic-warning-600); }
    .ds-button--danger { background: var(--ds-color-semantic-danger-600); color: #ffffff; }
    .ds-button--danger:hover:not(:disabled) { background: var(--ds-color-semantic-danger-700); }
    .ds-button--info { background: var(--ds-color-semantic-info-600); color: #ffffff; }
    .ds-button--ghost { background: transparent; color: var(--ds-color-semantic-text-secondary); }
    .ds-button--ghost:hover:not(:disabled) { background: var(--ds-color-semantic-surface-100); color: var(--ds-color-semantic-text-primary); }
    .ds-button--outline { background: transparent; color: var(--ds-color-semantic-primary-950); border: 1px solid var(--ds-color-semantic-primary-950); }
    .ds-button--outline:hover:not(:disabled) { background: var(--ds-color-semantic-primary-50); border-color: var(--ds-color-semantic-primary-900); color: var(--ds-color-semantic-primary-900); }
    .ds-button--link { background: transparent; color: var(--ds-color-semantic-primary-950); padding: 0.25rem 0.5rem; }
    .ds-button--link:hover:not(:disabled) { color: var(--ds-color-semantic-primary-900); text-decoration: underline; }
    .ds-button--xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: var(--ds-border-radius-xs); height: 1.75rem; min-width: 1.75rem; }
    .ds-button--xs .ds-button__icon, .ds-button--xs ds-icon { width: 0.875rem; height: 0.875rem; font-size: 0.875rem; }
    .ds-button--sm { padding: 0.25rem 0.75rem; font-size: 0.875rem; border-radius: var(--ds-border-radius-sm); height: 2rem; min-width: 2rem; }
    .ds-button--sm .ds-button__icon { width: 1rem; height: 1rem; }
    .ds-button--md { padding: 0.5rem 1rem; font-size: 1rem; border-radius: var(--ds-border-radius-default); height: 2.5rem; min-width: 2.5rem; }
    .ds-button--md .ds-button__icon { width: 1.125rem; height: 1.125rem; }
    .ds-button--lg { padding: 0.75rem 1.5rem; font-size: 1.125rem; border-radius: var(--ds-border-radius-md); height: 3rem; min-width: 3rem; }
    .ds-button--lg .ds-button__icon { width: 1.25rem; height: 1.25rem; }
    .ds-button--xl { padding: 1rem 2rem; font-size: 1.25rem; border-radius: var(--ds-border-radius-lg); height: 3.5rem; min-width: 3.5rem; }
    .ds-button--xl .ds-button__icon { width: 1.5rem; height: 1.5rem; }
    .ds-button--full-width { width: 100%; }
    .ds-button--loading { position: relative; color: transparent !important; }
  `]
})
export class DsButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: ButtonType = 'button';
  @Input() icon = '';
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input() badge: string | number = '';
  @Input() fullWidth = false;
  @Input() _loading = false;
  @Input() _disabled = false;
  @Input() ariaLabel = '';

  @Output() clicked = new EventEmitter<MouseEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();

  get iconSize(): number {
    switch (this.size) {
      case 'xs': return 12;
      case 'sm': return 14;
      case 'md': return 18;
      case 'lg': return 20;
      case 'xl': return 24;
    }
  }

  computedClasses = computed(() => {
    return cn(
      'ds-button',
      `ds-button--${this.variant}`,
      `ds-button--${this.size}`,
      this._loading && 'ds-button--loading',
      this.fullWidth && 'ds-button--full-width'
    );
  });

  onClick(event: MouseEvent): void {
    if (this._disabled || this._loading) return;
    this.clicked.emit(event);
  }

  handleKeydown(event: Event): void {
    const ke = event as KeyboardEvent;
    if (this._disabled || this._loading) return;
    if (ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      this.clicked.emit(event as unknown as MouseEvent);
    }
    this.keydown.emit(ke);
  }
}
