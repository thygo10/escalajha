import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                flex-direction:column;gap:16px;background:#f8fafc;font-family:inherit;">
      <div style="font-size:5rem;font-weight:900;color:#0b2a52;line-height:1;">404</div>
      <h1 style="font-size:1.25rem;color:#334155;font-weight:700;margin:0;">Página não encontrada</h1>
      <p style="color:#64748b;font-size:0.9rem;margin:0;">Esta rota não existe no sistema.</p>
      <a href="/dashboard"
        style="background:#0b2a52;color:#f7c600;padding:10px 24px;border-radius:8px;
               font-weight:800;text-decoration:none;margin-top:8px;">
        ← Voltar ao Dashboard
      </a>
    </div>
  `
})
export class NotFoundComponent {}
