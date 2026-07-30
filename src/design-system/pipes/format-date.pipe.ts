import { Pipe, PipeTransform } from '@angular/core';

/** Supported date format presets. */
export type DateFormat = 'short' | 'medium' | 'long' | 'relative';

/**
 * Pipe that formats a date value into a locale-aware string using pt-BR.
 *
 * Usage:
 *   `{{ dateValue | dsFormatDate: 'short' }}`
 *   `{{ dateValue | dsFormatDate: 'medium' }}`
 *   `{{ dateValue | dsFormatDate: 'long' }}`
 *   `{{ dateValue | dsFormatDate: 'relative' }}`
 */
@Pipe({
  name: 'dsFormatDate',
  standalone: true,
})
export class DsFormatDatePipe implements PipeTransform {
  private readonly locale = 'pt-BR';

  /**
   * Transforms a date-like value into a formatted string.
   * @param value - A Date, ISO string, null, or undefined.
   * @param format - One of 'short', 'medium', 'long', or 'relative'.
   * @returns The formatted date string or an empty string when the input is null/undefined.
   */
  transform(value: Date | string | null | undefined, format: DateFormat = 'short'): string {
    if (value === null || value === undefined) {
      return '';
    }
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) {
      return '';
    }
    switch (format) {
      case 'short':
        return this.formatShort(date);
      case 'medium':
        return this.formatMedium(date);
      case 'long':
        return this.formatLong(date);
      case 'relative':
        return this.formatRelative(date);
      default:
        return this.formatShort(date);
    }
  }

  private formatShort(date: Date): string {
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatMedium(date: Date): string {
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private formatLong(date: Date): string {
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatRelative(date: Date): string {
    const now = new Date();
    const diffMs = this.startOfDay(now).getTime() - this.startOfDay(date).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'hoje';
    }
    if (diffDays === 1) {
      return 'ontem';
    }
    return `há ${diffDays} dias`;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
