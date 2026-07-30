import { Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, Renderer2 } from '@angular/core';

/**
 * Directive that emits an event when the user clicks or touches outside the host element.
 * Use `[dsClickOutside]` to bind the output and `[dsClickOutsideEnabled]` to toggle it.
 */
@Directive({
  selector: '[dsClickOutside]',
  standalone: true,
})
export class DsClickOutsideDirective implements OnDestroy {
  /** Whether the click-outside detection is enabled. */
  @Input() dsClickOutsideEnabled: boolean = true;

  /** Emits when a click or touch occurs outside the host element. */
  @Output() dsClickOutside = new EventEmitter<MouseEvent>();

  private readonly removeDocumentListeners: () => void;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {
    const onMouseDown = this.renderer.listen('document', 'mousedown', (event: MouseEvent) => {
      this.onDocumentClick(event);
    });
    const onTouchStart = this.renderer.listen('document', 'touchstart', (event: MouseEvent) => {
      this.onDocumentClick(event);
    });
    this.removeDocumentListeners = () => {
      onMouseDown();
      onTouchStart();
    };
  }

  ngOnDestroy(): void {
    this.removeDocumentListeners();
    this.dsClickOutside.complete();
  }

  private onDocumentClick(event: MouseEvent): void {
    if (!this.dsClickOutsideEnabled) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.elementRef.nativeElement.contains(target)) {
      return;
    }
    this.dsClickOutside.emit(event);
  }
}
