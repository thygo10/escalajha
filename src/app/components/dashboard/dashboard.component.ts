import { Component, OnInit, inject, signal, computed, HostListener, ChangeDetectionStrategy, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { EscalaGeneratorService } from '../../services/escala-generator.service';
import { ToastService } from '../../services/toast.service';
import { Loja, Funcionario, Escala, EscalaItem, TipoDia, Setor, Cargo, Feriado, RegraEscala, DiaHistoricoTrabalho, TurnoConfig, IntervaloOption, ValidacaoEscalaResultado, ModeloEscala, RegraConformidade, HorarioPresenca, ResumoFuncionarioMetrics, EstadoTransicao } from '../../models/types';
import { IconComponent } from '../shared/icon.component';
import { HORARIOS_FIXOS_CAIXA, HORARIOS_FIXOS_FISCAL, INITIAL_REGRAS_CONFORMIDADE } from '../../models/mock-data';

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
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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

  // Data centralizada — evita múltiplas instâncias de Date inconsistentes (BUG-P4)
  private readonly _hoje = new Date();
  readonly hojeDia = this._hoje.getDate();
  readonly hojeStr = this._hoje.toISOString().split('T')[0];
  readonly currentYearMonth = `${this._hoje.getFullYear()}-${String(this._hoje.getMonth() + 1).padStart(2, '0')}`;

  // Mapa de rascunhos em memória para persistência entre trocas de abas/setores
  draftEscalasMap = signal<Map<string, EscalaItem[]>>(new Map());

  private _selectedMonth = this.currentYearMonth;
  get selectedMonth() { return this._selectedMonth; }
  set selectedMonth(val: string) {
    this._selectedMonth = val;
    this.triggerRecalculoEscala.update((v: number) => v + 1);
    const [ano, mes] = val.split('-').map(Number);
    this.generator.invalidateCache(ano, mes);
    this.onMonthOrSetorChange();
  }

  private _selectedSetor = 'Frente de Caixa';
  get selectedSetor() { return this._selectedSetor; }
  set selectedSetor(val: string) {
    this._selectedSetor = val;
    const lower = val.toLowerCase();
    if (lower.includes('caixa') && !lower.includes('fiscal')) {
      this.minFuncionariosPorDiaSetor.set(6);
    } else {
      this.minFuncionariosPorDiaSetor.set(2);
    }
    this.triggerRecalculoEscala.update((v: number) => v + 1);
    this.onMonthOrSetorChange();
  }

  onMonthOrSetorChange() {
    const key = `${this.activeLoja()?.id || 'loja-02-demo'}|${this.selectedMonth}|${this.selectedSetor}`;
    const draft = this.draftEscalasMap().get(key);
    if (draft) {
      this.escalaItens.set(draft);
    } else {
      this.loadEscala();
    }
  }

  // Gatilho manual para forçar re-cálculo da escala completa quando mês/setor mudam
  triggerRecalculoEscala = signal<number>(0);

  // Cache central da escala gerada para a loja inteira (todas as pessoas ativas no mês atual)
  escalaCompletaDaLojaCache = computed(() => {
    this.triggerRecalculoEscala();
    const funcs = this.funcionarios().filter((f: Funcionario) => f.ativo);
    const feriados = this.feriados();
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const funcsMap = new Map(funcs.map((f: Funcionario) => [f.matricula_aleatoria, f]));

    const raw = this.generator.gerarEscalaMensalCached(funcs, ano, mes, {
      permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
      diasPermitidosFolga: this.diasPermitidosFolga(),
      feriados
    });

    return raw.map(item => {
      const f = funcsMap.get(item.matricula);
      if (!f) return item;
      return {
        ...item,
        nome: f.primeiro_nome,
        cargo: f.cargo,
        setor: f.setor,
        turno: f.turno_padrao,
        genero: f.genero
      };
    });
  });

  folgasPorSetorMap = computed(() => {
    const hojeDia = this.hojeDia;
    const itens = this.escalaCompletaDaLojaCache();
    const funcs = this.funcionarios();
    const map = new Map<string, Funcionario[]>();
    
    for (const setor of this.setores()) {
      const matriculasFolga = new Set(
        itens.filter((i: EscalaItem) => {
          if (i.setor !== setor.nome) return false;
          const s = i.dias[hojeDia];
          return s === 'F' || s === 'FD' || s === 'FE';
        }).map((i: EscalaItem) => i.matricula)
      );
      map.set(setor.nome, funcs.filter((f: Funcionario) => matriculasFolga.has(f.matricula_aleatoria)));
    }
    return map;
  });

  // Configurações 6x1 Giratória (Convenção Coletiva)
  permitirDoisDiasConsecutivos = signal<boolean>(false);
  diasPermitidosFolga = signal<number[]>([0, 1, 2, 3, 4, 5, 6]); // 0=Dom, 1=Seg, 2=Ter...

  // Escala Guiada & Cobertura Mínima
  isEscalaGuiadaModalOpen = signal<boolean>(false);
  guiadaStep = signal<number>(1);
  guiadaSetor = signal<string>('Fiscal de Caixa');
  guiadaMinFuncionarios = signal<number>(2);
  guiadaPermitirDoisConsecutivos = signal<boolean>(false);
  guiadaModeloEscala = signal<ModeloEscala>('6x1');
  guiadaRegrasSelecionadas = signal<string[]>(['rc_1_clt67', 'rc_2_clt386', 'rc_3_cct_caixa']);

  // Modelo de Escala Ativo (6x1 ou 5x1)
  modeloEscalaAtivo = signal<ModeloEscala>('6x1');

  // Regras de Conformidade
  regrasConformidade = signal<RegraConformidade[]>(INITIAL_REGRAS_CONFORMIDADE);

  // Dia Selecionado para Curva de Presença Horária
  diaSelecionadoPresenca = signal<number>(1);

  // Mínimo por dia no setor ativo (Frente de Caixa exige 6)
  minFuncionariosPorDiaSetor = signal<number>(6);

  // Turnos & Intervalos Intrajornada
  isTurnosModalOpen = signal<boolean>(false);
  turnosConfigs = signal<TurnoConfig[]>([
    { id: 't1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
    { id: 't2', nome: '09:00 às 17:50 (Almoço 13:00 às 14:30)', entrada: '09:00', saida: '17:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
    { id: 't3', nome: '12:40 às 21:30 (Almoço 14:20 às 15:50)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
    { id: 't4', nome: '12:40 às 21:30 (Almoço 15:30 às 17:00)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false }
  ]);

  intervalosPresets: IntervaloOption[] = [
    { label: '30 min', minutos: 30 },
    { label: '1h', minutos: 60 },
    { label: '1h 30min', minutos: 90 },
    { label: '2h', minutos: 120 },
    { label: '2h 30min', minutos: 150 },
    { label: '2h 40min', minutos: 160 },
    { label: '3h', minutos: 180 }
  ];

  // Formulário do Novo Turno
  novoTurnoEntrada = signal<string>('08:00');
  novoTurnoSaida = signal<string>('17:00');
  novoTurnoIntervalo = signal<number>(60);
  novoTurnoCustomIntervalo = signal<number | null>(null);

  // Computado: Resumo de Métricas Individuais por Colaborador (Folgas, Horas Líquidas)
  resumoMetrics = computed<ResumoFuncionarioMetrics[]>(() => {
    const itens = this.escalaItens();
    const funcs = this.funcionarios();
    const tConfigs = this.turnosConfigs();
    const [ano, mes] = this.selectedMonth.split('-').map(Number);

    return this.generator.calcularResumoMetrics(itens, funcs, tConfigs, ano, mes);
  });

  // Computado: Total de Folgas na Escala Exibida
  totalFolgasEscala = computed<number>(() => {
    return this.resumoMetrics().reduce((acc, curr) => acc + curr.totalFolgas, 0);
  });

  // Computado: Curva de Presença de Colaboradores na Loja por Faixa Horária no Dia Selecionado
  presencaPorHorario = computed<HorarioPresenca[]>(() => {
    const itens = this.escalaItens();
    const tConfigs = this.turnosConfigs();
    const dia = this.diaSelecionadoPresenca();

    return this.generator.calcularPresencaPorFaixaHoraria(itens, tConfigs, dia);
  });

  // Engine de Validação Real Computada da Escala Exibida
  validacaoResultado = computed<ValidacaoEscalaResultado>(() => {
    const itens = this.escalaItens();
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const minReq = this.minFuncionariosPorDiaSetor();
    const tConfigs = this.turnosConfigs();
    return this.generator.validarEscala(itens, ano, mes, minReq, tConfigs);
  });


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
  filterTipoHistorico = signal<string>('TODOS');

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

  readonly horariosFixosCaixa = HORARIOS_FIXOS_CAIXA;

  // Form de novo funcionário
  novoNome = '';
  novoSetor = signal<string>('Frente de Caixa');
  novoCargo = signal<string>('Operadora de Caixa');
  novoTurno = '07:00 às 15:50 (Almoço 11:00 às 12:30)';
  novoGenero: 'M' | 'F' = 'F';

  dataAtualFormatted = this._hoje.toLocaleDateString('pt-BR');

  // Modal de Detalhamento e Inspeção da Equipe por Setor
  setorDetalhamentoModal = signal<{
    visible: boolean;
    setorNome: string;
    filterStatus: 'TODOS' | 'TRABALHANDO' | 'FOLGA';
    searchQuery: string;
  }>({
    visible: false,
    setorNome: '',
    filterStatus: 'TODOS',
    searchQuery: ''
  });

  openSetorDetalhamentoModal(setorNome: string = '', filterStatus: 'TODOS' | 'TRABALHANDO' | 'FOLGA' = 'TODOS') {
    this.setorDetalhamentoModal.set({
      visible: true,
      setorNome,
      filterStatus,
      searchQuery: ''
    });
  }

  closeSetorDetalhamentoModal() {
    this.setorDetalhamentoModal.update(s => ({ ...s, visible: false }));
  }

  setSetorDetalhamentoFilter(filterStatus: 'TODOS' | 'TRABALHANDO' | 'FOLGA') {
    this.setorDetalhamentoModal.update(s => ({ ...s, filterStatus }));
  }

  setSetorDetalhamentoSearch(query: string) {
    this.setorDetalhamentoModal.update(s => ({ ...s, searchQuery: query }));
  }

  setorDetalhamentoData = computed(() => {
    const modal = this.setorDetalhamentoModal();
    if (!modal.visible) {
      return { setorNome: '', total: 0, trabalhandoCount: 0, folgandoCount: 0, coberturaPct: 100, colaboradores: [] };
    }

    const setorNome = modal.setorNome;
    const funcs = setorNome
      ? (this.funcionariosPorSetorMap().get(setorNome) ?? [])
      : this.funcionarios().filter(f => f.ativo);

    const escala = this.escalaCompletaDaLojaCache();
    const hojeDia = this.hojeDia;
    const query = modal.searchQuery.toLowerCase().trim();

    const resultList = funcs.map(f => {
      const escalaItem = escala.find(i => i.matricula === f.matricula_aleatoria);
      const statusHoje: TipoDia = (escalaItem?.dias[hojeDia] as TipoDia) ?? 'T';
      const isFolga = statusHoje === 'F' || statusHoje === 'FD' || statusHoje === 'FE';

      let statusLabel = 'Em Trabalho';
      let statusClass = 'badge-trabalho';
      if (statusHoje === 'FD') {
        statusLabel = 'Folga Domingo';
        statusClass = 'badge-folga-domingo';
      } else if (statusHoje === 'FE') {
        statusLabel = 'Feriado Fechado';
        statusClass = 'badge-feriado';
      } else if (statusHoje === 'F') {
        statusLabel = 'Folga Semanal';
        statusClass = 'badge-folga-semanal';
      } else if (statusHoje === 'TF') {
        statusLabel = 'Trabalho em Feriado';
        statusClass = 'badge-trabalho-feriado';
      } else if (statusHoje === 'TD') {
        statusLabel = 'Trabalho em Domingo';
        statusClass = 'badge-trabalho-domingo';
      }

      return {
        funcionario: f,
        statusHoje,
        isFolga,
        statusLabel,
        statusClass
      };
    });

    const total = resultList.length;
    const folgandoCount = resultList.filter(item => item.isFolga).length;
    const trabalhandoCount = total - folgandoCount;
    const coberturaPct = total > 0 ? Math.round((trabalhandoCount / total) * 100) : 100;

    let filtered = resultList;
    if (modal.filterStatus === 'TRABALHANDO') {
      filtered = filtered.filter(item => !item.isFolga);
    } else if (modal.filterStatus === 'FOLGA') {
      filtered = filtered.filter(item => item.isFolga);
    }

    if (query) {
      filtered = filtered.filter(item =>
        item.funcionario.primeiro_nome.toLowerCase().includes(query) ||
        item.funcionario.cargo.toLowerCase().includes(query) ||
        item.funcionario.matricula_aleatoria.includes(query)
      );
    }

    return {
      setorNome: setorNome || 'Todos os Setores',
      total,
      trabalhandoCount,
      folgandoCount,
      coberturaPct,
      colaboradores: filtered
    };
  });

  // ============================================================
  // COMPUTED SIGNALS PRÉ-COMPUTADOS (substituem métodos no template — BUG-P1)
  // ============================================================

  /** Mapa pré-computado: setorNome → cor hex */
  private readonly _setorColorMap = computed(() => {
    const map = new Map<string, string>();
    for (const setor of this.setores()) {
      map.set(setor.nome, this._computeSetorColor(setor.nome));
    }
    return map;
  });

  /** Mapa pré-computado: setorNome → lista de Funcionarios */
  readonly funcionariosPorSetorMap = computed(() => {
    const map = new Map<string, Funcionario[]>();
    for (const setor of this.setores()) {
      map.set(setor.nome, this.funcionarios().filter((f: Funcionario) => f.setor === setor.nome));
    }
    return map;
  });

  /** Mapa pré-computado: setorNome → lista de Cargos */
  readonly cargosPorSetorMap = computed(() => {
    const map = new Map<string, Cargo[]>();
    for (const setor of this.setores()) {
      map.set(setor.nome, this.cargos().filter((c: Cargo) => c.setor_nome === setor.nome));
    }
    return map;
  });

  /** Mapa pré-computado: setorNome → % cobertura hoje */
  readonly coberturaPercentMap = computed(() => {
    const map = new Map<string, number>();
    const hojeDia = this.hojeDia;
    const escala = this.escalaCompletaDaLojaCache();
    const funcsPorSetor = this.funcionariosPorSetorMap();
    for (const setor of this.setores()) {
      const total = (funcsPorSetor.get(setor.nome) ?? []).length;
      if (total === 0) { map.set(setor.nome, 100); continue; }
      const emFolga = escala.filter((i: EscalaItem) => {
        if (i.setor !== setor.nome) return false;
        const s = i.dias[hojeDia];
        return s === 'F' || s === 'FD' || s === 'FE';
      }).length;
      map.set(setor.nome, Math.round(((total - emFolga) / total) * 100));
    }
    return map;
  });

  /** Mapa pré-computado: dia → abreviação do dia da semana (para tabela de escala) */
  readonly diasSemanaAbrevMap = computed(() => {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    const map = new Map<number, string>();
    for (let d = 1; d <= totalDias; d++) {
      const dateObj = new Date(ano, mes - 1, d);
      map.set(d, dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase());
    }
    return map;
  });

  /** Mapa pré-computado: dia → abreviação de 3 letras do dia da semana (UPPER) */
  readonly diasSemanaUpperMap = computed(() => {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    const map = new Map<number, string>();
    for (let d = 1; d <= totalDias; d++) {
      const dateObj = new Date(ano, mes - 1, d);
      const name = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      map.set(d, name.slice(0, 3));
    }
    return map;
  });

  /** Mapa pré-computado: "setor|dia" → string[] nomes de folgados */
  readonly folgasPorSetorEDiaMap = computed(() => {
    const map = new Map<string, string[]>();
    const escalaItens = this.escalaItens();
    const cacheItens = this.escalaCompletaDaLojaCache();
    const dias = this.diasDoMes();

    for (const setor of this.setores()) {
      let itensSetor = escalaItens.filter((item: EscalaItem) => item.setor === setor.nome);
      if (itensSetor.length === 0) {
        itensSetor = cacheItens.filter((item: EscalaItem) => item.setor === setor.nome);
      }
      for (const d of dias) {
        const key = `${setor.nome}|${d}`;
        const folgados: string[] = [];
        for (const item of itensSetor) {
          const status = item.dias[d];
          if (status === 'F' || status === 'FD' || status === 'FE') {
            folgados.push(item.nome);
          }
        }
        map.set(key, folgados);
      }
    }
    return map;
  });

  // Signal para controlar área de impressão (BUG-P5)
  isPrintingActive = signal(false);

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
    return this.cargos().filter((c: Cargo) => c.setor_nome === this.novoSetor());
  });

  cargosDoEditSetor = computed(() => {
    const ef = this.editingFunc();
    if (!ef) return [];
    return this.cargos().filter((c: Cargo) => c.setor_nome === ef.setor);
  });

  funcionariosFiltrados = computed(() => {
    let list = this.funcionarios();
    const fSetor = this.filterSetor();
    const sQuery = this.searchQuery().toLowerCase().trim();

    if (fSetor) {
      list = list.filter((f: Funcionario) => f.setor === fSetor);
    }
    if (sQuery) {
      list = list.filter((f: Funcionario) =>
        f.primeiro_nome.toLowerCase().includes(sQuery) ||
        f.matricula_aleatoria.includes(sQuery)
      );
    }
    return list.map((f: Funcionario) => ({ ...f }));
  });

  feriadosFiltrados = computed(() => {
    let list = this.feriados();
    const tipo = this.filterTipoFeriado();
    if (tipo) {
      list = list.filter((f: Feriado) => f.tipo === tipo);
    }
    return list.sort((a: Feriado, b: Feriado) => a.data.localeCompare(b.data));
  });

  regrasFiltradas = computed(() => {
    let list = this.regras();
    const filtro = this.filterTipoRegra();
    if (filtro) {
      if (filtro === 'IMPLEMENTADA' || filtro === 'PENDENTE_PROGRAMADOR') {
        list = list.filter((r: RegraEscala) => r.status === filtro);
      } else {
        list = list.filter((r: RegraEscala) => r.categoria === filtro);
      }
    }
    return list;
  });

  statsRegras = computed(() => {
    const list = this.regras();
    const implementadas = list.filter((r: RegraEscala) => r.status === 'IMPLEMENTADA').length;
    const pendentes = list.filter((r: RegraEscala) => r.status === 'PENDENTE_PROGRAMADOR').length;
    return { implementadas, pendentes };
  });

  setoresFiltradosDashboard = computed(() => {
    const fSetor = this.filterSetorDashboard();
    if (fSetor) {
      return this.setores().filter((s: Setor) => s.nome === fSetor);
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
  // BUG-L2 FIX: agora passa as mesmas opções do cache principal
  diasHistoricoCompleto = computed<DiaHistoricoTrabalho[]>(() => {
    const func = this.selectedFuncionarioForPage();
    if (!func) return [];

    const [ano, mes] = this.selectedMonthHistorico().split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    const funcsDoSetor = this.funcionarios().filter((f: Funcionario) => f.setor === func.setor && f.ativo);

    const escalaItem = this.generator.gerarEscalaMensalCached(funcsDoSetor, ano, mes, {
      permitirDoisDiasConsecutivos: untracked(() => this.permitirDoisDiasConsecutivos()),
      diasPermitidosFolga: untracked(() => this.diasPermitidosFolga()),
      feriados: untracked(() => this.feriados())
    }).find((i: EscalaItem) => i.matricula === func.matricula_aleatoria);

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
      let tipo: 'TRABALHO' | 'FOLGA' | 'DOMINGO' | 'FERIADO';
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
  // BUG-L4 FIX: agora lê filterTipoHistorico como signal
  diasHistoricoFiltrados = computed<DiaHistoricoTrabalho[]>(() => {
    const completo = this.diasHistoricoCompleto();
    const tipoFilter = this.filterTipoHistorico();
    if (tipoFilter === 'TODOS') return completo;
    return completo.filter((d: DiaHistoricoTrabalho) => d.tipo === tipoFilter);
  });

  statsColaboradorMes = computed(() => {
    const historico = this.diasHistoricoCompleto();
    const totalFolgas = historico.filter((h: DiaHistoricoTrabalho) => h.tipo === 'FOLGA').length;
    const domingosTrabalhados = historico.filter((h: DiaHistoricoTrabalho) => {
      const [ano, mes] = this.selectedMonthHistorico().split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, h.dia);
      return dataObj.getDay() === 0 && h.tipo === 'TRABALHO';
    }).length;
    return { totalFolgas, domingosTrabalhados };
  });

  proximoFeriadoInfo = computed(() => {
    const list = this.feriados();
    if (list.length === 0) return { nome: 'Nenhum feriado', dataFormatted: '-', diasRestantesText: 'Nenhum' };

    const hojeStrLocal = this.hojeStr;
    const proximos = list.filter((f: Feriado) => f.data >= hojeStrLocal).sort((a: Feriado, b: Feriado) => a.data.localeCompare(b.data));
    const target = proximos.length > 0 ? proximos[0] : list[0];

    const targetDate = new Date(target.data + 'T00:00:00');
    const hojeDate = new Date(this._hoje);
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
    const hojeDiaLocal = this.hojeDia;
    const itens = this.escalaCompletaDaLojaCache();
    
    const emFolga = itens.filter((item: EscalaItem) => {
      const status = item.dias[hojeDiaLocal];
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
    this.isMobileMenuOpen.update((v: boolean) => !v);
  }

  selectTab(tab: 'dashboard' | 'escala' | 'funcionarios' | 'setores' | 'feriados' | 'regras' | 'detalhes-funcionario') {
    this.activeTab.set(tab);
    this.isMobileMenuOpen.set(false);
  }

  // Agora usa mapa pré-computado (BUG-P1)
  getDiaSemanaAbrev(diaNum: number): string {
    return this.diasSemanaAbrevMap().get(diaNum) ?? '';
  }

  // Quick Blur Modal Controller
  // BUG-L3 FIX: usa cache principal em vez de recalcular
  openQuickBlurModal(func: Funcionario) {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    // Reutiliza cache principal em vez de gerar nova escala
    const escalaItem = this.escalaCompletaDaLojaCache()
      .find((i: EscalaItem) => i.matricula === func.matricula_aleatoria);

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

    const hojeStrLocal = this.hojeStr;
    const feriadosPassados = this.feriados()
      .filter((f: Feriado) => f.data <= hojeStrLocal)
      .sort((a: Feriado, b: Feriado) => b.data.localeCompare(a.data));

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
    this.isPrintingActive.set(true);
    setTimeout(() => {
      window.print();
      this.isPrintingActive.set(false);
    }, 300);
  }

  getDiasIntervalo(inicio: number, fim: number): number[] {
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }

  getDomingosFolga(item: EscalaItem): number {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    let count = 0;
    for (const [dia, status] of Object.entries(item.dias)) {
      const dateObj = new Date(ano, mes - 1, Number(dia));
      if (dateObj.getDay() === 0 && (status === 'F' || status === 'FD' || status === 'FE')) count++;
    }
    return count;
  }

  getDomingosTrabalhados(item: EscalaItem): number {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    let count = 0;
    for (const [dia, status] of Object.entries(item.dias)) {
      const dateObj = new Date(ano, mes - 1, Number(dia));
      if (dateObj.getDay() === 0 && (status === 'T' || status === 'TD' || status === 'TF')) count++;
    }
    return count;
  }

  getCargoPorMatricula(matricula: string): string {
    const func = this.funcionarios().find((f: Funcionario) => f.matricula_aleatoria === matricula);
    return func ? func.cargo : '-';
  }

  // Agora usam os mapas pré-computados (BUG-P1)
  getFolgasPorSetorFiltradas(setorNome: string): Funcionario[] {
    let list = this.folgasPorSetorMap().get(setorNome) ?? [];
    const query = this.searchQueryDashboard().toLowerCase().trim();
    if (query) {
      list = list.filter((f: Funcionario) =>
        f.primeiro_nome.toLowerCase().includes(query) ||
        f.matricula_aleatoria.includes(query)
      );
    }
    return list;
  }

  getFuncionariosPorSetor(setorNome: string): Funcionario[] {
    return this.funcionariosPorSetorMap().get(setorNome) ?? [];
  }

  getCoberturaPercent(setorNome: string): number {
    return this.coberturaPercentMap().get(setorNome) ?? 100;
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
    if (this.printModalVisible())      { this.printModalVisible.set(false); }
  }

  getRegrasPorCategoria(cat: string): RegraEscala[] {
    return this.regras().filter((r: RegraEscala) => r.categoria === cat);
  }

  // Lookup rápido via mapa pré-computado (BUG-P1)
  getSetorColor(setorNome: string): string {
    return this._setorColorMap().get(setorNome) ?? this._computeSetorColor(setorNome);
  }

  private _computeSetorColor(setorNome: string): string {
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

    // Gerador Dinâmico HSL via Hash para qualquer novo setor cadastrado pelo gestor
    let hash = 0;
    for (let i = 0; i < setorNome.length; i++) {
      hash = (setorNome.charCodeAt(i) + ((hash << 5) - hash)) & 0xffffffff;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 35%)`;
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
    const loja = this.userLojas().find((l: Loja) => l.id === lojaId);
    if (loja) {
      this.supabase.setActiveLoja(loja);
      this.toastService.info('Unidade Alterada', `Visualizando dados da loja ${loja.nome}.`);
      await this.loadData();
    }
  }

  // BUG-L1 FIX: separar loading de dados do loading de escala
  isEscalaLoading = signal(false);

  async loadData() {
    this.isLoading.set(true);

    try {
      await this.supabase.waitForAuthReady();
      let loja = this.activeLoja();
      if (!loja) {
        await this.supabase.loadUserLojas();
        loja = this.activeLoja();
      }

      const lojaId = loja?.id || 'loja-02-demo';

      const [funcs, sets, crgs, fers, rgrs] = await Promise.all([
        this.supabase.getFuncionarios(lojaId),
        this.supabase.getSetores(),
        this.supabase.getCargos(),
        this.supabase.getFeriados(),
        this.supabase.getRegras()
      ]);

      // Batch update — seta todos antes de liberar isLoading para minimizar re-renders
      this.funcionarios.set(funcs);
      this.setores.set(sets);
      this.cargos.set(crgs);
      this.feriados.set(fers);
      this.regras.set(rgrs);

      if (sets.length > 0 && !sets.some((s: Setor) => s.nome === this.selectedSetor)) {
        this._selectedSetor = sets[0].nome;
        this.triggerRecalculoEscala.update((v: number) => v + 1);
      }
      this.syncNovoSetorAndCargo();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      this.toastService.error('Erro ao Carregar Dados', 'Não foi possível buscar as informações no Supabase.');
    } finally {
      this.isLoading.set(false);
    }

    // Carrega escala de forma independente — não bloqueia o skeleton
    try {
      this.isEscalaLoading.set(true);
      this.generator.clearAllCache();
      this.draftEscalasMap.set(new Map());
      this.onMonthOrSetorChange();
    } finally {
      this.isEscalaLoading.set(false);
    }
  }

  syncNovoSetorAndCargo() {
    if (this.setores().length > 0 && !this.novoSetor()) {
      this.novoSetor.set(this.setores()[0].nome);
    }
    const availableCargos = this.cargosDoNovoSetor();
    if (availableCargos.length > 0 && !availableCargos.some((c: Cargo) => c.nome === this.novoCargo())) {
      this.novoCargo.set(availableCargos[0].nome);
    }
  }

  onNovoSetorChange(setorNome: string) {
    this.novoSetor.set(setorNome);
    const available = this.cargos().filter((c: Cargo) => c.setor_nome === setorNome);
    if (available.length > 0) {
      this.novoCargo.set(available[0].nome);
    } else {
      this.novoCargo.set('');
    }
  }

  // Agora usa mapa pré-computado (BUG-P1)
  getCargosDoSetor(setorNome: string): Cargo[] {
    return this.cargosPorSetorMap().get(setorNome) ?? [];
  }

  async loadEscala() {
    const loja = this.activeLoja();
    if (!loja) return;

    const key = `${loja.id}|${this.selectedMonth}|${this.selectedSetor}`;

    // Se já existe rascunho em memória para este setor e mês, preserva-o!
    if (this.draftEscalasMap().has(key)) {
      this.escalaItens.set(this.draftEscalasMap().get(key)!);
      return;
    }

    const mesRef = `${this.selectedMonth}-01`;
    try {
      const escala = await this.supabase.getEscala(loja.id, mesRef, this.selectedSetor);
      if (escala?.dados?.itens && escala.dados.itens.length > 0) {
        this.escalaItens.set(escala.dados.itens);
        this.draftEscalasMap.update((m: Map<string, EscalaItem[]>) => {
          const newMap = new Map(m);
          newMap.set(key, escala.dados.itens);
          return newMap;
        });
      } else {
        // Se Supabase não tem escala salva, gera a escala 6x1 giratória automaticamente
        const funcsDoSetor = this.funcionarios().filter((f: Funcionario) => f.setor === this.selectedSetor && f.ativo);
        if (funcsDoSetor.length > 0) {
          const [ano, mes] = this.selectedMonth.split('-').map(Number);
          const gerada = this.generator.gerarEscalaMensal(funcsDoSetor, ano, mes, {
            permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
            diasPermitidosFolga: this.diasPermitidosFolga(),
            feriados: this.feriados(),
            minFuncionariosPorDia: this.minFuncionariosPorDiaSetor()
          });
          this.escalaItens.set(gerada);
          this.draftEscalasMap.update((m: Map<string, EscalaItem[]>) => {
            const newMap = new Map(m);
            newMap.set(key, gerada);
            return newMap;
          });
        } else {
          this.escalaItens.set([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar escala:', err);
    }
  }

  toggleDiaFolgaPermitido(diaSemana: number) {
    this.diasPermitidosFolga.update((current: number[]) => {
      if (current.includes(diaSemana)) {
        if (current.length === 1) {
          this.toastService.warning('Atenção', 'Selecione pelo menos 1 dia da semana para folgas.');
          return current;
        }
        return current.filter((d: number) => d !== diaSemana);
      } else {
        return [...current, diaSemana].sort((a, b) => a - b);
      }
    });
  }

  isDiaFolgaPermitido(diaSemana: number): boolean {
    return this.diasPermitidosFolga().includes(diaSemana);
  }

  // Agora usa mapa pré-computado (BUG-P1)
  getDiaSemanaAbrevUpper(dia: number): string {
    return this.diasSemanaUpperMap().get(dia) ?? '';
  }

  // Agora usa mapa pré-computado (BUG-P1)
  getFolgasPorSetorEDia(setorNome: string, dia: number): string[] {
    return this.folgasPorSetorEDiaMap().get(`${setorNome}|${dia}`) ?? [];
  }

  gerarNovaEscala() {
    const funcsDoSetor = this.funcionarios().filter((f: Funcionario) => f.setor === this.selectedSetor && f.ativo);
    if (funcsDoSetor.length === 0) {
      this.toastService.warning('Sem Colaboradores Ativos', `Nenhum colaborador ativo cadastrado para o setor "${this.selectedSetor}".`);
      return;
    }
    this._executarGeracaoEscala(funcsDoSetor);
  }

  abrirEscalaGuiada() {
    this.guiadaSetor.set(this.selectedSetor);
    const lower = this.selectedSetor.toLowerCase();
    const isCaixa = lower.includes('caixa') && !lower.includes('fiscal');
    this.guiadaMinFuncionarios.set(isCaixa ? 6 : 2);
    this.guiadaStep.set(1);
    this.carregarHorariosFixosCaixa();
    this.isEscalaGuiadaModalOpen.set(true);
  }

  readonly horariosFixosFiscal = HORARIOS_FIXOS_FISCAL;

  carregarHorariosFixosCaixa() {
    const sLower = (this.guiadaSetor() || this.selectedSetor).toLowerCase();
    if (sLower.includes('fiscal')) {
      this.turnosConfigs.set([
        { id: 'tf1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
        { id: 'tf2', nome: '12:40 às 21:00 (Almoço 14:20 às 15:40)', entrada: '12:40', saida: '21:00', intervaloMinutos: 80, cargaHorariaLiquidaMinutos: 420, excedeLimiteDiario: false }
      ]);
    } else {
      this.turnosConfigs.set([
        { id: 't1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
        { id: 't2', nome: '09:00 às 17:50 (Almoço 13:00 às 14:30)', entrada: '09:00', saida: '17:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
        { id: 't3', nome: '12:40 às 21:30 (Almoço 14:20 às 15:50)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
        { id: 't4', nome: '12:40 às 21:30 (Almoço 15:30 às 17:00)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false }
      ]);
    }
  }

  formatarCargaHoraria(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (m > 0) return `${h}h ${m}m`;
    return `${h}.0h`;
  }

  proximoPassoGuiada() {
    this.guiadaStep.update((s: number) => Math.min(4, s + 1));
  }

  passoAnteriorGuiada() {
    this.guiadaStep.update((s: number) => Math.max(1, s - 1));
  }

  concluirEscalaGuiada() {
    const setorAlvo = this.guiadaSetor();
    this.minFuncionariosPorDiaSetor.set(this.guiadaMinFuncionarios());
    this.permitirDoisDiasConsecutivos.set(this.guiadaPermitirDoisConsecutivos());
    this.modeloEscalaAtivo.set(this.guiadaModeloEscala());
    this.isEscalaGuiadaModalOpen.set(false);

    this._selectedSetor = setorAlvo;
    this.triggerRecalculoEscala.update((v: number) => v + 1);

    const funcsDoSetor = this.funcionarios().filter((f: Funcionario) => f.setor === setorAlvo && f.ativo);
    if (funcsDoSetor.length === 0) {
      this.toastService.warning('Sem Colaboradores Ativos', `Nenhum colaborador ativo cadastrado para o setor "${setorAlvo}".`);
      return;
    }

    this._executarGeracaoEscala(funcsDoSetor, this.guiadaMinFuncionarios());
    this.selectTab('escala');
  }

  abrirModalTurnos() {
    this.isTurnosModalOpen.set(true);
  }

  fecharModalTurnos() {
    this.isTurnosModalOpen.set(false);
  }

  adicionarNovoTurno() {
    const ent = this.novoTurnoEntrada();
    const sai = this.novoTurnoSaida();
    const interMin = this.novoTurnoCustomIntervalo() || this.novoTurnoIntervalo();

    const calc = this.generator.calcularCargaHorariaLiquida(ent, sai, interMin);
    const nomeTurno = `${ent} às ${sai}`;

    const novoTurno: TurnoConfig = {
      id: 't_' + Date.now(),
      nome: nomeTurno,
      entrada: ent,
      saida: sai,
      intervaloMinutos: interMin,
      cargaHorariaLiquidaMinutos: calc.minutos,
      excedeLimiteDiario: calc.excedeLimite
    };

    this.turnosConfigs.update((list: TurnoConfig[]) => [...list, novoTurno]);
    this.toastService.success('Turno Cadastrado!', `Horário ${nomeTurno} (${calc.horasFormatted} líquidos) cadastrado.`);
    if (calc.excedeLimite) {
      this.toastService.warning('Alerta CLT', 'Este turno excede o limite diário de 8h48m.');
    }
    this.novoTurnoCustomIntervalo.set(null);
  }

  formatarMinutosIntervalo(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  }

  diminuirGuiadaMin() {
    this.guiadaMinFuncionarios.update((v: number) => Math.max(1, v - 1));
  }

  aumentarGuiadaMin() {
    this.guiadaMinFuncionarios.update((v: number) => v + 1);
  }

  getFuncsDoSetorCount(setorNome: string): number {
    return this.funcionarios().filter((f: Funcionario) => f.setor === setorNome && f.ativo).length;
  }

  private _executarGeracaoEscala(funcsDoSetor: Funcionario[], minPorDia?: number) {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const minReq = minPorDia ?? this.minFuncionariosPorDiaSetor();

    this.generator.invalidateCache(ano, mes);

    const gerada = this.generator.gerarEscalaMensal(funcsDoSetor, ano, mes, {
      permitirDoisDiasConsecutivos: this.permitirDoisDiasConsecutivos(),
      diasPermitidosFolga: this.diasPermitidosFolga(),
      feriados: this.feriados(),
      minFuncionariosPorDia: minReq,
      modeloEscala: this.modeloEscalaAtivo(),
      regrasConformidade: this.regrasConformidade()
    });
    this.escalaItens.set(gerada);

    // Salva rascunho em memória para não perder ao trocar de abas
    const key = `${this.activeLoja()?.id || 'loja-02-demo'}|${this.selectedMonth}|${this.selectedSetor}`;
    this.draftEscalasMap.update((map: Map<string, EscalaItem[]>) => {
      const newMap = new Map(map);
      newMap.set(key, gerada);
      return newMap;
    });

    this.triggerRecalculoEscala.update((v: number) => v + 1); // Atualiza os computeds de cache
    this.toastService.success('Escala Gerada!', `Escala ${this.modeloEscalaAtivo()} calculada com garantia de ${minReq} colaboradores por dia.`);
  }


  async salvarEscala() {
    const loja = this.activeLoja();
    if (!loja) return;

    if (this.escalaItens().length === 0) {
      this.toastService.warning('Atenção', 'Gere ou altere uma escala antes de salvar.');
      return;
    }

    // Validação estrita antes de salvar
    const validacao = this.validacaoResultado();
    if (!validacao.valida || validacao.totalErros > 0) {
      const primeiroErro = validacao.itensValidados.find(i => 
        i.tipo === 'ERRO_COBERTURA' || 
        i.tipo === 'ERRO_COBERTURA_CAIXA' || 
        i.tipo === 'ERRO_PADARIA_PRODUCAO' || 
        i.tipo === 'ERRO_FOLGAS_MES' || 
        i.tipo === 'ERRO_CLT'
      );
      const mensagem = primeiroErro ? primeiroErro.mensagem : 'Existem inconsistências ou violações de regras na escala.';
      this.toastService.error('Erro de Validação - Bloqueado', `${mensagem} Corrija a escala antes de salvar.`);
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

      // Limpa rascunho em memória pois agora está gravado no banco
      const key = `${loja.id}|${this.selectedMonth}|${this.selectedSetor}`;
      this.draftEscalasMap.update((map: Map<string, EscalaItem[]>) => {
        const newMap = new Map(map);
        newMap.delete(key);
        return newMap;
      });

      this.toastService.success('Salvo no Supabase!', `Escala de ${this.selectedSetor} salva com sucesso.`);
    } catch (err: any) {
      this.toastService.error('Erro ao Salvar', err.message);
    } finally {
      this.saving.set(false);
    }
  }

  async refreshAllDataAndCaches() {
    this.generator.clearAllCache();
    this.draftEscalasMap.set(new Map());
    await this.loadData();
    this.triggerRecalculoEscala.update((v: number) => v + 1);

    // 1. Se houver colaborador selecionado na página de detalhes, atualiza com os dados novos
    const selFunc = this.selectedFuncionarioForPage();
    if (selFunc) {
      const updated = this.funcionarios().find((f: Funcionario) => f.id === selFunc.id || f.matricula_aleatoria === selFunc.matricula_aleatoria);
      if (updated) {
        this.selectedFuncionarioForPage.set(updated);
      }
    }

    // 2. Se houver escala aberta no setor ativo, atualiza o nome/cargo dos itens na escala exibida em tempo real
    const itens = this.escalaItens();
    if (itens.length > 0) {
      const funcsMap = new Map(this.funcionarios().map((f: Funcionario) => [f.matricula_aleatoria, f]));
      const updatedItens = itens
        .filter((item: EscalaItem) => {
          const f = funcsMap.get(item.matricula);
          return f && f.ativo && f.setor === this.selectedSetor;
        })
        .map((item: EscalaItem) => {
          const f = funcsMap.get(item.matricula)!;
          return {
            ...item,
            nome: f.primeiro_nome,
            cargo: f.cargo,
            turno: f.turno_padrao,
            genero: f.genero
          };
        });
      this.escalaItens.set(updatedItens);
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
      await this.refreshAllDataAndCaches();
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
      await this.refreshAllDataAndCaches();
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
          await this.refreshAllDataAndCaches();
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
      await this.refreshAllDataAndCaches();
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
        await this.refreshAllDataAndCaches();
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
      await this.refreshAllDataAndCaches();
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
        await this.refreshAllDataAndCaches();
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
      await this.refreshAllDataAndCaches();
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
        await this.refreshAllDataAndCaches();
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
        const existing = this.regras().find((r: RegraEscala) => r.id === rm.regraId);
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
      await this.refreshAllDataAndCaches();
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
        await this.refreshAllDataAndCaches();
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

  isDiaDomingo(diaNum: number): boolean {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    return new Date(ano, mes - 1, diaNum).getDay() === 0;
  }

  isDiaFeriado(diaNum: number): boolean {
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    const dateStr = `${ano}-${String(mes).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
    return this.feriados().some((f: Feriado) => f.data === dateStr);
  }

  // BUG-L5 FIX: métodos separados para TipoDia na tabela de escala
  getDiaClassFromTipoDia(tipo: TipoDia): string {
    if (tipo === 'F' || tipo === 'FD' || tipo === 'FE') return 'status-folga-simple';
    return 'status-trabalho-simple';
  }

  getDiaLabelFromTipoDia(tipo: TipoDia): string {
    if (tipo === 'F' || tipo === 'FD' || tipo === 'FE') return 'F';
    return '-';
  }

  async handleLogout() {
    await this.supabase.logout();
    this.toastService.info('Sessão Encerrada', 'Você saiu do sistema.');
    this.router.navigate(['/login']);
  }
}
