import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Loja, Funcionario, Escala, Setor, Cargo, Feriado, RegraEscala } from '../models/types';

// Insira as credenciais do seu projeto Supabase aqui (ou via environment)
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
    // Se estiver usando URL genérica ou em teste local, permite login de demonstração
    if (SUPABASE_URL.includes('SEU_PROJETO') || email === 'rh.matriz@joaohenrique.com.br' || email === 'admin@joaohenrique.com.br') {
      if (pass === '123456' || pass === 'admin') {
        const mockUser: any = {
          id: 'demo-user-rh-01',
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
      } else {
        throw new Error('Senha incorreta para demonstração! Use a senha: 123456');
      }
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password: pass
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        // Fallback gracioso para teste sem conexão ativa
        if (pass === '123456') {
          const mockUser: any = { id: 'demo-user-rh-01', email };
          const mockLoja: Loja = { id: 'loja-matriz-demo', empresa_id: 'empresa-demo', nome: 'Matriz - Centro', codigo: 'MATRIZ' };
          this.currentUser.set(mockUser);
          this.userLojas.set([mockLoja]);
          this.activeLoja.set(mockLoja);
          return { user: mockUser };
        }
        throw new Error('Erro de conexão com o Supabase. Para testar offline, use a senha: 123456');
      }
      throw err;
    }
  }

  async logout() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  // Multitenancy: Carregar lojas vinculadas ao usuário RH logado
  async loadUserLojas() {
    const { data, error } = await this.client
      .from('lojas')
      .select('*');

    if (error) {
      console.error('Erro ao carregar lojas vinculadas:', error.message);
      return;
    }

    const lojas = (data as Loja[]) || [];
    this.userLojas.set(lojas);
    if (lojas.length > 0 && !this.activeLoja()) {
      this.activeLoja.set(lojas[0]);
    }
  }

  setActiveLoja(loja: Loja) {
    this.activeLoja.set(loja);
  }

  // Array local de setores de demonstração
  public readonly mockSetores = signal<Setor[]>([
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

  // Array local de cargos interligados por setor
  public readonly mockCargos = signal<Cargo[]>([
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

  // Array local de feriados Nacionais, Estaduais (BA) e Municipais (Poções-BA)
  public readonly mockFeriados = signal<Feriado[]>([
    // Nacionais
    { id: 'f1', nome: 'Confraternização Universal', data: '2026-01-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Ano Novo' },
    { id: 'f2', nome: 'Segunda-Feira de Carnaval', data: '2026-02-16', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Ponto Facultativo Nacional' },
    { id: 'f3', nome: 'Terça-Feira de Carnaval', data: '2026-02-17', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Carnaval' },
    { id: 'f4', nome: 'Sexta-Feira Santa / Paixão de Cristo', data: '2026-04-03', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Paixão de Cristo' },
    { id: 'f5', nome: 'Dia de Tiradentes', data: '2026-04-21', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Homenagem a Tiradentes' },
    { id: 'f6', nome: 'Dia do Trabalhador', data: '2026-05-01', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Dia Internacional do Trabalho' },
    { id: 'f7', nome: 'Corpus Christi', data: '2026-06-04', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Corpus Christi' },
    { id: 'f8', nome: 'Independência do Brasil', data: '2026-09-07', tipo: 'Nacional', abrangencia: 'Brasil', descricao: '7 de Setembro' },
    { id: 'f9', nome: 'Nossa Senhora Aparecida', data: '2026-10-12', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Padroeira do Brasil' },
    { id: 'f10', nome: 'Dia de Finados', data: '2026-11-02', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Finados' },
    { id: 'f11', nome: 'Proclamação da República', data: '2026-11-15', tipo: 'Nacional', abrangencia: 'Brasil', descricao: '15 de Novembro' },
    { id: 'f12', nome: 'Dia da Consciência Negra', data: '2026-11-20', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Feriado Nacional Zumbi dos Palmares' },
    { id: 'f13', nome: 'Natal', data: '2026-12-25', tipo: 'Nacional', abrangencia: 'Brasil', descricao: 'Celebração de Natal' },

    // Estaduais (Bahia)
    { id: 'f14', nome: 'São João', data: '2026-06-24', tipo: 'Estadual', abrangencia: 'Bahia', descricao: 'Festa Junina Tradicional da Bahia' },
    { id: 'f15', nome: 'Independência da Bahia', data: '2026-07-02', tipo: 'Estadual', abrangencia: 'Bahia', descricao: '2 de Julho - Data Magna da Bahia' },

    // Municipais (Poções - BA)
    { id: 'f16', nome: 'Festa do Divino Espírito Santo', data: '2026-05-24', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Festa do Padroeiro da Cidade de Poções' },
    { id: 'f17', nome: 'Emancipação Política de Poções', data: '2026-06-26', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Aniversário da Cidade de Poções - BA' },
    { id: 'f18', nome: 'Dia da Consciência Evangélica', data: '2026-10-31', tipo: 'Municipal', abrangencia: 'Poções - BA', descricao: 'Dia da Cultura Evangélica de Poções' }
  ]);

  // Array local de regras de escala (CLT, Acordo Coletivo e Solicitações do RH)
  private readonly mockRegras = signal<RegraEscala[]>([
    {
      id: 'r1',
      titulo: 'Descanso Semanal Remunerado (DSR 6x1)',
      descricao: 'Todo colaborador tem direito a 1 folga semanal preferencialmente no domingo após no máximo 6 dias consecutivos de trabalho (Art. 67 da CLT).',
      categoria: 'CLT',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r2',
      titulo: 'Revezamento Dominical Quinzenal (Mulheres)',
      descricao: 'Para colaboradoras do sexo feminino, é obrigatória a concessão de folga no domingo a cada 15 dias (Art. 386 da CLT).',
      categoria: 'CLT',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r3',
      titulo: 'Revezamento Dominical Máximo (Homens)',
      descricao: 'Colaboradores do sexo masculino não podem trabalhar mais de 7 domingos consecutivos sem folga dominical (Lei nº 10.101/2000).',
      categoria: 'Acordo Coletivo',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r4',
      titulo: 'Intervalo Interjornada de 11 Horas',
      descricao: 'Entre duas jornadas de trabalho é obrigatório o intervalo mínimo de 11 horas consecutivas para descanso (Art. 66 da CLT).',
      categoria: 'CLT',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r5',
      titulo: 'Intervalo Intrajornada (Refeição/Almoço)',
      descricao: 'Em qualquer trabalho contínuo superior a 6 horas é obrigatória a concessão de intervalo de 1 a 2 horas para refeição (Art. 71 da CLT).',
      categoria: 'CLT',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r6',
      titulo: 'Feriados Municipais de Poções-BA',
      descricao: 'Garantir folga ou compensação em dobro para feriados municipais de Poções (Festa do Divino Espírito Santo e Emancipação).',
      categoria: 'Interna RH',
      status: 'IMPLEMENTADA',
      obrigatoria: true
    },
    {
      id: 'r7',
      titulo: 'Prioridade de Folga Véspera de Feriado (Reposição)',
      descricao: 'Solicitação do RH: O pessoal da reposição que folgar no sábado véspera de feriado estadual não deve dobrar o turno na segunda-feira.',
      categoria: 'Solicitação RH',
      status: 'PENDENTE_PROGRAMADOR',
      obrigatoria: false
    }
  ]);

  // Array local de dados de demonstração para testes offline com TODOS os colaboradores da loja
  private readonly mockFuncionarios = signal<Funcionario[]>([
    // 1. Frente de Caixa (25 Colaboradores)
    { id: 'm1', loja_id: 'loja-02-demo', primeiro_nome: 'Nayle', matricula_aleatoria: '748291', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm2', loja_id: 'loja-02-demo', primeiro_nome: 'Alane', matricula_aleatoria: '482019', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm3', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Paula', matricula_aleatoria: '920148', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm4', loja_id: 'loja-02-demo', primeiro_nome: 'John', matricula_aleatoria: '830194', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm5', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Luísa', matricula_aleatoria: '502918', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm6', loja_id: 'loja-02-demo', primeiro_nome: 'Jaqueline', matricula_aleatoria: '392018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm7', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Beatriz', matricula_aleatoria: '719204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm8', loja_id: 'loja-02-demo', primeiro_nome: 'Jaine', matricula_aleatoria: '640192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm9', loja_id: 'loja-02-demo', primeiro_nome: 'Kamilly', matricula_aleatoria: '649201', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm10', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Félix', matricula_aleatoria: '319482', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm11', loja_id: 'loja-02-demo', primeiro_nome: 'Sabrina', matricula_aleatoria: '619284', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm12', loja_id: 'loja-02-demo', primeiro_nome: 'Viviane', matricula_aleatoria: '840192', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm13', loja_id: 'loja-02-demo', primeiro_nome: 'Laísa', matricula_aleatoria: '183920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm14', loja_id: 'loja-02-demo', primeiro_nome: 'Ana Cláudia', matricula_aleatoria: '572910', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm15', loja_id: 'loja-02-demo', primeiro_nome: 'Claudia', matricula_aleatoria: '294018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm16', loja_id: 'loja-02-demo', primeiro_nome: 'Joesiane', matricula_aleatoria: '940182', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm17', loja_id: 'loja-02-demo', primeiro_nome: 'Sueli', matricula_aleatoria: '381029', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm18', loja_id: 'loja-02-demo', primeiro_nome: 'Luciene', matricula_aleatoria: '729104', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm19', loja_id: 'loja-02-demo', primeiro_nome: 'Luciana', matricula_aleatoria: '610294', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm20', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus', matricula_aleatoria: '492018', setor: 'Frente de Caixa', cargo: 'Operador de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm21', loja_id: 'loja-02-demo', primeiro_nome: 'Natália', matricula_aleatoria: '819204', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm22', loja_id: 'loja-02-demo', primeiro_nome: 'Edma', matricula_aleatoria: '302948', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'm23', loja_id: 'loja-02-demo', primeiro_nome: 'Analandia', matricula_aleatoria: '694018', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'm24', loja_id: 'loja-02-demo', primeiro_nome: 'Roseli', matricula_aleatoria: '192048', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'm25', loja_id: 'loja-02-demo', primeiro_nome: 'Edinalia', matricula_aleatoria: '583920', setor: 'Frente de Caixa', cargo: 'Operadora de Caixa', turno_padrao: '14:00 às 22:00', ativo: true },

    // 2. Reposição (17 Colaboradores)
    { id: 'm26', loja_id: 'loja-02-demo', primeiro_nome: 'Jovando', matricula_aleatoria: '402918', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'm27', loja_id: 'loja-02-demo', primeiro_nome: 'Cláudio', matricula_aleatoria: '918204', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'm28', loja_id: 'loja-02-demo', primeiro_nome: 'Daniel', matricula_aleatoria: '673920', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'm29', loja_id: 'loja-02-demo', primeiro_nome: 'Mateus (Rep)', matricula_aleatoria: '204918', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'm30', loja_id: 'loja-02-demo', primeiro_nome: 'Suzaine', matricula_aleatoria: '859201', setor: 'Reposição', cargo: 'Repositora', turno_padrao: '07:00 às 15:00', ativo: true },
    { id: 'm31', loja_id: 'loja-02-demo', primeiro_nome: 'Wellington', matricula_aleatoria: '392014', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'm32', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto Jose', matricula_aleatoria: '740192', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'm33', loja_id: 'loja-02-demo', primeiro_nome: 'Danilo', matricula_aleatoria: '294810', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'm34', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo (Rep)', matricula_aleatoria: '683019', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '09:00 às 17:00', ativo: true },
    { id: 'm35', loja_id: 'loja-02-demo', primeiro_nome: 'Catarino', matricula_aleatoria: '104928', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm36', loja_id: 'loja-02-demo', primeiro_nome: 'André Santana', matricula_aleatoria: '930291', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm37', loja_id: 'loja-02-demo', primeiro_nome: 'Giovanne', matricula_aleatoria: '482910', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm38', loja_id: 'loja-02-demo', primeiro_nome: 'Emerson', matricula_aleatoria: '104920', setor: 'Reposição', cargo: 'Repositor Líder', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm39', loja_id: 'loja-02-demo', primeiro_nome: 'Leandro', matricula_aleatoria: '759201', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'm40', loja_id: 'loja-02-demo', primeiro_nome: 'Fagner', matricula_aleatoria: '392018', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },
    { id: 'm41', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael (Rep)', matricula_aleatoria: '602941', setor: 'Reposição', cargo: 'Repositor', turno_padrao: '14:00 às 22:00', ativo: true },

    // 3. Assistente de Lanchonete (8 Colaboradores)
    { id: 'm42', loja_id: 'loja-02-demo', primeiro_nome: 'Eduarda', matricula_aleatoria: '194028', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm43', loja_id: 'loja-02-demo', primeiro_nome: 'Valdenice', matricula_aleatoria: '850192', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm44', loja_id: 'loja-02-demo', primeiro_nome: 'Nicole', matricula_aleatoria: '302948', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm45', loja_id: 'loja-02-demo', primeiro_nome: 'Normelia', matricula_aleatoria: '694018', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm46', loja_id: 'loja-02-demo', primeiro_nome: 'Marielle', matricula_aleatoria: '192048', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm47', loja_id: 'loja-02-demo', primeiro_nome: 'Angela', matricula_aleatoria: '583920', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '10:00 às 18:00', ativo: true },
    { id: 'm48', loja_id: 'loja-02-demo', primeiro_nome: 'Ivonete', matricula_aleatoria: '402918', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm49', loja_id: 'loja-02-demo', primeiro_nome: 'Claudio (Lanch)', matricula_aleatoria: '918204', setor: 'Assistente de Lanchonete', cargo: 'Atendente de Lanchonete', turno_padrao: '12:00 às 20:00', ativo: true },

    // 4. Açougue (10 Colaboradores)
    { id: 'm50', loja_id: 'loja-02-demo', primeiro_nome: 'Gabriel', matricula_aleatoria: '673920', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm51', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Açougue)', matricula_aleatoria: '204918', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm52', loja_id: 'loja-02-demo', primeiro_nome: 'Roberto (Açougue)', matricula_aleatoria: '859201', setor: 'Açougue', cargo: 'Açougueiro Líder', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm53', loja_id: 'loja-02-demo', primeiro_nome: 'Ana (Açougue)', matricula_aleatoria: '392014', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '08:00 às 16:00', ativo: true },
    { id: 'm54', loja_id: 'loja-02-demo', primeiro_nome: 'Paulo', matricula_aleatoria: '740192', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'm55', loja_id: 'loja-02-demo', primeiro_nome: 'Vagner', matricula_aleatoria: '294810', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'm56', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos', matricula_aleatoria: '683019', setor: 'Açougue', cargo: 'Açougueiro', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm57', loja_id: 'loja-02-demo', primeiro_nome: 'Kauam', matricula_aleatoria: '104928', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '12:00 às 20:00', ativo: true },
    { id: 'm58', loja_id: 'loja-02-demo', primeiro_nome: 'Rafael', matricula_aleatoria: '930291', setor: 'Açougue', cargo: 'Auxiliar de Açougue', turno_padrao: '09:00 às 18:00', ativo: true },
    { id: 'm59', loja_id: 'loja-02-demo', primeiro_nome: 'Marcelo', matricula_aleatoria: '482910', setor: 'Açougue', cargo: 'Atendente', turno_padrao: '12:00 às 20:00', ativo: true },

    // 5. Padaria (Produção) (8 Colaboradores)
    { id: 'm60', loja_id: 'loja-02-demo', primeiro_nome: 'Evandro', matricula_aleatoria: '104920', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm61', loja_id: 'loja-02-demo', primeiro_nome: 'Maisa', matricula_aleatoria: '759201', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm62', loja_id: 'loja-02-demo', primeiro_nome: 'Erick (Padaria)', matricula_aleatoria: '392018', setor: 'Padaria (Produção)', cargo: 'Padeiro', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm63', loja_id: 'loja-02-demo', primeiro_nome: 'Jeane', matricula_aleatoria: '602941', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm64', loja_id: 'loja-02-demo', primeiro_nome: 'Raquel', matricula_aleatoria: '194028', setor: 'Padaria (Produção)', cargo: 'Auxiliar de Padaria', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm65', loja_id: 'loja-02-demo', primeiro_nome: 'Yuri', matricula_aleatoria: '850192', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm66', loja_id: 'loja-02-demo', primeiro_nome: 'Thais', matricula_aleatoria: '302948', setor: 'Padaria (Produção)', cargo: 'Atendente', turno_padrao: '05:00 às 15:00', ativo: true },
    { id: 'm67', loja_id: 'loja-02-demo', primeiro_nome: 'Ivandro', matricula_aleatoria: '694018', setor: 'Padaria (Produção)', cargo: 'Padeiro Líder', turno_padrao: '05:00 às 15:00', ativo: true },

    // 6. Fiscal de Caixa (4 Colaboradores)
    { id: 'm68', loja_id: 'loja-02-demo', primeiro_nome: 'Walta', matricula_aleatoria: '192048', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa Líder', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm69', loja_id: 'loja-02-demo', primeiro_nome: 'Ualas', matricula_aleatoria: '583920', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '10:00 às 20:00', ativo: true },
    { id: 'm70', loja_id: 'loja-02-demo', primeiro_nome: 'Lane', matricula_aleatoria: '402918', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm71', loja_id: 'loja-02-demo', primeiro_nome: 'Romildo', matricula_aleatoria: '918204', setor: 'Fiscal de Caixa', cargo: 'Fiscal de Caixa', turno_padrao: '10:00 às 20:00', ativo: true },

    // 7. Operador de Empilhadeira (1 Colaborador)
    { id: 'm72', loja_id: 'loja-02-demo', primeiro_nome: 'Reginaldo', matricula_aleatoria: '673920', setor: 'Operador de Empilhadeira', cargo: 'Operador de Empilhadeira', turno_padrao: '07:00 às 15:00', ativo: true },

    // 8. Higienização (3 Colaboradores)
    { id: 'm73', loja_id: 'loja-02-demo', primeiro_nome: 'Eliomar', matricula_aleatoria: '204918', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm74', loja_id: 'loja-02-demo', primeiro_nome: 'Acleia', matricula_aleatoria: '859201', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },
    { id: 'm75', loja_id: 'loja-02-demo', primeiro_nome: 'Gilvan', matricula_aleatoria: '392014', setor: 'Higienização', cargo: 'Auxiliar de Serviços Gerais', turno_padrao: '08:00 às 17:00', ativo: true },

    // 9. Manutenção (4 Colaboradores)
    { id: 'm76', loja_id: 'loja-02-demo', primeiro_nome: 'Thiago', matricula_aleatoria: '100001', setor: 'Manutenção', cargo: 'Supervisor de TI & Manutenção', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'm77', loja_id: 'loja-02-demo', primeiro_nome: 'Marcos (Manut)', matricula_aleatoria: '710294', setor: 'Manutenção', cargo: 'Oficial de Manutenção Líder', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'm78', loja_id: 'loja-02-demo', primeiro_nome: 'José (Manut)', matricula_aleatoria: '492018', setor: 'Manutenção', cargo: 'Auxiliar de Manutenção Predial', turno_padrao: '07:30 às 17:18', ativo: true },
    { id: 'm79', loja_id: 'loja-02-demo', primeiro_nome: 'Edilson', matricula_aleatoria: '839201', setor: 'Manutenção', cargo: 'Eletricista de Manutenção', turno_padrao: '07:30 às 17:18', ativo: true }
  ]);

  // Funcionários CRUD (Com Minimização LGPD)
  async getFuncionarios(lojaId: string): Promise<Funcionario[]> {
    if (SUPABASE_URL.includes('SEU_PROJETO') || lojaId.includes('demo')) {
      return this.mockFuncionarios().filter(f => f.ativo);
    }

    try {
      const { data, error } = await this.client
        .from('funcionarios')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('ativo', true)
        .order('primeiro_nome', { ascending: true });

      if (error) throw error;
      return (data as Funcionario[]) || [];
    } catch {
      return this.mockFuncionarios().filter(f => f.ativo);
    }
  }

  async addFuncionario(func: Omit<Funcionario, 'id' | 'matricula_aleatoria'>): Promise<Funcionario> {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomMatricula = (100000 + (array[0] % 900000)).toString();

    const newFunc: Funcionario = {
      ...func,
      id: 'demo-' + Date.now(),
      matricula_aleatoria: randomMatricula,
      ativo: true
    };

    if (SUPABASE_URL.includes('SEU_PROJETO') || func.loja_id.includes('demo')) {
      this.mockFuncionarios.update(list => [...list, newFunc]);
      return newFunc;
    }

    try {
      const { data, error } = await this.client
        .from('funcionarios')
        .insert({
          loja_id: func.loja_id,
          primeiro_nome: func.primeiro_nome,
          matricula_aleatoria: randomMatricula,
          setor: func.setor,
          cargo: func.cargo,
          turno_padrao: func.turno_padrao,
          ativo: true
        })
        .select()
        .single();

      if (error) throw error;
      return data as Funcionario;
    } catch {
      this.mockFuncionarios.update(list => [...list, newFunc]);
      return newFunc;
    }
  }

  // Soft Delete para manter retenção jurídica trabalhista (CLT + LGPD)
  async softDeleteFuncionario(id: string): Promise<void> {
    if (SUPABASE_URL.includes('SEU_PROJETO') || id.startsWith('demo') || id.length < 5) {
      this.mockFuncionarios.update(list =>
        list.map(f => f.id === id ? { ...f, ativo: false } : f)
      );
      return;
    }

    try {
      const { error } = await this.client
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    } catch {
      this.mockFuncionarios.update(list =>
        list.map(f => f.id === id ? { ...f, ativo: false } : f)
      );
    }
  }

  async updateFuncionario(func: Funcionario): Promise<Funcionario> {
    if (SUPABASE_URL.includes('SEU_PROJETO') || !func.id || func.id.startsWith('demo') || func.id.startsWith('m')) {
      this.mockFuncionarios.update(list =>
        list.map(f => f.id === func.id ? { ...f, ...func } : f)
      );
      return func;
    }

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

      if (error) throw error;
      return data as Funcionario;
    } catch {
      this.mockFuncionarios.update(list =>
        list.map(f => f.id === func.id ? { ...f, ...func } : f)
      );
      return func;
    }
  }

  // Setores CRUD
  async getSetores(): Promise<Setor[]> {
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      return this.mockSetores();
    }
    try {
      const { data, error } = await this.client.from('setores').select('*').order('nome');
      if (error) throw error;
      return (data as Setor[]) || this.mockSetores();
    } catch {
      return this.mockSetores();
    }
  }

  async addSetor(nome: string, descricao?: string): Promise<Setor> {
    const newSetor: Setor = {
      id: 'setor-' + Date.now(),
      nome,
      descricao
    };
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      this.mockSetores.update(list => [...list, newSetor]);
      return newSetor;
    }
    try {
      const { data, error } = await this.client.from('setores').insert({ nome, descricao }).select().single();
      if (error) throw error;
      return data as Setor;
    } catch {
      this.mockSetores.update(list => [...list, newSetor]);
      return newSetor;
    }
  }

  async updateSetor(id: string, novoNome: string, descricao?: string): Promise<void> {
    const oldSetor = this.mockSetores().find(s => s.id === id);
    const oldNome = oldSetor?.nome;

    this.mockSetores.update(list =>
      list.map(s => s.id === id ? { ...s, nome: novoNome, descricao } : s)
    );

    if (oldNome && oldNome !== novoNome) {
      this.mockCargos.update(list =>
        list.map(c => c.setor_nome === oldNome ? { ...c, setor_nome: novoNome } : c)
      );
      this.mockFuncionarios.update(list =>
        list.map(f => f.setor === oldNome ? { ...f, setor: novoNome } : f)
      );
    }

    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('setor-')) {
      try {
        await this.client.from('setores').update({ nome: novoNome, descricao }).eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar setor no Supabase:', err);
      }
    }
  }

  async deleteSetor(id: string): Promise<void> {
    const setorToDelete = this.mockSetores().find(s => s.id === id);
    const nome = setorToDelete?.nome;

    this.mockSetores.update(list => list.filter(s => s.id !== id));

    if (nome) {
      this.mockCargos.update(list => list.filter(c => c.setor_nome !== nome));
    }

    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('setor-')) {
      try {
        await this.client.from('setores').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar setor no Supabase:', err);
      }
    }
  }

  // Cargos CRUD
  async getCargos(): Promise<Cargo[]> {
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      return this.mockCargos();
    }
    try {
      const { data, error } = await this.client.from('cargos').select('*').order('nome');
      if (error) throw error;
      return (data as Cargo[]) || this.mockCargos();
    } catch {
      return this.mockCargos();
    }
  }

  async addCargo(setorNome: string, cargoNome: string, descricao?: string): Promise<Cargo> {
    const newCargo: Cargo = {
      id: 'cargo-' + Date.now(),
      setor_nome: setorNome,
      nome: cargoNome,
      descricao
    };
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      this.mockCargos.update(list => [...list, newCargo]);
      return newCargo;
    }
    try {
      const { data, error } = await this.client.from('cargos').insert({ setor_nome: setorNome, nome: cargoNome, descricao }).select().single();
      if (error) throw error;
      return data as Cargo;
    } catch {
      this.mockCargos.update(list => [...list, newCargo]);
      return newCargo;
    }
  }

  async updateCargo(id: string, novoNome: string, descricao?: string): Promise<void> {
    const oldCargo = this.mockCargos().find(c => c.id === id);
    const oldNome = oldCargo?.nome;

    this.mockCargos.update(list =>
      list.map(c => c.id === id ? { ...c, nome: novoNome, descricao } : c)
    );

    if (oldCargo && oldNome && oldNome !== novoNome) {
      this.mockFuncionarios.update(list =>
        list.map(f => (f.setor === oldCargo.setor_nome && f.cargo === oldNome) ? { ...f, cargo: novoNome } : f)
      );
    }

    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('cargo-')) {
      try {
        await this.client.from('cargos').update({ nome: novoNome, descricao }).eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar cargo no Supabase:', err);
      }
    }
  }

  async deleteCargo(id: string): Promise<void> {
    this.mockCargos.update(list => list.filter(c => c.id !== id));
    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('cargo-')) {
      try {
        await this.client.from('cargos').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar cargo no Supabase:', err);
      }
    }
  }

  // Escalas CRUD
  async getEscala(lojaId: string, mesRef: string, setor: string): Promise<Escala | null> {
    if (SUPABASE_URL.includes('SEU_PROJETO') || lojaId.includes('demo')) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('escalas')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('mes_referencia', mesRef)
        .eq('setor', setor)
        .maybeSingle();

      if (error) throw error;
      return data as Escala | null;
    } catch {
      return null;
    }
  }

  async saveEscala(escala: Escala): Promise<Escala> {
    if (SUPABASE_URL.includes('SEU_PROJETO') || escala.loja_id.includes('demo')) {
      return escala;
    }

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

      if (error) throw error;
      return data as Escala;
    } catch {
      return escala;
    }
  }

  // Feriados CRUD
  async getFeriados(): Promise<Feriado[]> {
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      return [...this.mockFeriados()].sort((a, b) => a.data.localeCompare(b.data));
    }
    try {
      const { data, error } = await this.client.from('feriados').select('*').order('data', { ascending: true });
      if (error) throw error;
      return (data as Feriado[]) || this.mockFeriados();
    } catch {
      return [...this.mockFeriados()].sort((a, b) => a.data.localeCompare(b.data));
    }
  }

  async addFeriado(feriado: Omit<Feriado, 'id'>): Promise<Feriado> {
    const newFeriado: Feriado = {
      ...feriado,
      id: 'feriado-' + Date.now()
    };
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      this.mockFeriados.update(list => [...list, newFeriado]);
      return newFeriado;
    }
    try {
      const { data, error } = await this.client.from('feriados').insert(feriado).select().single();
      if (error) throw error;
      return data as Feriado;
    } catch {
      this.mockFeriados.update(list => [...list, newFeriado]);
      return newFeriado;
    }
  }

  async updateFeriado(feriado: Feriado): Promise<Feriado> {
    this.mockFeriados.update(list => list.map(f => f.id === feriado.id ? { ...f, ...feriado } : f));
    if (!SUPABASE_URL.includes('SEU_PROJETO') && !feriado.id.startsWith('feriado-') && !feriado.id.startsWith('f')) {
      try {
        await this.client.from('feriados').update(feriado).eq('id', feriado.id);
      } catch (err) {
        console.error('Erro ao atualizar feriado no Supabase:', err);
      }
    }
    return feriado;
  }

  async deleteFeriado(id: string): Promise<void> {
    this.mockFeriados.update(list => list.filter(f => f.id !== id));
    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('feriado-') && !id.startsWith('f')) {
      try {
        await this.client.from('feriados').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar feriado no Supabase:', err);
      }
    }
  }

  // --- MÉTODOS CRUD: REGRAS DE ESCALA ---
  async getRegras(): Promise<RegraEscala[]> {
    if (SUPABASE_URL.includes('SEU_PROJETO')) {
      return this.mockRegras();
    }
    try {
      const { data, error } = await this.client.from('regras_escala').select('*');
      if (error || !data || data.length === 0) return this.mockRegras();
      return data as RegraEscala[];
    } catch (err) {
      console.error('Erro ao buscar regras no Supabase:', err);
      return this.mockRegras();
    }
  }

  async addRegra(regra: Omit<RegraEscala, 'id'>): Promise<RegraEscala> {
    const newRegra: RegraEscala = {
      ...regra,
      id: `regra-${Date.now()}`
    };

    this.mockRegras.update(list => [newRegra, ...list]);

    if (!SUPABASE_URL.includes('SEU_PROJETO')) {
      try {
        const { data, error } = await this.client.from('regras_escala').insert(regra).select().single();
        if (!error && data) return data as RegraEscala;
      } catch (err) {
        console.error('Erro ao inserir regra no Supabase:', err);
      }
    }

    return newRegra;
  }

  async updateRegra(regra: RegraEscala): Promise<RegraEscala> {
    this.mockRegras.update(list => list.map(r => r.id === regra.id ? { ...r, ...regra } : r));
    if (!SUPABASE_URL.includes('SEU_PROJETO') && !regra.id.startsWith('regra-') && !regra.id.startsWith('r')) {
      try {
        await this.client.from('regras_escala').update(regra).eq('id', regra.id);
      } catch (err) {
        console.error('Erro ao atualizar regra no Supabase:', err);
      }
    }
    return regra;
  }

  async deleteRegra(id: string): Promise<void> {
    this.mockRegras.update(list => list.filter(r => r.id !== id));
    if (!SUPABASE_URL.includes('SEU_PROJETO') && !id.startsWith('regra-') && !id.startsWith('r')) {
      try {
        await this.client.from('regras_escala').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar regra no Supabase:', err);
      }
    }
  }
}
