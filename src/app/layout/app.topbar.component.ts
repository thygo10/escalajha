import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LayoutService } from './service/layout.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout-topbar">
      <div class="layout-topbar-logo-container">
        <button class="p-link layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
          <i class="pi pi-bars"></i>
        </button>
        <a class="layout-topbar-logo" routerLink="/">
          <div class="brand-badge">
            <span class="brand-icon">JHA</span>
            <div class="brand-text">
              <span class="brand-title">EscalaJHA</span>
              <span class="brand-sub">João Henrique Atacadista</span>
            </div>
          </div>
        </a>
      </div>

      <div class="layout-topbar-actions">
        <div class="layout-config-menu">
          <button type="button" class="layout-topbar-action" (click)="layoutService.toggleDarkMode()" [title]="layoutService.isDarkTheme() ? 'Modo Claro' : 'Modo Escuro'">
            <i [class]="layoutService.isDarkTheme() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
          <button type="button" class="layout-topbar-action" (click)="layoutService.showConfigSidebar()" title="Configurações de Tema">
            <i class="pi pi-palette"></i>
          </button>
        </div>

        <button class="p-link layout-topbar-menu-button layout-topbar-action" (click)="toggleTopMenu()">
          <i class="pi pi-ellipsis-v"></i>
        </button>

        <div #topbarmenu class="layout-topbar-menu" [ngClass]="{ 'layout-topbar-menu-mobile-active': topMenuMobileActive }">
          <div class="topbar-user-profile">
            <div class="user-avatar">
              <span>JH</span>
            </div>
            <div class="user-info">
              <span class="user-name">Gestor de Operações</span>
              <span class="user-role">Supermercado JHA</span>
            </div>
          </div>

          <button type="button" class="layout-topbar-action logout-btn" (click)="logout()" title="Sair do Sistema">
            <i class="pi pi-sign-out"></i>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class AppTopbarComponent {
  @ViewChild('topbarmenu') menu!: ElementRef;
  
  layoutService = inject(LayoutService);
  supabase = inject(SupabaseService);
  router = inject(Router);

  topMenuMobileActive = false;

  toggleTopMenu() {
    this.topMenuMobileActive = !this.topMenuMobileActive;
  }

  async logout() {
    try {
      await this.supabase.logout();
    } finally {
      this.router.navigate(['/login']);
    }
  }
}
