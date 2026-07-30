import { Component, Input, computed, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-merge';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'ds-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (overlay) {
      <div class="ds-spinner__overlay" [class.ds-spinner__overlay--fullscreen]="fullscreen">
        <svg class="ds-spinner__svg" [class]="computedClasses()" viewBox="0 0 50 50" [attr.aria-hidden]="!ariaLabel">
          <circle
            class="ds-spinner__track"
            cx="25" cy="25" r="20"
            fill="none"
            [attr.stroke-width]="strokeWidth"
          />
          <circle
            class="ds-spinner__indicator"
            cx="25" cy="25" r="20"
            fill="none"
            [attr.stroke-width]="strokeWidth"
            stroke-dasharray="90, 150"
            stroke-dashoffset="-35"
          />
        </svg>
        @if (label) {
          <span class="ds-spinner__label">{{ label }}</span>
        }
      </div>
    } @else {
      <svg class="ds-spinner__svg" [class]="computedClasses()" viewBox="0 0 50 50" [attr.aria-hidden]="!ariaLabel" [attr.aria-label]="ariaLabel || 'Carregando'">
        <circle
          class="ds-spinner__track"
          cx="25" cy="25" r="20"
          fill="none"
          [attr.stroke-width]="strokeWidth"
        />
        <circle
          class="ds-spinner__indicator"
          cx="25" cy="25" r="20"
          fill="none"
          [attr.stroke-width]="strokeWidth"
          stroke-dasharray="90, 150"
          stroke-dashoffset="-35"
        />
      </svg>
      @if (label) {
        <span class="ds-spinner__label-inline">{{ label }}</span>
      }
    }
  `,
  styles: [`
    .ds-spinner__svg {
      animation: ds-spinner-rotate 1s linear infinite;
      color: var(--ds-color-semantic-primary-600);
    }

    .ds-spinner__track {
      stroke: var(--ds-color-semantic-surface-200);
    }

    .ds-spinner__indicator {
      stroke: currentColor;
      stroke-linecap: round;
      animation: ds-spinner-dash 1.5s ease-in-out infinite;
    }

    .ds-spinner--xs { width: 1rem; height: 1rem; }
    .ds-spinner--sm { width: 1.25rem; height: 1.25rem; }
    .ds-spinner--md { width: 1.75rem; height: 1.75rem; }
    .ds-spinner--lg { width: 2.5rem; height: 2.5rem; }
    .ds-spinner--xl { width: 3.5rem; height: 3.5rem; }

    @keyframes ds-spinner-rotate {
      100% { transform: rotate(360deg); }
    }

    @keyframes ds-spinner-dash {
      0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }

    .ds-spinner__overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--ds-spacing-3);
      padding: var(--ds-spacing-8);
    }

    .ds-spinner__overlay--fullscreen {
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 0.8);
      z-index: var(--ds-z-index-modal-backdrop);
    }

    .ds-spinner__label {
      font-family: var(--ds-typography-font-family-sans);
      font-size: var(--ds-typography-font-size-sm);
      color: var(--ds-color-semantic-text-muted);
      font-weight: var(--ds-typography-font-weight-medium);
    }

    .ds-spinner__label-inline {
      font-family: var(--ds-typography-font-family-sans);
      font-size: var(--ds-typography-font-size-sm);
      color: var(--ds-color-semantic-text-muted);
      margin-left: var(--ds-spacing-2);
    }

    /* Color variants */
    .ds-spinner--primary { color: var(--ds-color-semantic-primary-600) !important; }
    .ds-spinner--white { color: var(--ds-color-semantic-primary-contrast) !important; }
    .ds-spinner--muted { color: var(--ds-color-semantic-text-muted) !important; }
    .ds-spinner--success { color: var(--ds-color-semantic-success-600) !important; }
    .ds-spinner--danger { color: var(--ds-color-semantic-danger-600) !important; }
  `]
})
export class DsSpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() color: 'primary' | 'white' | 'muted' | 'success' | 'danger' = 'primary';
  @Input({ transform: booleanAttribute }) overlay = false;
  @Input({ transform: booleanAttribute }) fullscreen = false;

  get strokeWidth(): number {
    switch (this.size) {
      case 'xs': return 4;
      case 'sm': return 4;
      case 'md': return 3.5;
      case 'lg': return 3;
      case 'xl': return 2.5;
    }
  }

  computedClasses = computed(() => {
    return cn('ds-spinner', `ds-spinner--${this.size}`, `ds-spinner--${this.color}`);
  });
}
