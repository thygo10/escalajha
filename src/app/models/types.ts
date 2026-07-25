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

export interface ValidacaoItem {
  dia: number;
  setor: string;
  mensagem: string;
  tipo: 'ERRO_COBERTURA' | 'ERRO_CLT' | 'ALERTA_CARGA' | 'AVISO';
}

export interface ValidacaoEscalaResultado {
  valida: boolean;
  totalErros: number;
  totalAlertas: number;
  itensValidados: ValidacaoItem[];
  coberturaPorDia: Record<number, number>; // dia -> quantidade de pessoas trabalhando
  minimoRequerido: number;
}


