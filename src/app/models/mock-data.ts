import { Funcionario, Setor, Cargo, Feriado, RegraEscala, RegraConformidade } from './types';


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

export const INITIAL_FUNCIONARIOS: Funcionario[] = [
  // 1. Frente de Caixa - Horário 1: 07:00 às 15:50 (Almoço 11:00 às 12:30) [10 Operadores]
  { id: 'f_fc13', loja_id: 'loja-02-demo', primeiro_nome: 'Laísa', matricula_aleatoria: '183920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc26', loja_id: 'loja-02-demo', primeiro_nome: 'Cleide', matricula_aleatoria: '948102', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true, setores_cobertura: ['Fiscal de Caixa'] },
  { id: 'f_fc19', loja_id: 'loja-02-demo', primeiro_nome: 'Luciana', matricula_aleatoria: '610294', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc29', loja_id: 'loja-02-demo', primeiro_nome: 'Anna Caroline', matricula_aleatoria: '392094', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc37', loja_id: 'loja-02-demo', primeiro_nome: 'Valquiria', matricula_aleatoria: '392041', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc3', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Paula', matricula_aleatoria: '920148', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc4', loja_id: 'loja-02-demo', primeiro_nome: 'John', matricula_aleatoria: '830194', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'M', ativo: true },
  { id: 'f_fc9', loja_id: 'loja-02-demo', primeiro_nome: 'Kamilly', matricula_aleatoria: '649201', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc12', loja_id: 'loja-02-demo', primeiro_nome: 'Viviane', matricula_aleatoria: '840192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fc15', loja_id: 'loja-02-demo', primeiro_nome: 'Claudia', matricula_aleatoria: '294018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },

  // Frente de Caixa - Horário 2: 09:00 às 17:50 (Almoço 13:00 às 14:30) [10 Operadores]
  { id: 'f_fc11', loja_id: 'loja-02-demo', primeiro_nome: 'Sabrina', matricula_aleatoria: '619284', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc2', loja_id: 'loja-02-demo', primeiro_nome: 'Alane', matricula_aleatoria: '482019', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc36', loja_id: 'loja-02-demo', primeiro_nome: 'Micaele', matricula_aleatoria: '719203', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc1', loja_id: 'loja-02-demo', primeiro_nome: 'Naylle', matricula_aleatoria: '748291', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc21', loja_id: 'loja-02-demo', primeiro_nome: 'Natália', matricula_aleatoria: '819204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc24', loja_id: 'loja-02-demo', primeiro_nome: 'Roseli', matricula_aleatoria: '192048', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc25', loja_id: 'loja-02-demo', primeiro_nome: 'Edinalia', matricula_aleatoria: '583920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc18', loja_id: 'loja-02-demo', primeiro_nome: 'Luciene', matricula_aleatoria: '729104', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc22', loja_id: 'loja-02-demo', primeiro_nome: 'Edma', matricula_aleatoria: '302948', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },
  { id: 'f_fc6', loja_id: 'loja-02-demo', primeiro_nome: 'Jaqueline', matricula_aleatoria: '392018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: true },

  // Frente de Caixa - Horário 3: 12:40 às 21:30 (Almoço 14:20 às 15:50) [10 Operadores]
  { id: 'f_fc14', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Cláudia', matricula_aleatoria: '572910', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc20', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus', matricula_aleatoria: '492018', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'M', ativo: true },
  { id: 'f_fc23', loja_id: 'loja-02-demo', primeiro_nome: 'Analandia', matricula_aleatoria: '694018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc7', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Beatriz', matricula_aleatoria: '719204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc8', loja_id: 'loja-02-demo', primeiro_nome: 'Jaine', matricula_aleatoria: '640192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc17', loja_id: 'loja-02-demo', primeiro_nome: 'Sueli', matricula_aleatoria: '381029', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc16', loja_id: 'loja-02-demo', primeiro_nome: 'Joesiane', matricula_aleatoria: '940182', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc34', loja_id: 'loja-02-demo', primeiro_nome: 'Andreza', matricula_aleatoria: '204918', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc35', loja_id: 'loja-02-demo', primeiro_nome: 'Flávia', matricula_aleatoria: '849201', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },
  { id: 'f_fc40', loja_id: 'loja-02-demo', primeiro_nome: 'Ilka', matricula_aleatoria: '572911', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: true },

  // Frente de Caixa - Horário 4: 12:40 às 21:30 (Almoço 15:30 às 17:00) [10 Operadores]
  { id: 'f_lan9', loja_id: 'loja-02-demo', primeiro_nome: 'Bruna', matricula_aleatoria: '810293', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc10', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Félix', matricula_aleatoria: '319482', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc39', loja_id: 'loja-02-demo', primeiro_nome: 'Fabiola', matricula_aleatoria: '183921', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc42', loja_id: 'loja-02-demo', primeiro_nome: 'Sirlei', matricula_aleatoria: '940183', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc33', loja_id: 'loja-02-demo', primeiro_nome: 'Jéssica', matricula_aleatoria: '940192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc38', loja_id: 'loja-02-demo', primeiro_nome: 'Fabrício', matricula_aleatoria: '840193', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'M', ativo: true },
  { id: 'f_fc32', loja_id: 'loja-02-demo', primeiro_nome: 'Istelia', matricula_aleatoria: '381902', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc5', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Luíza', matricula_aleatoria: '502918', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc43', loja_id: 'loja-02-demo', primeiro_nome: 'Grazielle', matricula_aleatoria: '381030', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'F', ativo: true },
  { id: 'f_fc41', loja_id: 'loja-02-demo', primeiro_nome: 'Vinicius', matricula_aleatoria: '294019', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 15:30 às 17:00)', genero: 'M', ativo: true },

  // Inativas / Sobressalentes no cadastro antigo (não listadas no documento oficial enviado)
  { id: 'f_fc27', loja_id: 'loja-02-demo', primeiro_nome: 'Mônica', matricula_aleatoria: '810294', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: false },
  { id: 'f_fc28', loja_id: 'loja-02-demo', primeiro_nome: 'Mariane', matricula_aleatoria: '492011', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: false },
  { id: 'f_fc30', loja_id: 'loja-02-demo', primeiro_nome: 'Anita', matricula_aleatoria: '719208', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: false },
  { id: 'f_fc31', loja_id: 'loja-02-demo', primeiro_nome: 'Lunara', matricula_aleatoria: '582019', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:40 às 21:30 (Almoço 14:20 às 15:50)', genero: 'F', ativo: false },
  { id: 'f_fc44', loja_id: 'loja-02-demo', primeiro_nome: 'Lorena', matricula_aleatoria: '729105', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '09:00 às 17:50 (Almoço 13:00 às 14:30)', genero: 'F', ativo: false },

  // 2. Reposição
  { id: 'f_rep1', loja_id: 'loja-02-demo', primeiro_nome: 'Jovando', matricula_aleatoria: '402919', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_rep2', loja_id: 'loja-02-demo', primeiro_nome: 'Cláudio', matricula_aleatoria: '918205', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_rep3', loja_id: 'loja-02-demo', primeiro_nome: 'Daniel', matricula_aleatoria: '673921', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_rep4', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus (Rep)', matricula_aleatoria: '204919', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_rep5', loja_id: 'loja-02-demo', primeiro_nome: 'Suzaine', matricula_aleatoria: '859202', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true },
  { id: 'f_rep6', loja_id: 'loja-02-demo', primeiro_nome: 'Wellington', matricula_aleatoria: '392015', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep7', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto Jose', matricula_aleatoria: '740193', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep8', loja_id: 'loja-02-demo', primeiro_nome: 'Danilo', matricula_aleatoria: '294811', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep9', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo (Rep)', matricula_aleatoria: '683020', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep10', loja_id: 'loja-02-demo', primeiro_nome: 'Catarino', matricula_aleatoria: '104929', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_rep11', loja_id: 'loja-02-demo', primeiro_nome: 'André Santana', matricula_aleatoria: '930292', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_rep12', loja_id: 'loja-02-demo', primeiro_nome: 'Giovanne', matricula_aleatoria: '482911', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_rep13', loja_id: 'loja-02-demo', primeiro_nome: 'Emerson', matricula_aleatoria: '104921', setor: 'Reposição', cargo: 'Repositor Líder', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_rep14', loja_id: 'loja-02-demo', primeiro_nome: 'Leandro', matricula_aleatoria: '759202', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', genero: 'M', ativo: true },
  { id: 'f_rep15', loja_id: 'loja-02-demo', primeiro_nome: 'Fagner', matricula_aleatoria: '392019', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', genero: 'M', ativo: true },
  { id: 'f_rep16', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael (Rep)', matricula_aleatoria: '602942', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', genero: 'M', ativo: true },
  { id: 'f_rep17', loja_id: 'loja-02-demo', primeiro_nome: 'Marciano', matricula_aleatoria: '839102', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '11:00 às 19:00', genero: 'M', ativo: true },
  { id: 'f_rep18', loja_id: 'loja-02-demo', primeiro_nome: 'Lucas', matricula_aleatoria: '592011', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep19', loja_id: 'loja-02-demo', primeiro_nome: 'Gindauzio', matricula_aleatoria: '392810', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_rep20', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo Cesar', matricula_aleatoria: '719209', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_rep21', loja_id: 'loja-02-demo', primeiro_nome: 'Uegue', matricula_aleatoria: '482012', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '13:30 às 21:30', genero: 'M', ativo: true },
  { id: 'f_rep22', loja_id: 'loja-02-demo', primeiro_nome: 'José Marcos', matricula_aleatoria: '940128', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '13:30 às 21:30', genero: 'M', ativo: true },
  { id: 'f_rep23', loja_id: 'loja-02-demo', primeiro_nome: 'Jocelane', matricula_aleatoria: '183929', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', genero: 'F', ativo: true },

  // 3. Assistente de Lanchonete (com suporte a cobertura de Caixa)
  { id: 'f_lan1', loja_id: 'loja-02-demo', primeiro_nome: 'Eduarda', matricula_aleatoria: '194029', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true },
  { id: 'f_lan2', loja_id: 'loja-02-demo', primeiro_nome: 'Valdenice', matricula_aleatoria: '850193', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true },
  { id: 'f_lan3', loja_id: 'loja-02-demo', primeiro_nome: 'Nicole', matricula_aleatoria: '302949', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true, setores_cobertura: ['Frente de Caixa'] },
  { id: 'f_lan4', loja_id: 'loja-02-demo', primeiro_nome: 'Normelia', matricula_aleatoria: '694019', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true },
  { id: 'f_lan5', loja_id: 'loja-02-demo', primeiro_nome: 'Marielle', matricula_aleatoria: '192049', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', genero: 'F', ativo: true },
  { id: 'f_lan6', loja_id: 'loja-02-demo', primeiro_nome: 'Angela', matricula_aleatoria: '583921', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', genero: 'F', ativo: true, setores_cobertura: ['Frente de Caixa'] },
  { id: 'f_lan7', loja_id: 'loja-02-demo', primeiro_nome: 'Ivonete', matricula_aleatoria: '402920', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', genero: 'F', ativo: true },
  { id: 'f_lan8', loja_id: 'loja-02-demo', primeiro_nome: 'Claudio (Lanch)', matricula_aleatoria: '918206', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_lan10', loja_id: 'loja-02-demo', primeiro_nome: 'Val', matricula_aleatoria: '592018', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 19:00', genero: 'F', ativo: true },
  { id: 'f_lan11', loja_id: 'loja-02-demo', primeiro_nome: 'Maricleide', matricula_aleatoria: '381903', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 19:00', genero: 'F', ativo: true },
  { id: 'f_lan12', loja_id: 'loja-02-demo', primeiro_nome: 'Fernanda', matricula_aleatoria: '940193', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '11:30 às 21:30', genero: 'F', ativo: true },

  // 4. Açougue
  { id: 'f_ac1', loja_id: 'loja-02-demo', primeiro_nome: 'Gabriel', matricula_aleatoria: '673922', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_ac2', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Açougue)', matricula_aleatoria: '204920', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_ac3', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto (Açougue)', matricula_aleatoria: '859203', setor: 'Açougue', cargo: 'Açougueiro Líder', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_ac4', loja_id: 'loja-02-demo', primeiro_nome: 'Ana (Açougue)', matricula_aleatoria: '392016', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '08:00 às 16:00', genero: 'F', ativo: true },
  { id: 'f_ac5', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo', matricula_aleatoria: '740194', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '09:00 às 18:00', genero: 'M', ativo: true },
  { id: 'f_ac6', loja_id: 'loja-02-demo', primeiro_nome: 'Vagner', matricula_aleatoria: '294812', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', genero: 'M', ativo: true },
  { id: 'f_ac7', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos', matricula_aleatoria: '683021', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_ac8', loja_id: 'loja-02-demo', primeiro_nome: 'Kauam', matricula_aleatoria: '104930', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_ac9', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael', matricula_aleatoria: '930293', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', genero: 'M', ativo: true },
  { id: 'f_ac10', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo', matricula_aleatoria: '482912', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },
  { id: 'f_ac11', loja_id: 'loja-02-demo', primeiro_nome: 'Caike', matricula_aleatoria: '839201', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_ac12', loja_id: 'loja-02-demo', primeiro_nome: 'Kawan', matricula_aleatoria: '592012', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_ac13', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo Henrique', matricula_aleatoria: '392811', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_ac14', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Vitoria', matricula_aleatoria: '719210', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '09:00 às 17:00', genero: 'F', ativo: true },
  { id: 'f_ac15', loja_id: 'loja-02-demo', primeiro_nome: 'Luan', matricula_aleatoria: '482013', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_ac16', loja_id: 'loja-02-demo', primeiro_nome: 'David', matricula_aleatoria: '940129', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '10:00 às 18:00', genero: 'M', ativo: true },
  { id: 'f_ac17', loja_id: 'loja-02-demo', primeiro_nome: 'Valdinei', matricula_aleatoria: '183930', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '12:00 às 20:00', genero: 'M', ativo: true },

  // 5. Padaria (Produção)
  { id: 'f_pad1', loja_id: 'loja-02-demo', primeiro_nome: 'Evandro', matricula_aleatoria: '104922', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_pad2', loja_id: 'loja-02-demo', primeiro_nome: 'Maisa', matricula_aleatoria: '759203', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', genero: 'F', ativo: true },
  { id: 'f_pad3', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Padaria)', matricula_aleatoria: '392020', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_pad4', loja_id: 'loja-02-demo', primeiro_nome: 'Jeane', matricula_aleatoria: '602943', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', genero: 'F', ativo: true },
  { id: 'f_pad5', loja_id: 'loja-02-demo', primeiro_nome: 'Raquel', matricula_aleatoria: '194030', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', genero: 'F', ativo: true },
  { id: 'f_pad6', loja_id: 'loja-02-demo', primeiro_nome: 'Yuri', matricula_aleatoria: '850194', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_pad7', loja_id: 'loja-02-demo', primeiro_nome: 'Thais', matricula_aleatoria: '302950', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', genero: 'F', ativo: true },
  { id: 'f_pad8', loja_id: 'loja-02-demo', primeiro_nome: 'Ivandro', matricula_aleatoria: '694020', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_pad9', loja_id: 'loja-02-demo', primeiro_nome: 'Erick Dayan', matricula_aleatoria: '839202', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },
  { id: 'f_pad10', loja_id: 'loja-02-demo', primeiro_nome: 'Luís Henrique', matricula_aleatoria: '592013', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', genero: 'M', ativo: true },

  // 6. Fiscal de Caixa (Exatamente 2 Fiscais por dia: 1 de 07:00 às 15:50 e 1 de 12:40 às 21:00)
  { id: 'f_fisc1', loja_id: 'loja-02-demo', primeiro_nome: 'Walta', matricula_aleatoria: '192050', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa Líder', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fisc2', loja_id: 'loja-02-demo', primeiro_nome: 'Romildo', matricula_aleatoria: '918207', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '12:40 às 21:00 (Almoço 14:20 às 15:40)', genero: 'M', ativo: true },
  { id: 'f_fisc3', loja_id: 'loja-02-demo', primeiro_nome: 'Cleide (Fiscal)', matricula_aleatoria: '948102', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa Líder', turno_padrao: '07:00 às 15:50 (Almoço 11:00 às 12:30)', genero: 'F', ativo: true },
  { id: 'f_fisc4', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus (Fiscal)', matricula_aleatoria: '492018', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '12:40 às 21:00 (Almoço 14:20 às 15:40)', genero: 'M', ativo: true },

  // 7. Operador de Empilhadeira
  { id: 'f_emp1', loja_id: 'loja-02-demo', primeiro_nome: 'Reginaldo', matricula_aleatoria: '673923', setor: 'Operador de Empilhadeira', cargo: 'Operador de Empilhadeira', turno_padrao: '07:00 às 15:00', genero: 'M', ativo: true },

  // 8. Higienização / Limpeza
  { id: 'f_hig1', loja_id: 'loja-02-demo', primeiro_nome: 'Eliomar', matricula_aleatoria: '204921', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_hig2', loja_id: 'loja-02-demo', primeiro_nome: 'Acleia', matricula_aleatoria: '859204', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true },
  { id: 'f_hig3', loja_id: 'loja-02-demo', primeiro_nome: 'Gilvan', matricula_aleatoria: '392017', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_hig4', loja_id: 'loja-02-demo', primeiro_nome: 'Marinalva', matricula_aleatoria: '719211', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '10:00 às 19:00', genero: 'F', ativo: true },
  { id: 'f_hig5', loja_id: 'loja-02-demo', primeiro_nome: 'Lecia', matricula_aleatoria: '482014', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '07:00 às 16:00', genero: 'F', ativo: true },

  // 9. Manutenção
  { id: 'f_man1', loja_id: 'loja-02-demo', primeiro_nome: 'Thiago', matricula_aleatoria: '100001', setor: 'Manutenção', cargo: 'Técnico de Manutenção', turno_padrao: '07:30 às 17:18', genero: 'M', ativo: true },
  { id: 'f_man2', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos (Manut)', matricula_aleatoria: '710294', setor: 'Manutenção', cargo: 'Oficial de Manutenção Líder', turno_padrao: '07:30 às 17:18', genero: 'M', ativo: true },
  { id: 'f_man3', loja_id: 'loja-02-demo', primeiro_nome: 'José (Manut)', matricula_aleatoria: '492019', setor: 'Manutenção', cargo: 'Auxiliar de Manutenção Predial', turno_padrao: '07:30 às 17:18', genero: 'M', ativo: true },
  { id: 'f_man4', loja_id: 'loja-02-demo', primeiro_nome: 'Edilson', matricula_aleatoria: '839202', setor: 'Manutenção', cargo: 'Eletricista de Manutenção', turno_padrao: '07:30 às 17:18', genero: 'M', ativo: true },

  // 10. Depósito (Novo Setor)
  { id: 'f_dep1', loja_id: 'loja-02-demo', primeiro_nome: 'Esio', matricula_aleatoria: '940130', setor: 'Depósito', cargo: 'Conferente de Depósito', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_dep2', loja_id: 'loja-02-demo', primeiro_nome: 'Luis Carlos', matricula_aleatoria: '183931', setor: 'Depósito', cargo: 'Repositor de Depósito', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_dep3', loja_id: 'loja-02-demo', primeiro_nome: 'Fabio', matricula_aleatoria: '592014', setor: 'Depósito', cargo: 'Repositor de Depósito', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_dep4', loja_id: 'loja-02-demo', primeiro_nome: 'Welton', matricula_aleatoria: '392812', setor: 'Depósito', cargo: 'Repositor de Depósito', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_dep5', loja_id: 'loja-02-demo', primeiro_nome: 'Ivan', matricula_aleatoria: '719212', setor: 'Depósito', cargo: 'Conferente de Depósito', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_dep6', loja_id: 'loja-02-demo', primeiro_nome: 'Alessandro', matricula_aleatoria: '482015', setor: 'Depósito', cargo: 'Repositor de Depósito', turno_padrao: '08:00 às 16:00', genero: 'M', ativo: true },
  { id: 'f_dep7', loja_id: 'loja-02-demo', primeiro_nome: 'Jorge', matricula_aleatoria: '940131', setor: 'Depósito', cargo: 'Repositor de Depósito', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },
  { id: 'f_dep8', loja_id: 'loja-02-demo', primeiro_nome: 'Marlos', matricula_aleatoria: '183932', setor: 'Depósito', cargo: 'Conferente de Depósito', turno_padrao: '09:00 às 17:00', genero: 'M', ativo: true },

  // 11. ADM / Gerência
  { id: 'f_adm1', loja_id: 'loja-02-demo', primeiro_nome: 'Pamela', matricula_aleatoria: '592015', setor: 'ADM', cargo: 'Auxiliar Administrativo', turno_padrao: '08:00 às 16:00', genero: 'F', ativo: true },
  { id: 'f_adm2', loja_id: 'loja-02-demo', primeiro_nome: 'Ualas', matricula_aleatoria: '583922', setor: 'ADM', cargo: 'Gerente de Loja', turno_padrao: '08:00 às 17:00', genero: 'M', ativo: true, setores_cobertura: ['Fiscal de Caixa'] },
  { id: 'f_adm3', loja_id: 'loja-02-demo', primeiro_nome: 'Lane', matricula_aleatoria: '402921', setor: 'ADM', cargo: 'Gerente de Loja', turno_padrao: '08:00 às 17:00', genero: 'F', ativo: true, setores_cobertura: ['Fiscal de Caixa'] }
];

export const INITIAL_SETORES: Setor[] = [
  { id: 's1', nome: 'Frente de Caixa', descricao: 'Operadores e fiscais de caixa' },
  { id: 's2', nome: 'Reposição', descricao: 'Repositores de gôndolas e estoque' },
  { id: 's3', nome: 'Assistente de Lanchonete', descricao: 'Atendimento e preparo na lanchonete' },
  { id: 's4', nome: 'Açougue', descricao: 'Corte, preparo e atendimento do açougue' },
  { id: 's5', nome: 'Padaria (Produção)', descricao: 'Produção e atendimento de panificação' },
  { id: 's6', nome: 'Fiscal de Caixa', descricao: 'Supervisão e suporte aos caixas' },
  { id: 's7', nome: 'Operador de Empilhadeira', descricao: 'Operação de empilhadeiras e logística alta' },
  { id: 's8', nome: 'Higienização', descricao: 'Serviços gerais e zeladoria' },
  { id: 's9', nome: 'Manutenção', descricao: 'TI, elétrica e infraestrutura predial' },
  { id: 's10', nome: 'Depósito', descricao: 'Recebimento, conferência e armazenagem' },
  { id: 's11', nome: 'ADM', descricao: 'Administração e suporte ao cliente' }
];

export const INITIAL_CARGOS: Cargo[] = [
  { id: 'c1', setor_nome: 'Frente de Caixa', nome: 'Operadora de Caixa' },
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
  { id: 'c26', setor_nome: 'ADM', nome: 'Gerente de Loja' }
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

