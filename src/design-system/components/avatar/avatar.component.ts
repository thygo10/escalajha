import { Component, Input, computed, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-merge';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'square' | 'rounded';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'none';

@Component({
  selector: 'ds-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClasses()" [attr.title]="tooltip || label || undefined">
      @if (src && !imageError) {
        <img
          class="ds-avatar__image"
          [src]="src"
          [alt]="alt || label || ''"
          (error)="imageError = true"
          loading="lazy"
        />
      } @else if (icon) {
        <i [class]="icon" class="ds-avatar__icon"></i>
      } @else {
        <span class="ds-avatar__initials">{{ initials }}</span>
      }
      @if (status !== 'none') {
        <span class="ds-avatar__status" [class]="'ds-avatar__status--' + status"></span>
      }
      @if (badge || badgeDot) {
        <span class="ds-avatar__badge" [class.ds-avatar__badge--dot]="badgeDot" [class.ds-avatar__badge--number]="!!badge">
          @if (!badgeDot) { {{ badge }} }
        </span>
      }
    </div>
  `,
  styles: [`
    .ds-avatar {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: var(--ds-typography-font-family-sans);
      font-weight: var(--ds-typography-font-weight-bold);
      color: var(--ds-color-semantic-primary-contrast);
      background: var(--ds-color-semantic-primary-600);
      overflow: hidden;
      transition: var(--ds-transition-avatar);
      user-select: none;
      vertical-align: middle;
    }

    .ds-avatar--circle { border-radius: var(--ds-color-semantic-border-radius-full); }
    .ds-avatar--square { border-radius: 0; }
    .ds-avatar--rounded { border-radius: var(--ds-color-semantic-border-radius-md); }

    .ds-avatar--xs { width: 1.5rem; height: 1.5rem; font-size: 0.625rem; }
    .ds-avatar--sm { width: 2rem; height: 2rem; font-size: 0.75rem; }
    .ds-avatar--md { width: 2.5rem; height: 2.5rem; font-size: 0.875rem; }
    .ds-avatar--lg { width: 3rem; height: 3rem; font-size: 1rem; }
    .ds-avatar--xl { width: 3.5rem; height: 3.5rem; font-size: 1.125rem; }
    .ds-avatar--2xl { width: 4.5rem; height: 4.5rem; font-size: 1.5rem; }

    .ds-avatar__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ds-avatar__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2em;
    }

    .ds-avatar__initials {
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ds-avatar__status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 0.625rem;
      height: 0.625rem;
      border-radius: var(--ds-color-semantic-border-radius-full);
      border: 2px solid var(--ds-color-semantic-surface-0);
    }

    .ds-avatar--xs .ds-avatar__status,
    .ds-avatar--sm .ds-avatar__status { width: 0.5rem; height: 0.5rem; bottom: -1px; right: -1px; }
    .ds-avatar--lg .ds-avatar__status,
    .ds-avatar--xl .ds-avatar__status { width: 0.75rem; height: 0.75rem; }
    .ds-avatar--2xl .ds-avatar__status { width: 1rem; height: 1rem; }

    .ds-avatar__status--online { background: var(--ds-color-semantic-success-500); }
    .ds-avatar__status--offline { background: var(--ds-color-semantic-surface-400); }
    .ds-avatar__status--busy { background: var(--ds-color-semantic-danger-500); }
    .ds-avatar__status--away { background: var(--ds-color-semantic-warning-500); }

    .ds-avatar__badge {
      position: absolute;
      top: -2px;
      right: -2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ds-color-semantic-border-radius-full);
      border: 2px solid var(--ds-color-semantic-surface-0);
    }

    .ds-avatar__badge--dot {
      width: 0.625rem;
      height: 0.625rem;
      background: var(--ds-color-semantic-danger-500);
    }

    .ds-avatar__badge--number {
      min-width: 1.125rem;
      height: 1.125rem;
      padding: 0 var(--ds-spacing-1);
      background: var(--ds-color-semantic-danger-500);
      color: var(--ds-color-semantic-primary-contrast);
      font-size: 0.625rem;
      font-weight: var(--ds-typography-font-weight-bold);
    }
  `]
})
export class DsAvatarComponent {
  @Input() src = '';
  @Input() label = '';
  @Input() alt = '';
  @Input() icon = '';
  @Input() size: AvatarSize = 'md';
  @Input() shape: AvatarShape = 'circle';
  @Input() status: AvatarStatus = 'none';
  @Input() badge?: number;
  @Input() tooltip = '';
  @Input({ transform: booleanAttribute }) badgeDot = false;

  imageError = false;

  get initials(): string {
    if (this.label) {
      const parts = this.label.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().substring(0, 2);
      if (parts.length === 1) return parts[0][0].toUpperCase();
    }
    return '?';
  }

  computedClasses = computed(() => {
    return cn(
      'ds-avatar',
      `ds-avatar--${this.size}`,
      `ds-avatar--${this.shape}`
    );
  });
}
