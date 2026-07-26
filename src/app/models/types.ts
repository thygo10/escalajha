export interface Empresa {
  id: string;
  nome: string;
}

export interface Loja {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string;
}

export interface Setor {
  id: string;
  loja_id?: string;
  nome: string;
  descricao?: string;
}

export interface Cargo {
  id: string;
  setor_nome: string;
  nome: string;
  descricao?: string;
}

export interface Funcionario {
  id?: string;
  loja_id: string;
  primeiro_nome: string; // LGPD Data Minimization
  matricula_aleatoria: string; // Random 6-digit number
  setor: string;
  cargo: string;
  turno_padrao: string;
  genero: 'M' | 'F'; // Gênero obrigatório
  ativo: boolean; // Soft delete for CLT/LGPD legal compliance
  setores_cobertura?: string[]; // Setores secundários para cobertura de folga / função multisetor
}

export type TipoDia = 'T' | 'TD' | 'TF' | 'F' | 'FD' | 'FE';

export interface EscalaItem {
  matricula: string;
  nome: string;
  setor: string;
  turno: string;
  genero: 'M' | 'F';
  dias: Record<number, TipoDia>; 
}

export interface Escala {
  id?: string;
  loja_id: string;
  mes_referencia: string; // 'YYYY-MM-01'
  setor: string;
  dados: {
    ano: number;
    mes: number;
    itens: EscalaItem[];
  };
  atualizado_em?: string;
}

export interface UsuarioLojas {
  user_id: string;
  loja_id: string;
  role: string;
}

export interface Feriado {
  id: string;
  nome: string;
  data: string; // 'YYYY-MM-DD'
  tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo';
  abrangencia?: string;
  descricao?: string;
  funcionamento_proibido: boolean;
}

export interface DiaHistoricoTrabalho {
  dia: number;
  dataStr: string; // 'YYYY-MM-DD'
  diaSemana: string;
  tipo: 'TRABALHO' | 'FOLGA' | 'DOMINGO' | 'FERIADO';
  feriadoNome?: string;
}

export interface FuncionarioResumoAtividade {
  funcionario: Funcionario;
  ultimosDomingosTrabalhados: { data: string; descricao: string }[];
  ultimoFeriadoTrabalhado: { data: string; nome: string } | null;
  totalFolgasMes: number;
  totalDomingosTrabalhadosMes: number;
}

export interface RegraEscala {
  id: string;
  loja_id?: string;
  titulo: string;
  descricao: string;
  categoria: 'CLT' | 'Acordo Coletivo' | 'Interna RH' | 'Solicitação RH';
  status: 'IMPLEMENTADA' | 'EM_DESENVOLVIMENTO' | 'PENDENTE_PROGRAMADOR';
  obrigatoria: boolean;
  criado_por?: string;
  criado_em?: string;
}

export interface IntervaloOption {
  label: string; // Ex: '30 min', '1h', '1h30min', '2h', '2h30min', '2h40min', '3h'
  minutos: number;
}

export interface TurnoConfig {
  id: string;
  nome: string; // Ex: '08:00 às 17:00'
  entrada: string; // '08:00'
  saida: string; // '17:00'
  intervaloMinutos: number; // Ex: 60 (1h)
  cargaHorariaLiquidaMinutos: number; // Ex: 480 (8h)
  excedeLimiteDiario?: boolean;
}

export type ModeloEscala = '6x1' | '5x1';

export interface EstadoTransicao {
  matricula: string;
  mes_origem: string; // 'YYYY-MM'
  dias_trabalhados_fim_mes: number; // Sequência nos últimos dias do mês anterior
  status_ultimo_domingo: 'TD' | 'FD';
  domingos_consecutivos_trabalhados: number;
  data_ultima_folga?: string; // 'YYYY-MM-DD'
}

export interface EventoAfastamento {
  id?: string;
  matricula: string;
  tipo: 'FERIAS' | 'ATESTADO' | 'LICENCA' | 'FOLGA_COMPENSATORIA';
  data_inicio: string; // 'YYYY-MM-DD'
  data_fim: string; // 'YYYY-MM-DD'
  observacao?: string;
}

export interface RegraConformidade {
  id: string;
  nivel_hierarquia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  categoria: 'LEGAL' | 'CCT' | 'INTERNA_RH' | 'OPERACIONAL';
  titulo: string;
  descricao: string;
  valor: any; // Número, booleano ou objeto configurável
  setor_aplicavel: string; // 'TODOS' ou nome do setor
  vigencia_inicio?: string;
  vigencia_fim?: string;
  aprovado_por_juridico?: boolean;
  fonte?: string;
}

export interface LogAuditoria {
  id?: string;
  escala_id?: string;
  loja_id: string;
  usuario_email: string;
  acao: 'GERACAO_AUTOMATICA' | 'EDICAO_MANUAL' | 'OVERRIDE_REGRA' | 'PUBLICACAO';
  detalhes: string;
  justificativa_override?: string;
  criado_em: string;
}

export interface HorarioPresenca {
  horaStr: string; // Ex: '07:00', '08:00', ..., '21:00'
  quantidadeTrabalhando: number;
  funcionariosNomes: string[];
}

export interface ResumoFuncionarioMetrics {
  matricula: string;
  nome: string;
  setor: string;
  cargo: string;
  turno: string;
  genero: 'M' | 'F';
  totalFolgas: number;
  domingosFolgados: number;
  feriadosFolgados: number;
  diasTrabalhados: number;
  horasLiquidasMinutos: number;
  horasLiquidasFormatted: string;
  statusConformidade: 'OK' | 'ALERTA' | 'VIOLACAO';
  alertas: string[];
}

export interface ValidacaoItem {
  dia: number;
  setor: string;
  mensagem: string;
  tipo: 'ERRO_COBERTURA' | 'ERRO_COBERTURA_CAIXA' | 'ERRO_PADARIA_PRODUCAO' | 'ERRO_FOLGAS_MES' | 'ERRO_CLT' | 'ERRO_CLT_INTERJORNADA_11H' | 'ERRO_CARGA_HORARIA_MENSAL' | 'ERRO_STATUS_FERIADO' | 'ERRO_TRANSICAO_DOMINGO' | 'ALERTA_CARGA' | 'AVISO';
}

export interface ValidacaoEscalaResultado {
  valida: boolean;
  totalErros: number;
  totalAlertas: number;
  itensValidados: ValidacaoItem[];
  coberturaPorDia: Record<number, number>; // dia -> quantidade de pessoas trabalhando
  minimoRequerido: number;
}
