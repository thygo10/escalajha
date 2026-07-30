import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { DsButtonComponent } from '../button/button.component';
import { cn } from '../../utils/class-merge';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'ds-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, DsButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      (visibleChange)="onVisibleChange($event)"
      [modal]="modal"
      [dismissableMask]="dismissableMask"
      [closeOnEscape]="closeOnEscape"
      [blockScroll]="blockScroll"
      [draggable]="draggable"
      [resizable]="resizable"
      [position]="position"
      [appendTo]="appendTo"
      [showHeader]="showHeader"
      [breakpoints]="breakpoints"
      [styleClass]="computedClasses()"
    >
      @if (showHeader) {
        <ng-template pTemplate="header">
          <div class="ds-modal__header-content">
            <span class="ds-modal__title">{{ header }}</span>
            @if (closable) {
              <ds-button variant="ghost" size="sm" icon="x" (clicked)="close()" [ariaLabel]="ariaCloseLabel"></ds-button>
            }
          </div>
        </ng-template>
      }

      <ng-content></ng-content>

      @if (showFooter) {
        <ng-template pTemplate="footer">
          <ng-content select="[slot=footer]"></ng-content>
        </ng-template>
      }
    </p-dialog>
  `,
  styles: [`
    .ds-modal--sm { width: 24rem; }
    .ds-modal--md { width: 32rem; }
    .ds-modal--lg { width: 48rem; }
    .ds-modal--xl { width: 64rem; }
    .ds-modal--fullscreen { width: 100vw; height: 100vh; }
    .ds-modal__header-content { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .ds-modal__title { font-family: var(--ds-typography-font-family-sans); font-size: 1.125rem; font-weight: 700; color: var(--ds-color-semantic-text-primary); }
  `]
})
export class DsModalComponent {
  /** Controls the visibility of the modal */
  @Input() visible = false;
  /** Title text displayed in the modal header */
  @Input() header = '';
  /** Size preset determining modal width */
  @Input() size: ModalSize = 'md';
  /** Shows/hides the close button in header */
  @Input() closable = true;
  /** Enables dragging of the modal */
  @Input() draggable = false;
  /** Enables resizing of the modal */
  @Input() resizable = false;
  /** Closes modal when clicking the backdrop mask */
  @Input() dismissableMask = true;
  /** Closes modal on Escape key press */
  @Input() closeOnEscape = true;
  /** Prevents page scroll when modal is open */
  @Input() blockScroll = true;
  /** Shows backdrop overlay */
  @Input() modal = true;
  /** Position of the modal on screen */
  @Input() position: ModalPosition = 'center';
  /** Append the dialog to a specific element */
  @Input() appendTo: string = 'body';
  /** Controls visibility of the header bar */
  @Input() showHeader = true;
  /** Controls visibility of the footer area */
  @Input() showFooter = true;
  /** Accessibility label for the close button */
  @Input() ariaCloseLabel = 'Fechar';

  /** Emits the updated visibility state */
  @Output() visibleChange = new EventEmitter<boolean>();

  get breakpoints(): Record<string, string> {
    return { '640px': '90vw' };
  }

  computedClasses(): string {
    return cn('ds-modal', `ds-modal--${this.size}`);
  }

  onVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
