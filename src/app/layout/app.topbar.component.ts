import { Component, ElementRef, ViewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LayoutService } from './service/layout.service';
import { SupabaseService } from '../services/supabase.service';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SelectModule, ButtonModule, PopoverModule],

  template: `
    <div class="layout-topbar">
      <div class="layout-topbar-logo-container">
        <button pButton type="button" class="p-button-text p-button-secondary p-button-rounded layout-topbar-action" (click)="layoutService.onMenuToggle()" title="Alternar Menu">
          <i class="pi pi-bars" style="font-size: 1.25rem;"></i>
        </button>
        <a class="layout-topbar-logo" routerLink="/">
          <div class="brand-badge-box">
            <span class="brand-badge-icon">JH</span>
            <div class="brand-badge-text">
              <span class="brand-title">EscalaJHA</span>
              <span class="brand-sub">João Henrique Atacadista</span>
            </div>
          </div>
        </a>
      </div>

      <div class="layout-topbar-actions">
        <div #topbarmenu class="layout-topbar-menu" [ngClass]="{ 'layout-topbar-menu-mobile-active': topMenuMobileActive }">
          <div class="relative">
            <button
              type="button"
              class="topbar-user-profile cursor-pointer border-none bg-transparent flex align-items-center gap-2 p-1 border-round hover:bg-100"
              (click)="profilePopover.toggle($event)"
              style="color: inherit; font-family: inherit;"
            >
              <div class="user-avatar">
                <span>{{ userInitials() }}</span>
              </div>
              <div class="user-info text-left hidden md:flex flex-column">
                <span class="user-name font-semibold text-sm text-color">{{ currentUser()?.email?.split('@')?.[0] || 'Gestor RH' }}</span>
                <span class="user-role text-xs text-muted-color">Supermercado JHA</span>
              </div>
            </button>

            <!-- Popover Menu NATIVO PrimeNG -->
            <p-popover #profilePopover>
              <div class="flex flex-column gap-3 w-16rem p-2">
                <div class="flex align-items-center gap-3 pb-3 border-bottom-1 border-100">
                  <div class="user-avatar" style="width: 2.5rem; height: 2.5rem;">
                    <span>{{ userInitials() }}</span>
                  </div>
                  <div class="flex flex-column text-left">
                    <span class="font-bold text-sm text-color">{{ currentUser()?.email?.split('@')?.[0] || 'Gestor RH' }}</span>
                    <span class="text-xs text-muted-color" style="word-break: break-all;">{{ currentUser()?.email || 'rhjoaohenriqueatacadista@gmail.com' }}</span>
                  </div>
                </div>

                <div class="flex flex-column gap-1 text-left">
                  <span class="text-xs font-bold text-muted-color px-2 mb-1">LOJA ATIVA</span>
                  @if (userLojas().length > 0) {
                    <p-select
                      [options]="userLojas()"
                      [ngModel]="activeLoja()?.id"
                      (ngModelChange)="onLojaChange($event)"
                      optionLabel="nome"
                      optionValue="id"
                      styleClass="w-full"
                    >
                      <ng-template pTemplate="selectedItem" let-selectedOption>
                        <span class="font-semibold text-sm">{{ selectedOption.nome }} ({{ selectedOption.codigo }})</span>
                      </ng-template>
                      <ng-template pTemplate="item" let-option>
                        <span class="text-sm">{{ option.nome }} ({{ option.codigo }})</span>
                      </ng-template>
                    </p-select>
                  } @else {
                    <div class="flex align-items-center gap-2 p-2 border-round bg-50 border">
                      <i class="pi pi-building text-primary"></i>
                      <div class="flex flex-column">
                        <span class="text-xs font-semibold text-color">{{ activeLoja()?.nome || 'Loja Principal' }}</span>
                        <span class="text-muted-color" style="font-size: 10px;">Cód: {{ activeLoja()?.codigo || '002' }}</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="flex flex-column gap-2 pt-2 border-top-1 border-100">
                  <button pButton type="button" [icon]="layoutService.isDarkTheme() ? 'pi pi-sun' : 'pi pi-moon'" [label]="layoutService.isDarkTheme() ? 'Modo Claro' : 'Modo Escuro'" class="p-button-text p-button-secondary p-button-sm w-full text-left justify-content-start" (click)="layoutService.toggleDarkMode(); profilePopover.hide();"></button>
                  <button pButton type="button" icon="pi pi-palette" label="Aparência" class="p-button-text p-button-secondary p-button-sm w-full text-left justify-content-start" (click)="layoutService.showConfigSidebar(); profilePopover.hide();"></button>
                  <button pButton type="button" icon="pi pi-sign-out" label="Sair do Sistema" class="p-button-text p-button-danger p-button-sm w-full text-left justify-content-start" (click)="logout(); profilePopover.hide();"></button>
                </div>
              </div>
            </p-popover>
          </div>
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
