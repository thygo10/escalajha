import { Component, Input, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-merge';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ds-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="computedClasses()" [attr.title]="tooltip || undefined">
      @if (dot && !label && !content) {
        <span class="ds-badge__dot"></span>
      } @else {
        @if (icon && !dot) {
          <i [class]="icon" class="ds-badge__icon"></i>
        }
        <span class="ds-badge__label">
          @if (content) {
            {{ content }}
          } @else {
            <ng-content></ng-content>
          }
        </span>
        @if (removable) {
          <button type="button" class="ds-badge__remove" (click)="removeClick($event)" [attr.aria-label]="'Remover ' + (label || content)">
            <i class="pi pi-times"></i>
          </button>
        }
      }
    </span>
  `,
  styles: [`
    .ds-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; white-space: nowrap; user-select: none; line-height: 1; vertical-align: middle; }
    .ds-badge--sm { font-size: 0.625rem; padding: 0.125rem 0.5rem; border-radius: 4px; }
    .ds-badge--md { font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 6px; }
    .ds-badge--lg { font-size: 0.875rem; padding: 0.375rem 0.875rem; border-radius: 8px; }
    .ds-badge--pill { border-radius: 9999px !important; }
    .ds-badge--primary { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .ds-badge--success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .ds-badge--warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .ds-badge--danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
    .ds-badge--info { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .ds-badge--neutral { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .ds-badge--solid.ds-badge--primary { background: #2563eb; color: #ffffff; border-color: #2563eb; }
    .ds-badge--solid.ds-badge--success { background: #16a34a; color: #ffffff; border-color: #16a34a; }
    .ds-badge--solid.ds-badge--warning { background: #f59e0b; color: #0f172a; border-color: #f59e0b; }
    .ds-badge--solid.ds-badge--danger { background: #dc2626; color: #ffffff; border-color: #dc2626; }
    .ds-badge--solid.ds-badge--info { background: #2563eb; color: #ffffff; border-color: #2563eb; }
    .ds-badge--solid.ds-badge--neutral { background: #475569; color: #ffffff; border-color: #475569; }
    .ds-badge__icon { font-size: inherit; display: flex; align-items: center; }
    .ds-badge__dot { display: block; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: currentColor; }
    .ds-badge__remove { display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: inherit; cursor: pointer; padding: 0; font-size: 0.75em; opacity: 0.7; line-height: 0; }
    .ds-badge__remove:hover { opacity: 1; }
  `]
})
export class DsBadgeComponent {
  @Input() variant: BadgeVariant = 'primary';
  @Input() size: BadgeSize = 'md';
  @Input() icon = '';
  @Input() tooltip = '';
  @Input() label = '';
  @Input() content = '';
  @Input() dot = false;
  @Input() pill = false;
  @Input() solid = false;
  @Input() removable = false;

  @Output() onRemove = new EventEmitter<void>();

  removeClick(event: MouseEvent): void {
    event.stopPropagation();
    this.onRemove.emit();
  }

  computedClasses = computed(() => {
    return cn('ds-badge', `ds-badge--${this.variant}`, `ds-badge--${this.size}`, this.pill && 'ds-badge--pill', this.solid && 'ds-badge--solid');
  });
}
