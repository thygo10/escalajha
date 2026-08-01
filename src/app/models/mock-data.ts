import { Funcionario, Setor, Cargo, Feriado, RegraEscala, RegraConformidade, Rodizio, RodizioGrupo } from './types';


export const HORARIOS_FIXOS_CAIXA = [
  { id: 'h1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', almoco: '11:00 às 12:30' },
  { id: 'h2', nome: '09:00 às 17:50 (Almoço 13:00 às 14:30)', entrada: '09:00', saida: '17:50', almoco: '13:00 às 14:30' },
  { id: 'h3', nome: '12:40 às 21:30 (Almoço 14:20 às 15:50)', entrada: '12:40', saida: '21:30', almoco: '14:20 às 15:50' },
  { id: 'h4', nome: '12:40 às 21:30 (Almoço 15:30 às 17:00)', entrada: '12:40', saida: '21:30', almoco: '15:30 às 17:00' }
];

export const HORARIOS_FIXOS_FISCAL = [
  { id: 'hf1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', almoco: '11:00 às 12:30' },
  { id: 'hf2', nome: '12:40 às 21:00 (Almoço 14:20 às 15:40)', entrada: '12:40', saida: '21:00', almoco: '14:20 às 15:40' }
];

export const INITIAL_RODIZIO_GRUPOS: RodizioGrupo[] = [
  // Rodízio Normal 1T:2F
  { id: 'rg_norm_a', rodizio_id: 'rod_normal_1x2', codigo: 'A', ordem: 1, descricao: 'Grupo A (Trabalha 1º domingo)' },
  { id: 'rg_norm_b', rodizio_id: 'rod_normal_1x2', codigo: 'B', ordem: 2, descricao: 'Grupo B (Trabalha 2º domingo)' },
  { id: 'rg_norm_c', rodizio_id: 'rod_normal_1x2', codigo: 'C', ordem: 3, descricao: 'Grupo C (Trabalha 3º domingo)' },

  // Rodízio Especial CCT Açougue/Padaria (2T:1F)
  { id: 'rg_esp_a', rodizio_id: 'rod_especial_2x1', codigo: 'A', ordem: 1, descricao: 'Grupo A Especial' },
  { id: 'rg_esp_b', rodizio_id: 'rod_especial_2x1', codigo: 'B', ordem: 2, descricao: 'Grupo B Especial' }
];

export const INITIAL_RODIZIOS: Rodizio[] = [
  {
    id: 'rod_normal_1x2',
    nome: 'Rodízio Geral CLT / CCT (1T : 2F)',
    versao: 1,
    inicio_vigencia: '2026-01-01',
    domingos_trabalhados: 1,
    domingos_folga: 2,
    quantidade_grupos: 3,
    usa_grupo: true,
    grupos: INITIAL_RODIZIO_GRUPOS.filter(g => g.rodizio_id === 'rod_normal_1x2'),
    descricao: 'Trabalha 1 domingo e folga nos 2 domingos seguintes (Grupos A, B e C).'
  },
  {
    id: 'rod_especial_2x1',
    nome: 'Rodízio CCT Açougue & Padaria (2T : 1F)',
    versao: 1,
    inicio_vigencia: '2026-01-01',
    domingos_trabalhados: 2,
    domingos_folga: 1,
    quantidade_grupos: 2,
    usa_grupo: true,
    grupos: INITIAL_RODIZIO_GRUPOS.filter(g => g.rodizio_id === 'rod_especial_2x1'),
    descricao: 'Regra de exceção da CCT para produções de Açougue e Padaria.'
  }
];

export const INITIAL_FUNCIONARIOS: Funcionario[] = [
  // 1. Departamento Operacional - Frente de Caixa (42 Operadores)
  { id: 'f_001', loja_id: 'loja-02-demo', primeiro_nome: 'Alane', matricula_aleatoria: '482019', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_002', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Beatriz', matricula_aleatoria: '719204', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_003', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Carolina', matricula_aleatoria: '319482', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_004', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Cláudia', matricula_aleatoria: '572910', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_005', loja_id: 'loja-02-demo', primeiro_nome: 'Analandia', matricula_aleatoria: '694018', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_006', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Luíza', matricula_aleatoria: '502918', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_007', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Paula', matricula_aleatoria: '920148', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_008', loja_id: 'loja-02-demo', primeiro_nome: 'Andreza', matricula_aleatoria: '204918', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_009', loja_id: 'loja-02-demo', primeiro_nome: 'Anna Caroline', matricula_aleatoria: '392094', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_010', loja_id: 'loja-02-demo', primeiro_nome: 'Bruna Figueiredo', matricula_aleatoria: '810293', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_011', loja_id: 'loja-02-demo', primeiro_nome: 'Claudia', matricula_aleatoria: '294018', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_012', loja_id: 'loja-02-demo', primeiro_nome: 'Cleide', matricula_aleatoria: '948102', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A', setores_cobertura: ['Fiscal de Caixa'] },
  { id: 'f_013', loja_id: 'loja-02-demo', primeiro_nome: 'Edinalia', matricula_aleatoria: '583920', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_014', loja_id: 'loja-02-demo', primeiro_nome: 'Edma', matricula_aleatoria: '302948', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_015', loja_id: 'loja-02-demo', primeiro_nome: 'Fabiola', matricula_aleatoria: '183921', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_016', loja_id: 'loja-02-demo', primeiro_nome: 'Flávia', matricula_aleatoria: '849201', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_017', loja_id: 'loja-02-demo', primeiro_nome: 'Graziele', matricula_aleatoria: '381030', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_018', loja_id: 'loja-02-demo', primeiro_nome: 'Ilka', matricula_aleatoria: '572911', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_019', loja_id: 'loja-02-demo', primeiro_nome: 'Istelia', matricula_aleatoria: '381902', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_020', loja_id: 'loja-02-demo', primeiro_nome: 'Jaine', matricula_aleatoria: '640192', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_021', loja_id: 'loja-02-demo', primeiro_nome: 'Jaqueline', matricula_aleatoria: '392018', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_022', loja_id: 'loja-02-demo', primeiro_nome: 'Jéssica', matricula_aleatoria: '940192', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_023', loja_id: 'loja-02-demo', primeiro_nome: 'Joesiane', matricula_aleatoria: '940182', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_024', loja_id: 'loja-02-demo', primeiro_nome: 'John', matricula_aleatoria: '830194', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_025', loja_id: 'loja-02-demo', primeiro_nome: 'Kamilly', matricula_aleatoria: '649201', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_026', loja_id: 'loja-02-demo', primeiro_nome: 'Laísa', matricula_aleatoria: '183920', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_027', loja_id: 'loja-02-demo', primeiro_nome: 'Luciana', matricula_aleatoria: '610294', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_028', loja_id: 'loja-02-demo', primeiro_nome: 'Luciene', matricula_aleatoria: '729104', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_029', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus (Caixa)', matricula_aleatoria: '492018', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_030', loja_id: 'loja-02-demo', primeiro_nome: 'Micaele', matricula_aleatoria: '719203', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_031', loja_id: 'loja-02-demo', primeiro_nome: 'Mônica', matricula_aleatoria: '810294', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_032', loja_id: 'loja-02-demo', primeiro_nome: 'Natália', matricula_aleatoria: '819204', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_033', loja_id: 'loja-02-demo', primeiro_nome: 'Naylle', matricula_aleatoria: '748291', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_034', loja_id: 'loja-02-demo', primeiro_nome: 'Romildo', matricula_aleatoria: '940201', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_035', loja_id: 'loja-02-demo', primeiro_nome: 'Roseli', matricula_aleatoria: '192048', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_036', loja_id: 'loja-02-demo', primeiro_nome: 'Sabrina', matricula_aleatoria: '619284', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_037', loja_id: 'loja-02-demo', primeiro_nome: 'Sirlei', matricula_aleatoria: '940183', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_038', loja_id: 'loja-02-demo', primeiro_nome: 'Sueli', matricula_aleatoria: '381029', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_039', loja_id: 'loja-02-demo', primeiro_nome: 'Valquiria', matricula_aleatoria: '392041', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_040', loja_id: 'loja-02-demo', primeiro_nome: 'Vinícius', matricula_aleatoria: '294019', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_041', loja_id: 'loja-02-demo', primeiro_nome: 'Viviane', matricula_aleatoria: '840192', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_042', loja_id: 'loja-02-demo', primeiro_nome: 'Walta', matricula_aleatoria: '940202', setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },

  // Fiscal de Caixa (1 Fiscal)
  { id: 'f_043', loja_id: 'loja-02-demo', primeiro_nome: 'Fabrício', matricula_aleatoria: '840193', setor: 'Fiscal de Caixa', cargo: 'Fiscal de caixa', turno_padrao: '07:00 às 15:50', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },

  // 2. Departamento de Produção / Lanchonete - Padaria (17 Colaboradores)
  // NOTA RH: Angela e Nicole transferidas para Padaria conforme orientação do usuário
  { id: 'f_044', loja_id: 'loja-02-demo', primeiro_nome: 'Angela', matricula_aleatoria: '392095', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_045', loja_id: 'loja-02-demo', primeiro_nome: 'Nicole', matricula_aleatoria: '729106', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_046', loja_id: 'loja-02-demo', primeiro_nome: 'Bruna Alves', matricula_aleatoria: '810295', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_047', loja_id: 'loja-02-demo', primeiro_nome: 'Eduarda', matricula_aleatoria: '940203', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_048', loja_id: 'loja-02-demo', primeiro_nome: 'Erick Dayan', matricula_aleatoria: '640193', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_049', loja_id: 'loja-02-demo', primeiro_nome: 'Fernanda', matricula_aleatoria: '381031', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '12:00 às 20:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_050', loja_id: 'loja-02-demo', primeiro_nome: 'Ivandro', matricula_aleatoria: '572912', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_051', loja_id: 'loja-02-demo', primeiro_nome: 'Ivanete', matricula_aleatoria: '381903', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_052', loja_id: 'loja-02-demo', primeiro_nome: 'Jeane', matricula_aleatoria: '502919', setor: 'Padaria (Produção)', cargo: 'Auxiliar de salgadeiro', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_053', loja_id: 'loja-02-demo', primeiro_nome: 'Luis Henrique', matricula_aleatoria: '381032', setor: 'Padaria (Produção)', cargo: 'Auxiliar de padeiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_054', loja_id: 'loja-02-demo', primeiro_nome: 'Maise', matricula_aleatoria: '294020', setor: 'Padaria (Produção)', cargo: 'Auxiliar de salgadeiro', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_055', loja_id: 'loja-02-demo', primeiro_nome: 'Marielle', matricula_aleatoria: '492012', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '12:00 às 20:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_056', loja_id: 'loja-02-demo', primeiro_nome: 'Normelia', matricula_aleatoria: '719209', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_057', loja_id: 'loja-02-demo', primeiro_nome: 'Raquel', matricula_aleatoria: '582020', setor: 'Padaria (Produção)', cargo: 'Auxiliar de salgadeiro', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_058', loja_id: 'loja-02-demo', primeiro_nome: 'Thaís', matricula_aleatoria: '729107', setor: 'Padaria (Produção)', cargo: 'CONFEITEIRA', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_059', loja_id: 'loja-02-demo', primeiro_nome: 'Valdenise', matricula_aleatoria: '402920', setor: 'Padaria (Produção)', cargo: 'Atendente de Balcao', turno_padrao: '12:00 às 20:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_060', loja_id: 'loja-02-demo', primeiro_nome: 'Yuri', matricula_aleatoria: '918206', setor: 'Padaria (Produção)', cargo: 'Auxiliar de padeiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },

  // 3. Departamento de Mercadorias - Reposição (29 Repositores)
  { id: 'f_061', loja_id: 'loja-02-demo', primeiro_nome: 'Alessandro Gonzaga', matricula_aleatoria: '673922', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_062', loja_id: 'loja-02-demo', primeiro_nome: 'André Gonçalves', matricula_aleatoria: '204920', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_063', loja_id: 'loja-02-demo', primeiro_nome: 'André Oliveira', matricula_aleatoria: '859203', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_064', loja_id: 'loja-02-demo', primeiro_nome: 'André Santana', matricula_aleatoria: '392016', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_065', loja_id: 'loja-02-demo', primeiro_nome: 'Catarino', matricula_aleatoria: '104929', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_066', loja_id: 'loja-02-demo', primeiro_nome: 'Cláudio', matricula_aleatoria: '918205', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_067', loja_id: 'loja-02-demo', primeiro_nome: 'Daniel Souza', matricula_aleatoria: '673921', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_068', loja_id: 'loja-02-demo', primeiro_nome: 'Danilo', matricula_aleatoria: '294811', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_069', loja_id: 'loja-02-demo', primeiro_nome: 'Eduardo', matricula_aleatoria: '740194', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_070', loja_id: 'loja-02-demo', primeiro_nome: 'Emerson', matricula_aleatoria: '392017', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_071', loja_id: 'loja-02-demo', primeiro_nome: 'Erik Wekman', matricula_aleatoria: '683021', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_072', loja_id: 'loja-02-demo', primeiro_nome: 'Fagner', matricula_aleatoria: '940204', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_073', loja_id: 'loja-02-demo', primeiro_nome: 'Gindauzio', matricula_aleatoria: '104930', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_074', loja_id: 'loja-02-demo', primeiro_nome: 'Giovanne', matricula_aleatoria: '582021', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_075', loja_id: 'loja-02-demo', primeiro_nome: 'João Vitor', matricula_aleatoria: '729108', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_076', loja_id: 'loja-02-demo', primeiro_nome: 'Jocelane', matricula_aleatoria: '402921', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_077', loja_id: 'loja-02-demo', primeiro_nome: 'José Marcos', matricula_aleatoria: '918207', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_078', loja_id: 'loja-02-demo', primeiro_nome: 'Jovando', matricula_aleatoria: '402919', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_079', loja_id: 'loja-02-demo', primeiro_nome: 'Leandro', matricula_aleatoria: '673923', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_080', loja_id: 'loja-02-demo', primeiro_nome: 'Lucas', matricula_aleatoria: '204921', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_081', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo', matricula_aleatoria: '683020', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_082', loja_id: 'loja-02-demo', primeiro_nome: 'Marciano', matricula_aleatoria: '392018', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_083', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus Sousa', matricula_aleatoria: '683022', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_084', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo César', matricula_aleatoria: '104931', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_085', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael', matricula_aleatoria: '582022', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_086', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto José', matricula_aleatoria: '740193', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_087', loja_id: 'loja-02-demo', primeiro_nome: 'Suzaine', matricula_aleatoria: '859202', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_088', loja_id: 'loja-02-demo', primeiro_nome: 'Ueque', matricula_aleatoria: '729109', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_089', loja_id: 'loja-02-demo', primeiro_nome: 'Wellington', matricula_aleatoria: '392015', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },

  // 4. Departamento de Açougue (13 Colaboradores)
  { id: 'f_090', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Vitória', matricula_aleatoria: '402922', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_091', loja_id: 'loja-02-demo', primeiro_nome: 'Caike', matricula_aleatoria: '918208', setor: 'Açougue', cargo: 'Açogueiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_092', loja_id: 'loja-02-demo', primeiro_nome: 'David', matricula_aleatoria: '673924', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_093', loja_id: 'loja-02-demo', primeiro_nome: 'Erick Alves', matricula_aleatoria: '204922', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_094', loja_id: 'loja-02-demo', primeiro_nome: 'Gabriel', matricula_aleatoria: '859204', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_095', loja_id: 'loja-02-demo', primeiro_nome: 'Kawan', matricula_aleatoria: '392019', setor: 'Açougue', cargo: 'Açogueiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_096', loja_id: 'loja-02-demo', primeiro_nome: 'Luan', matricula_aleatoria: '683023', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_097', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos Antônio', matricula_aleatoria: '104932', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },
  { id: 'f_098', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo Henrique', matricula_aleatoria: '582023', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S4', grupo: 'A' },
  { id: 'f_099', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto Alves', matricula_aleatoria: '729110', setor: 'Açougue', cargo: 'Açogueiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S5', grupo: 'B' },
  { id: 'f_100', loja_id: 'loja-02-demo', primeiro_nome: 'Vagner', matricula_aleatoria: '402923', setor: 'Açougue', cargo: 'Açogueiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_101', loja_id: 'loja-02-demo', primeiro_nome: 'Valdinei', matricula_aleatoria: '918209', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_102', loja_id: 'loja-02-demo', primeiro_nome: 'Valter', matricula_aleatoria: '673925', setor: 'Açougue', cargo: 'Açogueiro', turno_padrao: '06:00 às 14:00', genero: 'M', ativo: true, rodizio_id: 'rod_especial_2x1', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },

  // 5. Departamento de Logística - Depósito (9 Colaboradores)
  { id: 'f_103', loja_id: 'loja-02-demo', primeiro_nome: 'Alessandro Castro', matricula_aleatoria: '204923', setor: 'Depósito', cargo: 'Auxiliar de deposito', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_104', loja_id: 'loja-02-demo', primeiro_nome: 'Ésio', matricula_aleatoria: '859205', setor: 'Depósito', cargo: 'Auxiliar de deposito', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_105', loja_id: 'loja-02-demo', primeiro_nome: 'Fábio', matricula_aleatoria: '392020', setor: 'Depósito', cargo: 'Conferente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_106', loja_id: 'loja-02-demo', primeiro_nome: 'Ivan', matricula_aleatoria: '683024', setor: 'Depósito', cargo: 'Conferente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_107', loja_id: 'loja-02-demo', primeiro_nome: 'Jorge', matricula_aleatoria: '104933', setor: 'Depósito', cargo: 'Conferente', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },
  { id: 'f_108', loja_id: 'loja-02-demo', primeiro_nome: 'Luis Carlos', matricula_aleatoria: '582024', setor: 'Depósito', cargo: 'Auxiliar de deposito', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'B', grupo_folga_semanal: 'S1', grupo: 'B' },
  { id: 'f_109', loja_id: 'loja-02-demo', primeiro_nome: 'Marlos', matricula_aleatoria: '729111', setor: 'Depósito', cargo: 'Auxiliar de deposito', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S2', grupo: 'A' },
  { id: 'f_110', loja_id: 'loja-02-demo', primeiro_nome: 'Reginaldo', matricula_aleatoria: '402924', setor: 'Operador de Empilhadeira', cargo: 'Operador de empilhadeira', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_111', loja_id: 'loja-02-demo', primeiro_nome: 'Welton', matricula_aleatoria: '918210', setor: 'Depósito', cargo: 'Auxiliar de deposito', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S3', grupo: 'B' },

  // 6. Departamento de Higienização (5 Colaboradores)
  { id: 'f_112', loja_id: 'loja-02-demo', primeiro_nome: 'Acleia', matricula_aleatoria: '673926', setor: 'Higienização', cargo: 'Serviços gerais(limpeza)', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_113', loja_id: 'loja-02-demo', primeiro_nome: 'Eliomar', matricula_aleatoria: '204924', setor: 'Higienização', cargo: 'Serviços gerais(limpeza)', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_114', loja_id: 'loja-02-demo', primeiro_nome: 'Gilvan', matricula_aleatoria: '859206', setor: 'Higienização', cargo: 'Serviços gerais(limpeza)', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_115', loja_id: 'loja-02-demo', primeiro_nome: 'Lécia', matricula_aleatoria: '392021', setor: 'Higienização', cargo: 'Serviços gerais(limpeza)', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_116', loja_id: 'loja-02-demo', primeiro_nome: 'Marinalva', matricula_aleatoria: '683025', setor: 'Higienização', cargo: 'Serviços gerais(limpeza)', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },

  // 7. Departamento Segurança - Vigias (5 Colaboradores)
  { id: 'f_117', loja_id: 'loja-02-demo', primeiro_nome: 'Daniel Souza (Vigia)', matricula_aleatoria: '104934', setor: 'Vigia', cargo: 'Vigia', turno_padrao: '19:00 às 07:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_118', loja_id: 'loja-02-demo', primeiro_nome: 'Júlio José', matricula_aleatoria: '582025', setor: 'Vigia', cargo: 'Vigia', turno_padrao: '19:00 às 07:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },
  { id: 'f_119', loja_id: 'loja-02-demo', primeiro_nome: 'Priscila', matricula_aleatoria: '729112', setor: 'Vigia', cargo: 'Vigia', turno_padrao: '07:00 às 19:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'C', grupo_feriado: 'A', grupo_folga_semanal: 'S3', grupo: 'A' },
  { id: 'f_120', loja_id: 'loja-02-demo', primeiro_nome: 'Rogério', matricula_aleatoria: '402925', setor: 'Vigia', cargo: 'Vigia', turno_padrao: '19:00 às 07:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'B', grupo_folga_semanal: 'S4', grupo: 'B' },
  { id: 'f_121', loja_id: 'loja-02-demo', primeiro_nome: 'Sívio', matricula_aleatoria: '918211', setor: 'Vigia', cargo: 'Vigia', turno_padrao: '19:00 às 07:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'A', grupo_folga_semanal: 'S5', grupo: 'A' },

  // 8. Manutenção (2 Colaboradores)
  { id: 'f_122', loja_id: 'loja-02-demo', primeiro_nome: 'Francisco', matricula_aleatoria: '673927', setor: 'Manutenção', cargo: 'AUXILIAR DE MANUTENÇÃO', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' },
  { id: 'f_123', loja_id: 'loja-02-demo', primeiro_nome: 'Thiago', matricula_aleatoria: '204925', setor: 'Manutenção', cargo: 'AUXILIAR TI', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'B', grupo_feriado: 'B', grupo_folga_semanal: 'S2', grupo: 'B' },

  // 9. Departamento Administrativo (1 Colaborador)
  { id: 'f_124', loja_id: 'loja-02-demo', primeiro_nome: 'Pâmela', matricula_aleatoria: '859207', setor: 'ADM', cargo: 'Encarregada do setor fiscal', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A', grupo_feriado: 'A', grupo_folga_semanal: 'S1', grupo: 'A' }
];



export const INITIAL_SETORES: Setor[] = [
  { id: 's1', nome: 'Frente de Caixa', descricao: 'Operadores e fiscais de caixa', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 6, min_funcionarios_domingo: 6, min_funcionarios_feriado: 6 },
  { id: 's2', nome: 'Reposição', descricao: 'Repositores de gôndolas e estoque', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's3', nome: 'Assistente de Lanchonete', descricao: 'Atendimento e preparo na lanchonete', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's4', nome: 'Açougue', descricao: 'Corte, preparo e atendimento do açougue', rodizio_id: 'rod_especial_2x1', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's5', nome: 'Padaria (Produção)', descricao: 'Produção e atendimento de panificação', rodizio_id: 'rod_especial_2x1', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's6', nome: 'Fiscal de Caixa', descricao: 'Supervisão e suporte aos caixas', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's7', nome: 'Operador de Empilhadeira', descricao: 'Operação de empilhadeiras e logística alta', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 1, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's8', nome: 'Higienização', descricao: 'Serviços gerais e zeladoria', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 2, min_funcionarios_domingo: 2, min_funcionarios_feriado: 2 },
  { id: 's9', nome: 'Manutenção', descricao: 'TI, elétrica e infraestrutura predial', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 1, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's10', nome: 'Depósito', descricao: 'Recebimento, conferência e armazenagem', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 2, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 },
  { id: 's11', nome: 'ADM', descricao: 'Administração e suporte ao cliente', rodizio_id: 'rod_normal_1x2', min_funcionarios_dia: 1, min_funcionarios_domingo: 1, min_funcionarios_feriado: 1 }
];

export const INITIAL_CARGOS: Cargo[] = [
  { id: 'c2', setor_nome: 'Frente de Caixa', nome: 'Operador de Caixa' },
  { id: 'c3', setor_nome: 'Reposição', nome: 'Repositor' },
  { id: 'c4', setor_nome: 'Reposição', nome: 'Repositora' },
  { id: 'c5', setor_nome: 'Reposição', nome: 'Repositor Líder' },
  { id: 'c6', setor_nome: 'Assistente de Lanchonete', nome: 'Atendente de Lanchonete' },
  { id: 'c7', setor_nome: 'Açougue', nome: 'Açougueiro' },
  { id: 'c8', setor_nome: 'Açougue', nome: 'Açougueiro Líder' },
  { id: 'c9', setor_nome: 'Açougue', nome: 'Auxiliar de Açougue' },
  { id: 'c10', setor_nome: 'Açougue', nome: 'Atendente' },
  { id: 'c11', setor_nome: 'Padaria (Produção)', nome: 'Padeiro Líder' },
  { id: 'c12', setor_nome: 'Padaria (Produção)', nome: 'Padeiro' },
  { id: 'c13', setor_nome: 'Padaria (Produção)', nome: 'Auxiliar de Padaria' },
  { id: 'c14', setor_nome: 'Padaria (Produção)', nome: 'Atendente' },
  { id: 'c15', setor_nome: 'Fiscal de Caixa', nome: 'Fiscal de Caixa Líder' },
  { id: 'c16', setor_nome: 'Fiscal de Caixa', nome: 'Fiscal de Caixa' },
  { id: 'c17', setor_nome: 'Operador de Empilhadeira', nome: 'Operador de Empilhadeira' },
  { id: 'c18', setor_nome: 'Higienização', nome: 'Auxiliar de Serviços Gerais' },
  { id: 'c19', setor_nome: 'Manutenção', nome: 'Técnico de Manutenção' },
  { id: 'c20', setor_nome: 'Manutenção', nome: 'Oficial de Manutenção Líder' },
  { id: 'c21', setor_nome: 'Manutenção', nome: 'Auxiliar de Manutenção Predial' },
  { id: 'c22', setor_nome: 'Manutenção', nome: 'Eletricista de Manutenção' },
  { id: 'c23', setor_nome: 'Depósito', nome: 'Conferente de Depósito' },
  { id: 'c24', setor_nome: 'Depósito', nome: 'Repositor de Depósito' },
  { id: 'c25', setor_nome: 'ADM', nome: 'Auxiliar Administrativo' },
  { id: 'c26', setor_nome: 'ADM', nome: 'Gerente de Loja' },
  { id: 'c27', setor_nome: 'Manutenção', nome: 'Auxiliar de TI' }
];

export const INITIAL_FERIADOS: Feriado[] = [
  { id: 'f1', nome: 'Ano Novo (Confraternização Universal)', data: '2026-01-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: true },
  { id: 'f2', nome: 'Carnaval (Terça-Feira)', data: '2026-02-17', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Ponto Facultativo / Feriado Nacional', funcionamento_proibido: false },
  { id: 'f3', nome: 'Paixão de Cristo (Sexta-Feira Santa)', data: '2026-04-03', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Religioso Nacional', funcionamento_proibido: true },
  { id: 'f4', nome: 'Tiradentes', data: '2026-04-21', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: false },
  { id: 'f5', nome: 'Dia do Trabalhador', data: '2026-05-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: true },
  { id: 'f6', nome: 'Corpus Christi', data: '2026-06-04', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Religioso Nacional', funcionamento_proibido: false },
  { id: 'f7', nome: 'Independência do Brasil (7 de Setembro)', data: '2026-09-07', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: false },
  { id: 'f8', nome: 'Nossa Senhora Aparecida (Padroeira do Brasil)', data: '2026-10-12', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: false },
  { id: 'f9', nome: 'Finados', data: '2026-11-02', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: false },
  { id: 'f10', nome: 'Proclamação da República', data: '2026-11-15', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional', funcionamento_proibido: false },
  { id: 'f11', nome: 'Dia da Consciência Negra', data: '2026-11-20', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional Zumbi dos Palmares', funcionamento_proibido: false },
  { id: 'f12', nome: 'Natal', data: '2026-12-25', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Celebração de Natal', funcionamento_proibido: true },
  { id: 'f13', nome: 'São João', data: '2026-06-24', tipo: 'Estadual', abrangencia: 'Bahia', descricao: 'Festa Junina Tradicional da Bahia', funcionamento_proibido: false },
  { id: 'f14', nome: 'Independência da Bahia', data: '2026-07-02', tipo: 'Estadual', abrangencia: 'Bahia', descricao: '2 de Julho - Data Magna da Bahia', funcionamento_proibido: false },
  { id: 'f15', nome: 'Festa do Divino Espírito Santo', data: '2026-05-24', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Festa do Padroeiro da Cidade de Poções', funcionamento_proibido: false },
  { id: 'f16', nome: 'Emancipação Política de Poções', data: '2026-06-26', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Aniversário da Cidade de Poções - BA', funcionamento_proibido: false },
  { id: 'f17', nome: 'Dia da Consciência Evangélica', data: '2026-10-31', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Dia da Cultura Evangélica de Poções', funcionamento_proibido: false },
  { id: 'f18', nome: 'Dia do Comerciário (Carnaval)', data: '2026-02-16', tipo: 'Municipal', abrangencia: 'Brumado Região - BA', descricao: 'Segunda-feira de carnaval, funcionamento proibido CCT', funcionamento_proibido: true }
];

export const INITIAL_REGRAS: RegraEscala[] = [
  { id: 'r1', titulo: 'Descanso Semanal Remunerado (DSR 6x1)', descricao: 'Todo colaborador tem direito a 1 folga semanal preferencialmente no domingo após no máximo 6 dias consecutivos de trabalho (Art. 67 da CLT).', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r2', titulo: 'Revezamento Dominical Quinzenal (Mulheres na Produção)', descricao: 'Para colaboradoras dos setores de Padaria e Açougue, aplica-se o revezamento quinzenal (Art. 386 da CLT). Nos demais setores, aplica-se a regra 1T:2F unificada para todos.', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r3', titulo: 'Revezamento Dominical Mensal (CCT)', descricao: 'Garantia de pelo menos 1 folga no domingo dentro de cada mês trabalhado para todos os colaboradores (Convenção Coletiva de Trabalho).', categoria: 'Acordo Coletivo', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r4', titulo: 'Intervalo Interjornada de 11 Horas', descricao: 'Entre duas jornadas de trabalho é obrigatório o intervalo mínimo de 11 horas consecutivas para descanso (Art. 66 da CLT).', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r5', titulo: 'Intervalo Intrajornada Flexível (Refeição)', descricao: 'Concessão de intervalo de refeição ajustável em 30 min, 1h, 1h30min, 2h, 2h30min, 2h40min ou 3h para jornadas acima de 6 horas (Salvo Convenção Coletiva).', categoria: 'Acordo Coletivo', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r6', titulo: 'Feriados Municipais de Poções-BA', descricao: 'Garantir folga ou compensação em dobro para feriados municipais de Poções (Festa do Divino Espírito Santo e Emancipação).', categoria: 'Interna RH', status: 'IMPLEMENTADA', obrigatoria: true },
  { id: 'r7', titulo: 'Prioridade de Folga Véspera de Feriado (Reposição)', descricao: 'Solicitação do RH: O pessoal da reposição que folgar no sábado véspera de feriado estadual não deve dobrar o turno na segunda-feira.', categoria: 'Solicitação RH', status: 'PENDENTE_PROGRAMADOR', obrigatoria: false }
];

export const INITIAL_REGRAS_CONFORMIDADE: RegraConformidade[] = [
  {
    id: 'rc_0',
    nivel_hierarquia: 0,
    categoria: 'LEGAL',
    titulo: 'Pausa de Sequência por Afastamento/Férias',
    descricao: 'Eventos de férias, atestados ou licenças suspendem a contagem de dias seguidos e não contam como trabalho nem folga comum.',
    valor: true,
    setor_aplicavel: 'TODOS',
    fonte: 'CLT Art. 130 / Súmula TST'
  },
  {
    id: 'rc_1_clt67',
    nivel_hierarquia: 1,
    categoria: 'LEGAL',
    titulo: 'Trava CLT Art. 67 (Máximo 6 dias de trabalho)',
    descricao: 'Nenhum colaborador pode trabalhar mais de 6 dias consecutivos sem gozar de descanso semanal remunerado.',
    valor: 6,
    setor_aplicavel: 'TODOS',
    fonte: 'CLT Art. 67 / OJ 410 SBDI-1 TST'
  },
  {
    id: 'rc_1_inter',
    nivel_hierarquia: 1,
    categoria: 'LEGAL',
    titulo: 'Intervalo Interjornada 11h (CLT Art. 66)',
    descricao: 'Entre duas jornadas de trabalho haverá um período mínimo de 11 horas consecutivas para descanso.',
    valor: 660,
    setor_aplicavel: 'TODOS',
    fonte: 'CLT Art. 66'
  },
  {
    id: 'rc_2_clt386',
    nivel_hierarquia: 2,
    categoria: 'LEGAL',
    titulo: 'Revezamento Quinzenal Feminino (CLT Art. 386)',
    descricao: 'Mulheres devem gozar de folga no domingo no máximo a cada 2 semanas (1 Domingo Trabalhado : 1 Domingo Folgado).',
    valor: 1,
    setor_aplicavel: 'Padaria e Açougue',
    fonte: 'CLT Art. 386 / STF Tema 828'
  },
  {
    id: 'rc_3_cct_caixa',
    nivel_hierarquia: 3,
    categoria: 'CCT',
    titulo: 'Revezamento Domingos Frente de Caixa (1T : 2F)',
    descricao: 'Operadores no Frente de Caixa trabalham 1 domingo e folgam nos 2 domingos seguintes.',
    valor: { trabalhado: 1, folgado: 2 },
    setor_aplicavel: 'Frente de Caixa',
    fonte: 'CCT Poções/BA'
  },
  {
    id: 'rc_3_cct_acougue',
    nivel_hierarquia: 3,
    categoria: 'CCT',
    titulo: 'Revezamento Domingos Açougue/Padaria (2T : 1F)',
    descricao: 'Atendentes e produções de Açougue/Padaria trabalham 2 domingos e folgam 1 domingo.',
    valor: { trabalhado: 2, folgado: 1 },
    setor_aplicavel: 'Açougue',
    fonte: 'CCT Poções/BA'
  },
  {
    id: 'rc_3_fiscais_duplas',
    nivel_hierarquia: 3,
    categoria: 'CCT',
    titulo: 'Duplas Fixas de Fiscais nos Domingos',
    descricao: 'Nos domingos, a equipe de Fiscais opera em duplas fixas (1 abertura + 1 fechamento).',
    valor: true,
    setor_aplicavel: 'Fiscal de Caixa',
    fonte: 'Acordo Interno / CCT'
  },
  {
    id: 'rc_4_feriados',
    nivel_hierarquia: 4,
    categoria: 'LEGAL',
    titulo: 'Feriados Fechados (FE) e Abertos (TF)',
    descricao: 'Em feriados fechados a loja não abre (folga FE). Em feriados abertos opera com equipe reduzida.',
    valor: true,
    setor_aplicavel: 'TODOS',
    fonte: 'Lei Municipal Poções / CCT'
  },
  {
    id: 'rc_5_teto_folgas',
    nivel_hierarquia: 5,
    categoria: 'INTERNA_RH',
    titulo: 'Meta Mensal de Folgas (4 a 5 folgas/mês)',
    descricao: 'Todo colaborador deve ter de 4 a 5 folgas mensais acumuladas.',
    valor: { min: 4, max: 5 },
    setor_aplicavel: 'TODOS',
    fonte: 'Política RH JH'
  },
  {
    id: 'rc_6_cobertura_caixa',
    nivel_hierarquia: 6,
    categoria: 'OPERACIONAL',
    titulo: 'Cobertura Mínima Frente de Caixa (Mínimo 6)',
    descricao: 'Garante no mínimo 6 operadores no caixa durante o funcionamento.',
    valor: 6,
    setor_aplicavel: 'Frente de Caixa',
    fonte: 'Dimensionamento Operacional'
  },
  {
    id: 'rc_6_padaria_folga_unica',
    nivel_hierarquia: 6,
    categoria: 'OPERACIONAL',
    titulo: 'Máximo 1 Folga por Dia na Produção da Padaria',
    descricao: 'Em dias úteis, permite no máximo 1 padeiro/auxiliar de folga simultânea para não parar a produção.',
    valor: 1,
    setor_aplicavel: 'Padaria (Produção)',
    fonte: 'Dimensionamento Operacional'
  }
];

