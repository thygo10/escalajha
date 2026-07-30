import { Directive, ElementRef, Input, AfterViewInit } from '@angular/core';

/**
 * Directive that auto-focuses the host element after the view initialises.
 * Use `[dsAutoFocus]` with an optional delay in milliseconds via `[dsAutoFocusDelay]`.
 */
@Directive({
  selector: '[dsAutoFocus]',
  standalone: true,
})
export class DsAutoFocusDirective implements AfterViewInit {
  /**
   * When a string is provided it is treated as truthy and the string value can be used
   * as a selector priority. Use `[dsAutoFocus]="'my-selector'"` to focus a specific element.
   */
  @Input() dsAutoFocus: boolean | string = true;

  /** Delay in milliseconds before the element receives focus. */
  @Input() dsAutoFocusDelay: number = 0;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const shouldFocus = typeof this.dsAutoFocus === 'string' || this.dsAutoFocus === true;
    if (!shouldFocus) {
      return;
    }
    const element = this.resolveElement();
    if (!element) {
      return;
    }
    if (this.dsAutoFocusDelay > 0) {
      setTimeout(() => element.focus(), this.dsAutoFocusDelay);
    } else {
      element.focus();
    }
  }

  /**
   * When `dsAutoFocus` is a string, resolves child elements matching that CSS selector;
   * otherwise returns the host element itself.
   */
  private resolveElement(): HTMLElement | null {
    if (typeof this.dsAutoFocus === 'string' && this.dsAutoFocus.length > 0) {
      const child = this.elementRef.nativeElement.querySelector<HTMLElement>(this.dsAutoFocus);
      return child;
    }
    return this.elementRef.nativeElement;
  }
}
