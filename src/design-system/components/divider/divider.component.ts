import { Component, Input, computed, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-merge';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerAlign = 'left' | 'center' | 'right';

@Component({
  selector: 'ds-divider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClasses()" role="separator" [attr.aria-orientation]="orientation">
      @if (orientation === 'horizontal' && label) {
        <span class="ds-divider__label" [class]="'ds-divider__label--' + align">{{ label }}</span>
      }
    </div>
  `,
  styles: [`
    .ds-divider {
      display: flex;
      align-items: center;
      align-self: stretch;
      border: 0;
      margin: 0;
    }

    .ds-divider--horizontal {
      width: 100%;
      border-top: 1px solid var(--ds-color-semantic-border-light);
      margin: var(--ds-spacing-4) 0;
    }

    .ds-divider--horizontal.ds-divider--dashed {
      border-top-style: dashed;
    }

    .ds-divider--horizontal.ds-divider--dotted {
      border-top-style: dotted;
    }

    .ds-divider--horizontal.ds-divider--strong {
      border-top-width: 2px;
      border-top-color: var(--ds-color-semantic-border-DEFAULT);
    }

    .ds-divider--vertical {
      width: 0;
      height: auto;
      min-height: 1em;
      border-left: 1px solid var(--ds-color-semantic-border-light);
      margin: 0 var(--ds-spacing-2);
      align-self: stretch;
    }

    .ds-divider--vertical.ds-divider--dashed {
      border-left-style: dashed;
    }

    .ds-divider--vertical.ds-divider--dotted {
      border-left-style: dotted;
    }

    .ds-divider--vertical.ds-divider--strong {
      border-left-width: 2px;
      border-left-color: var(--ds-color-semantic-border-DEFAULT);
    }

    .ds-divider__label {
      display: flex;
      align-items: center;
      padding: 0 var(--ds-spacing-3);
      font-family: var(--ds-typography-font-family-sans);
      font-size: var(--ds-typography-font-size-xs);
      font-weight: var(--ds-typography-font-weight-semibold);
      color: var(--ds-color-semantic-text-muted);
      text-transform: uppercase;
      letter-spacing: var(--ds-typography-letter-spacing-wider);
      white-space: nowrap;
    }

    .ds-divider__label--left {
      margin-right: auto;
      padding-left: 0;
    }

    .ds-divider__label--center {
      margin: 0 auto;
    }

    .ds-divider__label--right {
      margin-left: auto;
      padding-right: 0;
    }

    /* Spacing variants */
    .ds-divider--spacing-sm { margin-top: var(--ds-spacing-2); margin-bottom: var(--ds-spacing-2); }
    .ds-divider--spacing-md { margin-top: var(--ds-spacing-4); margin-bottom: var(--ds-spacing-4); }
    .ds-divider--spacing-lg { margin-top: var(--ds-spacing-6); margin-bottom: var(--ds-spacing-6); }
    .ds-divider--spacing-xl { margin-top: var(--ds-spacing-8); margin-bottom: var(--ds-spacing-8); }
  `]
})
export class DsDividerComponent {
  @Input() orientation: DividerOrientation = 'horizontal';
  @Input() align: DividerAlign = 'center';
  @Input() label = '';
  @Input() spacing: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input({ transform: booleanAttribute }) dashed = false;
  @Input({ transform: booleanAttribute }) dotted = false;
  @Input({ transform: booleanAttribute }) strong = false;

  computedClasses = computed(() => {
    return cn(
      'ds-divider',
      `ds-divider--${this.orientation}`,
      `ds-divider--spacing-${this.spacing}`,
      {
        'ds-divider--dashed': this.dashed,
        'ds-divider--dotted': this.dotted,
        'ds-divider--strong': this.strong,
      }
    );
  });
}
