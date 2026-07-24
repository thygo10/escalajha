import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { EscalaGeneratorService } from '../../services/escala-generator.service';
import { ToastService } from '../../services/toast.service';
import { Funcionario, Escala, EscalaItem, Setor, Cargo, Feriado, RegraEscala, DiaHistoricoTrabalho } from '../../models/types';

interface ConfirmModalData {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => Promise<void> | void;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="system-layout">

      <!-- Overlay para Fechar Sidebar no Mobile ao Clicar Fora -->
      <div
        class="sidebar-overlay"
        [class.active]="isMobileMenuOpen()"
        (click)="isMobileMenuOpen.set(false)"
      ></div>

      <!-- ============================================================================== -->
      <!-- BARRA LATERAL (SIDEBAR ENTERPRISE 100% BRANCA) -->
      <!-- ============================================================================== -->
      <aside class="sidebar no-print" [class.mobile-open]="isMobileMenuOpen()">
        <div>
          <!-- Marca / Logo Oficial -->
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="brand-badge">JH</div>
              <div class="brand-text">
                <h2>João Henrique</h2>
                <span>Atacadista 2.0</span>
              </div>
            </div>
          </div>

          <!-- Seletor de Loja (Multi-Tenant) -->
          @if (userLojas().length > 0) {
            <div style="margin-bottom: 20px; padding: 0 4px; margin-top: 16px;">
              <label style="font-size: 0.68rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
                Unidade / Loja
              </label>
              <select
                [ngModel]="activeLoja()?.id"
                (ngModelChange)="onLojaChange($event)"
                class="form-control"
                style="background: #ffffff !important; color: #0b2a52 !important; font-weight: 800; border-radius: 8px; border-color: #cbd5e1 !important;"
              >
                @for (l of userLojas(); track l.id) {
                  <option [value]="l.id">{{ l.nome }} ({{ l.codigo }})</option>
                }
              </select>
            </div>
          }

          <!-- Menu de Navegação Enterprise com Setas > -->
          <nav class="sidebar-menu">
            <div class="sidebar-label">Módulos de Gestão</div>

            <button
              (click)="selectTab('dashboard')"
              [class.active]="activeTab() === 'dashboard'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>📊</span>
                <span>Visão Geral</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            <button
              (click)="selectTab('escala')"
              [class.active]="activeTab() === 'escala'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>📅</span>
                <span>Escala do Mês</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            <button
              (click)="selectTab('funcionarios')"
              [class.active]="activeTab() === 'funcionarios'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>👥</span>
                <span>Colaboradores</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            <button
              (click)="selectTab('setores')"
              [class.active]="activeTab() === 'setores'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>📁</span>
                <span>Setores & Cargos</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            <button
              (click)="selectTab('feriados')"
              [class.active]="activeTab() === 'feriados'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>🎉</span>
                <span>Gestão de Feriados</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            <button
              (click)="selectTab('regras')"
              [class.active]="activeTab() === 'regras'"
              class="nav-link-btn"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>📜</span>
                <span>Regras de Escala</span>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
            </button>

            @if (selectedFuncionarioForPage()) {
              <button
                (click)="selectTab('detalhes-funcionario')"
                [class.active]="activeTab() === 'detalhes-funcionario'"
                class="nav-link-btn"
              >
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span>📱</span>
                  <span>Perfil de {{ selectedFuncionarioForPage()?.primeiro_nome }}</span>
                </div>
                <span style="font-size: 0.8rem; color: #94a3b8;">❯</span>
              </button>
            }
          </nav>
        </div>

        <!-- Rodapé do Usuário Logado -->
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">RH</div>
            <div class="user-info">
              <div class="user-name" [title]="currentUser()?.email || 'rh.matriz@joaohenrique.com.br'">
                {{ currentUser()?.email || 'rh.matriz@joaohenrique.com.br' }}
              </div>
              <div class="user-role">Gestão de RH & Escalas</div>
            </div>
            <button (click)="handleLogout()" title="Encerrar Sessão" class="icon-btn-sm danger" style="padding: 6px; color: #ef4444; flex-shrink: 0;">
              🚪
            </button>
          </div>
        </div>
      </aside>

      <!-- ============================================================================== -->
      <!-- CONTEÚDO PRINCIPAL (MAIN WRAPPER & TOPBAR ENTERPRISE) -->
      <!-- ============================================================================== -->
      <div class="main-wrapper">

        <!-- Topbar Superior de Utilidades (Padrão RP Info) -->
        <header class="topbar no-print">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button (click)="toggleMobileMenu()" class="mobile-menu-btn" title="Abrir Menu">
              ☰
            </button>

            <!-- Loja Ativa Tag -->
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 800; color: #0b2a52;">
              🏬 {{ activeLoja()?.nome || 'Matriz - Centro' }}
            </div>
          </div>

          <!-- Barra de Utilidades da Direita (Baixar App, Modo Escuro, Notificações, Perfil Avatar) -->
          <div class="topbar-actions" style="display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 4px; cursor: pointer;">
              Baixar App 📱
            </span>

            <button title="Alternar Modo Escuro" style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">
              🌙
            </button>

            <button title="Notificações do Sistema" style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b; position: relative;">
              🔔
              <span style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
            </button>

            <!-- User Avatar Circle TF / RH -->
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #10b981; color: #ffffff; font-weight: 900; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
              RH
            </div>

            <!-- Botão de Opções de Impressão A4 -->
            <button (click)="openPrintOptionsModal()" class="btn-premium btn-yellow-gradient">
              🖨️ <span class="no-mobile-text">Imprimir (A4)</span>
            </button>
          </div>
        </header>

        <!-- Conteúdo Interno da Página -->
        <main style="padding: 24px 20px; width: 100%; max-width: 1440px; margin: 0 auto;">

          <!-- BANNER HERO DINÂMICO POR MÓDULO (PADRÃO RP INFO) -->
          @if (activeTab() === 'dashboard') {
            <div class="hero-banner banner-navy no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Visão Geral & Painel Executivo
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">📊</div>
                  <div class="hero-text">
                    <h2>Visão Geral & Indicadores de Folga</h2>
                    <p>Acompanhe a folga dos colaboradores por setor em tempo real e o próximo feriado regulamentar.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ folgasHojeInfo().total }}</div>
                  <div class="kpi-lbl">Folgas Hoje</div>
                </div>
                <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.3);"></div>
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ funcionarios().length }}</div>
                  <div class="kpi-lbl">Equipe Total</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'escala') {
            <div class="hero-banner banner-cyan no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Escala Mensal de Folgas
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">📅</div>
                  <div class="hero-text">
                    <h2>Escala Mensal de Folgas (Matriz 6x1)</h2>
                    <p>Gerencie e calcule a distribuição de turnos e descansos no padrão regulamentar CLT.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ escalaItens().length }}</div>
                  <div class="kpi-lbl">Itens na Escala</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'funcionarios') {
            <div class="hero-banner banner-green no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Colaboradores & LGPD
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">👥</div>
                  <div class="hero-text">
                    <h2>Diretório de Colaboradores</h2>
                    <p>Consulte a equipe da loja com pseudonimização LGPD e acesse os perfis detalhados de presença.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ funcionarios().length }}</div>
                  <div class="kpi-lbl">Ativos na Loja</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'setores') {
            <div class="hero-banner banner-purple no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Setores & Cargos Operacionais
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">📁</div>
                  <div class="hero-text">
                    <h2>Estrutura de Setores & Cargos</h2>
                    <p>Configure a árvore organizacional de funções interligadas ao organograma oficial da loja.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ setores().length }}</div>
                  <div class="kpi-lbl">Setores Ativos</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'feriados') {
            <div class="hero-banner banner-amber no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Gestão de Feriados
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">🎉</div>
                  <div class="hero-text">
                    <h2>Gestão de Feriados (Poções / Bahia / Brasil)</h2>
                    <p>Cadastre e acompanhe os feriados oficiais para desconto e folgas compensatórias.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ feriados().length }}</div>
                  <div class="kpi-lbl">Feriados Salvos</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'regras') {
            <div class="hero-banner banner-red no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Regras de Escala & Solicitações RH
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">📜</div>
                  <div class="hero-text">
                    <h2>Regras de Escala (CLT, Convenção & Solicitações RH)</h2>
                    <p>Consulte as regras aplicadas pelo algoritmo e cadastre novos requisitos de escala para o programador codificar.</p>
                  </div>
                </div>
              </div>

              <div class="hero-kpi-card">
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ statsRegras().implementadas }}</div>
                  <div class="kpi-lbl">No Algoritmo</div>
                </div>
                <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.3);"></div>
                <div class="hero-kpi-item">
                  <div class="kpi-num">{{ statsRegras().pendentes }}</div>
                  <div class="kpi-lbl">Pendente Dev</div>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'detalhes-funcionario' && selectedFuncionarioForPage()) {
            <div class="hero-banner banner-navy no-print">
              <div>
                <div class="hero-breadcrumb">
                  🏠 Home &gt; Colaboradores &gt; {{ selectedFuncionarioForPage()?.primeiro_nome }}
                </div>
                <div class="hero-content">
                  <div class="hero-icon-box">📱</div>
                  <div class="hero-text">
                    <h2>Perfil Detalhado de {{ selectedFuncionarioForPage()?.primeiro_nome }}</h2>
                    <p>Matrícula LGPD: {{ selectedFuncionarioForPage()?.matricula_aleatoria }} | Setor: {{ selectedFuncionarioForPage()?.setor }}</p>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- ABA 0: DASHBOARD VISÃO GERAL (INICIAL) -->
          @if (activeTab() === 'dashboard') {

            <!-- BARRA DE PESQUISA & FILTROS EM PÍLULA NO DASHBOARD PRINCIPAL -->
            <div class="filter-pill-bar no-print">
              <div class="search-input-wrapper">
                <span class="search-icon-left">🔍</span>
                <input
                  type="text"
                  [ngModel]="searchQueryDashboard()"
                  (ngModelChange)="searchQueryDashboard.set($event)"
                  placeholder="Pesquisar colaboradores ou setores no dashboard de hoje..."
                />
                <div class="search-actions-right">
                  <button (click)="searchQueryDashboard.set(''); filterSetorDashboard.set('')" title="Limpar Filtros" class="icon-btn-sm" style="font-size: 1rem;">✕</button>
                </div>
              </div>

              <div class="pill-group">
                <span style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">FILTRAR SETORES:</span>

                <button (click)="filterSetorDashboard.set('')" [class.active]="filterSetorDashboard() === ''" class="pill-btn">
                  Todos os Setores <span class="pill-badge">{{ setores().length }}</span>
                </button>

                @for (s of setores(); track s.id) {
                  <button (click)="filterSetorDashboard.set(s.nome)" [class.active]="filterSetorDashboard() === s.nome" class="pill-btn">
                    {{ s.nome }} <span class="pill-badge">{{ getFolgasPorSetor(s.nome).length }} folga(s)</span>
                  </button>
                }
              </div>
            </div>

            <!-- Detalhamento por Setores: Quem Está de Folga Hoje -->
            <div class="clean-card">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
                <div>
                  <h3 style="color: #0b2a52; margin: 0; font-size: 1.15rem; font-weight: 800;">
                    🏖️ Quem Está de Folga Hoje Por Setor ({{ dataAtualFormatted }})
                  </h3>
                  <p style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                    💡 Clique em qualquer colaborador para abrir o resumo com blur ou navegar para o perfil completo.
                  </p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px;">
                @for (setor of setoresFiltradosDashboard(); track setor.id) {
                  <div class="setor-card">
                    <div class="setor-card-header" [style.background-color]="getSetorColor(setor.nome)">
                      <div>
                        <h4 style="margin: 0; font-size: 1.05rem; color: #ffffff !important; font-weight: 800;">
                          {{ setor.nome }}
                        </h4>
                        <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: rgba(255,255,255,0.85);">
                          {{ getFolgasPorSetorFiltradas(setor.nome).length }} em folga hoje ({{ getFuncionariosPorSetor(setor.nome).length }} colaboradores cadastrados no setor)
                        </p>
                      </div>
                    </div>

                    <div class="setor-card-body">
                      @if (getFolgasPorSetorFiltradas(setor.nome).length > 0) {
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                          @for (f of getFolgasPorSetorFiltradas(setor.nome); track f.id) {
                            <div
                              (click)="openQuickBlurModal(f)"
                              class="clickable-row"
                              style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;"
                            >
                              <div>
                                <span style="font-weight: 800; color: #1e40af; font-size: 0.88rem;">{{ f.primeiro_nome }}</span>
                                <span style="font-size: 0.75rem; color: #64748b; display: block;">Matrícula: {{ f.matricula_aleatoria }}</span>
                              </div>
                              <span style="background: #dbeafe; color: #1e40af; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px;">
                                🏖️ Ver Detalhes ➔
                              </span>
                            </div>
                          }
                        </div>
                      } @else {
                        <div style="font-size: 0.85rem; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; text-align: center; font-weight: 700;">
                          ✅ 100% da equipe deste setor em trabalho hoje.
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- ABA 1: ESCALA DO MÊS -->
          @if (activeTab() === 'escala') {
            <div class="clean-card no-print">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; width: 100%; max-width: 500px;">
                  <div style="flex: 1; min-width: 140px;">
                    <label>Mês / Ano Ref:</label>
                    <input type="month" [(ngModel)]="selectedMonth" (change)="loadEscala()" class="form-control" />
                  </div>
                  <div style="flex: 1.4; min-width: 180px;">
                    <label>Setor Operacional:</label>
                    <select [(ngModel)]="selectedSetor" (change)="loadEscala()" class="form-control">
                      @for (s of setores(); track s.id) {
                        <option [value]="s.nome">{{ s.nome }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap; width: 100%; justify-content: flex-end;">
                  <button (click)="gerarNovaEscala()" class="btn-premium btn-primary-gradient">
                    ⚡ Gerar Escala Automática (6x1)
                  </button>
                  <button (click)="salvarEscala()" class="btn-premium btn-yellow-gradient" [disabled]="saving()">
                    {{ saving() ? 'Salvando...' : '💾 Salvar no Supabase' }}
                  </button>
                </div>
              </div>

              <!-- Tabela Visual de Escala Mensal -->
              @if (escalaItens().length > 0) {
                <div class="escala-table-wrapper">
                  <table class="escala-table">
                    <thead>
                      <tr>
                        <th class="sticky-col" style="width: 85px; left: 0;">Matrícula</th>
                        <th class="sticky-col" style="width: 140px; left: 85px;">Nome (LGPD)</th>
                        <th style="width: 120px;">Turno</th>
                        @for (d of diasDoMes(); track d) {
                          <th style="width: 32px;">{{ d }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of escalaItens(); track item.matricula) {
                        <tr>
                          <td class="sticky-col" style="font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #0b2a52; left: 0;">{{ item.matricula }}</td>
                          <td class="sticky-col nome-col" style="left: 85px;">{{ item.nome }}</td>
                          <td style="font-size: 0.75rem;">{{ item.turno }}</td>
                          @for (d of diasDoMes(); track d) {
                            <td [class]="getDiaClass(item.dias[d])">
                              {{ getDiaLabel(item.dias[d]) }}
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div style="text-align: center; padding: 40px 16px; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                  <div style="font-size: 2.2rem; margin-bottom: 8px;">📅</div>
                  <h4 style="color: #0b2a52; margin-bottom: 4px; font-weight: 800;">Nenhuma escala salva neste setor/mês</h4>
                  <p style="font-size: 0.85rem;">Clique em <strong>"Gerar Escala Automática (6x1)"</strong> para montar os turnos e folgas quinzenais.</p>
                </div>
              }
            </div>
          }

          <!-- ABA 2: COLABORADORES (BARRA DE FILTROS EM PÍLULA REATIVA) -->
          @if (activeTab() === 'funcionarios') {

            <!-- BARRA DE PESQUISA & FILTROS EM PÍLULA -->
            <div class="filter-pill-bar no-print">
              <div class="search-input-wrapper">
                <span class="search-icon-left">🔍</span>
                <input
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  placeholder="Pesquisar colaboradores por nome ou matrícula..."
                />
                <div class="search-actions-right">
                  <button (click)="searchQuery.set(''); filterSetor.set('')" title="Limpar Filtros" class="icon-btn-sm" style="font-size: 1rem;">✕</button>
                </div>
              </div>

              <div class="pill-group">
                <span style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">FILTROS RÁPIDOS:</span>

                <button (click)="filterSetor.set('')" [class.active]="filterSetor() === ''" class="pill-btn">
                  Todos os Setores <span class="pill-badge">{{ funcionarios().length }}</span>
                </button>

                @for (s of setores(); track s.id) {
                  <button (click)="filterSetor.set(s.nome)" [class.active]="filterSetor() === s.nome" class="pill-btn">
                    {{ s.nome }} <span class="pill-badge">{{ getFuncionariosPorSetor(s.nome).length }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Card de Inclusão de Novo Colaborador -->
            <div class="clean-card no-print">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
                <h3 style="color: #0b2a52; margin: 0; font-size: 1.15rem; font-weight: 800;">➕ Cadastrar Novo Colaborador</h3>
                <span style="font-size: 0.78rem; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; padding: 4px 12px; border-radius: 20px; font-weight: 700;">
                  💡 Clique no colaborador para abrir a Página Detalhada de Histórico
                </span>
              </div>

              <form (ngSubmit)="cadastrarFuncionario()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label>Primeiro Nome (LGPD)</label>
                  <input type="text" [(ngModel)]="novoNome" name="novoNome" class="form-control" placeholder="Ex: Carlos" required />
                </div>

                <!-- Setor Interligado -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label>1. Setor Operacional</label>
                  <select [ngModel]="novoSetor()" (ngModelChange)="onNovoSetorChange($event)" name="novoSetor" class="form-control" required>
                    @for (s of setores(); track s.id) {
                      <option [value]="s.nome">{{ s.nome }}</option>
                    }
                  </select>
                </div>

                <!-- Cargo Interligado -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label>2. Função / Cargo (Do Setor)</label>
                  <select [ngModel]="novoCargo()" (ngModelChange)="novoCargo.set($event)" name="novoCargo" class="form-control" required [disabled]="cargosDoNovoSetor().length === 0">
                    @for (c of cargosDoNovoSetor(); track c.id) {
                      <option [value]="c.nome">{{ c.nome }}</option>
                    }
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label>Turno Padrão</label>
                  <input type="text" [(ngModel)]="novoTurno" name="novoTurno" class="form-control" placeholder="08:00 às 16:20" required />
                </div>

                <button type="submit" class="btn-premium btn-primary-gradient" style="height: 42px;">
                  + Adicionar Colaborador
                </button>
              </form>
            </div>

            <!-- Quadro da Equipe Ativa -->
            <div class="clean-card no-print">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
                <div>
                  <h3 style="color: #0b2a52; margin: 0; font-size: 1.15rem; font-weight: 800;">Quadro da Equipe Ativa ({{ funcionariosFiltrados().length }} Colaboradores)</h3>
                  <p style="font-size: 0.82rem; color: #64748b; margin-top: 2px;">
                    Clique em qualquer colaborador para ver sua Página Detalhada de Histórico Mensal
                  </p>
                </div>
              </div>

              <div class="escala-table-wrapper">
                <table class="escala-table" style="width: 100%;">
                  <thead>
                    <tr>
                      <th style="width: 130px;">Matrícula (LGPD)</th>
                      <th>Primeiro Nome</th>
                      <th>Setor Operacional</th>
                      <th>Cargo / Função</th>
                      <th>Turno Padrão</th>
                      <th style="width: 220px; text-align: center;">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of funcionariosFiltrados(); track f.id) {
                      <tr class="clickable-row">
                        <td (click)="navigateToFuncProfile(f)" style="font-family: monospace; font-weight: 800; color: #0b2a52;">
                          {{ f.matricula_aleatoria }}
                        </td>
                        <td (click)="navigateToFuncProfile(f)" style="font-weight: 700; color: #0f172a;">{{ f.primeiro_nome }}</td>
                        <td (click)="navigateToFuncProfile(f)">
                          <span [style.background-color]="getSetorColor(f.setor)" class="setor-badge-color">
                            {{ f.setor }}
                          </span>
                        </td>
                        <td (click)="navigateToFuncProfile(f)" style="color: #334155; font-weight: 600;">{{ f.cargo }}</td>
                        <td (click)="navigateToFuncProfile(f)" style="font-size: 0.85rem; color: #475569;">{{ f.turno_padrao }}</td>
                        <td style="text-align: center;">
                          <div style="display: flex; justify-content: center; gap: 6px;">
                            <button (click)="navigateToFuncProfile(f)" class="btn-premium btn-yellow-gradient" style="padding: 4px 8px; font-size: 0.74rem;">
                              📱 Perfil
                            </button>
                            <button (click)="openEditFuncModal(f)" class="btn-premium btn-primary-gradient" style="padding: 4px 8px; font-size: 0.74rem;">
                              ✏️
                            </button>
                            <button (click)="confirmSoftDeleteFuncionario(f)" class="btn-premium btn-danger-gradient" style="padding: 4px 8px; font-size: 0.74rem;">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
                          Nenhum colaborador encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ABA 3: SETORES E CARGOS -->
          @if (activeTab() === 'setores') {
            <div class="clean-card no-print">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
                <div>
                  <h3 style="color: #0b2a52; margin: 0; font-size: 1.15rem; font-weight: 800;">📁 Estrutura Operacional (Setores e Cargos)</h3>
                  <p style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                    Gerencie a árvore hierárquica de setores e funções inspirada na tabela oficial
                  </p>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap; width: 100%; max-width: 360px;">
                  <button (click)="openAddSetorModal()" class="btn-premium btn-primary-gradient" style="flex: 1;">
                    + Novo Setor
                  </button>
                  <button (click)="openAddCargoModal()" class="btn-premium btn-yellow-gradient" style="flex: 1;">
                    + Novo Cargo
                  </button>
                </div>
              </div>

              <!-- Grade de Setores e seus Cargos Associados -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px;">
                @for (setor of setores(); track setor.id) {
                  <div class="setor-card">
                    <div class="setor-card-header" [style.background-color]="getSetorColor(setor.nome)">
                      <div>
                        <h4 style="margin: 0; font-size: 1.05rem; color: #ffffff !important; font-weight: 800;">
                          {{ setor.nome }}
                        </h4>
                        @if (setor.descricao) {
                          <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: rgba(255,255,255,0.85);">
                            {{ setor.descricao }}
                          </p>
                        }
                      </div>

                      <div style="display: flex; gap: 4px;">
                        <button (click)="openEditSetorModal(setor)" title="Editar Setor" class="icon-btn-white">
                          ✏️
                        </button>
                        <button (click)="confirmDeleteSetor(setor)" title="Excluir Setor" class="icon-btn-white danger">
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div class="setor-card-body">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                          Cargos / Funções ({{ getCargosDoSetor(setor.nome).length }})
                        </span>
                        <button (click)="openAddCargoModal(setor.nome)" class="btn-link" style="font-size: 0.75rem;">
                          + Adicionar Função
                        </button>
                      </div>

                      <div style="display: flex; flex-direction: column; gap: 6px;">
                        @for (cargo of getCargosDoSetor(setor.nome); track cargo.id) {
                          <div class="cargo-item">
                            <span style="font-size: 0.88rem; font-weight: 700; color: #334155;">
                              • {{ cargo.nome }}
                            </span>
                            <div style="display: flex; gap: 4px;">
                              <button (click)="openEditCargoModal(cargo)" title="Editar Cargo" class="icon-btn-sm">
                                ✏️
                              </button>
                              <button (click)="confirmDeleteCargo(cargo)" title="Excluir Cargo" class="icon-btn-sm danger">
                                🗑️
                              </button>
                            </div>
                          </div>
                        } @empty {
                          <div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 8px 0;">
                            Nenhum cargo cadastrado neste setor.
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- ABA 4: GESTÃO DE FERIADOS -->
          @if (activeTab() === 'feriados') {
            <div class="clean-card no-print">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
                <div>
                  <h3 style="color: #0b2a52; margin: 0; font-size: 1.15rem; font-weight: 800;">
                    🎉 Gestão de Feriados (Nacionais, Bahia e Poções-BA)
                  </h3>
                  <p style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                    Feriados cadastrados para consideração automática nos cálculos de descanso e domingos
                  </p>
                </div>

                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                  <select [ngModel]="filterTipoFeriado()" (ngModelChange)="filterTipoFeriado.set($event)" class="form-control" style="width: 200px;">
                    <option value="">Todos os Âmbitos</option>
                    <option value="Nacional">Nacionais (Brasil)</option>
                    <option value="Estadual">Estaduais (Bahia)</option>
                    <option value="Municipal">Municipais (Poções - BA)</option>
                  </select>

                  <button (click)="openAddFeriadoModal()" class="btn-premium btn-yellow-gradient">
                    + Adicionar Feriado
                  </button>
                </div>
              </div>

              <!-- Tabela de Feriados -->
              <div class="escala-table-wrapper">
                <table class="escala-table" style="width: 100%;">
                  <thead>
                    <tr>
                      <th style="width: 120px;">Data</th>
                      <th>Nome do Feriado</th>
                      <th style="width: 140px;">Âmbito / Tipo</th>
                      <th style="width: 160px;">Abrangência</th>
                      <th>Descrição / Observação</th>
                      <th style="width: 140px; text-align: center;">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of feriadosFiltrados(); track f.id) {
                      <tr>
                        <td style="font-family: monospace; font-weight: 800; color: #0b2a52;">
                          {{ formatFeriadoData(f.data) }}
                        </td>
                        <td style="font-weight: 800; color: #0f172a; text-align: left;">
                          {{ f.nome }}
                        </td>
                        <td>
                          <span
                            [style.background-color]="getFeriadoBadgeColor(f.tipo)"
                            style="color: #fff; font-weight: 800; font-size: 0.74rem; padding: 4px 10px; border-radius: 6px;"
                          >
                            {{ f.tipo }}
                          </span>
                        </td>
                        <td style="font-weight: 700; color: #475569;">
                          {{ f.abrangencia || 'Brasil' }}
                        </td>
                        <td style="font-size: 0.85rem; color: #64748b; text-align: left;">
                          {{ f.descricao || '-' }}
                        </td>
                        <td style="text-align: center;">
                          <div style="display: flex; justify-content: center; gap: 6px;">
                            <button (click)="openEditFeriadoModal(f)" class="btn-premium btn-primary-gradient" style="padding: 4px 10px; font-size: 0.78rem;">
                              ✏️ Editar
                            </button>
                            <button (click)="confirmDeleteFeriado(f)" class="btn-premium btn-danger-gradient" style="padding: 4px 10px; font-size: 0.78rem;">
                              🗑️ Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
                          Nenhum feriado encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- ABA 5: REGRAS DE ESCALA (CLT & SOLICITAÇÕES DO RH) -->
          @if (activeTab() === 'regras') {
            <div class="clean-card no-print">

              <!-- BARRA DE FILTROS EM PÍLULA -->
              <div class="filter-pill-bar" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                  <div class="pill-group">
                    <span style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">FILTRAR REGRAS:</span>

                    <button (click)="filterTipoRegra.set('')" [class.active]="filterTipoRegra() === ''" class="pill-btn">
                      Todas as Regras <span class="pill-badge">{{ regras().length }}</span>
                    </button>

                    <button (click)="filterTipoRegra.set('IMPLEMENTADA')" [class.active]="filterTipoRegra() === 'IMPLEMENTADA'" class="pill-btn">
                      ✅ Implementadas <span class="pill-badge">{{ statsRegras().implementadas }}</span>
                    </button>

                    <button (click)="filterTipoRegra.set('PENDENTE_PROGRAMADOR')" [class.active]="filterTipoRegra() === 'PENDENTE_PROGRAMADOR'" class="pill-btn">
                      ⚙️ Pendente Dev <span class="pill-badge">{{ statsRegras().pendentes }}</span>
                    </button>

                    <button (click)="filterTipoRegra.set('CLT')" [class.active]="filterTipoRegra() === 'CLT'" class="pill-btn">
                      ⚖️ CLT <span class="pill-badge">{{ getRegrasPorCategoria('CLT').length }}</span>
                    </button>
                  </div>

                  <button (click)="openAddRegraModal()" class="btn-premium btn-red-gradient" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                    + Cadastrar Nova Regra / Solicitação RH
                  </button>
                </div>
              </div>

              <!-- Grade de Cards de Regras -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                @for (regra of regrasFiltradas(); track regra.id) {
                  <div class="clean-card" style="margin-bottom: 0; border-top: 4px solid #0b2a52 !important; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <span [class]="regra.status === 'IMPLEMENTADA' ? 'badge-status-implementada' : 'badge-status-pendente'">
                          {{ regra.status === 'IMPLEMENTADA' ? '✅ No Algoritmo' : '⚙️ Pendente Programação' }}
                        </span>

                        <span style="font-size: 0.74rem; font-weight: 800; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 6px;">
                          {{ regra.categoria }}
                        </span>
                      </div>

                      <h4 style="color: #0b2a52; font-weight: 800; font-size: 1.05rem; margin: 0 0 6px 0;">
                        {{ regra.titulo }}
                      </h4>

                      <p style="font-size: 0.85rem; color: #475569; line-height: 1.5; margin: 0 0 14px 0;">
                        {{ regra.descricao }}
                      </p>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 0.78rem;">
                      <span style="font-weight: 700; color: #64748b;">
                        Obrigatoriedade: <strong [style.color]="regra.obrigatoria ? '#dc2626' : '#64748b'">{{ regra.obrigatoria ? 'Sim (Rígida)' : 'Desejável' }}</strong>
                      </span>

                      <div style="display: flex; gap: 4px;">
                        <button (click)="openEditRegraModal(regra)" class="icon-btn-sm" title="Editar Regra">✏️</button>
                        <button (click)="confirmDeleteRegra(regra)" class="icon-btn-sm danger" title="Excluir Regra">🗑️</button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border-radius: 12px;">
                    Nenhuma regra encontrada para o filtro selecionado.
                  </div>
                }
              </div>
            </div>
          }

          <!-- ABA 6: PÁGINA DETALHADA DO COLABORADOR -->
          @if (activeTab() === 'detalhes-funcionario' && selectedFuncionarioForPage()) {
            @let func = selectedFuncionarioForPage()!;
            
            <div class="clean-card no-print">
              <!-- Cabeçalho do Perfil -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <div style="width: 60px; height: 60px; border-radius: 50%; background: #0b2a52; color: #f7c600; font-weight: 900; font-size: 1.5rem; display: flex; align-items: center; justify-content: center;">
                    {{ func.primeiro_nome.substring(0, 2).toUpperCase() }}
                  </div>

                  <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <h2 style="margin: 0; font-size: 1.4rem; font-weight: 900; color: #0b2a52;">
                        {{ func.primeiro_nome }}
                      </h2>
                      <span style="font-family: monospace; font-size: 0.8rem; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 20px;">
                        Matrícula LGPD: {{ func.matricula_aleatoria }}
                      </span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap;">
                      <span [style.background-color]="getSetorColor(func.setor)" class="setor-badge-color">
                        {{ func.setor }}
                      </span>
                      <span style="font-weight: 700; color: #475569; font-size: 0.85rem;">
                        Função: <strong>{{ func.cargo }}</strong>
                      </span>
                      <span style="font-weight: 700; color: #475569; font-size: 0.85rem;">
                        Turno: <strong>{{ func.turno_padrao }}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <button (click)="selectTab('funcionarios')" class="btn-premium btn-ghost">
                    ⬅️ Voltar para a Lista
                  </button>
                </div>
              </div>

              <!-- Filtros da Página Detalhada -->
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                  <div style="min-width: 150px;">
                    <label style="font-size: 0.78rem; font-weight: 800; color: #334155;">Mês de Referência:</label>
                    <input type="month" [(ngModel)]="selectedMonthHistorico" class="form-control" />
                  </div>

                  <div style="min-width: 180px;">
                    <label style="font-size: 0.78rem; font-weight: 800; color: #334155;">Filtrar Tipo de Dia:</label>
                    <select [(ngModel)]="filterTipoHistorico" class="form-control">
                      <option value="TODOS">Todos os Dias</option>
                      <option value="FOLGA">Apenas Folgas (F)</option>
                      <option value="DOMINGO">Apenas Domingos (D)</option>
                      <option value="TRABALHO">Apenas Dias de Trabalho (T)</option>
                    </select>
                  </div>
                </div>

                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                  <div style="text-align: right;">
                    <span style="font-size: 0.78rem; color: #64748b; font-weight: 700; display: block;">Resumo CLT no Mês</span>
                    <strong style="color: #0b2a52; font-size: 0.95rem;">
                      {{ statsColaboradorMes().totalFolgas }} Folgas | {{ statsColaboradorMes().domingosTrabalhados }} Domingos Trabalhados
                    </strong>
                  </div>
                </div>
              </div>

              <!-- Grade / Timeline de Histórico Mensal -->
              <h4 style="color: #0b2a52; font-weight: 800; margin-bottom: 12px;">
                📅 Histórico Diário de Presença ({{ selectedMonthHistorico }})
              </h4>

              <div class="timeline-grid">
                @for (d of diasHistoricoFiltrados(); track d.dia) {
                  <div class="timeline-day-card" [style.border-top]="d.tipo === 'FOLGA' ? '3px solid #3b82f6' : d.tipo === 'DOMINGO' ? '3px solid #f59e0b' : '3px solid #cbd5e1'">
                    <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">
                      {{ d.diaSemana }}
                    </span>
                    <strong style="font-size: 1.2rem; color: #0b2a52; margin: 2px 0;">
                      Dia {{ d.dia }}
                    </strong>
                    <span [class]="getDiaClass(d.tipo)" style="padding: 4px 10px; border-radius: 6px; font-size: 0.76rem; font-weight: 800; margin-top: 4px;">
                      {{ d.tipo === 'FOLGA' ? '🏖️ Folga' : d.tipo === 'DOMINGO' ? '☀️ Domingo' : '💼 Trabalho' }}
                    </span>
                    <span style="font-size: 0.7rem; color: #94a3b8; margin-top: 6px;">
                      {{ d.tipo === 'FOLGA' ? 'Descanso CLT' : func.turno_padrao }}
                    </span>
                  </div>
                } @empty {
                  <div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: #64748b; background: #f8fafc; border-radius: 12px;">
                    Nenhum dia corresponde ao filtro selecionado.
                  </div>
                }
              </div>
            </div>
          }

          <!-- ============================================================================== -->
          <!-- ÁREA DE IMPRESSÃO A4 (2 ESTILOS DE LAYOUT: FORMAL RH VS MURAL VISUAL MODERNO) -->
          <!-- ============================================================================== -->
          <div class="print-area" style="display: none;">

            <!-- ESTILO 1: FORMAL / OFICIAL RH COM ASSINATURAS -->
            @if (printEstilo() === 'formal') {
              <!-- FORMATO 1: ESCALA DE FOLGAS DE DOMINGO (A4) -->
              @if (activePrintMode() === 'domingos') {
                <div class="print-header-official">
                  <div>
                    <h2 style="font-size: 1.3rem; font-weight: 900; margin: 0; color: #0b2a52;">JOÃO HENRIQUE ATACADISTA</h2>
                    <p style="font-size: 0.85rem; margin: 0; font-weight: 700;">ESCALA OFICIAL DE FOLGAS AOS DOMINGOS - {{ selectedMonth }}</p>
                  </div>
                  <div style="text-align: right; font-size: 0.78rem;">
                    <strong>{{ activeLoja()?.nome }}</strong><br>
                    Setor: {{ selectedSetor }} | Emissão: {{ dataAtualFormatted }}
                  </div>
                </div>

                <table class="print-table">
                  <thead>
                    <tr>
                      <th>Matr.</th>
                      <th>Colaborador</th>
                      <th>Cargo / Função</th>
                      <th>Domingos em Folga (D)</th>
                      <th>Domingos Trabalhados</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of escalaItens(); track item.matricula) {
                      <tr>
                        <td style="font-family: monospace;">{{ item.matricula }}</td>
                        <td style="text-align: left; font-weight: 700;">{{ item.nome }}</td>
                        <td>{{ getCargoPorMatricula(item.matricula) }}</td>
                        <td style="font-weight: 800; color: #1e40af;">{{ getDomingosFolga(item) }}</td>
                        <td style="font-weight: 800; color: #b45309;">{{ getDomingosTrabalhados(item) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>

                <div class="print-signatures">
                  <div>Assinatura Encarregado de RH</div>
                  <div>Visto Gerência da Loja</div>
                </div>
              }

              <!-- FORMATO 2: ESCALA SEMANAL DE FOLGAS (A4) -->
              @if (activePrintMode() === 'semanal') {
                <div class="print-header-official">
                  <div>
                    <h2 style="font-size: 1.3rem; font-weight: 900; margin: 0; color: #0b2a52;">JOÃO HENRIQUE ATACADISTA</h2>
                    <p style="font-size: 0.85rem; margin: 0; font-weight: 700;">ESCALA DE FOLGAS SEMANAL - SEMANA {{ printSemanaSelecionada() }} ({{ selectedMonth }})</p>
                  </div>
                  <div style="text-align: right; font-size: 0.78rem;">
                    <strong>{{ activeLoja()?.nome }}</strong><br>
                    Setor: {{ selectedSetor }}
                  </div>
                </div>

                <table class="print-table">
                  <thead>
                    <tr>
                      <th>Matr.</th>
                      <th>Colaborador</th>
                      <th>Turno</th>
                      @for (d of diasDaSemanaImpressao(); track d) {
                        <th>Dia {{ d }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of escalaItens(); track item.matricula) {
                      <tr>
                        <td style="font-family: monospace;">{{ item.matricula }}</td>
                        <td style="text-align: left; font-weight: 700;">{{ item.nome }}</td>
                        <td>{{ item.turno }}</td>
                        @for (d of diasDaSemanaImpressao(); track d) {
                          <td [class]="getDiaClass(item.dias[d])" style="font-weight: 800;">
                            {{ getDiaLabel(item.dias[d]) }}
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>

                <div class="print-signatures">
                  <div>Assinatura Encarregado de Setor</div>
                  <div>Visto Gerência Geral</div>
                </div>
              }

              <!-- FORMATO 3: ESCALA MENSAL COMPLETA EM PAINEL (4 FOLHAS A4 CONTINUAS) -->
              @if (activePrintMode() === 'painel-4-a4') {
                @for (bloco of blocosPainelA4; track bloco.pagina) {
                  <div [class.page-break]="$index < 3" style="padding-bottom: 20px;">
                    <div class="print-header-official">
                      <div>
                        <h2 style="font-size: 1.3rem; font-weight: 900; margin: 0; color: #0b2a52;">JOÃO HENRIQUE ATACADISTA</h2>
                        <p style="font-size: 0.85rem; margin: 0; font-weight: 700;">
                          PAINEL OFICIAL DE FOLGAS MENSAL - FOLHA {{ bloco.pagina }} DE 4 (DIAS {{ bloco.inicio }} A {{ bloco.fim }})
                        </p>
                      </div>
                      <div style="text-align: right; font-size: 0.78rem;">
                        <strong>{{ activeLoja()?.nome }}</strong><br>
                        Setor: {{ selectedSetor }} | Mês: {{ selectedMonth }}
                      </div>
                    </div>

                    <table class="print-table">
                      <thead>
                        <tr>
                          <th style="width: 70px;">Matr.</th>
                          <th style="width: 140px;">Colaborador</th>
                          <th style="width: 100px;">Turno</th>
                          @for (d of getDiasIntervalo(bloco.inicio, bloco.fim); track d) {
                            <th style="width: 30px;">{{ d }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of escalaItens(); track item.matricula) {
                          <tr>
                            <td style="font-family: monospace; font-weight: 700;">{{ item.matricula }}</td>
                            <td style="text-align: left; font-weight: 800;">{{ item.nome }}</td>
                            <td style="font-size: 0.7rem;">{{ item.turno }}</td>
                            @for (d of getDiasIntervalo(bloco.inicio, bloco.fim); track d) {
                              <td [class]="getDiaClass(item.dias[d])" style="font-weight: 800;">
                                {{ getDiaLabel(item.dias[d]) }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>

                    <div class="print-signatures">
                      <div>Visto RH (Folha {{ bloco.pagina }}/4)</div>
                      <div>Gerência Geral da Loja</div>
                    </div>
                  </div>
                }
              }
            }

            <!-- ESTILO 2: MURAL VISUAL MODERNO (GRADE DE CARDS CONFORME IMAGEM ANEXADA) -->
            @if (printEstilo() === 'mural-moderno') {
              @for (item of escalaItens(); track item.matricula) {
                <div class="page-break" style="padding-bottom: 24px;">
                  <div style="border-bottom: 3px solid #0b2a52; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h2 style="font-size: 1.4rem; font-weight: 900; color: #0b2a52; margin: 0;">{{ item.nome }}</h2>
                      <span style="font-size: 0.85rem; font-weight: 700; color: #475569;">
                        Matrícula LGPD: {{ item.matricula }} | Setor: {{ selectedSetor }} | Turno: {{ item.turno }}
                      </span>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.8rem; font-weight: 800; color: #0b2a52; background: #e0f2fe; padding: 4px 12px; border-radius: 20px;">
                        Mês Ref: {{ selectedMonth }}
                      </span>
                    </div>
                  </div>

                  <!-- Grade Visual de Cards 7x5 -->
                  <div class="print-mural-grid">
                    @for (d of diasDoMes(); track d) {
                      <div
                        class="print-day-card"
                        [class.folga-card]="item.dias[d] === 'FOLGA'"
                        [class.domingo-card]="item.dias[d] === 'DOMINGO'"
                        [class.trabalho-card]="item.dias[d] === 'TRABALHO'"
                      >
                        <span style="font-weight: 800; font-size: 0.68rem; color: #64748b; display: block; text-transform: uppercase;">
                          {{ getDiaSemanaAbrev(d) }}
                        </span>
                        <strong style="font-size: 1.1rem; color: #0b2a52; display: block; margin: 2px 0;">
                          Dia {{ d }}
                        </strong>
                        <span style="font-weight: 800; font-size: 0.72rem; display: inline-block; padding: 2px 6px; border-radius: 4px;" [style.color]="item.dias[d] === 'FOLGA' ? '#2563eb' : item.dias[d] === 'DOMINGO' ? '#d97706' : '#475569'">
                          {{ item.dias[d] === 'FOLGA' ? '🏖️ Folga' : item.dias[d] === 'DOMINGO' ? '☀️ Domingo' : '💼 Trabalho' }}
                        </span>
                        <span style="font-size: 0.65rem; color: #94a3b8; display: block; margin-top: 4px;">
                          {{ item.dias[d] === 'FOLGA' ? 'Descanso CLT' : item.turno }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }
            }

          </div>

        </main>
      </div>

      <!-- TOAST SYSTEM -->
      <div class="toast-container">
        @for (t of toastService.toasts(); track t.id) {
          <div class="toast-item" [class.toast-success]="t.type === 'success'" [class.toast-error]="t.type === 'error'" [class.toast-warning]="t.type === 'warning'">
            <div class="toast-icon">
              @if (t.type === 'success') { ✅ }
              @if (t.type === 'error') { ❌ }
              @if (t.type === 'warning') { ⚠️ }
              @if (t.type === 'info') { ℹ️ }
            </div>
            <div class="toast-content">
              <div class="toast-title">{{ t.title }}</div>
              @if (t.message) {
                <div class="toast-message">{{ t.message }}</div>
              }
            </div>
            <button (click)="toastService.remove(t.id)" class="icon-btn-sm" style="color: #94a3b8;">✖</button>
          </div>
        }
      </div>

      <!-- MODAIS -->
      <!-- MODAL DE ESCOLHA DE FORMATO E ESTILO DE IMPRESSÃO A4 -->
      @if (printModalVisible()) {
        <div class="modal-backdrop">
          <div class="modal-card" style="max-width: 600px; border-top: 5px solid #f7c600 !important;">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.15rem; font-weight: 800;">
                🖨️ Selecionar Opções & Estilo de Impressão A4
              </h4>
              <button (click)="printModalVisible.set(false)" class="icon-btn-sm">✖</button>
            </div>

            <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
              
              <!-- Seletor de Estilo Visual -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px;">
                <label style="font-size: 0.82rem; font-weight: 800; color: #0b2a52; display: block; margin-bottom: 8px;">
                  1. Escolha o Estilo Visual do Relatório A4:
                </label>
                <div style="display: flex; gap: 12px;">
                  <button
                    (click)="printEstilo.set('formal')"
                    [style.background]="printEstilo() === 'formal' ? '#0b2a52' : '#ffffff'"
                    [style.color]="printEstilo() === 'formal' ? '#ffffff' : '#475569'"
                    style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer;"
                  >
                    📜 Formal / Oficial (Com Assinaturas)
                  </button>

                  <button
                    (click)="printEstilo.set('mural-moderno')"
                    [style.background]="printEstilo() === 'mural-moderno' ? '#0b2a52' : '#ffffff'"
                    [style.color]="printEstilo() === 'mural-moderno' ? '#ffffff' : '#475569'"
                    style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer;"
                  >
                    🎨 Mural Visual Moderno (Cards de Dias)
                  </button>
                </div>
              </div>

              <!-- Seletor de Formato -->
              <label style="font-size: 0.82rem; font-weight: 800; color: #0b2a52; margin: 0;">
                2. Escolha o Formato da Escala:
              </label>

              <!-- Opção 1: Escala de Domingos -->
              <div
                (click)="selectedPrintMode.set('domingos')"
                [style.border-color]="selectedPrintMode() === 'domingos' ? '#0b2a52' : '#e2e8f0'"
                [style.background]="selectedPrintMode() === 'domingos' ? '#f0f9ff' : '#ffffff'"
                style="padding: 14px 18px; border: 2px solid; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;"
              >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h4 style="margin: 0; color: #0b2a52; font-weight: 800;">☀️ 1. Escala de Folgas de Domingo (1 Folha A4)</h4>
                  <input type="radio" name="printMode" [checked]="selectedPrintMode() === 'domingos'" />
                </div>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #64748b;">
                  Relatório focado no controle de revezamento de domingos trabalhados e descansos regulamentares.
                </p>
              </div>

              <!-- Opção 2: Escala Semanal -->
              <div
                (click)="selectedPrintMode.set('semanal')"
                [style.border-color]="selectedPrintMode() === 'semanal' ? '#0b2a52' : '#e2e8f0'"
                [style.background]="selectedPrintMode() === 'semanal' ? '#f0f9ff' : '#ffffff'"
                style="padding: 14px 18px; border: 2px solid; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;"
              >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h4 style="margin: 0; color: #0b2a52; font-weight: 800;">📅 2. Escala Semanal de Folgas (1 Folha A4)</h4>
                  <input type="radio" name="printMode" [checked]="selectedPrintMode() === 'semanal'" />
                </div>
                <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px;" (click)="$event.stopPropagation()">
                  <span style="font-size: 0.78rem; color: #475569; font-weight: 700;">Escolha a Semana:</span>
                  <select [ngModel]="printSemanaSelecionada()" (ngModelChange)="printSemanaSelecionada.set($event)" class="form-control" style="width: 140px; padding: 4px 8px;">
                    <option [value]="1">Semana 1 (Dias 1-7)</option>
                    <option [value]="2">Semana 2 (Dias 8-14)</option>
                    <option [value]="3">Semana 3 (Dias 15-21)</option>
                    <option [value]="4">Semana 4 (Dias 22-28)</option>
                  </select>
                </div>
              </div>

              <!-- Opção 3: Escala Mensal em Painel (4 A4s) -->
              <div
                (click)="selectedPrintMode.set('painel-4-a4')"
                [style.border-color]="selectedPrintMode() === 'painel-4-a4' ? '#0b2a52' : '#e2e8f0'"
                [style.background]="selectedPrintMode() === 'painel-4-a4' ? '#f0f9ff' : '#ffffff'"
                style="padding: 14px 18px; border: 2px solid; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;"
              >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h4 style="margin: 0; color: #0b2a52; font-weight: 800;">📑 3. Escala Mensal Completa em Painel (4 Folhas A4)</h4>
                  <input type="radio" name="printMode" [checked]="selectedPrintMode() === 'painel-4-a4'" />
                </div>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #64748b;">
                  Gera 4 páginas A4 sequenciais contínuas para impressão e montagem de mural no quadro de avisos da loja.
                </p>
              </div>
            </div>

            <div class="modal-footer">
              <button (click)="printModalVisible.set(false)" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="executePrint()" class="btn-premium btn-yellow-gradient">
                🖨️ Confirmar e Imprimir A4
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL DE CRIAR / EDITAR REGRA DE ESCALA -->
      @if (regraModal().visible) {
        <div class="modal-backdrop">
          <div class="modal-card" style="max-width: 520px; border-top: 5px solid #ef4444 !important;">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.1rem; font-weight: 800;">
                {{ regraModal().isEdit ? '✏️ Editar Regra de Escala' : '➕ Cadastrar Nova Regra / Solicitação RH' }}
              </h4>
              <button (click)="closeRegraModal()" class="icon-btn-sm">✖</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label>Título da Regra / Solicitação</label>
                <input type="text" [(ngModel)]="regraModalForm.titulo" class="form-control" placeholder="Ex: Preferência de folga aos sábados para Reposição" required />
              </div>

              <div class="form-group">
                <label>Descrição Detalhada para o Programador</label>
                <textarea [(ngModel)]="regraModalForm.descricao" class="form-control" rows="3" placeholder="Explique como o algoritmo 6x1 deve se comportar..." required></textarea>
              </div>

              <div class="form-group">
                <label>Categoria da Regra</label>
                <select [(ngModel)]="regraModalForm.categoria" class="form-control">
                  <option value="CLT">CLT (Consolidação das Leis do Trabalho)</option>
                  <option value="Acordo Coletivo">Acordo Coletivo / Convenção</option>
                  <option value="Interna RH">Interna RH (Diretriz da Loja)</option>
                  <option value="Solicitação RH">Solicitação RH (Requisito para Dev)</option>
                </select>
              </div>

              <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 0;">
                <input type="checkbox" [(ngModel)]="regraModalForm.obrigatoria" id="chkObrigatoria" style="width: 18px; height: 18px; cursor: pointer;" />
                <label for="chkObrigatoria" style="margin: 0; cursor: pointer; font-weight: 700; color: #334155;">
                  Regra Rígida / Obrigatória (Violar gera alarme de compliance)
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeRegraModal()" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="saveRegraModal()" class="btn-premium btn-red-gradient" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                {{ regraModal().isEdit ? 'Salvar Alterações' : '➕ Cadastrar Solicitação RH' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 0: RESUMO RÁPIDO DO COLABORADOR COM BLUR -->
      @if (quickBlurModal().visible && quickBlurModal().func) {
        @let f = quickBlurModal().func!;
        
        <div class="blur-backdrop">
          <div class="modal-card" style="max-width: 520px; border-top: 5px solid #0b2a52 !important;">
            <div class="modal-header" style="background: #ffffff;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #0b2a52; color: #f7c600; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                  {{ f.primeiro_nome.substring(0, 2).toUpperCase() }}
                </div>
                <div>
                  <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.15rem; font-weight: 800;">
                    {{ f.primeiro_nome }}
                  </h4>
                  <span style="font-size: 0.78rem; color: #64748b; font-weight: 700;">
                    Matrícula LGPD: {{ f.matricula_aleatoria }} | {{ f.setor }}
                  </span>
                </div>
              </div>
              <button (click)="closeQuickBlurModal()" class="icon-btn-sm">✖</button>
            </div>

            <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <h5 style="margin: 0 0 8px 0; color: #b45309; font-size: 0.88rem; font-weight: 800; display: flex; align-items: center; gap: 6px;">
                  ☀️ Últimos Domingos Trabalhados
                </h5>

                @if (quickBlurModal().ultimosDomingos.length > 0) {
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    @for (dom of quickBlurModal().ultimosDomingos; track dom.dataStr) {
                      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.82rem;">
                        <span style="font-weight: 800; color: #0b2a52;">📅 {{ dom.dataStr }}</span>
                        <span style="color: #64748b;">{{ dom.descricao }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <div style="font-size: 0.8rem; color: #64748b; font-style: italic;">
                    Nenhum trabalho aos domingos registrado recentemente.
                  </div>
                }
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <h5 style="margin: 0 0 8px 0; color: #0369a1; font-size: 0.88rem; font-weight: 800; display: flex; align-items: center; gap: 6px;">
                  🎉 Último Feriado Trabalhado
                </h5>

                @if (quickBlurModal().ultimoFeriado) {
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bae6fd;">
                    <div>
                      <strong style="color: #0b2a52; font-size: 0.88rem; display: block;">
                        {{ quickBlurModal().ultimoFeriado!.nome }}
                      </strong>
                      <span style="font-size: 0.76rem; color: #64748b;">
                        Data: {{ quickBlurModal().ultimoFeriado!.dataStr }}
                      </span>
                    </div>
                    <span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px;">
                      Em Serviço
                    </span>
                  </div>
                } @else {
                  <div style="font-size: 0.8rem; color: #64748b; font-style: italic;">
                    Nenhum feriado trabalhado nos últimos registros.
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button (click)="closeQuickBlurModal()" class="btn-premium btn-ghost">Fechar</button>
              <button (click)="navigateToFuncProfile(f)" class="btn-premium btn-yellow-gradient">
                📱 Ver Perfil Detalhado Completo
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 1. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO -->
      @if (confirmModal().visible) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h4 style="margin: 0; color: #dc2626 !important; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                ⚠️ {{ confirmModal().title }}
              </h4>
            </div>
            <div class="modal-body">
              <p style="margin: 0; color: #334155; font-size: 0.95rem; line-height: 1.5; font-weight: 500;">
                {{ confirmModal().message }}
              </p>
            </div>
            <div class="modal-footer">
              <button (click)="closeConfirmModal()" class="btn-premium btn-ghost">
                {{ confirmModal().cancelText || 'Cancelar' }}
              </button>
              <button (click)="executeConfirmModal()" class="btn-premium btn-danger-gradient">
                {{ confirmModal().confirmText || 'Confirmar Exclusão' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 2. MODAL DE EDIÇÃO DE FUNCIONÁRIO -->
      @if (editingFunc()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.1rem; font-weight: 800;">✏️ Editar Colaborador</h4>
              <button (click)="editingFunc.set(null)" class="icon-btn-sm">✖</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label>Primeiro Nome (LGPD)</label>
                <input type="text" [(ngModel)]="editingFunc()!.primeiro_nome" class="form-control" required />
              </div>

              <!-- Setor no Edit -->
              <div class="form-group">
                <label>Setor Operacional</label>
                <select [ngModel]="editingFunc()!.setor" (ngModelChange)="onEditFuncSetorChange($event)" class="form-control">
                  @for (s of setores(); track s.id) {
                    <option [value]="s.nome">{{ s.nome }}</option>
                  }
                </select>
              </div>

              <!-- Cargo no Edit (Filtrado) -->
              <div class="form-group">
                <label>Função / Cargo</label>
                <select [(ngModel)]="editingFunc()!.cargo" class="form-control">
                  @for (c of cargosDoEditSetor(); track c.id) {
                    <option [value]="c.nome">{{ c.nome }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Turno Padrão</label>
                <input type="text" [(ngModel)]="editingFunc()!.turno_padrao" class="form-control" required />
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="editingFunc.set(null)" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="saveEditFuncionario()" class="btn-premium btn-primary-gradient">Salvar Alterações</button>
            </div>
          </div>
        </div>
      }

      <!-- 3. MODAL DE CRIAR / EDITAR SETOR -->
      @if (sectorModal().visible) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.1rem; font-weight: 800;">
                {{ sectorModal().isEdit ? '✏️ Editar Setor' : '➕ Adicionar Novo Setor' }}
              </h4>
              <button (click)="closeSectorModal()" class="icon-btn-sm">✖</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label>Nome do Setor</label>
                <input type="text" [(ngModel)]="sectorModalForm.nome" class="form-control" placeholder="Ex: Recebimento & Logística" required />
              </div>
              <div class="form-group">
                <label>Descrição (Opcional)</label>
                <input type="text" [(ngModel)]="sectorModalForm.descricao" class="form-control" placeholder="Ex: Responsável pelo recebimento de mercadorias" />
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeSectorModal()" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="saveSectorModal()" class="btn-premium btn-yellow-gradient">
                {{ sectorModal().isEdit ? 'Salvar Alterações' : 'Criar Setor' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 4. MODAL DE CRIAR / EDITAR CARGO -->
      @if (cargoModal().visible) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.1rem; font-weight: 800;">
                {{ cargoModal().isEdit ? '✏️ Editar Cargo/Função' : '➕ Adicionar Novo Cargo/Função' }}
              </h4>
              <button (click)="closeCargoModal()" class="icon-btn-sm">✖</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label>Setor Vinculado</label>
                <select [(ngModel)]="cargoModalForm.setor_nome" class="form-control" [disabled]="cargoModal().isEdit">
                  @for (s of setores(); track s.id) {
                    <option [value]="s.nome">{{ s.nome }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Nome da Função / Cargo</label>
                <input type="text" [(ngModel)]="cargoModalForm.nome" class="form-control" placeholder="Ex: Operador de Caixa Senior" required />
              </div>

              <div class="form-group">
                <label>Descrição (Opcional)</label>
                <input type="text" [(ngModel)]="cargoModalForm.descricao" class="form-control" placeholder="Ex: Operação nos caixas rápidos" />
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeCargoModal()" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="saveCargoModal()" class="btn-premium btn-primary-gradient">
                {{ cargoModal().isEdit ? 'Salvar Alterações' : 'Criar Cargo' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 5. MODAL DE CRIAR / EDITAR FERIADO -->
      @if (feriadoModal().visible) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h4 style="margin: 0; color: #0b2a52 !important; font-size: 1.1rem; font-weight: 800;">
                {{ feriadoModal().isEdit ? '✏️ Editar Feriado' : '➕ Cadastrar Novo Feriado' }}
              </h4>
              <button (click)="closeFeriadoModal()" class="icon-btn-sm">✖</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label>Nome do Feriado</label>
                <input type="text" [(ngModel)]="feriadoModalForm.nome" class="form-control" placeholder="Ex: Emancipação de Poções" required />
              </div>

              <div class="form-group">
                <label>Data do Feriado</label>
                <input type="date" [(ngModel)]="feriadoModalForm.data" class="form-control" required />
              </div>

              <div class="form-group">
                <label>Âmbito / Tipo</label>
                <select [(ngModel)]="feriadoModalForm.tipo" (ngModelChange)="onFeriadoTipoChange($event)" class="form-control">
                  <option value="Nacional">Nacional (Brasil)</option>
                  <option value="Estadual">Estadual (Bahia)</option>
                  <option value="Municipal">Municipal (Poções - BA)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Abrangência</label>
                <input type="text" [(ngModel)]="feriadoModalForm.abrangencia" class="form-control" placeholder="Ex: Poções - BA" required />
              </div>

              <div class="form-group">
                <label>Descrição / Observação</label>
                <input type="text" [(ngModel)]="feriadoModalForm.descricao" class="form-control" placeholder="Ex: Feriado municipal comemorativo" />
              </div>
            </div>
            <div class="modal-footer">
              <button (click)="closeFeriadoModal()" class="btn-premium btn-ghost">Cancelar</button>
              <button (click)="saveFeriadoModal()" class="btn-premium btn-yellow-gradient">
                {{ feriadoModal().isEdit ? 'Salvar Alterações' : 'Cadastrar Feriado' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .setor-badge-color {
      color: #ffffff;
      font-weight: 800;
      font-size: 0.76rem;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Cards de Setores */
    .setor-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .setor-card-header {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .setor-card-body {
      padding: 18px 20px;
      flex: 1;
    }
    .cargo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .cargo-item:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .icon-btn-white {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .icon-btn-white:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    .icon-btn-sm {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 0.78rem;
    }
    .icon-btn-sm:hover {
      background: #e2e8f0;
    }
    .icon-btn-sm.danger:hover {
      background: #fee2e2;
    }

    .btn-link {
      background: transparent;
      border: none;
      color: #0b2a52;
      font-weight: 800;
      cursor: pointer;
      padding: 0;
    }
    .btn-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 640px) {
      .no-mobile-text {
        display: none;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly generator = inject(EscalaGeneratorService);
  public readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  userLojas = this.supabase.userLojas;
  activeLoja = this.supabase.activeLoja;
  currentUser = this.supabase.currentUser;

  // Tabs
  activeTab = signal<'dashboard' | 'escala' | 'funcionarios' | 'setores' | 'feriados' | 'regras' | 'detalhes-funcionario'>('dashboard');
  isMobileMenuOpen = signal<boolean>(false);

  selectedMonth = '2026-08';
  selectedSetor = 'Frente de Caixa';

  // Signals de Dados
  funcionarios = signal<Funcionario[]>([]);
  setores = signal<Setor[]>([]);
  cargos = signal<Cargo[]>([]);
  feriados = signal<Feriado[]>([]);
  regras = signal<RegraEscala[]>([]);
  escalaItens = signal<EscalaItem[]>([]);
  saving = signal(false);

  // Perfil Detalhado do Colaborador
  selectedFuncionarioForPage = signal<Funcionario | null>(null);
  selectedMonthHistorico = '2026-08';
  filterTipoHistorico = 'TODOS';

  // Modal de Impressão A4 (Modos + Estilos)
  printModalVisible = signal(false);
  selectedPrintMode = signal<'domingos' | 'semanal' | 'painel-4-a4'>('painel-4-a4');
  activePrintMode = signal<'domingos' | 'semanal' | 'painel-4-a4'>('painel-4-a4');
  printSemanaSelecionada = signal<number>(1);
  printEstilo = signal<'formal' | 'mural-moderno'>('formal');

  // Estrutura dos 4 blocos A4 do painel contínuo
  blocosPainelA4 = [
    { pagina: 1, inicio: 1, fim: 8 },
    { pagina: 2, inicio: 9, fim: 16 },
    { pagina: 3, inicio: 17, fim: 24 },
    { pagina: 4, inicio: 25, fim: 31 }
  ];

  // Filtros Globais Reativos
  searchQuery = signal<string>('');
  filterSetor = signal<string>('');
  filterTipoFeriado = signal<string>('');
  filterTipoRegra = signal<string>('');

  // Filtros Reativos do Dashboard Inicial
  searchQueryDashboard = signal<string>('');
  filterSetorDashboard = signal<string>('');

  // Form de novo funcionário
  novoNome = '';
  novoSetor = signal<string>('Frente de Caixa');
  novoCargo = signal<string>('Operadora de Caixa');
  novoTurno = '08:00 às 16:20';

  dataAtualFormatted = new Date().toLocaleDateString('pt-BR');

  // Modais State
  confirmModal = signal<ConfirmModalData>({ visible: false, title: '', message: '', onConfirm: () => {} });
  editingFunc = signal<Funcionario | null>(null);

  // Quick Blur Modal State
  quickBlurModal = signal<{
    visible: boolean;
    func: Funcionario | null;
    ultimosDomingos: { dataStr: string; descricao: string }[];
    ultimoFeriado: { dataStr: string; nome: string } | null;
  }>({ visible: false, func: null, ultimosDomingos: [], ultimoFeriado: null });

  sectorModal = signal<{ visible: boolean; isEdit: boolean; setorId?: string }>({ visible: false, isEdit: false });
  sectorModalForm = { nome: '', descricao: '' };

  cargoModal = signal<{ visible: boolean; isEdit: boolean; cargoId?: string }>({ visible: false, isEdit: false });
  cargoModalForm = { setor_nome: 'Frente de Caixa', nome: '', descricao: '' };

  feriadoModal = signal<{ visible: boolean; isEdit: boolean; feriadoId?: string }>({ visible: false, isEdit: false });
  feriadoModalForm: { nome: string; data: string; tipo: 'Nacional' | 'Estadual' | 'Municipal'; abrangencia: string; descricao: string } = {
    nome: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'Municipal',
    abrangencia: 'Poções - BA',
    descricao: ''
  };

  regraModal = signal<{ visible: boolean; isEdit: boolean; regraId?: string }>({ visible: false, isEdit: false });
  regraModalForm: { titulo: string; descricao: string; categoria: 'CLT' | 'Acordo Coletivo' | 'Interna RH' | 'Solicitação RH'; obrigatoria: boolean } = {
    titulo: '',
    descricao: '',
    categoria: 'Solicitação RH',
    obrigatoria: false
  };

  // Computeds Reativos
  cargosDoNovoSetor = computed(() => {
    return this.cargos().filter(c => c.setor_nome === this.novoSetor());
  });

  cargosDoEditSetor = computed(() => {
    const ef = this.editingFunc();
    if (!ef) return [];
    return this.cargos().filter(c => c.setor_nome === ef.setor);
  });

  funcionariosFiltrados = computed(() => {
    let list = this.funcionarios();
    const fSetor = this.filterSetor();
    const sQuery = this.searchQuery().toLowerCase().trim();

    if (fSetor) {
      list = list.filter(f => f.setor === fSetor);
    }
    if (sQuery) {
      list = list.filter(f =>
        f.primeiro_nome.toLowerCase().includes(sQuery) ||
        f.matricula_aleatoria.includes(sQuery)
      );
    }
    return list;
  });

  feriadosFiltrados = computed(() => {
    let list = this.feriados();
    const tipo = this.filterTipoFeriado();
    if (tipo) {
      list = list.filter(f => f.tipo === tipo);
    }
    return list.sort((a, b) => a.data.localeCompare(b.data));
  });

  regrasFiltradas = computed(() => {
    let list = this.regras();
    const filtro = this.filterTipoRegra();
    if (filtro) {
      if (filtro === 'IMPLEMENTADA' || filtro === 'PENDENTE_PROGRAMADOR') {
        list = list.filter(r => r.status === filtro);
      } else {
        list = list.filter(r => r.categoria === filtro);
      }
    }
    return list;
  });

  statsRegras = computed(() => {
    const list = this.regras();
    const implementadas = list.filter(r => r.status === 'IMPLEMENTADA').length;
    const pendentes = list.filter(r => r.status === 'PENDENTE_PROGRAMADOR').length;
    return { implementadas, pendentes };
  });

  setoresFiltradosDashboard = computed(() => {
    const fSetor = this.filterSetorDashboard();
    if (fSetor) {
      return this.setores().filter(s => s.nome === fSetor);
    }
    return this.setores();
  });

  diasDoMes = computed(() => {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const total = new Date(ano, mes, 0).getDate();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // Dias da Semana Selecionada para Impressão A4
  diasDaSemanaImpressao = computed(() => {
    const sem = Number(this.printSemanaSelecionada());
    const inicio = (sem - 1) * 7 + 1;
    const fim = Math.min(sem * 7, 31);
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  });

  // Perfil Detalhado do Colaborador: Histórico Computado
  diasHistoricoFiltrados = computed<DiaHistoricoTrabalho[]>(() => {
    const func = this.selectedFuncionarioForPage();
    if (!func) return [];

    const [ano, mes] = this.selectedMonthHistorico.split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    const funcsDoSetor = this.funcionarios().filter(f => f.setor === func.setor);

    const escalaItem = this.generator.gerarEscalaMensal(funcsDoSetor, ano, mes)
      .find(i => i.matricula === func.matricula_aleatoria);

    const result: DiaHistoricoTrabalho[] = [];
    const tipoFilter = this.filterTipoHistorico;

    for (let d = 1; d <= totalDias; d++) {
      const dataObj = new Date(ano, mes - 1, d);
      const diaSemanaStr = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dataStr = dataObj.toISOString().split('T')[0];

      let status = 'TRABALHO';
      if (escalaItem) {
        status = escalaItem.dias[d];
      } else if (dataObj.getDay() === 0) {
        status = 'DOMINGO';
      }
      const tipo: 'TRABALHO' | 'FOLGA' | 'DOMINGO' | 'FERIADO' = (status as any) || 'TRABALHO';

      if (tipoFilter === 'TODOS' || tipoFilter === tipo) {
        result.push({
          dia: d,
          dataStr,
          diaSemana: diaSemanaStr.toUpperCase(),
          tipo
        });
      }
    }

    return result;
  });

  statsColaboradorMes = computed(() => {
    const historico = this.diasHistoricoFiltrados();
    const totalFolgas = historico.filter(h => h.tipo === 'FOLGA').length;
    const domingosTrabalhados = historico.filter(h => h.tipo === 'DOMINGO').length;
    return { totalFolgas, domingosTrabalhados };
  });

  proximoFeriadoInfo = computed(() => {
    const list = this.feriados();
    if (list.length === 0) return { nome: 'Nenhum feriado', dataFormatted: '-', diasRestantesText: 'Nenhum' };

    const hojeStr = new Date().toISOString().split('T')[0];
    const proximos = list.filter(f => f.data >= hojeStr).sort((a, b) => a.data.localeCompare(b.data));
    const target = proximos.length > 0 ? proximos[0] : list[0];

    const targetDate = new Date(target.data + 'T00:00:00');
    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - hojeDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let diasRestantesText = 'Hoje!';
    if (diffDays > 0) {
      diasRestantesText = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffDays < 0) {
      diasRestantesText = 'Passado';
    }

    const dataFormatted = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      nome: target.nome,
      dataFormatted,
      tipo: target.tipo,
      abrangencia: target.abrangencia || 'Brasil',
      diasRestantesText
    };
  });

  folgasHojeInfo = computed(() => {
    const funcs = this.funcionarios();
    const hojeDia = new Date().getDate();
    const ano = new Date().getFullYear();
    const mes = new Date().getMonth() + 1;

    const itens = this.generator.gerarEscalaMensal(funcs, ano, mes);
    const emFolga = itens.filter(item => {
      const status = item.dias[hojeDia];
      return status === 'FOLGA' || status === 'DOMINGO';
    });

    return {
      total: emFolga.length,
      itens: emFolga
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  selectTab(tab: 'dashboard' | 'escala' | 'funcionarios' | 'setores' | 'feriados' | 'regras' | 'detalhes-funcionario') {
    this.activeTab.set(tab);
    this.isMobileMenuOpen.set(false);
  }

  getDiaSemanaAbrev(diaNum: number): string {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, diaNum);
    return dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
  }

  // Quick Blur Modal Controller
  openQuickBlurModal(func: Funcionario) {
    const domingosSimulados = [
      { dataStr: '12/07/2026', descricao: 'Trabalho em escala 6x1 (Revezamento)' },
      { dataStr: '28/06/2026', descricao: 'Trabalho em escala 6x1 (Escala Especial)' }
    ];

    const ultimoFeriadoSimulado = {
      nome: 'São João (Festa Tradicional)',
      dataStr: '24/06/2026'
    };

    this.quickBlurModal.set({
      visible: true,
      func,
      ultimosDomingos: domingosSimulados,
      ultimoFeriado: ultimoFeriadoSimulado
    });
  }

  closeQuickBlurModal() {
    this.quickBlurModal.set({ visible: false, func: null, ultimosDomingos: [], ultimoFeriado: null });
  }

  navigateToFuncProfile(func: Funcionario) {
    this.closeQuickBlurModal();
    this.selectedFuncionarioForPage.set(func);
    this.activeTab.set('detalhes-funcionario');
  }

  // Opções de Impressão A4
  openPrintOptionsModal() {
    this.printModalVisible.set(true);
  }

  executePrint() {
    this.activePrintMode.set(this.selectedPrintMode());
    this.printModalVisible.set(false);
    setTimeout(() => {
      window.print();
    }, 200);
  }

  getDiasIntervalo(inicio: number, fim: number): number[] {
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }

  getDomingosFolga(item: EscalaItem): number {
    return Object.values(item.dias).filter(v => v === 'DOMINGO').length;
  }

  getDomingosTrabalhados(item: EscalaItem): number {
    return Object.values(item.dias).filter(v => v === 'TRABALHO').length;
  }

  getCargoPorMatricula(matricula: string): string {
    const func = this.funcionarios().find(f => f.matricula_aleatoria === matricula);
    return func ? func.cargo : '-';
  }

  getFolgasPorSetor(setorNome: string): Funcionario[] {
    const funcs = this.funcionarios().filter(f => f.setor === setorNome);
    const hojeDia = new Date().getDate();
    const ano = new Date().getFullYear();
    const mes = new Date().getMonth() + 1;

    const itens = this.generator.gerarEscalaMensal(funcs, ano, mes);
    const matriculasFolga = new Set(
      itens.filter(item => item.dias[hojeDia] === 'FOLGA' || item.dias[hojeDia] === 'DOMINGO').map(i => i.matricula)
    );

    return funcs.filter(f => matriculasFolga.has(f.matricula_aleatoria));
  }

  getFolgasPorSetorFiltradas(setorNome: string): Funcionario[] {
    let list = this.getFolgasPorSetor(setorNome);
    const query = this.searchQueryDashboard().toLowerCase().trim();
    if (query) {
      list = list.filter(f =>
        f.primeiro_nome.toLowerCase().includes(query) ||
        f.matricula_aleatoria.includes(query)
      );
    }
    return list;
  }

  getFuncionariosPorSetor(setorNome: string): Funcionario[] {
    return this.funcionarios().filter(f => f.setor === setorNome);
  }

  getRegrasPorCategoria(cat: string): RegraEscala[] {
    return this.regras().filter(r => r.categoria === cat);
  }

  // Cores Oficiais da Tabela em PDF
  getSetorColor(setorNome: string): string {
    const name = setorNome.toLowerCase();
    if (name.includes('caixa') && !name.includes('fiscal')) return '#0b2a52'; // Navy
    if (name.includes('reposi')) return '#16a34a'; // Green
    if (name.includes('lanchonete')) return '#d97706'; // Amber/Yellow
    if (name.includes('açougue') || name.includes('acougue')) return '#dc2626'; // Red
    if (name.includes('padaria')) return '#ea580c'; // Orange
    if (name.includes('fiscal')) return '#7c3aed'; // Purple
    if (name.includes('empilhadeira')) return '#0d9488'; // Teal
    if (name.includes('higieni')) return '#475569'; // Slate
    if (name.includes('manuten')) return '#0284c7'; // Cyan
    return '#0b2a52';
  }

  getFeriadoBadgeColor(tipo: string): string {
    if (tipo === 'Nacional') return '#16a34a'; // Verde
    if (tipo === 'Estadual') return '#d97706'; // Amarelo/Âmbar (Bahia)
    return '#0369a1'; // Azul (Poções)
  }

  formatFeriadoData(dataStr: string): string {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  async onLojaChange(lojaId: string) {
    const loja = this.userLojas().find(l => l.id === lojaId);
    if (loja) {
      this.supabase.setActiveLoja(loja);
      this.toastService.info('Unidade Alterada', `Visualizando dados da loja ${loja.nome}.`);
      await this.loadData();
    }
  }

  async loadData() {
    const loja = this.activeLoja();
    if (!loja) return;

    try {
      const [funcs, sets, crgs, fers, rgrs] = await Promise.all([
        this.supabase.getFuncionarios(loja.id),
        this.supabase.getSetores(),
        this.supabase.getCargos(),
        this.supabase.getFeriados(),
        this.supabase.getRegras()
      ]);

      this.funcionarios.set(funcs);
      this.setores.set(sets);
      this.cargos.set(crgs);
      this.feriados.set(fers);
      this.regras.set(rgrs);

      if (sets.length > 0 && !sets.some(s => s.nome === this.selectedSetor)) {
        this.selectedSetor = sets[0].nome;
      }
      this.syncNovoSetorAndCargo();

      await this.loadEscala();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      this.toastService.error('Erro ao Carregar Dados', 'Não foi possível buscar as informações no Supabase.');
    }
  }

  syncNovoSetorAndCargo() {
    if (this.setores().length > 0 && !this.novoSetor()) {
      this.novoSetor.set(this.setores()[0].nome);
    }
    const availableCargos = this.cargosDoNovoSetor();
    if (availableCargos.length > 0 && !availableCargos.some(c => c.nome === this.novoCargo())) {
      this.novoCargo.set(availableCargos[0].nome);
    }
  }

  onNovoSetorChange(setorNome: string) {
    this.novoSetor.set(setorNome);
    const available = this.cargos().filter(c => c.setor_nome === setorNome);
    if (available.length > 0) {
      this.novoCargo.set(available[0].nome);
    } else {
      this.novoCargo.set('');
    }
  }

  getCargosDoSetor(setorNome: string): Cargo[] {
    return this.cargos().filter(c => c.setor_nome === setorNome);
  }

  async loadEscala() {
    const loja = this.activeLoja();
    if (!loja) return;

    const mesRef = `${this.selectedMonth}-01`;
    try {
      const escala = await this.supabase.getEscala(loja.id, mesRef, this.selectedSetor);
      if (escala?.dados?.itens) {
        this.escalaItens.set(escala.dados.itens);
      } else {
        this.escalaItens.set([]);
      }
    } catch (err) {
      console.error('Erro ao carregar escala:', err);
    }
  }

  gerarNovaEscala() {
    const funcsDoSetor = this.funcionarios().filter(f => f.setor === this.selectedSetor);
    if (funcsDoSetor.length === 0) {
      this.toastService.warning('Sem Colaboradores Ativos', `Nenhum colaborador ativo cadastrado para o setor "${this.selectedSetor}".`);
      return;
    }

    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const gerada = this.generator.gerarEscalaMensal(funcsDoSetor, ano, mes);
    this.escalaItens.set(gerada);
    this.toastService.success('Escala Gerada!', `Matriz 6x1 calculada com sucesso para ${funcsDoSetor.length} colaboradores.`);
  }

  async salvarEscala() {
    const loja = this.activeLoja();
    if (!loja) return;

    if (this.escalaItens().length === 0) {
      this.toastService.warning('Atenção', 'Gere ou altere uma escala antes de salvar.');
      return;
    }

    this.saving.set(true);
    const [ano, mes] = this.selectedMonth.split('-').map(Number);

    const escalaObj: Escala = {
      loja_id: loja.id,
      mes_referencia: `${this.selectedMonth}-01`,
      setor: this.selectedSetor,
      dados: {
        ano,
        mes,
        itens: this.escalaItens()
      }
    };

    try {
      await this.supabase.saveEscala(escalaObj);
      this.toastService.success('Salvo no Supabase!', `Escala de ${this.selectedSetor} salva com sucesso.`);
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar', err.message);
    } finally {
      this.saving.set(false);
    }
  }

  async cadastrarFuncionario() {
    const loja = this.activeLoja();
    if (!loja) return;

    if (!this.novoNome) {
      this.toastService.warning('Campo Obrigatório', 'Informe o primeiro nome do colaborador.');
      return;
    }

    if (!this.novoSetor() || !this.novoCargo()) {
      this.toastService.warning('Campo Obrigatório', 'Selecione um setor e uma função/cargo válida.');
      return;
    }

    try {
      const added = await this.supabase.addFuncionario({
        loja_id: loja.id,
        primeiro_nome: this.novoNome,
        setor: this.novoSetor(),
        cargo: this.novoCargo(),
        turno_padrao: this.novoTurno,
        ativo: true
      });

      this.toastService.success('Colaborador Cadastrado!', `${added.primeiro_nome} (Matrícula: ${added.matricula_aleatoria}) adicionado com sucesso.`);
      this.novoNome = '';
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Cadastrar', err.message);
    }
  }

  // --- MODAL DE EDIÇÃO DE FUNCIONÁRIO ---
  openEditFuncModal(func: Funcionario) {
    this.editingFunc.set({ ...func });
  }

  onEditFuncSetorChange(newSetor: string) {
    const ef = this.editingFunc();
    if (!ef) return;
    ef.setor = newSetor;
    const available = this.cargos().filter(c => c.setor_nome === newSetor);
    if (available.length > 0) {
      ef.cargo = available[0].nome;
    } else {
      ef.cargo = '';
    }
    this.editingFunc.set({ ...ef });
  }

  async saveEditFuncionario() {
    const ef = this.editingFunc();
    if (!ef) return;

    try {
      await this.supabase.updateFuncionario(ef);
      this.toastService.success('Cadastro Atualizado!', `Dados de ${ef.primeiro_nome} atualizados com sucesso.`);
      this.editingFunc.set(null);
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Atualizar', err.message);
    }
  }

  confirmSoftDeleteFuncionario(func: Funcionario) {
    this.confirmModal.set({
      visible: true,
      title: 'Confirmar Exclusão de Colaborador',
      message: `Tem certeza que deseja desativar o colaborador "${func.primeiro_nome}" (Matrícula: ${func.matricula_aleatoria})? Esta ação realiza exclusão lógica (soft-delete) preservando registros fiscais/CLT.`,
      confirmText: 'Sim, Excluir Colaborador',
      onConfirm: async () => {
        if (func.id) {
          await this.supabase.softDeleteFuncionario(func.id);
          this.toastService.warning('Colaborador Desativado', `${func.primeiro_nome} foi desativado (soft-delete CLT).`);
          await this.loadData();
        }
      }
    });
  }

  // --- MODAL DE CONFIRMAÇÃO GENÉRICO ---
  closeConfirmModal() {
    this.confirmModal.set({ visible: false, title: '', message: '', onConfirm: () => {} });
  }

  async executeConfirmModal() {
    const modal = this.confirmModal();
    if (modal.onConfirm) {
      await modal.onConfirm();
    }
    this.closeConfirmModal();
  }

  // --- MODAIS DE SETOR ---
  openAddSetorModal() {
    this.sectorModalForm = { nome: '', descricao: '' };
    this.sectorModal.set({ visible: true, isEdit: false });
  }

  openEditSetorModal(setor: Setor) {
    this.sectorModalForm = { nome: setor.nome, descricao: setor.descricao || '' };
    this.sectorModal.set({ visible: true, isEdit: true, setorId: setor.id });
  }

  closeSectorModal() {
    this.sectorModal.set({ visible: false, isEdit: false });
  }

  async saveSectorModal() {
    if (!this.sectorModalForm.nome.trim()) {
      this.toastService.warning('Campo Obrigatório', 'Informe o nome do setor.');
      return;
    }
    const sm = this.sectorModal();
    try {
      if (sm.isEdit && sm.setorId) {
        await this.supabase.updateSetor(sm.setorId, this.sectorModalForm.nome.trim(), this.sectorModalForm.descricao.trim());
        this.toastService.success('Setor Atualizado', `Setor "${this.sectorModalForm.nome}" alterado com sucesso.`);
      } else {
        await this.supabase.addSetor(this.sectorModalForm.nome.trim(), this.sectorModalForm.descricao.trim());
        this.toastService.success('Novo Setor Criado', `Setor "${this.sectorModalForm.nome}" adicionado com sucesso.`);
      }
      this.closeSectorModal();
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar Setor', err.message);
    }
  }

  confirmDeleteSetor(setor: Setor) {
    this.confirmModal.set({
      visible: true,
      title: 'Confirmar Exclusão de Setor',
      message: `Tem certeza que deseja excluir o setor "${setor.nome}"? Isso removerá os cargos vinculados a ele.`,
      confirmText: 'Excluir Setor',
      onConfirm: async () => {
        await this.supabase.deleteSetor(setor.id);
        this.toastService.warning('Setor Removido', `Setor "${setor.nome}" removido do sistema.`);
        await this.loadData();
      }
    });
  }

  // --- MODAIS DE CARGO ---
  openAddCargoModal(defaultSetor?: string) {
    const setorInicial = defaultSetor || (this.setores().length > 0 ? this.setores()[0].nome : '');
    this.cargoModalForm = { setor_nome: setorInicial, nome: '', descricao: '' };
    this.cargoModal.set({ visible: true, isEdit: false });
  }

  openEditCargoModal(cargo: Cargo) {
    this.cargoModalForm = { setor_nome: cargo.setor_nome, nome: cargo.nome, descricao: cargo.descricao || '' };
    this.cargoModal.set({ visible: true, isEdit: true, cargoId: cargo.id });
  }

  closeCargoModal() {
    this.cargoModal.set({ visible: false, isEdit: false });
  }

  async saveCargoModal() {
    if (!this.cargoModalForm.nome.trim()) {
      this.toastService.warning('Campo Obrigatório', 'Informe o nome do cargo/função.');
      return;
    }
    const cm = this.cargoModal();
    try {
      if (cm.isEdit && cm.cargoId) {
        await this.supabase.updateCargo(cm.cargoId, this.cargoModalForm.nome.trim(), this.cargoModalForm.descricao.trim());
        this.toastService.success('Cargo Atualizado', `Cargo "${this.cargoModalForm.nome}" alterado com sucesso.`);
      } else {
        await this.supabase.addCargo(this.cargoModalForm.setor_nome, this.cargoModalForm.nome.trim(), this.cargoModalForm.descricao.trim());
        this.toastService.success('Novo Cargo Criado', `Cargo "${this.cargoModalForm.nome}" adicionado ao setor ${this.cargoModalForm.setor_nome}.`);
      }
      this.closeCargoModal();
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar Cargo', err.message);
    }
  }

  confirmDeleteCargo(cargo: Cargo) {
    this.confirmModal.set({
      visible: true,
      title: 'Confirmar Exclusão de Cargo',
      message: `Tem certeza que deseja excluir o cargo/função "${cargo.nome}" do setor "${cargo.setor_nome}"?`,
      confirmText: 'Excluir Cargo',
      onConfirm: async () => {
        await this.supabase.deleteCargo(cargo.id);
        this.toastService.warning('Cargo Removido', `Cargo "${cargo.nome}" removido do sistema.`);
        await this.loadData();
      }
    });
  }

  // --- MODAIS DE FERIADO ---
  openAddFeriadoModal() {
    this.feriadoModalForm = {
      nome: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'Municipal',
      abrangencia: 'Poções - BA',
      descricao: ''
    };
    this.feriadoModal.set({ visible: true, isEdit: false });
  }

  openEditFeriadoModal(feriado: Feriado) {
    let abrangencia = feriado.abrangencia;
    if (!abrangencia) {
      if (feriado.tipo === 'Municipal') {
        abrangencia = 'Poções - BA';
      } else if (feriado.tipo === 'Estadual') {
        abrangencia = 'Bahia';
      } else {
        abrangencia = 'Brasil';
      }
    }

    this.feriadoModalForm = {
      nome: feriado.nome,
      data: feriado.data,
      tipo: feriado.tipo,
      abrangencia,
      descricao: feriado.descricao || ''
    };
    this.feriadoModal.set({ visible: true, isEdit: true, feriadoId: feriado.id });
  }

  onFeriadoTipoChange(tipo: 'Nacional' | 'Estadual' | 'Municipal') {
    if (tipo === 'Municipal') this.feriadoModalForm.abrangencia = 'Poções - BA';
    else if (tipo === 'Estadual') this.feriadoModalForm.abrangencia = 'Bahia';
    else this.feriadoModalForm.abrangencia = 'Brasil';
  }

  closeFeriadoModal() {
    this.feriadoModal.set({ visible: false, isEdit: false });
  }

  async saveFeriadoModal() {
    if (!this.feriadoModalForm.nome.trim() || !this.feriadoModalForm.data) {
      this.toastService.warning('Campos Obrigatórios', 'Informe o nome e a data do feriado.');
      return;
    }
    const fm = this.feriadoModal();
    try {
      if (fm.isEdit && fm.feriadoId) {
        await this.supabase.updateFeriado({
          id: fm.feriadoId,
          nome: this.feriadoModalForm.nome.trim(),
          data: this.feriadoModalForm.data,
          tipo: this.feriadoModalForm.tipo,
          abrangencia: this.feriadoModalForm.abrangencia.trim(),
          descricao: this.feriadoModalForm.descricao.trim()
        });
        this.toastService.success('Feriado Atualizado', `Feriado "${this.feriadoModalForm.nome}" alterado com sucesso.`);
      } else {
        await this.supabase.addFeriado({
          nome: this.feriadoModalForm.nome.trim(),
          data: this.feriadoModalForm.data,
          tipo: this.feriadoModalForm.tipo,
          abrangencia: this.feriadoModalForm.abrangencia.trim(),
          descricao: this.feriadoModalForm.descricao.trim()
        });
        this.toastService.success('Feriado Cadastrado', `Feriado "${this.feriadoModalForm.nome}" cadastrado com sucesso.`);
      }
      this.closeFeriadoModal();
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar Feriado', err.message);
    }
  }

  confirmDeleteFeriado(feriado: Feriado) {
    this.confirmModal.set({
      visible: true,
      title: 'Confirmar Exclusão de Feriado',
      message: `Tem certeza que deseja excluir o feriado "${feriado.nome}" (${this.formatFeriadoData(feriado.data)})?`,
      confirmText: 'Excluir Feriado',
      onConfirm: async () => {
        await this.supabase.deleteFeriado(feriado.id);
        this.toastService.warning('Feriado Removido', `Feriado "${feriado.nome}" excluído com sucesso.`);
        await this.loadData();
      }
    });
  }

  // --- MODAIS DE REGRAS DE ESCALA ---
  openAddRegraModal() {
    this.regraModalForm = {
      titulo: '',
      descricao: '',
      categoria: 'Solicitação RH',
      obrigatoria: false
    };
    this.regraModal.set({ visible: true, isEdit: false });
  }

  openEditRegraModal(regra: RegraEscala) {
    this.regraModalForm = {
      titulo: regra.titulo,
      descricao: regra.descricao,
      categoria: regra.categoria,
      obrigatoria: regra.obrigatoria
    };
    this.regraModal.set({ visible: true, isEdit: true, regraId: regra.id });
  }

  closeRegraModal() {
    this.regraModal.set({ visible: false, isEdit: false });
  }

  async saveRegraModal() {
    if (!this.regraModalForm.titulo.trim() || !this.regraModalForm.descricao.trim()) {
      this.toastService.warning('Campos Obrigatórios', 'Informe o título e a descrição da regra.');
      return;
    }
    const rm = this.regraModal();
    try {
      if (rm.isEdit && rm.regraId) {
        const existing = this.regras().find(r => r.id === rm.regraId);
        await this.supabase.updateRegra({
          id: rm.regraId,
          titulo: this.regraModalForm.titulo.trim(),
          descricao: this.regraModalForm.descricao.trim(),
          categoria: this.regraModalForm.categoria,
          status: existing ? existing.status : 'PENDENTE_PROGRAMADOR',
          obrigatoria: this.regraModalForm.obrigatoria
        });
        this.toastService.success('Regra Atualizada', `Regra "${this.regraModalForm.titulo}" alterada com sucesso.`);
      } else {
        await this.supabase.addRegra({
          titulo: this.regraModalForm.titulo.trim(),
          descricao: this.regraModalForm.descricao.trim(),
          categoria: this.regraModalForm.categoria,
          status: 'PENDENTE_PROGRAMADOR',
          obrigatoria: this.regraModalForm.obrigatoria
        });
        this.toastService.success('Solicitação RH Registrada!', `Nova regra "${this.regraModalForm.titulo}" cadastrada para o programador codificar.`);
      }
      this.closeRegraModal();
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar Regra', err.message);
    }
  }

  confirmDeleteRegra(regra: RegraEscala) {
    this.confirmModal.set({
      visible: true,
      title: 'Confirmar Exclusão de Regra',
      message: `Tem certeza que deseja excluir a regra "${regra.titulo}"?`,
      confirmText: 'Excluir Regra',
      onConfirm: async () => {
        await this.supabase.deleteRegra(regra.id);
        this.toastService.warning('Regra Removida', `Regra "${regra.titulo}" excluída com sucesso.`);
        await this.loadData();
      }
    });
  }

  // Visual Helpers
  getDiaClass(tipo: string): string {
    if (tipo === 'FOLGA') return 'status-folga';
    if (tipo === 'DOMINGO') return 'status-domingo';
    return 'status-trabalho';
  }

  getDiaLabel(tipo: string): string {
    if (tipo === 'FOLGA') return 'F';
    if (tipo === 'DOMINGO') return 'D';
    return 'T';
  }

  async handleLogout() {
    await this.supabase.logout();
    this.toastService.info('Sessão Encerrada', 'Você saiu do sistema.');
    this.router.navigate(['/login']);
  }
}
