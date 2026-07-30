import { Directive, ElementRef, Input, inject, OnDestroy } from '@angular/core';
import { cn } from '../../utils/class-merge';

@Directive({
  selector: '[dsTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onMouseEnter()',
    '(focusout)': 'onMouseLeave()'
  }
})
export class DsTooltipDirective implements OnDestroy {
  /** Tooltip text content */
  @Input() dsTooltip = '';
  /** Position of the tooltip relative to the host element */
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
  /** Delay in ms before the tooltip appears */
  @Input() tooltipDelay = 300;
  /** Delay in ms before the tooltip hides */
  @Input() tooltipHideDelay = 100;
  /** Disables the tooltip */
  @Input() tooltipDisabled = false;
  /** Additional CSS classes applied to the tooltip element */
  @Input() tooltipClass = '';

  private elementRef = inject(ElementRef<HTMLElement>);

  private tooltipElement: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly GAP = 8;

  ngOnDestroy(): void {
    this.clearTimeouts();
    this.removeTooltip();
  }

  onMouseEnter(): void {
    if (this.tooltipDisabled || !this.dsTooltip) return;
    this.clearTimeouts();
    this.hideTimeout = null;
    this.showTimeout = setTimeout(() => this.createTooltip(), this.tooltipDelay);
  }

  onMouseLeave(): void {
    this.clearTimeouts();
    this.showTimeout = null;
    this.hideTimeout = setTimeout(() => this.removeTooltip(), this.tooltipHideDelay);
  }

  private createTooltip(): void {
    this.removeTooltip();

    const host = this.elementRef.nativeElement;
    const rect = host.getBoundingClientRect();

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = cn('ds-tooltip', this.tooltipClass);
    this.tooltipElement.textContent = this.dsTooltip;
    this.tooltipElement.setAttribute('role', 'tooltip');
    this.tooltipElement.id = 'ds-tooltip-' + Date.now();
    this.tooltipElement.style.cssText = `
      position: fixed;
      z-index: 99999;
      font-family: var(--ds-typography-font-family-sans, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.8125rem;
      font-weight: 500;
      background: var(--ds-color-semantic-surface-800, #1e293b);
      color: var(--ds-color-semantic-primary-contrast, #ffffff);
      padding: 0.375rem 0.75rem;
      border-radius: var(--ds-color-semantic-border-radius-md, 6px);
      max-width: 18rem;
      word-wrap: break-word;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: none;
      white-space: normal;
      opacity: 0;
      transition: opacity 120ms ease;
    `;

    document.body.appendChild(this.tooltipElement);
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    const positions: Record<string, { top: number; left: number }> = {
      top: { top: rect.top - tooltipRect.height - this.GAP, left: rect.left + (rect.width - tooltipRect.width) / 2 },
      bottom: { top: rect.bottom + this.GAP, left: rect.left + (rect.width - tooltipRect.width) / 2 },
      left: { top: rect.top + (rect.height - tooltipRect.height) / 2, left: rect.left - tooltipRect.width - this.GAP },
      right: { top: rect.top + (rect.height - tooltipRect.height) / 2, left: rect.right + this.GAP }
    };

    const pos = positions[this.tooltipPosition] || positions['top'];

    this.tooltipElement.style.top = Math.max(8, pos.top) + 'px';
    this.tooltipElement.style.left = Math.max(8, pos.left) + 'px';
    this.tooltipElement.style.opacity = '1';

    host.setAttribute('aria-describedby', this.tooltipElement.id);
  }

  private removeTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
    this.elementRef.nativeElement.removeAttribute('aria-describedby');
  }

  private clearTimeouts(): void {
    if (this.showTimeout !== null) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
