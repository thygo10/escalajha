import { Component, Input, forwardRef, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { cn } from '../../utils/class-merge';

@Component({
  selector: 'ds-datepicker',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DsDatePickerComponent),
      multi: true
    }
  ],
  template: `
    <div class="ds-datepicker-wrapper">
      @if (label) {
        <label class="ds-datepicker__label" [class.ds-datepicker__label--required]="required">
          {{ label }}
        </label>
      }

      <div class="ds-datepicker__container" [class]="cn(
        _disabled && 'ds-datepicker__container--disabled',
        hasError && 'ds-datepicker__container--error'
      )">
        <p-datepicker
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (onSelect)="onSelect.emit($event)"
          (onClear)="onClear.emit($event)"
          (onBlur)="onTouched()"
          [placeholder]="placeholder"
          [inline]="inline"
          [showTime]="showTime"
          [showIcon]="showIcon"
          [iconDisplay]="iconDisplay"
          [selectionMode]="selectionMode"
          [minDate]="minDate"
          [maxDate]="maxDate"
          [disabledDates]="disabledDates"
          [disabledDays]="disabledDays"
          [dateFormat]="dateFormat"
          [touchUI]="touchUI"
          [readonlyInput]="readonlyInput"
          [required]="required"
          [appendTo]="appendTo"
          [disabled]="_disabled"
          [styleClass]="'ds-datepicker__input ds-datepicker__input--' + size"
          [attr.aria-label]="label || placeholder"
          [attr.aria-invalid]="hasError"
        />
      </div>

      @if (hint && !hasError) {
        <span class="ds-datepicker__hint">{{ hint }}</span>
      }
      @if (hasError && error) {
        <span class="ds-datepicker__error" role="alert">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    .ds-datepicker-wrapper { display: flex; flex-direction: column; gap: 0.25rem; width: 100%; font-family: var(--ds-typography-font-family-sans); }
    .ds-datepicker__label { font-size: 0.875rem; font-weight: 600; color: var(--ds-color-semantic-text-muted); }
    .ds-datepicker__label--required::after { content: '*'; color: var(--ds-color-semantic-danger-500); margin-left: 0.25rem; }
    .ds-datepicker__container { width: 100%; }
    .ds-datepicker__container--disabled { opacity: 0.5; pointer-events: none; }
    .ds-datepicker__hint { font-size: 0.75rem; color: var(--ds-color-semantic-text-muted); }
    .ds-datepicker__error { font-size: 0.75rem; color: var(--ds-color-semantic-danger-500); font-weight: 500; }
  `]
})
export class DsDatePickerComponent implements ControlValueAccessor {
  /** Selected date or date range */
  @Input() value: Date | Date[] | null = null;
  /** Label displayed above the datepicker */
  @Input() label = '';
  /** Placeholder text */
  @Input() placeholder = '';
  /** Display the calendar inline */
  @Input() inline = false;
  /** Show time picker alongside date */
  @Input() showTime = false;
  /** Show calendar icon */
  @Input() showIcon = false;
  /** Icon display mode: 'input' or 'button' */
  @Input() iconDisplay: 'input' | 'button' = 'input';
  /** Selection mode: single date, range, or multiple */
  @Input() selectionMode: 'single' | 'multiple' | 'range' = 'single';
  /** Minimum selectable date */
  @Input() minDate: Date | undefined;
  /** Maximum selectable date */
  @Input() maxDate: Date | undefined;
  /** Array of dates to disable */
  @Input() disabledDates: Date[] = [];
  /** Array of weekday indices to disable (0=Sunday) */
  @Input() disabledDays: number[] = [];
  /** Date format string (e.g. 'dd/mm/yy') */
  @Input() dateFormat = 'dd/mm/yy';
  /** Enable touch-friendly UI on mobile */
  @Input() touchUI = false;
  /** Prevent manual input editing */
  @Input() readonlyInput = false;
  /** Marks the field as required */
  @Input() required = false;
  /** Error message displayed below */
  @Input() error = '';
  /** Hint text displayed below */
  @Input() hint = '';
  /** Append the overlay to a specific element or body */
  @Input() appendTo: string = 'body';
  /** Disables the datepicker */
  @Input() _disabled = false;
  /** Size variant */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Emitted when a date is selected */
  @Output() onSelect = new EventEmitter<Date>();
  /** Emitted when selection is cleared */
  @Output() onClear = new EventEmitter<void>();

  hasError = false;

  private _onChange: (value: Date | Date[] | null) => void = () => {};
  private _onTouched: () => void = () => {};

  cn = cn;

  onValueChange(value: Date | Date[] | null): void {
    this.value = value;
    this._onChange(value);
    this.hasError = false;
  }

  onTouched(): void {
    this._onTouched();
    if (this.required && !this.value) {
      this.hasError = true;
    }
  }

  writeValue(value: Date | Date[] | null): void { this.value = value; }
  registerOnChange(fn: (value: Date | Date[] | null) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this._disabled = isDisabled; }
}
