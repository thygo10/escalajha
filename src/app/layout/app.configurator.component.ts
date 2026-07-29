import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from './service/layout.service';

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="layout-configurator" [ngClass]="{ 'layout-configurator-active': layoutService.layoutState().configSidebarVisible }">
      <div class="configurator-header">
        <h5>Configurações do Sakai NG</h5>
        <button type="button" class="p-link close-btn" (click)="layoutService.hideConfigSidebar()">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="configurator-content">
        <div class="config-section">
          <h6>Modo do Tema</h6>
          <div class="theme-mode-options">
            <button
              type="button"
              class="theme-opt-btn"
              [ngClass]="{ active: !layoutService.isDarkTheme() }"
              (click)="setDarkTheme(false)"
            >
              <i class="pi pi-sun"></i> Claro
            </button>
            <button
              type="button"
              class="theme-opt-btn"
              [ngClass]="{ active: layoutService.isDarkTheme() }"
              (click)="setDarkTheme(true)"
            >
              <i class="pi pi-moon"></i> Escuro
            </button>
          </div>
        </div>

        <div class="config-section">
          <h6>Paleta Principal (JH Atacadista)</h6>
          <div class="color-options">
            <button
              *ngFor="let color of primaryColors"
              type="button"
              class="color-circle"
              [style.background-color]="color.hex"
              [title]="color.name"
              [ngClass]="{ selected: selectedColor === color.name }"
              (click)="changePrimaryColor(color.name)"
            ></button>
          </div>
        </div>

        <div class="config-section">
          <h6>Modo de Menu Sidebar</h6>
          <div class="menu-mode-options">
            <button
              type="button"
              class="theme-opt-btn"
              [ngClass]="{ active: layoutService.layoutConfig().menuMode === 'static' }"
              (click)="setMenuMode('static')"
            >
              Fixo (Estático)
            </button>
            <button
              type="button"
              class="theme-opt-btn"
              [ngClass]="{ active: layoutService.layoutConfig().menuMode === 'overlay' }"
              (click)="setMenuMode('overlay')"
            >
              Sobreposição (Overlay)
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div
      class="layout-configurator-mask"
      *ngIf="layoutService.layoutState().configSidebarVisible"
      (click)="layoutService.hideConfigSidebar()"
    ></div>
  `
})
export class AppConfiguratorComponent {
  layoutService = inject(LayoutService);

  selectedColor = 'navy';

  primaryColors = [
    { name: 'navy', hex: '#0b2a52' },
    { name: 'amber', hex: '#f59e0b' },
    { name: 'emerald', hex: '#10b981' },
    { name: 'indigo', hex: '#6366f1' },
    { name: 'teal', hex: '#14b8a6' },
    { name: 'rose', hex: '#f43f5e' }
  ];

  setDarkTheme(value: boolean) {
    this.layoutService.layoutConfig.update((prev) => ({
      ...prev,
      darkTheme: value
    }));
  }

  changePrimaryColor(colorName: string) {
    this.selectedColor = colorName;
    this.layoutService.layoutConfig.update((prev) => ({
      ...prev,
      primary: colorName
    }));
  }

  setMenuMode(mode: 'static' | 'overlay') {
    this.layoutService.layoutConfig.update((prev) => ({
      ...prev,
      menuMode: mode
    }));
  }
}
