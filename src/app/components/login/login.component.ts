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
    <div class="flex h-screen w-full overflow-hidden" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      
      <!-- Lado Esquerdo: Banner Corporativo Premium -->
      <div class="hidden lg:flex flex-column justify-content-between w-6 relative p-7" 
           style="background: url('assets/images/login-bg.png') center/cover no-repeat;">
        
        <!-- Gradiente Overlay (Mais transparente para ver a imagem, mas escuro o suficiente para o texto) -->
        <div class="absolute top-0 left-0 w-full h-full" 
             style="background: linear-gradient(135deg, rgba(11,42,82,0.85) 0%, rgba(6,24,48,0.95) 100%); z-index: 1;"></div>
        
        <!-- Decorador geométrico de fundo -->
        <div class="absolute w-full h-full top-0 left-0" style="z-index: 1; background: radial-gradient(circle at 20% 50%, rgba(247, 198, 0, 0.08) 0%, transparent 50%);"></div>
        
        <!-- Logo Topo Esquerda -->
        <div class="relative z-2 flex align-items-center gap-3 fadein animation-duration-1000">
           <div class="flex align-items-center justify-content-center text-900 font-extrabold border-round-2xl shadow-6" 
                style="width: 56px; height: 56px; font-size: 1.8rem; background: linear-gradient(135deg, #f7c600 0%, #e0b300 100%);">JH</div>
           <span class="text-white font-extrabold text-2xl tracking-wide" style="text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
              João Henrique
           </span>
        </div>

        <!-- Texto Motivacional Rodapé Esquerda -->
        <div class="relative z-2 text-white mb-6 fadeinup animation-duration-1000 animation-delay-300">
           <div class="mb-4 inline-block px-3 py-1 border-round-3xl" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px);">
              <span class="text-sm font-bold text-yellow-400 tracking-wider text-uppercase">Portal do Gestor 2.0</span>
           </div>
           <h1 class="font-extrabold mb-4 line-height-2" style="font-size: 3.8rem; letter-spacing: -1px; text-shadow: 0 4px 20px rgba(0,0,0,0.4);">
              Gestão de Escalas<br/>Inteligente.
           </h1>
           <p class="text-xl opacity-90 max-w-30rem line-height-3" style="color: #e2e8f0; font-weight: 500;">
              Otimize a produtividade do seu time com visibilidade total e controle preciso em uma interface desenhada para o futuro.
           </p>
        </div>
      </div>

      <!-- Lado Direito: Formulário de Login (Fundo Cinza Claro) -->
      <div class="w-full lg:w-6 flex flex-column align-items-center justify-content-center relative px-4 sm:px-6" 
           style="background: #f1f5f9;">
        
        <!-- Badge LGPD Premium -->
        <div class="absolute top-0 right-0 p-5 fadeindown animation-duration-1000">
          <div class="flex align-items-center gap-2 px-4 py-2 border-round-3xl shadow-1 hover:shadow-3 transition-all transition-duration-300 cursor-default bg-white" 
               style="border: 1px solid #e2e8f0;">
            <i class="pi pi-shield text-blue-600 text-lg"></i>
            <span class="font-bold text-xs text-700 tracking-wide text-uppercase">LGPD Compliant</span>
          </div>
        </div>

        <!-- Card do Formulário (Elevado e Limpo) -->
        <div class="w-full max-w-30rem p-5 sm:p-7 bg-white border-round-3xl shadow-6 fadeinup animation-duration-1000" 
             style="border: 1px solid rgba(255,255,255,0.8); position: relative; z-index: 10;">
          
          <div class="text-center mb-6">
            <h2 class="text-900 font-extrabold mb-2" style="font-size: 2.2rem; color: #0f172a; letter-spacing: -0.5px;">Acesse sua Conta</h2>
            <p class="text-500 text-lg m-0 font-medium">Insira suas credenciais para continuar</p>
          </div>

          <form (ngSubmit)="handleLogin()" class="flex flex-column gap-4">
            
            <!-- Input Email -->
            <div class="flex flex-column gap-2">
              <label for="email" class="text-800 font-bold text-sm ml-1">E-mail Corporativo</label>
              <div class="relative">
                <i class="pi pi-envelope absolute text-500 z-2" style="left: 1.2rem; top: 50%; transform: translateY(-50%); font-size: 1.2rem;"></i>
                <input type="email" id="email" [(ngModel)]="email" name="email"
                       class="p-inputtext p-component w-full premium-input" 
                       placeholder="exemplo@jhatacadista.com.br" required />
              </div>
            </div>

            <!-- Input Senha -->
            <div class="flex flex-column gap-2 mt-2">
              <div class="flex justify-content-between align-items-center ml-1">
                 <label for="password" class="text-800 font-bold text-sm">Senha</label>
                 <a href="#" class="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors no-underline">Esqueceu a senha?</a>
              </div>
              <div class="relative">
                <i class="pi pi-lock absolute text-500 z-2" style="left: 1.2rem; top: 50%; transform: translateY(-50%); font-size: 1.2rem;"></i>
                <input type="password" id="password" [(ngModel)]="password" name="password"
                       class="p-inputtext p-component w-full premium-input" 
                       placeholder="••••••••" required />
              </div>
            </div>

            <!-- Mensagem de Erro -->
            @if (errorMessage()) {
              <div class="p-3 border-round-xl text-sm flex align-items-center gap-3 mt-3 shadow-1 animation-fadein" 
                   style="background: #fff1f2; border: 1px solid #fecdd3;">
                <div class="flex align-items-center justify-content-center bg-red-100 border-round-circle" style="width: 32px; height: 32px;">
                   <i class="pi pi-exclamation-triangle text-red-600 text-lg"></i>
                </div>
                <span class="font-bold text-red-700">{{ errorMessage() }}</span>
              </div>
            }

            <!-- Botão de Login Premium -->
            <button type="submit" [disabled]="loading()" 
                    class="premium-btn w-full mt-4 flex align-items-center justify-content-center gap-2 border-round-2xl">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner text-xl text-white"></i>
                <span class="font-bold text-lg text-white">Autenticando...</span>
              } @else {
                <span class="font-bold text-lg text-white tracking-wide">Entrar no Sistema</span>
                <i class="pi pi-arrow-right text-white"></i>
              }
            </button>

          </form>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Inputs Premium */
    .premium-input {
      padding-left: 3.2rem !important;
      height: 3.8rem;
      border-radius: 14px;
      font-size: 1.05rem;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }

    .premium-input::placeholder {
      color: #94a3b8;
      font-weight: 500;
    }

    .premium-input:hover {
      background: #ffffff;
      border-color: #cbd5e1;
    }

    .premium-input:focus {
      background: #ffffff;
      border-color: #2563eb !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15), 0 4px 10px rgba(0,0,0,0.05) !important;
      transform: translateY(-1px);
    }

    /* Botão Premium */
    .premium-btn {
      height: 4rem;
      border: none;
      background: linear-gradient(135deg, #0b2a52 0%, #1e40af 100%);
      box-shadow: 0 4px 15px rgba(11, 42, 82, 0.25), inset 0 1px 0 rgba(255,255,255,0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .premium-btn:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(11, 42, 82, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);
      background: linear-gradient(135deg, #0f396e 0%, #2563eb 100%);
    }

    .premium-btn:active:not([disabled]) {
      transform: translateY(1px);
      box-shadow: 0 2px 10px rgba(11, 42, 82, 0.2);
    }

    .premium-btn[disabled] {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    /* Animação Extra */
    @keyframes fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animation-fadein {
      animation: fadein 0.4s ease-out forwards;
    }
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

