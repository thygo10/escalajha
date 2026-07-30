import { Directive, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';

/** Query selector for all focusable elements. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Directive that traps keyboard focus within the host element.
 * Use `[dsFocusTrap]` to enable focus trapping and `[dsFocusTrapActive]` to toggle it.
 */
@Directive({
  selector: '[dsFocusTrap]',
  host: { '(keydown)': 'onKeydown($event)' },
  standalone: true,
})
export class DsFocusTrapDirective implements OnInit, OnDestroy {
  /** Whether the focus trap is active. */
  @Input() dsFocusTrapActive: boolean = true;

  /** Whether to auto-focus the first focusable element when activated. */
  @Input() dsFocusTrapAutoFocus: boolean = true;

  private focusableElements: HTMLElement[] = [];

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.updateFocusableElements();
    if (this.dsFocusTrapActive && this.dsFocusTrapAutoFocus) {
      this.focusFirst();
    }
  }

  ngOnDestroy(): void {
    this.focusableElements = [];
  }

  /** Handles Tab and Shift+Tab keydown events to cycle focus within the trap. */
  onKeydown(event: KeyboardEvent): void {
    if (!this.dsFocusTrapActive || event.key !== 'Tab') {
      return;
    }
    this.updateFocusableElements();
    if (this.focusableElements.length === 0) {
      return;
    }
    const first = this.focusableElements[0];
    const last = this.focusableElements[this.focusableElements.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /** Focuses the first focusable element inside the trap. */
  focusFirst(): void {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  /** Focuses the last focusable element inside the trap. */
  focusLast(): void {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.focusableElements[this.focusableElements.length - 1].focus();
    }
  }

  private updateFocusableElements(): void {
    this.focusableElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
  }
}
