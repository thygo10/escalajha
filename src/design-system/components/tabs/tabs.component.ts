import { Component, Input, Output, EventEmitter, ContentChildren, QueryList, AfterContentInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { cn } from '../../utils/class-merge';

export type TabsVariant = 'tabs' | 'pills' | 'underline';

let nextTabId = 0;

@Component({
  selector: 'ds-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active) {
      <div class="ds-tab__panel" role="tabpanel" [attr.aria-labelledby]="'ds-tab-label-' + id">
        <ng-content></ng-content>
      </div>
    }
  `,
  styles: [`
    .ds-tab__panel { padding: var(--ds-spacing-4, 1rem) 0; }
  `]
})
export class DsTabComponent {
  /** Unique value identifying this tab */
  @Input() value: unknown = '';
  /** Display label shown in the tab header */
  @Input() label = '';
  /** Icon class to show alongside the label */
  @Input() icon = '';
  /** Disables the tab */
  @Input() disabled = false;
  /** Badge count or text displayed on the tab */
  @Input() badge: string | number = '';
  /** Accessibility label for the tab */
  @Input() ariaLabel = '';

  id = ++nextTabId;
  active = false;

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }
}

@Component({
  selector: 'ds-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-tabs" [class]="cn(
      'ds-tabs--' + variant,
      'ds-tabs--' + size
    )" role="tablist" [attr.aria-label]="ariaLabel">
      @for (tab of tabs; track tab.id) {
        <button
          type="button"
          class="ds-tabs__trigger"
          [class]="cn(
            'ds-tabs__trigger',
            tab.value === activeValue && 'ds-tabs__trigger--active',
            tab.disabled && 'ds-tabs__trigger--disabled'
          )"
          role="tab"
          [attr.aria-selected]="tab.value === activeValue"
          [attr.aria-controls]="'ds-tab-panel-' + tab.id"
          [attr.aria-label]="tab.ariaLabel || tab.label"
          [disabled]="tab.disabled"
          (click)="selectTab(tab)"
          (keydown)="onKeydown($event, tab)"
        >
          @if (tab.icon) {
            <i [class]="tab.icon" class="ds-tabs__icon"></i>
          }
          <span class="ds-tabs__label">{{ tab.label }}</span>
          @if (tab.badge !== '' && tab.badge !== undefined && tab.badge !== null) {
            <span class="ds-tabs__badge">{{ tab.badge }}</span>
          }
        </button>
      }
    </div>
    <div class="ds-tabs__panels">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .ds-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--ds-color-semantic-border-light, #e2e8f0); font-family: var(--ds-typography-font-family-sans); }
    .ds-tabs--pills { gap: 0.5rem; border-bottom: none; }
    .ds-tabs--underline { gap: 0; border-bottom: 2px solid var(--ds-color-semantic-border-light, #e2e8f0); }
    .ds-tabs--sm .ds-tabs__trigger { font-size: 0.8125rem; padding: 0.5rem 0.75rem; }
    .ds-tabs--md .ds-tabs__trigger { font-size: 0.875rem; padding: 0.625rem 1rem; }
    .ds-tabs--lg .ds-tabs__trigger { font-size: 1rem; padding: 0.75rem 1.25rem; }
    .ds-tabs__trigger { display: inline-flex; align-items: center; gap: 0.5rem; border: none; background: transparent; cursor: pointer; font-family: inherit; font-weight: 500; color: var(--ds-color-semantic-text-muted, #64748b); white-space: nowrap; position: relative; transition: color 150ms ease; }
    .ds-tabs__trigger:hover { color: var(--ds-color-semantic-text-DEFAULT, #0f172a); }
    .ds-tabs__trigger--active { color: var(--ds-color-semantic-primary-600, #2563eb); font-weight: 600; }
    .ds-tabs__trigger--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
    .ds-tabs--tabs .ds-tabs__trigger--active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: var(--ds-color-semantic-primary-600, #2563eb); }
    .ds-tabs--underline .ds-tabs__trigger--active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: var(--ds-color-semantic-primary-600, #2563eb); }
    .ds-tabs--pills .ds-tabs__trigger { border-radius: var(--ds-color-semantic-border-radius-md, 6px); padding: 0.5rem 1rem; }
    .ds-tabs--pills .ds-tabs__trigger--active { background: var(--ds-color-semantic-primary-50, #eff6ff); color: var(--ds-color-semantic-primary-700, #1d4ed8); }
    .ds-tabs__icon { font-size: 1.1em; }
    .ds-tabs__badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.25rem; height: 1.25rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; line-height: 1; }
    .ds-tabs--pills .ds-tabs__badge { background: var(--ds-color-semantic-surface-200, #e2e8f0); color: var(--ds-color-semantic-text-muted, #64748b); }
    .ds-tabs--pills .ds-tabs__trigger--active .ds-tabs__badge { background: var(--ds-color-semantic-primary-600, #2563eb); color: #fff; }
    .ds-tabs__panels { width: 100%; }
  `]
})
export class DsTabsComponent implements AfterContentInit, OnDestroy {
  /** Currently selected tab value */
  @Input() value: unknown = '';
  /** Visual variant of the tabs */
  @Input() variant: TabsVariant = 'tabs';
  /** Size variant */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** Enable animated tab transitions */
  @Input() animated = false;
  /** Enable lazy loading of tab panels (only render active) */
  @Input() lazy = false;
  /** Accessibility label for the tablist */
  @Input() ariaLabel = '';

  /** Emitted when the active tab changes */
  @Output() valueChange = new EventEmitter<unknown>();

  @ContentChildren(DsTabComponent) tabQuery!: QueryList<DsTabComponent>;

  tabs: DsTabComponent[] = [];
  activeValue: unknown = '';

  private querySubscription: Subscription | null = null;

  cn = cn;

  ngAfterContentInit(): void {
    this.updateTabs(this.tabQuery);
    this.querySubscription = this.tabQuery.changes.subscribe((query: QueryList<DsTabComponent>) => {
      this.updateTabs(query);
    });
  }

  ngOnDestroy(): void {
    this.querySubscription?.unsubscribe();
  }

  private updateTabs(query: QueryList<DsTabComponent>): void {
    this.tabs = query.toArray();
    if (this.tabs.length > 0) {
      const matchingTab = this.value !== '' && this.value !== undefined
        ? this.tabs.find(t => t.value === this.value)
        : undefined;
      this.activateTab(matchingTab || this.tabs[0]);
    }
  }

  selectTab(tab: DsTabComponent): void {
    if (tab.disabled) return;
    this.activateTab(tab);
    this.valueChange.emit(tab.value);
  }

  private activateTab(tab: DsTabComponent): void {
    this.tabs.forEach(t => t.deactivate());
    tab.activate();
    this.activeValue = tab.value;
    this.value = tab.value;
  }

  onKeydown(event: KeyboardEvent, tab: DsTabComponent): void {
    const index = this.tabs.indexOf(tab);
    let nextIndex = -1;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % this.tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
    }
    if (nextIndex >= 0) {
      event.preventDefault();
      const nextTab = this.tabs[nextIndex];
      if (nextTab && !nextTab.disabled) {
        this.selectTab(nextTab);
      }
    }
  }
}
