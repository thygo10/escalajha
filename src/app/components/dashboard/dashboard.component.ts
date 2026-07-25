import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { EscalaGeneratorService } from '../../services/escala-generator.service';
import { ToastService } from '../../services/toast.service';
import { Funcionario, Escala, EscalaItem, Setor, Cargo, Feriado, RegraEscala, DiaHistoricoTrabalho } from '../../models/types';
import { IconComponent } from '../shared/icon.component';

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
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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

  private readonly now = new Date();
  readonly currentYearMonth = `${this.now.getFullYear()}-${String(this.now.getMonth() + 1).padStart(2, '0')}`;

  private _selectedMonth = this.currentYearMonth;
  get selectedMonth() { return this._selectedMonth; }
  set selectedMonth(val: string) {
    this._selectedMonth = val;
    this.triggerRecalculoEscala.update(v => v + 1);
    const [ano, mes] = val.split('-').map(Number);
    this.generator.invalidateCache(ano, mes);
  }

  private _selectedSetor = 'Frente de Caixa';
  get selectedSetor() { return this._selectedSetor; }
  set selectedSetor(val: string) {
    this._selectedSetor = val;
    this.triggerRecalculoEscala.update(v => v + 1);
  }

  // Gatilho manual para forçar re-cálculo da escala completa quando mês/setor mudam
  triggerRecalculoEscala = signal<number>(0);

  // Cache central da escala gerada para a loja inteira (todas as pessoas ativas no mês atual)
  escalaCompletaDaLojaCache = computed(() => {
    this.triggerRecalculoEscala();
    const funcs = this.funcionarios().filter(f => f.ativo);
    const feriados = this.feriados();
    const [ano, mes] = this.selectedMonth.split('-').map(Number);

    return this.generator.gerarEscalaMensalCached(funcs, ano, mes, {
      permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
      diasPermitidosFolga: this.diasPermitidosFolga(),
      feriados
    });
  });

  folgasPorSetorMap = computed(() => {
    const hojeDia = new Date().getDate();
    const itens = this.escalaCompletaDaLojaCache();
    const funcs = this.funcionarios();
    const map = new Map<string, Funcionario[]>();
    
    for (const setor of this.setores()) {
      const matriculasFolga = new Set(
        itens.filter(i => {
          if (i.setor !== setor.nome) return false;
          const s = i.dias[hojeDia];
          return s === 'F' || s === 'FD' || s === 'FE';
        }).map(i => i.matricula)
      );
      map.set(setor.nome, funcs.filter(f => matriculasFolga.has(f.matricula_aleatoria)));
    }
    return map;
  });

  // Configurações 6x1 Giratória (Convenção Coletiva)
  permitirDoisDiasConsecutivos = signal<boolean>(false);
  diasPermitidosFolga = signal<number[]>([0, 1, 2, 3, 4, 5, 6]); // 0=Dom, 1=Seg, 2=Ter...

  userInitials = computed(() => {
    const email = this.currentUser()?.email || 'gestor@empresa.com';
    const clean = email.split('@')[0].toUpperCase();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      return (parts[0][0] + (parts[1]?.[0] || '')).substring(0, 2);
    }
    if (clean.length >= 2) {
      return clean.substring(0, 2);
    }
    return 'RH';
  });

  // Signals de Dados
  funcionarios = signal<Funcionario[]>([]);
  setores = signal<Setor[]>([]);
  cargos = signal<Cargo[]>([]);
  feriados = signal<Feriado[]>([]);
  regras = signal<RegraEscala[]>([]);
  escalaItens = signal<EscalaItem[]>([]);
  saving = signal(false);
  isLoading = signal(true);

  // Breadcrumb label como computed — substitui 7 @if no template
  breadcrumbLabel = computed(() => {
    const tab = this.activeTab();
    const labels: Record<string, string> = {
      'dashboard': 'Visão Geral',
      'escala': 'Escala Mensal de Folgas',
      'funcionarios': 'Colaboradores',
      'setores': 'Setores & Cargos',
      'feriados': 'Feriados Registrados',
      'regras': 'Regras de Escala',
      'detalhes-funcionario': `Perfil de ${this.selectedFuncionarioForPage()?.primeiro_nome ?? '...'}`
    };
    return labels[tab] ?? tab;
  });

  // Perfil Detalhado do Colaborador
  selectedFuncionarioForPage = signal<Funcionario | null>(null);
  selectedMonthHistorico = signal(this.currentYearMonth);
  filterTipoHistorico = 'TODOS';

  // Modal de Impressão A4 (Modos + Estilos)
  printModalVisible = signal(false);
  selectedPrintMode = signal<'domingos' | 'semanal' | 'painel-4-a4'>('semanal');
  activePrintMode = signal<'domingos' | 'semanal' | 'painel-4-a4'>('semanal');
  printSemanaSelecionada = signal<number>(1);
  printEstilo = signal<'mural-folgas' | 'formal' | 'mural-moderno'>('mural-folgas');
  mostrarApenasFolgasImpressao = signal<boolean>(false);

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
  novoGenero: 'M' | 'F' = 'F';

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
  feriadoModalForm: { nome: string; data: string; tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo'; abrangencia: string; descricao: string; funcionamento_proibido: boolean } = {
    nome: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'Municipal',
    abrangencia: 'Poções - BA',
    descricao: '',
    funcionamento_proibido: false
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

  // Perfil Detalhado do Colaborador: Histórico Computado Completo (Sem Filtros)
  diasHistoricoCompleto = computed<DiaHistoricoTrabalho[]>(() => {
    const func = this.selectedFuncionarioForPage();
    if (!func) return [];

    const [ano, mes] = this.selectedMonthHistorico().split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    const funcsDoSetor = this.funcionarios().filter(f => f.setor === func.setor);

    const escalaItem = this.generator.gerarEscalaMensalCached(funcsDoSetor, ano, mes)
      .find(i => i.matricula === func.matricula_aleatoria);

    const result: DiaHistoricoTrabalho[] = [];

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
      
      // Mapear status atualizado para tipos do histórico
      let tipo: 'TRABALHO' | 'FOLGA' | 'DOMINGO' | 'FERIADO' = 'TRABALHO';
      if (status === 'F' || status === 'FD' || status === 'FE') tipo = 'FOLGA';
      else if (status === 'TD' || status === 'DOMINGO') tipo = 'DOMINGO';
      else if (status === 'TF') tipo = 'FERIADO';
      else tipo = 'TRABALHO';

      result.push({
        dia: d,
        dataStr,
        diaSemana: diaSemanaStr.toUpperCase(),
        tipo
      });
    }

    return result;
  });

  // Perfil Detalhado do Colaborador: Histórico Filtrado para exibição
  diasHistoricoFiltrados = computed<DiaHistoricoTrabalho[]>(() => {
    const completo = this.diasHistoricoCompleto();
    const tipoFilter = this.filterTipoHistorico;
    if (tipoFilter === 'TODOS') return completo;
    return completo.filter(d => d.tipo === tipoFilter);
  });

  statsColaboradorMes = computed(() => {
    const historico = this.diasHistoricoCompleto();
    const totalFolgas = historico.filter(h => h.tipo === 'FOLGA').length;
    const domingosTrabalhados = historico.filter(h => {
      const [ano, mes] = this.selectedMonthHistorico().split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, h.dia);
      return dataObj.getDay() === 0 && h.tipo === 'TRABALHO';
    }).length;
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
    const hojeDia = new Date().getDate();
    const itens = this.escalaCompletaDaLojaCache();
    
    const emFolga = itens.filter(item => {
      const status = item.dias[hojeDia];
      return status === 'F' || status === 'FD' || status === 'FE';
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
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const funcsDoSetor = this.funcionarios().filter(f => f.setor === func.setor);
    const escalaItem = this.generator.gerarEscalaMensalCached(funcsDoSetor, ano, mes, {
      permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
      diasPermitidosFolga: this.diasPermitidosFolga()
    }).find(i => i.matricula === func.matricula_aleatoria);

    const domingosReais: { dataStr: string; descricao: string }[] = [];
    if (escalaItem) {
      const totalDias = new Date(ano, mes, 0).getDate();
      for (let d = 1; d <= totalDias; d++) {
        const dateObj = new Date(ano, mes - 1, d);
        if (dateObj.getDay() === 0) {
          const status = escalaItem.dias[d];
          const dataStr = dateObj.toLocaleDateString('pt-BR');
          if (status === 'TD') {
            domingosReais.push({ dataStr, descricao: 'Trabalho em escala 6x1 (Revezamento)' });
          }
        }
      }
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    const feriadosPassados = this.feriados()
      .filter(f => f.data <= hojeStr)
      .sort((a, b) => b.data.localeCompare(a.data));

    const ultimoFeriadoReal = feriadosPassados.length > 0 ? {
      nome: feriadosPassados[0].nome,
      dataStr: this.formatFeriadoData(feriadosPassados[0].data)
    } : null;

    this.quickBlurModal.set({
      visible: true,
      func,
      ultimosDomingos: domingosReais,
      ultimoFeriado: ultimoFeriadoReal
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
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    return Object.entries(item.dias).filter(([dia, status]) => {
      const dateObj = new Date(ano, mes - 1, Number(dia));
      return dateObj.getDay() === 0 && (status === 'T' || status === 'TD' || status === 'TF');
    }).length;
  }

  getCargoPorMatricula(matricula: string): string {
    const func = this.funcionarios().find(f => f.matricula_aleatoria === matricula);
    return func ? func.cargo : '-';
  }

  getFolgasPorSetorFiltradas(setorNome: string): Funcionario[] {
    let list = this.folgasPorSetorMap().get(setorNome) ?? [];
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

  getCoberturaPercent(setorNome: string): number {
    const total = this.getFuncionariosPorSetor(setorNome).length;
    if (total === 0) return 100;
    const hojeDia = new Date().getDate();
    const emFolga = this.escalaCompletaDaLojaCache()
      .filter(i => {
        if (i.setor !== setorNome) return false;
        const s = i.dias[hojeDia];
        return s === 'F' || s === 'FD' || s === 'FE';
      }).length;
    return Math.round(((total - emFolga) / total) * 100);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.quickBlurModal().visible) { this.closeQuickBlurModal(); return; }
    if (this.confirmModal().visible)   { this.closeConfirmModal(); return; }
    if (this.editingFunc())            { this.editingFunc.set(null); return; }
    if (this.sectorModal().visible)    { this.closeSectorModal(); return; }
    if (this.cargoModal().visible)     { this.closeCargoModal(); return; }
    if (this.feriadoModal().visible)   { this.closeFeriadoModal(); return; }
    if (this.regraModal().visible)     { this.closeRegraModal(); return; }
    if (this.printModalVisible())      { this.printModalVisible.set(false); return; }
  }

  getRegrasPorCategoria(cat: string): RegraEscala[] {
    return this.regras().filter(r => r.categoria === cat);
  }

  getSetorColor(setorNome: string): string {
    const name = setorNome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (name.includes('caixa') && !name.includes('fiscal')) return '#0b2a52';
    if (name.includes('reposi')) return '#16a34a';
    if (name.includes('lanchonete')) return '#d97706';
    if (name.includes('acougue')) return '#dc2626';
    if (name.includes('padaria')) return '#ea580c';
    if (name.includes('fiscal')) return '#7c3aed';
    if (name.includes('empilhadeira')) return '#0d9488';
    if (name.includes('higieni')) return '#475569';
    if (name.includes('manuten')) return '#0284c7';
    return '#0b2a52';
  }

  getFeriadoBadgeColor(tipo: string): string {
    if (tipo === 'Nacional') return '#16a34a';
    if (tipo === 'Estadual') return '#d97706';
    return '#0369a1';
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
    this.isLoading.set(true);

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
    } finally {
      this.isLoading.set(false);
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

  toggleDiaFolgaPermitido(diaSemana: number) {
    this.diasPermitidosFolga.update(current => {
      if (current.includes(diaSemana)) {
        if (current.length === 1) {
          this.toastService.warning('Atenção', 'Selecione pelo menos 1 dia da semana para folgas.');
          return current;
        }
        return current.filter(d => d !== diaSemana);
      } else {
        return [...current, diaSemana].sort((a, b) => a - b);
      }
    });
  }

  isDiaFolgaPermitido(diaSemana: number): boolean {
    return this.diasPermitidosFolga().includes(diaSemana);
  }

  getDiaSemanaAbrevUpper(dia: number): string {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    const name = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
    return name.replace('-FEIRA', '');
  }

  getFolgasPorSetorEDia(setorNome: string, dia: number): string[] {
    let itensSetor = this.escalaItens().filter(item => item.setor === setorNome);
    if (itensSetor.length === 0) {
      // Usa o cache ao invés de recalcular do zero!
      itensSetor = this.escalaCompletaDaLojaCache().filter(item => item.setor === setorNome);
    }

    const folgados: string[] = [];
    itensSetor.forEach(item => {
      const status = item.dias[dia];
      if (status === 'F' || status === 'FD' || status === 'FE') {
        folgados.push(item.nome);
      }
    });

    return folgados;
  }

  gerarNovaEscala() {
    const funcsDoSetor = this.funcionarios().filter(f => f.setor === this.selectedSetor && f.ativo);
    if (funcsDoSetor.length === 0) {
      this.toastService.warning('Sem Colaboradores Ativos', `Nenhum colaborador ativo cadastrado para o setor "${this.selectedSetor}".`);
      return;
    }

    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const gerada = this.generator.gerarEscalaMensal(funcsDoSetor, ano, mes, {
      permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
      diasPermitidosFolga: this.diasPermitidosFolga(),
      feriados: this.feriados()
    });
    this.escalaItens.set(gerada);
    this.triggerRecalculoEscala.update(v => v + 1); // Atualiza os computeds de cache
    this.toastService.success('Escala Gerada!', `Escala 6x1 Giratória calculada com sucesso para ${funcsDoSetor.length} colaboradores.`);
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
        genero: this.novoGenero,
        ativo: true
      });

      this.toastService.success('Colaborador Cadastrado!', `${added.primeiro_nome} (Matrícula: ${added.matricula_aleatoria}) adicionado com sucesso.`);
      this.novoNome = '';
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Erro ao Cadastrar', err.message);
    }
  }

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

  closeConfirmModal() {
    this.confirmModal.set({ visible: false, title: '', message: '', onConfirm: () => {} });
  }

  async executeConfirmModal() {
    const modal = this.confirmModal();
    if (modal.onConfirm) {
      try {
        await modal.onConfirm();
      } catch (err: any) {
        this.toastService.error('Erro na Operação', 'Falha ao processar requisição: ' + (err.message || 'Erro de rede.'));
      } finally {
        this.closeConfirmModal();
      }
    } else {
      this.closeConfirmModal();
    }
  }

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

  openAddFeriadoModal() {
    this.feriadoModalForm = {
      nome: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'Municipal',
      abrangencia: 'Poções - BA',
      descricao: '',
      funcionamento_proibido: false
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
      descricao: feriado.descricao || '',
      funcionamento_proibido: feriado.funcionamento_proibido || false
    };
    this.feriadoModal.set({ visible: true, isEdit: true, feriadoId: feriado.id });
  }

  onFeriadoTipoChange(tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo') {
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
          descricao: this.feriadoModalForm.descricao.trim(),
          funcionamento_proibido: this.feriadoModalForm.funcionamento_proibido
        });
        this.toastService.success('Feriado Atualizado', `Feriado "${this.feriadoModalForm.nome}" alterado com sucesso.`);
      } else {
        await this.supabase.addFeriado({
          nome: this.feriadoModalForm.nome.trim(),
          data: this.feriadoModalForm.data,
          tipo: this.feriadoModalForm.tipo,
          abrangencia: this.feriadoModalForm.abrangencia.trim(),
          descricao: this.feriadoModalForm.descricao.trim(),
          funcionamento_proibido: this.feriadoModalForm.funcionamento_proibido
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
