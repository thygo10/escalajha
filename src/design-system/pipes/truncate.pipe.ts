import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe that truncates a string at a word boundary with an optional suffix.
 *
 * Usage:
 *   `{{ text | dsTruncate: 50: '...' }}`
 */
@Pipe({
  name: 'dsTruncate',
  standalone: true,
})
export class DsTruncatePipe implements PipeTransform {
  /**
   * Truncates the input string to the given maximum length, breaking at word boundaries.
   * @param value - The string to truncate.
   * @param maxLength - Maximum character length (default 100).
   * @param suffix - Suffix appended when truncation occurs (default '...').
   * @returns The truncated string, or an empty string when the input is null/undefined.
   */
  transform(value: string | null | undefined, maxLength: number = 100, suffix: string = '...'): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value.length <= maxLength) {
      return value;
    }
    const truncated = value.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + suffix;
    }
    return truncated + suffix;
  }
}
