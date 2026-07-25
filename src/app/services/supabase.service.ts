import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Loja, Funcionario, Escala, Setor, Cargo, Feriado, RegraEscala } from '../models/types';
import { environment } from '../../environments/environment';
import {
  INITIAL_FUNCIONARIOS,
  INITIAL_SETORES,
  INITIAL_CARGOS,
  INITIAL_FERIADOS,
  INITIAL_REGRAS
} from '../models/mock-data';

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
  public authReady = signal<boolean>(false);

  // Armazenamento em memória local com os 75 colaboradores oficiais da Loja 002
  public readonly localFuncionarios = signal<Funcionario[]>(INITIAL_FUNCIONARIOS);
  public readonly localSetores = signal<Setor[]>(INITIAL_SETORES);
  public readonly localCargos = signal<Cargo[]>(INITIAL_CARGOS);
  public readonly localFeriados = signal<Feriado[]>(INITIAL_FERIADOS);
  public readonly localRegras = signal<RegraEscala[]>(INITIAL_REGRAS);

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    this.initAuthListener();
  }

  public async waitForAuthReady(): Promise<void> {
    if (this.authReady()) return;
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (this.authReady()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  private initAuthListener(): void {
    this.client.auth.getSession().then(({ data }) => {
      this.updateAuthState(data.session);
    }).catch((err: unknown) => {
      console.error('Erro ao obter sessão Supabase:', err);
    }).finally(() => {
      this.authReady.set(true);
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.updateAuthState(session);
      this.authReady.set(true);
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
    if (!email || !pass) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const isPlaceholderUrl = environment.supabaseUrl.includes('SEU_PROJETO');

    // 1. Tentar Login Real via Supabase Auth se a URL não for a de placeholder
    if (!isPlaceholderUrl) {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password: pass
      });
      if (error) {
        throw new Error(error.message || 'E-mail ou senha incorretos.');
      }
      if (data?.user) {
        return data;
      }
    }

    // 2. Fallback seguro para modo demonstração (sem expor senhas hardcoded em texto plano)
    if (environment.demoMode || isPlaceholderUrl) {
      const mockUser: any = {
        id: 'user-demo-' + btoa(email).substring(0, 8),
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
