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
  ativo: boolean; // Soft delete for CLT/LGPD legal compliance
}

export interface EscalaItem {
  matricula: string;
  nome: string;
  setor: string;
  turno: string;
  dias: Record<number, string>; // Key: day of month (1-31), Value: 'TRABALHO' | 'FOLGA' | 'FERIAS' | 'DOMINGO'
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
  tipo: 'Nacional' | 'Estadual' | 'Municipal';
  abrangencia?: string;
  descricao?: string;
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

