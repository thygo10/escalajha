import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-merge';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'ds-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClasses()">
      @if (header) {
        <div class="ds-card__header">
          <ng-content select="[slot=header]"></ng-content>
          <h3 class="ds-card__title">{{ header }}</h3>
          @if (subtitle) { <p class="ds-card__subtitle">{{ subtitle }}</p> }
        </div>
      }
      <div class="ds-card__body"><ng-content></ng-content></div>
      @if (footer) {
        <div class="ds-card__footer">
          <ng-content select="[slot=footer]"></ng-content>
          <span class="ds-card__footer-text">{{ footer }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .ds-card { display: flex; flex-direction: column; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; }
    .ds-card--elevated { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .ds-card--outlined { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; }
    .ds-card--filled { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    .ds-card--ghost { background: transparent; border: none; border-radius: 12px; }
    .ds-card--padding-sm { padding: 0.75rem; }
    .ds-card--padding-md { padding: 1rem; }
    .ds-card--padding-lg { padding: 1.5rem; }
    .ds-card--padding-xl { padding: 2rem; }
    .ds-card--padding-none { padding: 0; }
    .ds-card__header { display: flex; flex-direction: column; gap: 0.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; }
    .ds-card__title { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0; }
    .ds-card__subtitle { font-size: 0.875rem; color: #475569; margin: 0; }
    .ds-card__body { flex: 1; font-size: 1rem; color: #0f172a; }
    .ds-card__footer { display: flex; align-items: center; padding-top: 1rem; border-top: 1px solid #e2e8f0; margin-top: 1rem; }
    .ds-card__footer-text { font-size: 0.875rem; color: #64748b; }
    .ds-card--hoverable:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); transition: box-shadow 200ms cubic-bezier(0.4,0,0.2,1); }
  `]
})
export class DsCardComponent {
  @Input() variant: CardVariant = 'elevated';
  @Input() padding: CardPadding = 'md';
  @Input() header = '';
  @Input() subtitle = '';
  @Input() footer = '';
  @Input() hoverable = false;

  computedClasses = computed(() => {
    return cn('ds-card', `ds-card--${this.variant}`, `ds-card--padding-${this.padding}`, this.hoverable && 'ds-card--hoverable');
  });
}
