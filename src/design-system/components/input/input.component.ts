import { Component, Input, forwardRef, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { cn } from '../../utils/class-merge';

export type InputVariant = 'outlined' | 'filled' | 'underlined';
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ds-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ds-input-wrapper" [class]="'ds-input-wrapper--' + variant">
      @if (label) {
        <label class="ds-input__label" [for]="inputId" [class.ds-input__label--required]="required">
          {{ label }}
          @if (tooltip) {
            <span class="ds-input__tooltip-icon" title="{{ tooltip }}">?</span>
          }
        </label>
      }

      <div class="ds-input__container" [class]="cn(
        _disabled && 'ds-input__container--disabled',
        hasError && 'ds-input__container--error'
      )">
        @if (prefixIcon) {
          <span class="ds-input__prefix-icon"><i [class]="prefixIcon"></i></span>
        }
        @if (prefix) {
          <span class="ds-input__prefix">{{ prefix }}</span>
        }

        <input
          #input
          [id]="inputId"
          [type]="type"
          [value]="value"
          [placeholder]="placeholder"
          [disabled]="_disabled"
          [readonly]="readonly"
          [required]="required"
          [attr.min]="min"
          [attr.max]="max"
          [attr.minlength]="inputMinLength"
          [attr.maxlength]="maxlength"
          [attr.step]="step"
          [attr.autocomplete]="autocomplete"
          [attr.aria-label]="ariaLabel || label"
          [attr.aria-describedby]="errorId"
          [attr.aria-invalid]="hasError"
          class="ds-input"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          (keydown)="handleKeydown($event)"
        />

        @if (suffix) { <span class="ds-input__suffix">{{ suffix }}</span> }
        @if (suffixIcon) { <span class="ds-input__suffix-icon"><i [class]="suffixIcon"></i></span> }
        @if (clearable && value && !_disabled) {
          <button type="button" class="ds-input__clear-btn" (click)="clear()" tabindex="-1" aria-label="Limpar">
            <i class="pi pi-times"></i>
          </button>
        }
      </div>

      @if (hint && !hasError) { <span class="ds-input__hint">{{ hint }}</span> }
      @if (hasError && errorMessage) {
        <span class="ds-input__error" [id]="errorId" role="alert">{{ errorMessage }}</span>
      }
      @if (charCount && maxlength) {
        <span class="ds-input__charcount">{{ (value || '').length }}/{{ maxlength }}</span>
      }
    </div>
  `,
  styles: [`
    .ds-input-wrapper { display: flex; flex-direction: column; gap: 0.25rem; width: 100%; }
    .ds-input__label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.875rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 0.25rem; }
    .ds-input__label--required::after { content: '*'; color: #ef4444; margin-left: 0.25rem; }
    .ds-input__tooltip-icon { display: inline-flex; align-items: center; justify-content: center; width: 1rem; height: 1rem; border-radius: 9999px; background: #e2e8f0; color: #64748b; font-size: 0.625rem; font-weight: 700; cursor: help; }
    .ds-input__container { display: flex; align-items: center; width: 100%; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; position: relative; }
    .ds-input__container:hover { border-color: #94a3b8; }
    .ds-input__container:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); outline: none; }
    .ds-input__container--disabled { background: #f8fafc; border-color: #e2e8f0; cursor: not-allowed; }
    .ds-input__container--error { border-color: #ef4444 !important; }
    .ds-input__container--error:focus-within { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important; }
    .ds-input { flex: 1; border: none; outline: none; background: transparent; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 400; color: #0f172a; padding: 0.5rem 0.75rem; width: 100%; min-height: 2.5rem; }
    .ds-input:disabled { color: #94a3b8; cursor: not-allowed; }
    .ds-input::placeholder { color: #94a3b8; }
    .ds-input__prefix, .ds-input__suffix { display: flex; align-items: center; padding: 0 0.5rem; font-size: 0.875rem; color: #64748b; white-space: nowrap; }
    .ds-input__prefix-icon, .ds-input__suffix-icon { display: flex; align-items: center; padding: 0 0.25rem; color: #64748b; }
    .ds-input__clear-btn { display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #64748b; cursor: pointer; padding: 0.25rem; border-radius: 9999px; font-size: 0.75rem; flex-shrink: 0; }
    .ds-input__clear-btn:hover { color: #0f172a; background: #f1f5f9; }
    .ds-input__hint { font-size: 0.75rem; color: #64748b; }
    .ds-input__error { font-size: 0.75rem; color: #ef4444; font-weight: 500; display: flex; align-items: center; gap: 0.25rem; }
    .ds-input__charcount { font-size: 0.75rem; color: #64748b; text-align: right; }
    .ds-input-wrapper--filled .ds-input__container { background: #f1f5f9; border-color: transparent; }
    .ds-input-wrapper--filled .ds-input__container:focus-within { background: #ffffff; border-color: #2563eb; }
    .ds-input-wrapper--underlined .ds-input__container { border-top: none; border-left: none; border-right: none; border-radius: 0; }
  `],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DsInputComponent), multi: true }
  ]
})
export class DsInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() variant: InputVariant = 'outlined';
  @Input() size: InputSize = 'md';
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() prefixIcon = '';
  @Input() suffixIcon = '';
  @Input() hint = '';
  @Input() errorMessage = '';
  @Input() tooltip = '';
  @Input() min: number | string = '';
  @Input() max: number | string = '';
  @Input() inputMinLength: number | string = '';
  @Input() maxlength: number | string = '';
  @Input() step: number | string = '';
  @Input() autocomplete = 'off';
  @Input() ariaLabel = '';
  @Input() _disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() clearable = false;
  @Input() charCount = false;

  @Output() keydownEvent = new EventEmitter<KeyboardEvent>();

  private static nextId = 0;
  inputId = `ds-input-${++DsInputComponent.nextId}`;
  errorId = `${this.inputId}-error`;

  value = '';
  hasError = false;

  private _onChange = (value: string) => {};
  private _onTouched = () => {};

  cn = cn;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this._onChange(this.value);
    this.hasError = false;
  }

  onBlur(): void {
    this._onTouched();
    if (this.required && !this.value) {
      this.hasError = true;
    }
  }

  onFocus(): void {}

  handleKeydown(event: KeyboardEvent): void {
    this.keydownEvent.emit(event);
  }

  clear(): void {
    this.value = '';
    this._onChange('');
    this.hasError = false;
  }

  writeValue(value: string): void { this.value = value || ''; }
  registerOnChange(fn: (value: string) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this._disabled = isDisabled; }
}
