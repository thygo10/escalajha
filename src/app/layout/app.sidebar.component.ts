import { Component, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMenuComponent } from './app.menu.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppMenuComponent],
  template: `
    <div class="layout-sidebar">
      <app-menu></app-menu>
    </div>
  `
})
export class AppSidebarComponent {
  constructor(public el: ElementRef) {}
}
