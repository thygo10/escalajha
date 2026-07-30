import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { cn } from '../../utils/class-merge';
import type { TablePageEvent, TableFilterEvent } from 'primeng/table';

export type SelectionMode = 'single' | 'multiple' | 'none';

export interface DsTableColumn<T = unknown> {
  field: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  frozen?: boolean;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'ds-table',
  standalone: true,
  imports: [CommonModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DsTableComponent),
      multi: true
    }
  ],
  template: `
    <div class="ds-table-wrapper" [class.ds-table-wrapper--loading]="loading">
      <p-table
        #dt
        [columns]="columns"
        [value]="data"
        [(selection)]="selection"
        [selectionMode]="selectionMode === 'none' ? undefined : selectionMode"
        [paginator]="paginator"
        [rows]="rows"
        [rowsPerPageOptions]="rowsPerPageOptions"
        [totalRecords]="totalRecords"
        [lazy]="lazy"
        [loading]="loading"
        [scrollable]="scrollable"
        [scrollHeight]="scrollHeight"
        [globalFilterFields]="globalFilterFields"
        [styleClass]="'ds-table'"
        (onPage)="onPage($event)"
        (onSort)="onSort($event)"
        (selectionChange)="onSelectionChange($event)"
        (onFilter)="onFilterChange($event)"
        [rowHover]="true"
        [stripedRows]="striped"
      >
        <ng-template pTemplate="header" let-columns>
          <tr>
            <th *ngFor="let col of columns" [pSortableColumn]="col.sortable ? col.field : undefined" [style.width]="col.width">
              {{ col.header }}
              <p-sortIcon *ngIf="col.sortable" [field]="col.field"></p-sortIcon>
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-rowData let-rowIndex="rowIndex">
          <tr [pSelectableRow]="rowData" [pSelectableRowIndex]="rowIndex">
            <td *ngFor="let col of columns" [style.width]="col.width">
              {{ rowData[col.field] }}
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage" let-columns>
          <tr>
            <td [attr.colspan]="columns.length" class="ds-table__empty">
              {{ emptyMessage }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .ds-table-wrapper { width: 100%; font-family: var(--ds-typography-font-family-sans); position: relative; }
    .ds-table-wrapper--loading { opacity: 0.7; pointer-events: none; }
    .ds-table__empty { text-align: center; padding: 2rem 1rem; color: var(--ds-color-semantic-text-muted, #64748b); font-size: 0.875rem; }
    :host ::ng-deep .p-datatable { border: 1px solid var(--ds-color-semantic-border-light, #e2e8f0); border-radius: var(--ds-color-semantic-border-radius-lg, 8px); overflow: hidden; }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th { background: var(--ds-color-semantic-surface-50, #f8fafc); font-size: 0.8125rem; font-weight: 600; color: var(--ds-color-semantic-text-muted, #475569); padding: 0.75rem 1rem; border-bottom: 1px solid var(--ds-color-semantic-border-light, #e2e8f0); }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--ds-color-semantic-text-DEFAULT, #0f172a); border-bottom: 1px solid var(--ds-color-semantic-border-light, #e2e8f0); }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:last-child > td { border-bottom: none; }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover { background: var(--ds-color-semantic-surface-50, #f8fafc); }
    :host ::ng-deep .p-paginator { background: transparent; padding: 0.75rem 1rem; border-top: 1px solid var(--ds-color-semantic-border-light, #e2e8f0); }
  `]
})
export class DsTableComponent<T = unknown> implements ControlValueAccessor {
  /** Column definitions */
  @Input() columns: DsTableColumn<T>[] = [];
  /** Table data rows */
  @Input() data: T[] = [];
  /** Currently selected row(s) */
  @Input() selection: T | T[] | null = null;
  /** Selection mode */
  @Input() selectionMode: SelectionMode = 'none';
  /** Show paginator */
  @Input() paginator = false;
  /** Number of rows per page */
  @Input() rows = 10;
  /** Page size options for the paginator */
  @Input() rowsPerPageOptions: number[] = [10, 25, 50];
  /** Total number of records (required for lazy loading) */
  @Input() totalRecords = 0;
  /** Enable lazy loading for server-side pagination/sorting/filtering */
  @Input() lazy = false;
  /** Shows loading overlay */
  @Input() loading = false;
  /** Enable horizontal scrolling */
  @Input() scrollable = false;
  /** Scroll height when scrollable is true */
  @Input() scrollHeight = '400px';
  /** An array of objects to represent dynamic columns that are frozen */
  @Input() frozenColumns: DsTableColumn<T>[] = [];
  /** An array of objects to display as frozen */
  @Input() frozenData: T[] = [];
  /** Whether to display rows with alternating colors */
  @Input() striped = false;
  /** Text shown when no data is available */
  @Input() emptyMessage = 'Nenhum registro encontrado.';
  /** An array of fields as string to use in global filtering */
  @Input() globalFilterFields: string[] = [];

  /** Emitted on page change */
  @Output() pageChange = new EventEmitter<TablePageEvent>();
  /** Emitted on sort change */
  @Output() sortChange = new EventEmitter<{ field: string; order: number }>();
  /** Emitted when selection changes */
  @Output() selectionChange = new EventEmitter<T | T[] | null>();
  /** Emitted on filter change */
  @Output() filterChange = new EventEmitter<TableFilterEvent>();

  private _onChange: (value: T | T[] | null) => void = () => {};
  private _onTouched: () => void = () => {};

  cn = cn;

  onPage(event: TablePageEvent): void {
    this.pageChange.emit(event);
  }

  onSort(event: { field: string; order: number }): void {
    this.sortChange.emit(event);
  }

  onSelectionChange(value: T | T[] | null): void {
    this.selection = value;
    this._onChange(value);
    this.selectionChange.emit(value);
  }

  onFilterChange(event: TableFilterEvent): void {
    this.filterChange.emit(event);
  }

  writeValue(value: T | T[] | null): void { this.selection = value; }
  registerOnChange(fn: (value: T | T[] | null) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
}
