import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface LayoutConfig {
  preset: string;
  primary: string;
  surface: string | null;
  darkTheme: boolean;
  menuMode: 'static' | 'overlay';
}

export interface LayoutState {
  staticMenuDesktopInactive: boolean;
  overlayMenuActive: boolean;
  profileSidebarVisible: boolean;
  configSidebarVisible: boolean;
  staticMenuMobileActive: boolean;
  menuHoverActive: boolean;
}

interface MenuChangeEvent {
  key: string;
  routeEvent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  layoutConfig = signal<LayoutConfig>({
    preset: 'Aura',
    primary: 'navy',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
  });

  layoutState = signal<LayoutState>({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false
  });

  private configUpdate = new Subject<LayoutConfig>();
  private overlayOpen = new Subject<any>();
  private menuSource = new Subject<MenuChangeEvent>();
  private resetSource = new Subject<void>();

  menuSource$ = this.menuSource.asObservable();
  resetSource$ = this.resetSource.asObservable();
  configUpdate$ = this.configUpdate.asObservable();
  overlayOpen$ = this.overlayOpen.asObservable();

  isDarkTheme = computed(() => this.layoutConfig().darkTheme);

  isSidebarActive = computed(() => 
    this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive
  );

  constructor() {
    effect(() => {
      const config = this.layoutConfig();
      if (config.darkTheme) {
        document.documentElement.classList.add('p-dark');
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('p-dark');
        document.documentElement.classList.remove('dark-mode');
      }
    });
  }

  onMenuToggle() {
    if (this.isOverlay()) {
      this.layoutState.update((prev) => ({
        ...prev,
        overlayMenuActive: !prev.overlayMenuActive
      }));
      if (this.layoutState().overlayMenuActive) {
        this.overlayOpen.next(null);
      }
    }

    if (this.isDesktop()) {
      this.layoutState.update((prev) => ({
        ...prev,
        staticMenuDesktopInactive: !prev.staticMenuDesktopInactive
      }));
    } else {
      this.layoutState.update((prev) => ({
        ...prev,
        staticMenuMobileActive: !prev.staticMenuMobileActive
      }));
    }
  }

  toggleDarkMode() {
    this.layoutConfig.update((prev) => ({
      ...prev,
      darkTheme: !prev.darkTheme
    }));
  }

  showConfigSidebar() {
    this.layoutState.update((prev) => ({
      ...prev,
      configSidebarVisible: true
    }));
  }

  hideConfigSidebar() {
    this.layoutState.update((prev) => ({
      ...prev,
      configSidebarVisible: false
    }));
  }

  isOverlay() {
    return this.layoutConfig().menuMode === 'overlay';
  }

  isDesktop() {
    return window.innerWidth > 991;
  }

  onMenuStateChange(event: MenuChangeEvent) {
    this.menuSource.next(event);
  }

  resetMenu() {
    this.resetSource.next();
  }
}
