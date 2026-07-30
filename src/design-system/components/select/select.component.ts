import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { cn } from '../../utils/class-merge';

export type SelectVariant = 'outlined' | 'filled';

@Component({
  selector: 'ds-select',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DsSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="ds-select-wrapper" [class]="'ds-select-wrapper--' + variant">
      @if (label) {
        <label class="ds-select__label" [class.ds-select__label--required]="required">
          {{ label }}
        </label>
      }

      <div class="ds-select__container" [class]="cn(
        _disabled && 'ds-select__container--disabled',
        hasError && 'ds-select__container--error'
      )">
        <p-select
          [options]="options"
          [optionLabel]="optionLabel"
          [optionValue]="optionValue"
          [placeholder]="placeholder"
          [filter]="filter"
          [showClear]="clearable"
          [loading]="loading"
          [disabled]="_disabled"
          [required]="required"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (onBlur)="onTouched()"
          [styleClass]="'ds-select__input'"
          [attr.aria-label]="label || placeholder"
          [attr.aria-invalid]="hasError"
        />
      </div>

      @if (hint && !hasError) {
        <span class="ds-select__hint">{{ hint }}</span>
      }
      @if (hasError && error) {
        <span class="ds-select__error" role="alert">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    .ds-select-wrapper { display: flex; flex-direction: column; gap: 0.25rem; width: 100%; font-family: var(--ds-typography-font-family-sans); }
    .ds-select__label { font-size: 0.875rem; font-weight: 600; color: var(--ds-color-semantic-text-muted); display: flex; align-items: center; gap: 0.25rem; }
    .ds-select__label--required::after { content: '*'; color: var(--ds-color-semantic-danger-500); margin-left: 0.25rem; }
    .ds-select__container { width: 100%; }
    .ds-select__container--disabled { opacity: 0.5; pointer-events: none; }
    .ds-select__hint { font-size: 0.75rem; color: var(--ds-color-semantic-text-muted); }
    .ds-select__error { font-size: 0.75rem; color: var(--ds-color-semantic-danger-500); font-weight: 500; display: flex; align-items: center; gap: 0.25rem; }
    .ds-select-wrapper--filled .ds-select__container ::ng-deep .p-select { background: var(--ds-color-semantic-surface-100); border-color: transparent; }
  `]
})
export class DsSelectComponent<T = unknown> implements ControlValueAccessor {
  /** Array of selectable options */
  @Input() options: T[] = [];
  /** Property name for option display label */
  @Input() optionLabel = 'label';
  /** Property name for option value */
  @Input() optionValue = 'value';
  /** Placeholder text when no option is selected */
  @Input() placeholder = '';
  /** Enables filtering/searching within options */
  @Input() filter = false;
  /** Shows a clear button to reset selection */
  @Input() clearable = false;
  /** Shows loading state */
  @Input() loading = false;
  /** Disables the select */
  @Input() _disabled = false;
  /** Marks the field as required */
  @Input() required = false;
  /** Label displayed above the select */
  @Input() label = '';
  /** Error message displayed below the select */
  @Input() error = '';
  /** Hint text displayed below the select */
  @Input() hint = '';
  /** Visual variant of the select */
  @Input() variant: SelectVariant = 'outlined';
  /** Size variant */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  value: T | null = null;
  hasError = false;

  private _onChange: (value: T | null) => void = () => {};
  private _onTouched: () => void = () => {};

  cn = cn;

  onValueChange(value: T | null): void {
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

  writeValue(value: T | null): void { this.value = value; }
  registerOnChange(fn: (value: T | null) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this._disabled = isDisabled; }
}
