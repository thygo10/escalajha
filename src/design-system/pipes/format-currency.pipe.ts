import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe that formats a numeric value as Brazilian Real (BRL) currency.
 *
 * Usage:
 *   `{{ value | dsFormatCurrency }}`
 */
@Pipe({
  name: 'dsFormatCurrency',
  standalone: true,
})
export class DsFormatCurrencyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  /**
   * Transforms a numeric value into a BRL-formatted string.
   * @param value - A number, null, undefined, or NaN.
   * @returns The formatted currency string or an empty string when the input is invalid.
   */
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '';
    }
    return this.formatter.format(value);
  }
}
