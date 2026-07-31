import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  template: `
    <div class="login-wrapper">
      <div class="login-banner">
        <div class="banner-overlay"></div>
        <div class="banner-content">
          <div class="logo-area">
            <span class="logo-badge">JH</span>
            <span class="logo-text">João Henrique</span>
          </div>
          <div class="banner-text">
            <div class="banner-tag">Portal do Gestor 2.0</div>
            <h1>Gestão de Escalas<br/>Inteligente.</h1>
            <p>Otimize a produtividade do seu time com visibilidade total e controle preciso em uma interface desenhada para o futuro.</p>
          </div>
        </div>
      </div>
      <div class="login-form-wrapper">
        <div class="lgpd-badge">
          <i class="pi pi-shield" style="color: var(--ds-color-semantic-text-link); font-size: 1.1rem;"></i>
          <span>LGPD Compliant</span>
        </div>
        <div class="login-card">
          <div class="login-card-header">
            <h2>Acesse sua Conta</h2>
            <p>Insira suas credenciais para continuar</p>
          </div>
          <form (ngSubmit)="handleLogin()">
            <div class="form-field">
              <label for="email">E-mail Corporativo</label>
              <div class="input-wrapper">
                <i class="pi pi-envelope input-icon"></i>
                <input type="email" id="email" [(ngModel)]="email" name="email"
                       pInputText class="premium-input" placeholder="exemplo@jhatacadista.com.br" required />
              </div>
            </div>
            <div class="form-field">
              <div class="label-row">
                <label for="password">Senha</label>
                <a href="#" class="forgot-link">Esqueceu a senha?</a>
              </div>
              <div class="input-wrapper">
                <i class="pi pi-lock input-icon"></i>
                <input type="password" id="password" [(ngModel)]="password" name="password"
                       pInputText class="premium-input" placeholder="••••••••" required />
              </div>
            </div>
            @if (errorMessage()) {
              <div class="error-box">
                <div class="error-icon-wrapper">
                  <i class="pi pi-exclamation-triangle" style="color: var(--ds-color-semantic-danger-600); font-size: 1.1rem;"></i>
                </div>
                <span class="error-text">{{ errorMessage() }}</span>
              </div>
            }
            <button type="submit" [disabled]="loading()" class="premium-btn">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner"></i>
                <span>Autenticando...</span>
              } @else {
                <span>Entrar no Sistema</span>
                <i class="pi pi-arrow-right"></i>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper { display: flex; height: 100vh; width: 100%; overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif; }
    .login-banner { display: none; position: relative; width: 50%; padding: var(--ds-spacing-7); background: linear-gradient(135deg, var(--ds-color-semantic-primary-950) 0%, #061830 100%); justify-content: space-between; flex-direction: column; }
    @media (min-width: 1024px) { .login-banner { display: flex; } }
    .banner-overlay { position: absolute; inset: 0; z-index: 1; background: radial-gradient(circle at 20% 50%, rgba(247,198,0,0.08) 0%, transparent 50%); }
    .banner-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .logo-area { display: flex; align-items: center; gap: var(--ds-spacing-3); }
    .logo-badge { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; font-size: 1.8rem; font-weight: 900; border-radius: var(--ds-border-radius-2xl); background: linear-gradient(135deg, var(--ds-color-primitive-yellow-500) 0%, #e0b300 100%); color: var(--ds-color-semantic-surface-900); box-shadow: var(--ds-shadow-3); }
    .logo-text { color: #ffffff; font-weight: 900; font-size: 1.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.3); letter-spacing: 0.5px; }
    .banner-tag { display: inline-block; padding: var(--ds-spacing-1) var(--ds-spacing-3); border-radius: var(--ds-border-radius-full); background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px); margin-bottom: var(--ds-spacing-4); }
    .banner-tag span { font-size: var(--ds-typography-font-size-sm); font-weight: 700; color: var(--ds-color-primitive-yellow-400); text-transform: uppercase; letter-spacing: 1px; }
    .banner-text { margin-bottom: var(--ds-spacing-6); }
    .banner-text h1 { font-size: 3.8rem; font-weight: 900; margin: 0 0 var(--ds-spacing-4) 0; color: #ffffff; line-height: 1.2; letter-spacing: -1px; text-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .banner-text p { font-size: var(--ds-typography-font-size-xl); color: #e2e8f0; font-weight: 500; max-width: 30rem; line-height: 1.6; }
    .login-form-wrapper { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: var(--ds-spacing-4) var(--ds-spacing-6); background: var(--ds-color-semantic-surface-100); }
    @media (min-width: 1024px) { .login-form-wrapper { width: 50%; } }
    .lgpd-badge { position: absolute; top: 0; right: 0; padding: var(--ds-spacing-5); display: flex; align-items: center; gap: var(--ds-spacing-2); padding: var(--ds-spacing-3) var(--ds-spacing-4); border-radius: var(--ds-border-radius-full); border: 1px solid var(--ds-color-semantic-border-light); background: var(--ds-color-semantic-surface-0); box-shadow: var(--ds-shadow-1); }
    .lgpd-badge span { font-weight: 700; font-size: var(--ds-typography-font-size-xs); color: var(--ds-color-semantic-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .login-card { width: 100%; max-width: 30rem; padding: var(--ds-spacing-7); background: var(--ds-color-semantic-surface-0); border-radius: var(--ds-border-radius-2xl); box-shadow: var(--ds-shadow-4); border: 1px solid rgba(255,255,255,0.8); position: relative; z-index: 10; }
    .login-card-header { text-align: center; margin-bottom: var(--ds-spacing-6); }
    .login-card-header h2 { color: var(--ds-color-semantic-text-primary); font-weight: 900; margin: 0 0 var(--ds-spacing-2) 0; font-size: 2.2rem; letter-spacing: -0.5px; }
    .login-card-header p { color: var(--ds-color-semantic-text-secondary); margin: 0; font-size: var(--ds-typography-font-size-lg); font-weight: 500; }
    .form-field { display: flex; flex-direction: column; gap: var(--ds-spacing-2); margin-bottom: var(--ds-spacing-4); }
    .form-field label { font-weight: 700; font-size: var(--ds-typography-font-size-sm); color: var(--ds-color-semantic-surface-800); margin-left: var(--ds-spacing-1); }
    .label-row { display: flex; justify-content: space-between; align-items: center; margin-left: var(--ds-spacing-1); }
    .forgot-link { font-size: var(--ds-typography-font-size-sm); font-weight: 700; color: var(--ds-color-semantic-text-link); text-decoration: none; }
    .forgot-link:hover { color: var(--ds-color-semantic-text-link-hover); }
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: var(--ds-color-semantic-text-muted); z-index: 2; font-size: 1.2rem; }
    .premium-input { width: 100%; padding-left: 3.2rem !important; height: 3.8rem; border-radius: 14px; font-size: 1.05rem; font-weight: 600; color: var(--ds-color-semantic-text-primary); background: var(--ds-color-semantic-surface-50); border: 1.5px solid var(--ds-color-semantic-border-light); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
    .premium-input::placeholder { color: var(--ds-color-semantic-text-muted); font-weight: 500; }
    .premium-input:hover { background: var(--ds-color-semantic-surface-0); border-color: var(--ds-color-semantic-border-default); }
    .premium-input:focus { background: var(--ds-color-semantic-surface-0); border-color: var(--ds-color-semantic-text-link) !important; box-shadow: 0 0 0 4px rgba(37,99,235,0.15), 0 4px 10px rgba(0,0,0,0.05) !important; }
    .error-box { padding: var(--ds-spacing-3); border-radius: var(--ds-border-radius-xl); display: flex; align-items: center; gap: var(--ds-spacing-3); background: #fff1f2; border: 1px solid #fecdd3; }
    .error-icon-wrapper { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #fee2e2; flex-shrink: 0; }
    .error-text { font-weight: 700; color: var(--ds-color-semantic-danger-700); font-size: var(--ds-typography-font-size-sm); }
    .premium-btn { width: 100%; margin-top: var(--ds-spacing-4); height: 4rem; border: none; border-radius: var(--ds-border-radius-2xl); background: linear-gradient(135deg, var(--ds-color-semantic-primary-950) 0%, var(--ds-color-semantic-primary-800) 100%); box-shadow: 0 4px 15px rgba(11,42,82,0.25), inset 0 1px 0 rgba(255,255,255,0.15); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: var(--ds-spacing-2); color: #ffffff; font-weight: 700; font-size: var(--ds-typography-font-size-lg); font-family: inherit; }
    .premium-btn:hover:not([disabled]) { box-shadow: 0 8px 25px rgba(11,42,82,0.35), inset 0 1px 0 rgba(255,255,255,0.2); background: linear-gradient(135deg, #0f396e 0%, #2563eb 100%); }
    .premium-btn:active:not([disabled]) { box-shadow: 0 2px 10px rgba(11,42,82,0.2); }
    .premium-btn[disabled] { opacity: 0.7; cursor: not-allowed; }
    .premium-btn span { font-weight: 700; }
  `]
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
