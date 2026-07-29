import { Component, HostBinding, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LayoutService } from './service/layout.service';

export interface MenuItem {
  label?: string;
  icon?: string;
  routerLink?: any[];
  queryParams?: { [key: string]: any };
  url?: string[];
  target?: string;
  items?: MenuItem[];
  badge?: string;
  badgeClass?: string;
  visible?: boolean;
  disabled?: boolean;
  separator?: boolean;
  key?: string;
  command?: (event?: any) => void;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[app-menuitem]',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <ng-container>
      <div *ngIf="root && item.visible !== false" class="layout-menuitem-root-text">{{ item.label }}</div>
      
      <a
        *ngIf="(!item.routerLink || item.items) && !root && item.visible !== false"
        [attr.href]="item.url"
        (click)="itemClick($event)"
        [ngClass]="item.badgeClass"
        [attr.target]="item.target"
        tabindex="0"
      >
        <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
        <span class="layout-menuitem-text">{{ item.label }}</span>
        <i class="pi pi-fw pi-chevron-down layout-submenu-toggler" *ngIf="item.items"></i>
        <span class="p-badge p-badge-info" *ngIf="item.badge">{{ item.badge }}</span>
      </a>

      <a
        *ngIf="item.routerLink && !item.items && item.visible !== false"
        (click)="itemClick($event)"
        [ngClass]="item.badgeClass"
        [routerLink]="item.routerLink"
        [queryParams]="item.queryParams"
        routerLinkActive="active-route"
        [routerLinkActiveOptions]="{ paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }"
        [attr.target]="item.target"
        tabindex="0"
      >
        <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
        <span class="layout-menuitem-text">{{ item.label }}</span>
        <span class="p-badge p-badge-info" *ngIf="item.badge">{{ item.badge }}</span>
      </a>

      <ul *ngIf="item.items && item.visible !== false" [@children]="root ? 'expanded' : submenuState">
        <ng-template ngFor let-child let-i="index" [ngForOf]="item.items">
          <li app-menuitem [item]="child" [index]="i" [parentKey]="key" [class]="child.badgeClass"></li>
        </ng-template>
      </ul>
    </ng-container>
  `,
  animations: [
    trigger('children', [
      state('collapsed', style({
        height: '0',
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*'
      })),
      transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
    ])
  ]
})
export class AppMenuItemComponent implements OnInit, OnDestroy {
  @Input() item!: MenuItem;
  @Input() index!: number;
  @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;
  @Input() parentKey!: string;

  layoutService = inject(LayoutService);
  router = inject(Router);

  active = false;
  menuResetSubscription!: Subscription;
  menuChangeSubscription!: Subscription;
  key: string = '';

  get submenuState() {
    return this.root || this.active ? 'expanded' : 'collapsed';
  }

  @HostBinding('class.active-menuitem')
  get activeClass() {
    return this.active;
  }

  ngOnInit() {
    this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);

    this.menuChangeSubscription = this.layoutService.menuSource$.subscribe((value) => {
      if (value.key !== this.key && !value.key.startsWith(this.key + '-')) {
        this.active = false;
      }
    });

    this.menuResetSubscription = this.layoutService.resetSource$.subscribe(() => {
      this.active = false;
    });

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (this.item.routerLink) {
        this.updateActiveStateFromRoute();
      }
    });

    if (this.item.routerLink) {
      this.updateActiveStateFromRoute();
    }
  }

  updateActiveStateFromRoute() {
    if (!this.item.routerLink?.[0]) return;

    const activeRoute = this.router.isActive(this.item.routerLink[0], {
      paths: 'exact',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: 'ignored'
    });

    if (activeRoute) {
      this.layoutService.onMenuStateChange({ key: this.key, routeEvent: true });
    }
  }

  itemClick(event: Event) {
    if (this.item.disabled) {
      event.preventDefault();
      return;
    }

    if (this.item.command) {
      this.item.command({ originalEvent: event, item: this.item });
    }

    if (this.item.items) {
      this.active = !this.active;
    } else {
      this.active = true;
    }

    this.layoutService.onMenuStateChange({ key: this.key });
  }

  ngOnDestroy() {
    if (this.menuChangeSubscription) {
      this.menuChangeSubscription.unsubscribe();
    }
    if (this.menuResetSubscription) {
      this.menuResetSubscription.unsubscribe();
    }
  }
}
