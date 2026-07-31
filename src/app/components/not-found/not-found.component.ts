import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="not-found-wrapper">
      <div class="not-found-code">404</div>
      <h1>Página não encontrada</h1>
      <p>Esta rota não existe no sistema.</p>
      <a routerLink="/dashboard" class="not-found-btn">Voltar ao Dashboard</a>
    </div>
  `,
  styles: [`
    .not-found-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: var(--ds-spacing-4); background: var(--ds-color-semantic-surface-50); font-family: 'Plus Jakarta Sans', sans-serif; }
    .not-found-code { font-size: 5rem; font-weight: 900; color: var(--ds-color-semantic-primary-950); line-height: 1; }
    h1 { font-size: var(--ds-typography-font-size-xl); color: var(--ds-color-semantic-surface-800); font-weight: 700; margin: 0; }
    p { color: var(--ds-color-semantic-text-secondary); font-size: 0.9rem; margin: 0; }
    .not-found-btn { display: inline-flex; align-items: center; gap: var(--ds-spacing-2); background: var(--ds-color-semantic-primary-950); color: var(--ds-color-primitive-yellow-500); padding: var(--ds-spacing-3) var(--ds-spacing-6); border-radius: var(--ds-border-radius-default); font-weight: 800; text-decoration: none; margin-top: var(--ds-spacing-2); transition: all 0.2s ease; }
    .not-found-btn:hover { background: var(--ds-color-semantic-primary-900); box-shadow: var(--ds-shadow-2); }
  `]
})
export class NotFoundComponent {}
