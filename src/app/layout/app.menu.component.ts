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
          { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }
        ]
      },
      {
        label: 'GESTÃO DE ESCALAS',
        items: [
          { label: 'Gerador & Escalas', icon: 'pi pi-fw pi-calendar', routerLink: ['/dashboard'] },
          { label: 'Auditoria CLT', icon: 'pi pi-fw pi-shield', routerLink: ['/dashboard'] },
          { label: 'Trocas & Folgas', icon: 'pi pi-fw pi-sync', routerLink: ['/dashboard'] }
        ]
      },
      {
        label: 'CADASTROS & OPERAÇÃO',
        items: [
          { label: 'Setores & Turnos', icon: 'pi pi-fw pi-building', routerLink: ['/dashboard'] },
          { label: 'Colaboradores', icon: 'pi pi-fw pi-users', routerLink: ['/dashboard'] }
        ]
      },
      {
        label: 'GOVERNANÇA & SISTEMA',
        items: [
          { label: 'Regras Trabalhistas', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/dashboard'] },
          { label: 'Logs de Auditoria', icon: 'pi pi-fw pi-list', routerLink: ['/dashboard'] }
        ]
      }
    ];
  }
}
