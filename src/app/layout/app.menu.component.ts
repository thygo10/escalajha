import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMenuItemComponent, MenuItem } from './app.menuitem.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuItemComponent],
  template: `
    <ul class="layout-menu">
      <ng-container *ngFor="let item of model; let i = index">
        <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
        <li *ngIf="item.separator" class="menu-separator"></li>
      </ng-container>
    </ul>
  `
})
export class AppMenuComponent implements OnInit {
  model: MenuItem[] = [];

  ngOnInit() {
    this.model = [
      {
        label: 'VISÃO GERAL',
        items: [
          { label: 'Painel Geral', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'], queryParams: { tab: 'dashboard' } }
        ]
      },
      {
        label: 'GESTÃO DE ESCALAS',
        items: [
          { label: 'Gerador de Escalas', icon: 'pi pi-fw pi-calendar', routerLink: ['/dashboard'], queryParams: { tab: 'escala' } },
          { label: 'Auditoria', icon: 'pi pi-fw pi-shield', routerLink: ['/dashboard'], queryParams: { tab: 'regras' } }
        ]
      },
      {
        label: 'CADASTROS',
        items: [
          { label: 'Setores & Turnos', icon: 'pi pi-fw pi-building', routerLink: ['/dashboard'], queryParams: { tab: 'setores' } },
          { label: 'Colaboradores', icon: 'pi pi-fw pi-users', routerLink: ['/dashboard'], queryParams: { tab: 'funcionarios' } },
          { label: 'Gestão de Feriados', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/dashboard'], queryParams: { tab: 'feriados' } }
        ]
      },
      {
        label: 'REGRAS',
        items: [
          { label: 'Trabalhistas', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/dashboard'], queryParams: { tab: 'regras' } }
        ]
      }
    ];
  }
}
