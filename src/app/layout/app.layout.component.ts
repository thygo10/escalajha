import { Component, Renderer2, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from './service/layout.service';
import { AppTopbarComponent } from './app.topbar.component';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppFooterComponent } from './app.footer.component';
import { AppConfiguratorComponent } from './app.configurator.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AppTopbarComponent,
    AppSidebarComponent,
    AppFooterComponent,
    AppConfiguratorComponent
  ],
  template: `
    <div class="layout-wrapper" [ngClass]="containerClass">
      <app-topbar></app-topbar>
      <app-sidebar></app-sidebar>
      <div class="layout-main-container">
        <div class="layout-main">
          <router-outlet></router-outlet>
        </div>
        <app-footer></app-footer>
      </div>
      <app-configurator></app-configurator>
      <div class="layout-mask" (click)="hideMenu()"></div>
    </div>
  `
})
export class AppLayoutComponent {
  layoutService = inject(LayoutService);
  renderer = inject(Renderer2);
  router = inject(Router);

  @ViewChild(AppSidebarComponent) appSidebar!: AppSidebarComponent;
  @ViewChild(AppTopbarComponent) appTopbar!: AppTopbarComponent;

  get containerClass() {
    return {
      'layout-theme-light': !this.layoutService.layoutConfig().darkTheme,
      'layout-theme-dark': this.layoutService.layoutConfig().darkTheme,
      'layout-overlay': this.layoutService.layoutConfig().menuMode === 'overlay',
      'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
      'layout-static-inactive': this.layoutService.layoutState().staticMenuDesktopInactive && this.layoutService.layoutConfig().menuMode === 'static',
      'layout-overlay-active': this.layoutService.layoutState().overlayMenuActive,
      'layout-mobile-active': this.layoutService.layoutState().staticMenuMobileActive
    };
  }

  hideMenu() {
    this.layoutService.layoutState.update((prev) => ({
      ...prev,
      overlayMenuActive: false,
      staticMenuMobileActive: false,
      menuHoverActive: false
    }));
  }
}
