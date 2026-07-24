import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">JH</div>
          <h2>Portal de Escalas 2.0</h2>
          <p>João Henrique Atacadista - Acesso Gestão RH</p>
        </div>

        <form (ngSubmit)="handleLogin()" class="login-form">
          <div class="form-group">
            <label for="email">E-mail Corporativo</label>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              class="form-control"
              placeholder="Digite seu e-mail corporativo..."
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Senha de Acesso</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              class="form-control"
              placeholder="••••••••"
              required
            />
          </div>

          @if (errorMessage()) {
            <div class="error-alert">
              {{ errorMessage() }}
            </div>
          }

          <button type="submit" class="btn btn-yellow w-full" [disabled]="loading()" style="background: #f7c600; color: #0b2a52; font-weight: 800; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
            @if (loading()) {
              <span>Entrando...</span>
            } @else {
              <span>Entrar no Sistema</span>
            }
          </button>
        </form>

        <div class="login-footer">
          <span class="badge-lgpd">
            🔒 LGPD Compliance Active
          </span>
          <p class="terms-note">
            Acesso restrito a gestores autorizados. Conforme a LGPD (Lei 13.709/2018), os dados pessoais exibidos possuem minimização prévia e controle estrito de auditoria por perfil.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 20px;
    }
    .login-card {
      background: #ffffff;
      width: 100%;
      max-width: 420px;
      padding: 40px 32px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo {
      width: 56px;
      height: 56px;
      background: #0b2a52;
      color: #f7c600;
      font-size: 24px;
      font-weight: 900;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 4px 12px rgba(11, 42, 82, 0.2);
    }
    .login-header h2 {
      font-size: 1.5rem;
      color: #0b2a52;
      font-weight: 800;
    }
    .login-header p {
      color: #64748b;
      font-size: 0.88rem;
      margin-top: 4px;
    }
    .w-full {
      width: 100%;
      justify-content: center;
      padding: 12px;
      margin-top: 8px;
    }
    .error-alert {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      padding: 10px;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-bottom: 16px;
      text-align: center;
    }
    .login-footer {
      margin-top: 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
    }
    .terms-note {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 10px;
      line-height: 1.4;
    }
  `]
})
export class LoginComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

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
