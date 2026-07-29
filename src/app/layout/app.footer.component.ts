import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="layout-footer">
      <span class="footer-text">
        <strong>EscalaJHA</strong> &copy; 2026 - João Henrique Atacadista | Sistema de Escalas Inteligentes CSP
      </span>
      <span class="footer-version">v2.0.0 Enterprise</span>
    </div>
  `
})
export class AppFooterComponent {}
