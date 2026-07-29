import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  template: `
    <div class="sakai-login-body flex align-center justify-center min-h-screen p-4" style="background: var(--surface-ground, #f8fafc);">
      <div class="card p-5 shadow-2 border-round-xl w-full max-w-26rem" style="background: var(--surface-card, #ffffff);">
        <div class="text-center mb-5">
          <div class="brand-badge-icon mx-auto mb-3" style="width: 48px; height: 48px; font-size: 1.25rem; font-weight: 800; background: #0b2a52; color: #f7c600; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            JH
          </div>
          <div class="text-900 text-2xl font-bold mb-1" style="color: #0b2a52;">Portal de Escalas 2.0</div>
          <span class="text-600 text-sm">João Henrique Atacadista - Acesso Gestão RH</span>
        </div>

        <form (ngSubmit)="handleLogin()" class="flex flex-column gap-3">
          <div>
            <label for="email" class="block text-900 font-medium text-xs mb-2" style="color: var(--text-color, #0f172a);">E-mail Corporativo</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-envelope"></i>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                class="p-inputtext p-component w-full"
                placeholder="Digite seu e-mail corporativo..."
                required
                style="padding-left: 2.5rem; border-radius: 8px;"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-900 font-medium text-xs mb-2" style="color: var(--text-color, #0f172a);">Senha de Acesso</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-lock"></i>
              <input
                type="password"
                id="password"
                [(ngModel)]="password"
                name="password"
                class="p-inputtext p-component w-full"
                placeholder="••••••••"
                required
                style="padding-left: 2.5rem; border-radius: 8px;"
              />
            </div>
          </div>

          @if (errorMessage()) {
            <div class="p-3 border-round text-sm" style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;">
              {{ errorMessage() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="p-button p-button-primary w-full font-bold mt-2"
            style="background: #0b2a52; border-color: #0b2a52; padding: 0.75rem; border-radius: 8px;"
          >
            @if (loading()) {
              <span>Entrando no Sistema...</span>
            } @else {
              <span>Entrar no Sistema</span>
            }
          </button>
        </form>

        <div class="text-center mt-5 pt-4 border-top-1 border-200">
          <div class="inline-flex align-items-center gap-2 text-xs font-semibold" style="color: #0284c7;">
            <i class="pi pi-shield"></i>
            <span>LGPD Compliance Active</span>
          </div>
          <p class="text-xs text-500 mt-2 m-0" style="color: #94a3b8; font-size: 0.72rem; line-height: 1.4;">
            Acesso restrito a gestores autorizados. Conforme a LGPD (Lei 13.709/2018), os dados pessoais exibidos possuem minimização prévia e controle estrito de auditoria.
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  async handleLogin() {
    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      await this.supabase.loginWithEmail(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      this.loading.set(false);
    }
  }
}
