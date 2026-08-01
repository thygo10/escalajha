import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Loja, Funcionario, Escala, Setor, Cargo, Feriado, RegraEscala, SaveEscalaResult, Rodizio, FuncionarioEstadoRotacao, EscalaEvento, TipoDia } from '../models/types';
import { environment } from '../../environments/environment';
import {
  INITIAL_FUNCIONARIOS,
  INITIAL_SETORES,
  INITIAL_CARGOS,
  INITIAL_FERIADOS,
  INITIAL_REGRAS,
  INITIAL_RODIZIOS
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
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        clearInterval(checkId);
        reject(new Error('Auth timeout: sessão Supabase não inicializou em 10s. Verifique a conexão.'));
      }, 10_000);

      const checkId = setInterval(() => {
        if (this.authReady()) {
          clearInterval(checkId);
          clearTimeout(timeoutId);
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
      // Garante que a loja ativa seja sempre populada mesmo que não haja sessão do Supabase
      if (!this.activeLoja()) {
        this.loadUserLojas().catch(() => {});
      }
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.updateAuthState(session);
      this.authReady.set(true);
    });
  }

  private updateAuthState(session: Session | null): void {
    this.currentSession.set(session);
    this.currentUser.set(session?.user ?? null);

    this.loadUserLojas().catch((err: unknown) => {
      console.error('Erro ao carregar lojas do usuário:', err);
    });
  }

  // Auth Methods
  async loginWithEmail(email: string, pass: string) {
    if (!email || !pass) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const isPlaceholderUrl = environment.supabaseUrl.includes('SEU_PROJETO');

    // 1. Tentar Login Real via Supabase Auth se a URL não for a de placeholder
    if (!isPlaceholderUrl) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email,
          password: pass
        });
        if (!error && data?.user) {
          await this.loadUserLojas();
          return data;
        }
      } catch (err) {
        console.warn('Falha no Supabase Auth, verificando modo de demonstração seguro:', err);
      }
    }

    // 2. Fallback de demonstração local sem armazenar senhas em texto puro no bundle client-side
    const normalizedEmail = email.toLowerCase().trim();
    const isDemoEnvironment = environment.demoMode || isPlaceholderUrl;

    if (isDemoEnvironment) {
      const mockUser = {
        id: 'user-demo-' + (normalizedEmail.includes('thygo') ? 'thygo' : 'rh'),
        email: normalizedEmail
      } as unknown as User;
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

      if (!error && data && data.length > 0) {
        const funcs = data as Funcionario[];
        const { funcionariosAtualizados, count } = this.garantirBackfillGruposFuncionarios(funcs);
        this.localFuncionarios.set(funcionariosAtualizados);
        if (count > 0) {
          await this.persistirBackfillGruposFuncionarios(funcionariosAtualizados, funcs);
        }
        return funcionariosAtualizados;
      }
    } catch (err) {
      console.error('Erro ao buscar funcionarios no Supabase:', err);
    }
    const funcs = this.localFuncionarios().filter(f => f.ativo);
    const baseList = funcs.length > 0 ? funcs : INITIAL_FUNCIONARIOS;
    const { funcionariosAtualizados } = this.garantirBackfillGruposFuncionarios(baseList);
    return funcionariosAtualizados;
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
      genero: func.genero || 'F',
      ativo: true,
      rodizio_id: func.rodizio_id || 'rod_normal_1x2',
      grupo_domingo: func.grupo_domingo || 'A',
      grupo_feriado: func.grupo_feriado || 'A',
      grupo: func.grupo || func.grupo_feriado || 'A',
      setores_cobertura: func.setores_cobertura || []
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
          ativo: func.ativo,
          rodizio_id: func.rodizio_id,
          grupo_domingo: func.grupo_domingo,
          grupo_feriado: func.grupo_feriado,
          grupo: func.grupo || func.grupo_feriado,
          setores_cobertura: func.setores_cobertura || []
        })
        .eq('id', func.id)
        .select()
        .single();

      if (!error && data) {
        const updated = data as Funcionario;
        this.localFuncionarios.update(list => list.map(f => (f.id === func.id || (!!func.matricula_aleatoria && f.matricula_aleatoria === func.matricula_aleatoria)) ? updated : f));
        return updated;
      }
    } catch (err) {
      console.error('Erro ao atualizar funcionário no Supabase:', err);
    }

    this.localFuncionarios.update(list => list.map(f => (f.id === func.id || (!!func.matricula_aleatoria && f.matricula_aleatoria === func.matricula_aleatoria)) ? { ...f, ...func } : f));
    return func;
  }

  garantirBackfillGruposFuncionarios(funcionarios: Funcionario[]): { funcionariosAtualizados: Funcionario[]; count: number } {
    let count = 0;
    const setoresMap = new Map<string, { domCount: Record<string, number>; ferCount: Record<string, number> }>();

    funcionarios.forEach(f => {
      const setorKey = f.setor || 'Geral';
      if (!setoresMap.has(setorKey)) {
        setoresMap.set(setorKey, {
          domCount: { A: 0, B: 0, C: 0 },
          ferCount: { A: 0, B: 0 }
        });
      }
      const st = setoresMap.get(setorKey)!;
      if (f.grupo_domingo && st.domCount[f.grupo_domingo] !== undefined) {
        st.domCount[f.grupo_domingo]++;
      }
      if (f.grupo_feriado && st.ferCount[f.grupo_feriado] !== undefined) {
        st.ferCount[f.grupo_feriado]++;
      }
    });

    const result = funcionarios.map(f => {
      let modificado = false;
      const setorKey = f.setor || 'Geral';
      const st = setoresMap.get(setorKey)!;

      const rodizio_id = f.rodizio_id || (this.isSetorRodizioEspecial(f.setor) ? 'rod_especial_2x1' : 'rod_normal_1x2');
      if (!f.rodizio_id) modificado = true;

      let grupo_domingo = f.grupo_domingo;
      if (!grupo_domingo) {
        const gruposDom = rodizio_id === 'rod_especial_2x1' ? ['A', 'B'] : ['A', 'B', 'C'];
        grupo_domingo = gruposDom.reduce((minG, g) => (st.domCount[g] || 0) < (st.domCount[minG] || 0) ? g : minG, gruposDom[0]);
        st.domCount[grupo_domingo] = (st.domCount[grupo_domingo] || 0) + 1;
        modificado = true;
      }

      let grupo_feriado = f.grupo_feriado;
      if (!grupo_feriado) {
        const gruposFer = ['A', 'B'];
        grupo_feriado = gruposFer.reduce((minG, g) => (st.ferCount[g] || 0) < (st.ferCount[minG] || 0) ? g : minG, gruposFer[0]);
        st.ferCount[grupo_feriado] = (st.ferCount[grupo_feriado] || 0) + 1;
        modificado = true;
      }

      const grupo = f.grupo || grupo_feriado;
      if (!f.grupo) modificado = true;

      if (modificado) {
        count++;
        return {
          ...f,
          rodizio_id,
          grupo_domingo,
          grupo_feriado,
          grupo
        };
      }
      return f;
    });

    return { funcionariosAtualizados: result, count };
  }

  private async persistirBackfillGruposFuncionarios(atualizados: Funcionario[], originais: Funcionario[]): Promise<void> {
    const originalById = new Map(originais.map(f => [f.id || f.matricula_aleatoria, f]));
    const changed = atualizados.filter(f => {
      const original = originalById.get(f.id || f.matricula_aleatoria);
      return !!original && (
        original.rodizio_id !== f.rodizio_id ||
        original.grupo_domingo !== f.grupo_domingo ||
        original.grupo_feriado !== f.grupo_feriado ||
        original.grupo !== f.grupo
      );
    });

    for (const f of changed) {
      if (!f.id || f.id.startsWith('local-')) continue;
      try {
        await this.client
          .from('funcionarios')
          .update({
            rodizio_id: f.rodizio_id,
            grupo_domingo: f.grupo_domingo,
            grupo_feriado: f.grupo_feriado,
            grupo: f.grupo
          })
          .eq('id', f.id);
      } catch (err) {
        console.warn('Backfill de grupos nÃ£o persistiu no Supabase para funcionario:', f.id, err);
      }
    }
  }

  private isSetorRodizioEspecial(setor: string): boolean {
    const s = setor.toLowerCase();
    return s.includes('padaria') || s.includes('acougue') || s.includes('aÃ§ougue');
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

  async addSetor(nome: string, descricao?: string, min_funcionarios_dia?: number, min_funcionarios_domingo?: number, min_funcionarios_feriado?: number): Promise<Setor> {
    const payload = { nome, descricao, min_funcionarios_dia, min_funcionarios_domingo, min_funcionarios_feriado };
    try {
      const { data, error } = await this.client.from('setores').insert(payload).select().single();
      if (!error && data) {
        const newSetor = data as Setor;
        this.localSetores.update(list => [...list, newSetor]);
        return newSetor;
      }
    } catch (err) {
      console.error('Erro ao criar setor no Supabase:', err);
    }

    const newSetor: Setor = { id: 'setor-' + Date.now(), ...payload };
    this.localSetores.update(list => [...list, newSetor]);
    return newSetor;
  }

  async updateSetor(id: string, novoNome: string, descricao?: string, min_funcionarios_dia?: number, min_funcionarios_domingo?: number, min_funcionarios_feriado?: number): Promise<void> {
    const updates = { nome: novoNome, descricao, min_funcionarios_dia, min_funcionarios_domingo, min_funcionarios_feriado };
    try {
      await this.client.from('setores').update(updates).eq('id', id);
    } catch (err) {
      console.error('Erro ao atualizar setor no Supabase:', err);
    }

    this.localSetores.update(list =>
      list.map(s => s.id === id ? { ...s, ...updates } : s)
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

    this.localSetores.update(list => list.filter(s => s.id !== id));
  }

  // Escalas CRUD com Supabase + Persistence Fallback em localStorage
  async getEscala(lojaId: string, mesRef: string, setor: string): Promise<Escala | null> {
    const storageKey = `jh_escala_${lojaId}_${mesRef}_${setor}`;

    try {
      const { data, error } = await this.client
        .from('escalas')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('mes_referencia', mesRef)
        .eq('setor', setor)
        .maybeSingle();

      if (!error && data) {
        const dbEscala = data as Escala;
        try { localStorage.setItem(storageKey, JSON.stringify(dbEscala)); } catch {}
        return dbEscala;
      }
    } catch (err) {
      console.error('Erro ao consultar escala no Supabase:', err);
    }

    // Fallback: busca do localStorage se Supabase falhou ou não encontrou
    try {
      const local = localStorage.getItem(storageKey);
      if (local) {
        const parsed = JSON.parse(local) as Escala;
        const itens = parsed.dados?.itens || [];
        const hasStaleFolgas = itens.some((i: any) => {
          const fCount = Object.values(i.dias || {}).filter(st => st === 'F' || st === 'FD').length;
          return fCount > 6;
        });
        if (!hasStaleFolgas) {
          return parsed;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar escala do localStorage:', e);
    }

    return null;
  }

  async saveEscala(escala: Escala): Promise<SaveEscalaResult> {
    const storageKey = `jh_escala_${escala.loja_id}_${escala.mes_referencia}_${escala.setor}`;
    let savedLocal = false;
    let localError: string | undefined;

    // 1. Sempre tenta persistir no localStorage imediatamente para garantir cópia local
    try {
      localStorage.setItem(storageKey, JSON.stringify(escala));
      savedLocal = true;
    } catch (e: any) {
      localError = e?.message || 'Erro ao gravar no localStorage';
      console.error('Erro ao salvar no localStorage:', e);
    }

    // 2. Tenta persistir no Supabase se disponível
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

      if (error) {
        console.warn('Aviso do Supabase ao salvar escala:', error.message);
        if (!savedLocal) {
          return {
            ok: false,
            persistedRemotely: false,
            source: 'supabase',
            pendingSync: true,
            error: `Erro ao salvar no Supabase (${error.message}) e no armazenamento local (${localError}).`
          };
        }
        return {
          ok: true,
          persistedRemotely: false,
          source: 'local',
          pendingSync: true,
          error: error.message,
          data: escala
        };
      }

      if (data) {
        return {
          ok: true,
          persistedRemotely: true,
          source: 'supabase',
          pendingSync: false,
          data: data as Escala
        };
      }
    } catch (err: any) {
      console.warn('Exceção ao salvar escala no Supabase:', err);
      if (!savedLocal) {
        return {
          ok: false,
          persistedRemotely: false,
          source: 'supabase',
          pendingSync: true,
          error: `Falha de conexão com Supabase e falha local (${localError}).`
        };
      }
      return {
        ok: true,
        persistedRemotely: false,
        source: 'local',
        pendingSync: true,
        error: err?.message || 'Erro de conexão',
        data: escala
      };
    }

    return {
      ok: savedLocal,
      persistedRemotely: false,
      source: 'local',
      pendingSync: true,
      data: escala
    };
  }

  async deleteEscala(lojaId: string, mesRef: string, setor: string): Promise<boolean> {
    const storageKey = `jh_escala_${lojaId}_${mesRef}_${setor}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {}

    try {
      await this.client
        .from('escalas')
        .delete()
        .eq('loja_id', lojaId)
        .eq('mes_referencia', mesRef)
        .eq('setor', setor);
      return true;
    } catch (err) {
      console.warn('Erro ao deletar escala do Supabase:', err);
      return false;
    }
  }

  async clearAllEscalas(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('jh_escala_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}

    try {
      await this.client
        .from('escalas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Erro ao limpar escalas do Supabase:', err);
    }
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

  // -------------------------------------------------------------------------
  // ARQUITETURA v5.1: RODÍZIOS, ESTADO DE ROTAÇÃO E EVENTOS DE AUDITORIA
  // -------------------------------------------------------------------------
  private readonly localRodizios = signal<Rodizio[]>(INITIAL_RODIZIOS);
  private readonly localEstadosRotacao = signal<FuncionarioEstadoRotacao[]>([]);
  private readonly localEventos = signal<EscalaEvento[]>([]);

  async getRodizios(): Promise<Rodizio[]> {
    try {
      const { data, error } = await this.client.from('rodizios').select('*, grupos:rodizio_grupos(*)');
      if (!error && data && data.length > 0) {
        const rodizios = data as Rodizio[];
        this.localRodizios.set(rodizios);
        return rodizios;
      }
    } catch (err) {
      console.warn('Erro ao carregar rodízios no Supabase, usando mock:', err);
    }
    return this.localRodizios();
  }

  async addRodizio(rodizio: Omit<Rodizio, 'id'>): Promise<Rodizio> {
    const payload = { ...rodizio, id: 'rod_' + Date.now() };
    try {
      const { data, error } = await this.client.from('rodizios').insert(payload).select().single();
      if (!error && data) {
        const newRod = data as Rodizio;
        this.localRodizios.update(list => [...list, newRod]);
        return newRod;
      }
    } catch (err) {
      console.error('Erro ao adicionar rodízio no Supabase:', err);
    }
    this.localRodizios.update(list => [...list, payload as Rodizio]);
    return payload as Rodizio;
  }

  async getFuncionarioEstadoRotacao(funcionarioId: string, mesReferencia: string): Promise<FuncionarioEstadoRotacao | null> {
    try {
      const { data, error } = await this.client
        .from('funcionario_estados_regra')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('mes_referencia', mesReferencia)
        .maybeSingle();

      if (!error && data) {
        return data as FuncionarioEstadoRotacao;
      }
    } catch (err) {
      console.warn('Erro ao buscar estado de rotação no Supabase:', err);
    }
    return this.localEstadosRotacao().find(e => e.funcionario_id === funcionarioId && e.mes_referencia === mesReferencia) || null;
  }

  async saveFuncionarioEstadoRotacao(estado: FuncionarioEstadoRotacao): Promise<void> {
    const payload = {
      ...estado,
      versao_motor: estado.versao_motor || 'v2.0',
      atualizado_em: new Date().toISOString()
    };
    try {
      await this.client.from('funcionario_estados_regra').upsert(payload, { onConflict: 'funcionario_id,mes_referencia' });
    } catch (err) {
      console.error('Erro ao salvar estado de rotação no Supabase:', err);
    }
    this.localEstadosRotacao.update(list => {
      const filtered = list.filter(e => !(e.funcionario_id === estado.funcionario_id && e.mes_referencia === estado.mes_referencia));
      return [...filtered, payload];
    });
  }

  async carregarHistoricoMesAnterior(lojaId: string, ano: number, mes: number): Promise<Record<string, TipoDia[]>> {
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    const mesRef = `${prevAno}-${String(prevMes).padStart(2, '0')}-01`;

    const res: Record<string, TipoDia[]> = {};
    try {
      const { data, error } = await this.client
        .from('escala_mensal')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('mes_referencia', mesRef);

      if (!error && data && data.length > 0) {
        for (const row of data) {
          const itens = row.dados?.itens || row.itens;
          if (Array.isArray(itens)) {
            itens.forEach((item: any) => {
              if (item.matricula && item.dias) {
                const sortedDays = Object.keys(item.dias).map(Number).sort((a, b) => a - b);
                const last7 = sortedDays.slice(-7).map(d => item.dias[d]);
                res[item.matricula] = last7;
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar histórico do mês anterior:', err);
    }
    return res;
  }

  async logEscalaEvento(evento: EscalaEvento): Promise<void> {
    const payload = { ...evento, criado_em: new Date().toISOString() };
    try {
      await this.client.from('escala_eventos').insert(payload);
    } catch (err) {
      console.error('Erro ao registrar evento de auditoria da escala:', err);
    }
    this.localEventos.update(list => [payload, ...list]);
  }
}
