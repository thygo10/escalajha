import { Component, ElementRef, ViewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LayoutService } from './service/layout.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
        <div *ngIf="userLojas().length > 0" class="topbar-loja-select mr-3">
          <select
            [ngModel]="activeLoja()?.id"
            (ngModelChange)="onLojaChange($event)"
            class="p-inputtext p-component p-inputtext-sm font-semibold"
            style="border-radius: 8px; font-size: 0.85rem; padding: 0.4rem 0.8rem;"
          >
            <option *ngFor="let l of userLojas()" [value]="l.id">
              {{ l.nome }} ({{ l.codigo }})
            </option>
          </select>
        </div>

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
              <span>{{ userInitials() }}</span>
            </div>
            <div class="user-info">
              <span class="user-name" [title]="currentUser()?.email || 'rhjoaohenriqueatacadista@gmail.com'">
                {{ currentUser()?.email || 'Gestor RH JHA' }}
              </span>
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

  userLojas = this.supabase.userLojas;
  activeLoja = this.supabase.activeLoja;
  currentUser = this.supabase.currentUser;

  userInitials = computed(() => {
    const email = this.currentUser()?.email || 'gestor@empresa.com';
    const clean = email.split('@')[0].toUpperCase();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      return (parts[0][0] + (parts[1]?.[0] || '')).substring(0, 2);
    }
    if (clean.length >= 2) {
      return clean.substring(0, 2);
    }
    return 'RH';
  });

  onLojaChange(lojaId: string) {
    const l = this.userLojas().find(item => item.id === lojaId);
    if (l) {
      this.supabase.setActiveLoja(l);
    }
  }

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
