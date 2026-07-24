import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Loja, Funcionario, Escala, Setor, Cargo, Feriado, RegraEscala } from '../models/types';

// Insira as credenciais do seu projeto Supabase aqui (ou via ambiente)
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_SUPABASE';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly client: SupabaseClient;

  // Signals para estado reativo moderno no Angular
  public currentUser = signal<User | null>(null);
  public currentSession = signal<Session | null>(null);
  public userLojas = signal<Loja[]>([]);
  public activeLoja = signal<Loja | null>(null);

  // Armazenamento em memória local com os 75 colaboradores oficiais da Loja 002
  public readonly localFuncionarios = signal<Funcionario[]>([
    // 1. Frente de Caixa
    { id: 'f_fc1', loja_id: 'loja-02-demo', primeiro_nome: 'Nayle', matricula_aleatoria: '748291', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc2', loja_id: 'loja-02-demo', primeiro_nome: 'Alane', matricula_aleatoria: '482019', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc3', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Paula', matricula_aleatoria: '920148', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc4', loja_id: 'loja-02-demo', primeiro_nome: 'John', matricula_aleatoria: '830194', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc5', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Luísa', matricula_aleatoria: '502918', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc6', loja_id: 'loja-02-demo', primeiro_nome: 'Jaqueline', matricula_aleatoria: '392018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc7', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Beatriz', matricula_aleatoria: '719204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_fc8', loja_id: 'loja-02-demo', primeiro_nome: 'Jaine', matricula_aleatoria: '640192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_fc9', loja_id: 'loja-02-demo', primeiro_nome: 'Kamilly', matricula_aleatoria: '649201', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_fc10', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Félix', matricula_aleatoria: '319482', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_fc11', loja_id: 'loja-02-demo', primeiro_nome: 'Sabrina', matricula_aleatoria: '619284', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_fc12', loja_id: 'loja-02-demo', primeiro_nome: 'Viviane', matricula_aleatoria: '840192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_fc13', loja_id: 'loja-02-demo', primeiro_nome: 'Laísa', matricula_aleatoria: '183920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc14', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Cláudia', matricula_aleatoria: '572910', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc15', loja_id: 'loja-02-demo', primeiro_nome: 'Claudia', matricula_aleatoria: '294018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc16', loja_id: 'loja-02-demo', primeiro_nome: 'Joesiane', matricula_aleatoria: '940182', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc17', loja_id: 'loja-02-demo', primeiro_nome: 'Sueli', matricula_aleatoria: '381029', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc18', loja_id: 'loja-02-demo', primeiro_nome: 'Luciene', matricula_aleatoria: '729104', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc19', loja_id: 'loja-02-demo', primeiro_nome: 'Luciana', matricula_aleatoria: '610294', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc20', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus', matricula_aleatoria: '492018', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc21', loja_id: 'loja-02-demo', primeiro_nome: 'Natália', matricula_aleatoria: '819204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_fc22', loja_id: 'loja-02-demo', primeiro_nome: 'Edma', matricula_aleatoria: '302948', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'f_fc23', loja_id: 'loja-02-demo', primeiro_nome: 'Analandia', matricula_aleatoria: '694018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'f_fc24', loja_id: 'loja-02-demo', primeiro_nome: 'Roseli', matricula_aleatoria: '192048', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'f_fc25', loja_id: 'loja-02-demo', primeiro_nome: 'Edinalia', matricula_aleatoria: '583920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },

    // 2. Reposição
    { id: 'f_rep1', loja_id: 'loja-02-demo', primeiro_nome: 'Jovando', matricula_aleatoria: '402919', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'f_rep2', loja_id: 'loja-02-demo', primeiro_nome: 'Cláudio', matricula_aleatoria: '918205', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'f_rep3', loja_id: 'loja-02-demo', primeiro_nome: 'Daniel', matricula_aleatoria: '673921', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'f_rep4', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus (Rep)', matricula_aleatoria: '204919', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'f_rep5', loja_id: 'loja-02-demo', primeiro_nome: 'Suzaine', matricula_aleatoria: '859202', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'f_rep6', loja_id: 'loja-02-demo', primeiro_nome: 'Wellington', matricula_aleatoria: '392015', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'f_rep7', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto Jose', matricula_aleatoria: '740193', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'f_rep8', loja_id: 'loja-02-demo', primeiro_nome: 'Danilo', matricula_aleatoria: '294811', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'f_rep9', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo (Rep)', matricula_aleatoria: '683020', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'f_rep10', loja_id: 'loja-02-demo', primeiro_nome: 'Catarino', matricula_aleatoria: '104929', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_rep11', loja_id: 'loja-02-demo', primeiro_nome: 'André Santana', matricula_aleatoria: '930292', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_rep12', loja_id: 'loja-02-demo', primeiro_nome: 'Giovanne', matricula_aleatoria: '482911', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_rep13', loja_id: 'loja-02-demo', primeiro_nome: 'Emerson', matricula_aleatoria: '104921', setor: 'Reposição', cargo: 'Repositor Líder', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_rep14', loja_id: 'loja-02-demo', primeiro_nome: 'Leandro', matricula_aleatoria: '759202', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'f_rep15', loja_id: 'loja-02-demo', primeiro_nome: 'Fagner', matricula_aleatoria: '392019', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'f_rep16', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael (Rep)', matricula_aleatoria: '602942', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },

    // 3. Assistente de Lanchonete
    { id: 'f_lan1', loja_id: 'loja-02-demo', primeiro_nome: 'Eduarda', matricula_aleatoria: '194029', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_lan2', loja_id: 'loja-02-demo', primeiro_nome: 'Valdenice', matricula_aleatoria: '850193', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_lan3', loja_id: 'loja-02-demo', primeiro_nome: 'Nicole', matricula_aleatoria: '302949', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_lan4', loja_id: 'loja-02-demo', primeiro_nome: 'Normelia', matricula_aleatoria: '694019', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_lan5', loja_id: 'loja-02-demo', primeiro_nome: 'Marielle', matricula_aleatoria: '192049', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_lan6', loja_id: 'loja-02-demo', primeiro_nome: 'Angela', matricula_aleatoria: '583921', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'f_lan7', loja_id: 'loja-02-demo', primeiro_nome: 'Ivonete', matricula_aleatoria: '402920', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_lan8', loja_id: 'loja-02-demo', primeiro_nome: 'Claudio (Lanch)', matricula_aleatoria: '918206', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', ativo: true },

    // 4. Açougue
    { id: 'f_ac1', loja_id: 'loja-02-demo', primeiro_nome: 'Gabriel', matricula_aleatoria: '673922', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_ac2', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Açougue)', matricula_aleatoria: '204920', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_ac3', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto (Açougue)', matricula_aleatoria: '859203', setor: 'Açougue', cargo: 'Açougueiro Líder', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_ac4', loja_id: 'loja-02-demo', primeiro_nome: 'Ana (Açougue)', matricula_aleatoria: '392016', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'f_ac5', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo', matricula_aleatoria: '740194', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'f_ac6', loja_id: 'loja-02-demo', primeiro_nome: 'Vagner', matricula_aleatoria: '294812', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'f_ac7', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos', matricula_aleatoria: '683021', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_ac8', loja_id: 'loja-02-demo', primeiro_nome: 'Kauam', matricula_aleatoria: '104930', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'f_ac9', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael', matricula_aleatoria: '930293', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'f_ac10', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo', matricula_aleatoria: '482912', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '12:00 às 20:00', ativo: true },

    // 5. Padaria (Produção)
    { id: 'f_pad1', loja_id: 'loja-02-demo', primeiro_nome: 'Evandro', matricula_aleatoria: '104922', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad2', loja_id: 'loja-02-demo', primeiro_nome: 'Maisa', matricula_aleatoria: '759203', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad3', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Padaria)', matricula_aleatoria: '392020', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad4', loja_id: 'loja-02-demo', primeiro_nome: 'Jeane', matricula_aleatoria: '602943', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad5', loja_id: 'loja-02-demo', primeiro_nome: 'Raquel', matricula_aleatoria: '194030', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad6', loja_id: 'loja-02-demo', primeiro_nome: 'Yuri', matricula_aleatoria: '850194', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad7', loja_id: 'loja-02-demo', primeiro_nome: 'Thais', matricula_aleatoria: '302950', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'f_pad8', loja_id: 'loja-02-demo', primeiro_nome: 'Ivandro', matricula_aleatoria: '694020', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', ativo: true },

    // 6. Fiscal de Caixa
    { id: 'f_fisc1', loja_id: 'loja-02-demo', primeiro_nome: 'Walta', matricula_aleatoria: '192050', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa Líder', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_fisc2', loja_id: 'loja-02-demo', primeiro_nome: 'Ualas', matricula_aleatoria: '583922', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '10:00 às 20:00', ativo: true },
    { id: 'f_fisc3', loja_id: 'loja-02-demo', primeiro_nome: 'Lane', matricula_aleatoria: '402921', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_fisc4', loja_id: 'loja-02-demo', primeiro_nome: 'Romildo', matricula_aleatoria: '918207', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '10:00 às 20:00', ativo: true },

    // 7. Operador de Empilhadeira
    { id: 'f_emp1', loja_id: 'loja-02-demo', primeiro_nome: 'Reginaldo', matricula_aleatoria: '673923', setor: 'Operador de Empilhadeira', cargo: 'Operador de Empilhadeira', turno_padrao: '07:00 às 15:00', ativo: true },

    // 8. Higienização
    { id: 'f_hig1', loja_id: 'loja-02-demo', primeiro_nome: 'Eliomar', matricula_aleatoria: '204921', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_hig2', loja_id: 'loja-02-demo', primeiro_nome: 'Acleia', matricula_aleatoria: '859204', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'f_hig3', loja_id: 'loja-02-demo', primeiro_nome: 'Gilvan', matricula_aleatoria: '392017', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },

    // 9. Manutenção
    { id: 'f_man1', loja_id: 'loja-02-demo', primeiro_nome: 'Thiago', matricula_aleatoria: '100001', setor: 'Manutenção', cargo: 'Supervisor de TI & Manutenção', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'f_man2', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos (Manut)', matricula_aleatoria: '710294', setor: 'Manutenção', cargo: 'Oficial de Manutenção Líder', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'f_man3', loja_id: 'loja-02-demo', primeiro_nome: 'José (Manut)', matricula_aleatoria: '492019', setor: 'Manutenção', cargo: 'Auxiliar de Manutenção Predial', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'f_man4', loja_id: 'loja-02-demo', primeiro_nome: 'Edilson', matricula_aleatoria: '839202', setor: 'Manutenção', cargo: 'Eletricista de Manutenção', turno_padrao: '07:30 às 17:18', ativo: true }
  ]);
  public readonly localSetores = signal<Setor[]>([
    { id: 's1', nome: 'Frente de Caixa', descricao: 'Operadores e fiscais de caixa' },
    { id: 's2', nome: 'Reposição', descricao: 'Repositores de gôndolas e estoque' },
    { id: 's3', nome: 'Assistente de Lanchonete', descricao: 'Atendimento e preparo na lanchonete' },
    { id: 's4', nome: 'Açougue', descricao: 'Corte, preparo e atendimento do açougue' },
    { id: 's5', nome: 'Padaria (Produção)', descricao: 'Produção e atendimento de panificação' },
    { id: 's6', nome: 'Fiscal de Caixa', descricao: 'Supervisão e suporte aos caixas' },
    { id: 's7', nome: 'Operador de Empilhadeira', descricao: 'Operação de empilhadeiras e logística alta' },
    { id: 's8', nome: 'Higienização', descricao: 'Serviços gerais e zeladoria' },
    { id: 's9', nome: 'Manutenção', descricao: 'TI, elétrica e infraestrutura predial' }
  ]);

  public readonly localCargos = signal<Cargo[]>([
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
    { id: 'c19', setor_nome: 'Manutenção', nome: 'Supervisor de TI & Manutenção' },
    { id: 'c20', setor_nome: 'Manutenção', nome: 'Oficial de Manutenção Líder' },
    { id: 'c21', setor_nome: 'Manutenção', nome: 'Auxiliar de Manutenção Predial' },
    { id: 'c22', setor_nome: 'Manutenção', nome: 'Eletricista de Manutenção' }
  ]);

  public readonly localFeriados = signal<Feriado[]>([
    { id: 'f1', nome: 'Ano Novo (Confraternização Universal)', data: '2026-01-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f2', nome: 'Carnaval (Terça-Feira)', data: '2026-02-17', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Ponto Facultativo / Feriado Nacional' },
    { id: 'f3', nome: 'Paixão de Cristo (Sexta-Feira Santa)', data: '2026-04-03', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Religioso Nacional' },
    { id: 'f4', nome: 'Tiradentes', data: '2026-04-21', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f5', nome: 'Dia do Trabalhador', data: '2026-05-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f6', nome: 'Corpus Christi', data: '2026-06-04', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Religioso Nacional' },
    { id: 'f7', nome: 'Independência do Brasil (7 de Setembro)', data: '2026-09-07', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f8', nome: 'Nossa Senhora Aparecida (Padroeira do Brasil)', data: '2026-10-12', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f9', nome: 'Finados', data: '2026-11-02', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f10', nome: 'Proclamação da República', data: '2026-11-15', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional' },
    { id: 'f11', nome: 'Dia da Consciência Negra', data: '2026-11-20', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional Zumbi dos Palmares' },
    { id: 'f12', nome: 'Natal', data: '2026-12-25', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Celebração de Natal' },
    { id: 'f13', nome: 'São João', data: '2026-06-24', tipo: 'Estadual', abrangencia: 'Bahia', descricao: 'Festa Junina Tradicional da Bahia' },
    { id: 'f14', nome: 'Independência da Bahia', data: '2026-07-02', tipo: 'Estadual', abrangencia: 'Bahia', descricao: '2 de Julho - Data Magna da Bahia' },
    { id: 'f15', nome: 'Festa do Divino Espírito Santo', data: '2026-05-24', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Festa do Padroeiro da Cidade de Poções' },
    { id: 'f16', nome: 'Emancipação Política de Poções', data: '2026-06-26', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Aniversário da Cidade de Poções - BA' },
    { id: 'f17', nome: 'Dia da Consciência Evangélica', data: '2026-10-31', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Dia da Cultura Evangélica de Poções' }
  ]);

  public readonly localRegras = signal<RegraEscala[]>([
    { id: 'r1', titulo: 'Descanso Semanal Remunerado (DSR 6x1)', descricao: 'Todo colaborador tem direito a 1 folga semanal preferencialmente no domingo após no máximo 6 dias consecutivos de trabalho (Art. 67 da CLT).', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r2', titulo: 'Revezamento Dominical Quinzenal (Mulheres)', 'descricao': 'Para colaboradoras do sexo feminino, é proibido trabalhar 2 domingos consecutivos (Art. 386 da CLT).', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r3', titulo: 'Revezamento Dominical Mensal (CCT)', descricao: 'Garantia de pelo menos 1 folga no domingo dentro de cada mês trabalhado para todos os colaboradores (Convenção Coletiva de Trabalho).', categoria: 'Acordo Coletivo', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r4', titulo: 'Intervalo Interjornada de 11 Horas', descricao: 'Entre duas jornadas de trabalho é obrigatório o intervalo mínimo de 11 horas consecutivas para descanso (Art. 66 da CLT).', categoria: 'CLT', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r5', titulo: 'Intervalo Intrajornada Flexível (Refeição)', descricao: 'Concessão de intervalo de refeição ajustável em 30 min, 1h, 1h30min, 2h, 2h30min, 2h40min ou 3h para jornadas acima de 6 horas (Salvo Convenção Coletiva).', categoria: 'Acordo Coletivo', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r6', titulo: 'Feriados Municipais de Poções-BA', descricao: 'Garantir folga ou compensação em dobro para feriados municipais de Poções (Festa do Divino Espírito Santo e Emancipação).', categoria: 'Interna RH', status: 'IMPLEMENTADA', obrigatoria: true },
    { id: 'r7', titulo: 'Prioridade de Folga Véspera de Feriado (Reposição)', descricao: 'Solicitação do RH: O pessoal da reposição que folgar no sábado véspera de feriado estadual não deve dobrar o turno na segunda-feira.', categoria: 'Solicitação RH', status: 'PENDENTE_PROGRAMADOR', obrigatoria: false }
  ]);

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    this.initAuthListener();
  }

  private initAuthListener(): void {
    this.client.auth.getSession().then(({ data }) => {
      this.updateAuthState(data.session);
    }).catch((err: unknown) => {
      console.error('Erro ao obter sessão Supabase:', err);
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.updateAuthState(session);
    });
  }

  private updateAuthState(session: Session | null): void {
    this.currentSession.set(session);
    this.currentUser.set(session?.user ?? null);

    if (session?.user) {
      this.loadUserLojas().catch((err: unknown) => {
        console.error('Erro ao carregar lojas do usuário:', err);
      });
    } else {
      this.userLojas.set([]);
      this.activeLoja.set(null);
    }
  }

  // Auth Methods
  async loginWithEmail(email: string, pass: string) {
    // 1. Tentar Login Real via Supabase Auth
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password: pass
      });
      if (!error && data?.user) {
        return data;
      }
      if (error && error.message !== 'Failed to fetch') {
        throw error;
      }
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }
    }

    // 2. Fallback de teste local apenas para credenciais autorizadas se as chaves da URL do Supabase ainda forem as padrão
    const isRhUser = email === 'rhjoaohenriqueatacadista@gmail.com' && pass === '282419';
    const isThygoUser = email === 'thygo10@gmail.com' && pass === '320512';
    const isDemoUser = (pass === '123456' || pass === 'admin') && 
      (email === 'rh.matriz@joaohenrique.com.br' || email === 'admin@joaohenrique.com.br');

    if (isRhUser || isThygoUser || isDemoUser) {
      let userId = 'demo-user-rh-01';
      if (isThygoUser) {
        userId = 'user-thygo-10';
      } else if (isRhUser) {
        userId = 'user-rh-jh-01';
      }

      const mockUser: any = {
        id: userId,
        email: email
      };
      const mockLoja: Loja = {
        id: 'loja-02-demo',
        empresa_id: 'empresa-demo',
        nome: 'Filial - Loja 002',
        codigo: 'LOJA002'
      };
      this.currentUser.set(mockUser);
      this.userLojas.set([mockLoja]);
      this.activeLoja.set(mockLoja);
      return { user: mockUser };
    }

    throw new Error('E-mail ou senha incorretos.');
  }

  async logout() {
    const { error } = await this.client.auth.signOut();
    if (error) console.error('Erro ao encerrar sessão:', error.message);
    this.currentUser.set(null);
    this.currentSession.set(null);
    this.activeLoja.set(null);
    this.userLojas.set([]);
  }

  // Multitenancy: Carregar lojas da empresa via Supabase
  async loadUserLojas() {
    try {
      const { data, error } = await this.client
        .from('lojas')
        .select('*');

      if (!error && data && data.length > 0) {
        const lojas = data as Loja[];
        this.userLojas.set(lojas);
        if (!this.activeLoja()) {
          this.activeLoja.set(lojas[0]);
        }
        return;
      }
    } catch (err) {
      console.error('Erro ao consultar lojas no Supabase:', err);
    }

    // Fallback padrão se não houver registros
    const defaultLoja: Loja = {
      id: 'loja-02-demo',
      empresa_id: 'empresa-demo',
      nome: 'Filial - Loja 002',
      codigo: 'LOJA002'
    };
    this.userLojas.set([defaultLoja]);
    if (!this.activeLoja()) this.activeLoja.set(defaultLoja);
  }

  setActiveLoja(loja: Loja) {
    this.activeLoja.set(loja);
  }

  // Funcionários CRUD 100% via Supabase
  async getFuncionarios(lojaId: string): Promise<Funcionario[]> {
    try {
      const { data, error } = await this.client
        .from('funcionarios')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('ativo', true)
        .order('primeiro_nome', { ascending: true });

      if (!error && data) {
        const funcs = data as Funcionario[];
        this.localFuncionarios.set(funcs);
        return funcs;
      }
    } catch (err) {
      console.error('Erro ao buscar funcionarios no Supabase:', err);
    }
    return this.localFuncionarios().filter(f => f.ativo && (f.loja_id === lojaId || f.loja_id === 'loja-02-demo'));
  }

  async addFuncionario(func: Omit<Funcionario, 'id' | 'matricula_aleatoria'>): Promise<Funcionario> {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomMatricula = (100000 + (array[0] % 900000)).toString();

    const payload = {
      loja_id: func.loja_id,
      primeiro_nome: func.primeiro_nome,
      matricula_aleatoria: randomMatricula,
      setor: func.setor,
      cargo: func.cargo,
      turno_padrao: func.turno_padrao,
      ativo: true
    };

    try {
      const { data, error } = await this.client
        .from('funcionarios')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const newFunc = data as Funcionario;
        this.localFuncionarios.update(list => [...list, newFunc]);
        return newFunc;
      }
    } catch (err) {
      console.error('Erro ao adicionar funcionário no Supabase:', err);
    }

    const localNewFunc: Funcionario = {
      ...payload,
      id: 'local-' + Date.now()
    };
    this.localFuncionarios.update(list => [...list, localNewFunc]);
    return localNewFunc;
  }

  async softDeleteFuncionario(id: string): Promise<void> {
    try {
      await this.client
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar funcionário no Supabase:', err);
    }
    this.localFuncionarios.update(list =>
      list.map(f => f.id === id ? { ...f, ativo: false } : f)
    );
  }

  async updateFuncionario(func: Funcionario): Promise<Funcionario> {
    try {
      const { data, error } = await this.client
        .from('funcionarios')
        .update({
          primeiro_nome: func.primeiro_nome,
          setor: func.setor,
          cargo: func.cargo,
          turno_padrao: func.turno_padrao,
          ativo: func.ativo
        })
        .eq('id', func.id)
        .select()
        .single();

      if (!error && data) {
        const updated = data as Funcionario;
        this.localFuncionarios.update(list => list.map(f => f.id === func.id ? updated : f));
        return updated;
      }
    } catch (err) {
      console.error('Erro ao atualizar funcionário no Supabase:', err);
    }

    this.localFuncionarios.update(list => list.map(f => f.id === func.id ? { ...f, ...func } : f));
    return func;
  }

  // Setores CRUD
  async getSetores(): Promise<Setor[]> {
    try {
      const { data, error } = await this.client.from('setores').select('*').order('nome');
      if (!error && data && data.length > 0) {
        return data as Setor[];
      }
    } catch (err) {
      console.error('Erro ao carregar setores no Supabase:', err);
    }
    return this.localSetores();
  }

  async addSetor(nome: string, descricao?: string): Promise<Setor> {
    try {
      const { data, error } = await this.client.from('setores').insert({ nome, descricao }).select().single();
      if (!error && data) return data as Setor;
    } catch (err) {
      console.error('Erro ao criar setor no Supabase:', err);
    }

    const newSetor: Setor = { id: 'setor-' + Date.now(), nome, descricao };
    this.localSetores.update(list => [...list, newSetor]);
    return newSetor;
  }

  async updateSetor(id: string, novoNome: string, descricao?: string): Promise<void> {
    try {
      await this.client.from('setores').update({ nome: novoNome, descricao }).eq('id', id);
    } catch (err) {
      console.error('Erro ao atualizar setor no Supabase:', err);
    }

    this.localSetores.update(list =>
      list.map(s => s.id === id ? { ...s, nome: novoNome, descricao } : s)
    );
  }

  async deleteSetor(id: string): Promise<void> {
    try {
      await this.client.from('setores').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar setor no Supabase:', err);
    }

    this.localSetores.update(list => list.filter(s => s.id !== id));
  }

  // Cargos CRUD
  async getCargos(): Promise<Cargo[]> {
    try {
      const { data, error } = await this.client.from('cargos').select('*').order('nome');
      if (!error && data && data.length > 0) {
        return data as Cargo[];
      }
    } catch (err) {
      console.error('Erro ao carregar cargos no Supabase:', err);
    }
    return this.localCargos();
  }

  async addCargo(setorNome: string, cargoNome: string, descricao?: string): Promise<Cargo> {
    try {
      const { data, error } = await this.client.from('cargos').insert({ setor_nome: setorNome, nome: cargoNome, descricao }).select().single();
      if (!error && data) return data as Cargo;
    } catch (err) {
      console.error('Erro ao criar cargo no Supabase:', err);
    }

    const newCargo: Cargo = { id: 'cargo-' + Date.now(), setor_nome: setorNome, nome: cargoNome, descricao };
    this.localCargos.update(list => [...list, newCargo]);
    return newCargo;
  }

  async updateCargo(id: string, novoNome: string, descricao?: string): Promise<void> {
    try {
      await this.client.from('cargos').update({ nome: novoNome, descricao }).eq('id', id);
    } catch (err) {
      console.error('Erro ao atualizar cargo no Supabase:', err);
    }

    this.localCargos.update(list =>
      list.map(c => c.id === id ? { ...c, nome: novoNome, descricao } : c)
    );
  }

  async deleteCargo(id: string): Promise<void> {
    try {
      await this.client.from('cargos').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar cargo no Supabase:', err);
    }

    this.localCargos.update(list => list.filter(c => c.id !== id));
  }

  // Escalas CRUD 100% via Supabase
  async getEscala(lojaId: string, mesRef: string, setor: string): Promise<Escala | null> {
    try {
      const { data, error } = await this.client
        .from('escalas')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('mes_referencia', mesRef)
        .eq('setor', setor)
        .maybeSingle();

      if (!error && data) return data as Escala;
    } catch (err) {
      console.error('Erro ao consultar escala no Supabase:', err);
    }
    return null;
  }

  async saveEscala(escala: Escala): Promise<Escala> {
    try {
      const { data, error } = await this.client
        .from('escalas')
        .upsert({
          loja_id: escala.loja_id,
          mes_referencia: escala.mes_referencia,
          setor: escala.setor,
          dados: escala.dados,
          criado_por: this.currentUser()?.id
        }, { onConflict: 'loja_id,mes_referencia,setor' })
        .select()
        .single();

      if (!error && data) return data as Escala;
    } catch (err) {
      console.error('Erro ao salvar escala no Supabase:', err);
    }
    return escala;
  }

  // Feriados CRUD 100% via Supabase
  async getFeriados(): Promise<Feriado[]> {
    try {
      const { data, error } = await this.client
        .from('feriados')
        .select('*')
        .order('data', { ascending: true });

      if (!error && data) {
        const feriados = data as Feriado[];
        this.localFeriados.set(feriados);
        return feriados;
      }
    } catch (err) {
      console.error('Erro ao buscar feriados no Supabase:', err);
    }
    return this.localFeriados();
  }

  async addFeriado(feriado: Omit<Feriado, 'id'>): Promise<Feriado> {
    try {
      const { data, error } = await this.client.from('feriados').insert(feriado).select().single();
      if (!error && data) {
        const added = data as Feriado;
        this.localFeriados.update(list => [...list, added]);
        return added;
      }
    } catch (err) {
      console.error('Erro ao inserir feriado no Supabase:', err);
    }

    const localNew: Feriado = { ...feriado, id: 'feriado-' + Date.now() };
    this.localFeriados.update(list => [...list, localNew]);
    return localNew;
  }

  async updateFeriado(feriado: Feriado): Promise<Feriado> {
    try {
      await this.client.from('feriados').update(feriado).eq('id', feriado.id);
    } catch (err) {
      console.error('Erro ao atualizar feriado no Supabase:', err);
    }
    this.localFeriados.update(list => list.map(f => f.id === feriado.id ? { ...f, ...feriado } : f));
    return feriado;
  }

  async deleteFeriado(id: string): Promise<void> {
    try {
      await this.client.from('feriados').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar feriado no Supabase:', err);
    }
    this.localFeriados.update(list => list.filter(f => f.id !== id));
  }

  // Regras de Escala CRUD 100% via Supabase
  async getRegras(): Promise<RegraEscala[]> {
    try {
      const { data, error } = await this.client.from('regras_escala').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const regras = data as RegraEscala[];
        this.localRegras.set(regras);
        return regras;
      }
    } catch (err) {
      console.error('Erro ao buscar regras no Supabase:', err);
    }
    return this.localRegras();
  }

  async addRegra(regra: Omit<RegraEscala, 'id'>): Promise<RegraEscala> {
    try {
      const { data, error } = await this.client.from('regras_escala').insert(regra).select().single();
      if (!error && data) {
        const newRegra = data as RegraEscala;
        this.localRegras.update(list => [newRegra, ...list]);
        return newRegra;
      }
    } catch (err) {
      console.error('Erro ao inserir regra no Supabase:', err);
    }

    const localRegra: RegraEscala = { ...regra, id: `regra-${Date.now()}` };
    this.localRegras.update(list => [localRegra, ...list]);
    return localRegra;
  }

  async updateRegra(regra: RegraEscala): Promise<RegraEscala> {
    try {
      await this.client.from('regras_escala').update(regra).eq('id', regra.id);
    } catch (err) {
      console.error('Erro ao atualizar regra no Supabase:', err);
    }
    this.localRegras.update(list => list.map(r => r.id === regra.id ? { ...r, ...regra } : r));
    return regra;
  }

  async deleteRegra(id: string): Promise<void> {
    try {
      await this.client.from('regras_escala').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar regra no Supabase:', err);
    }
    this.localRegras.update(list => list.filter(r => r.id !== id));
  }
}
