-- ==============================================================================
-- ESCALA DE FOLGAS 2.0 - SCHEMA SUPABASE COM RLS BLINDADO E CONFORMIDADE LGPD
-- ==============================================================================

-- 1. EXTENSÕES & TABELAS PRINCIPAIS

create extension if not exists "uuid-ossp";

-- Tabela de Empresas
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz default now()
);

-- Tabela de Lojas (Filiais)
create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete restrict,
  nome text not null,
  codigo text unique not null, -- Ex: 'MATRIZ', 'LOJA02'
  created_at timestamptz default now()
);

-- Tabela de Vínculo de Usuários RH/Gestores com Lojas (Multi-Tenancy Security)
create table if not exists public.usuario_lojas (
  user_id uuid references auth.users(id) on delete cascade,
  loja_id uuid references public.lojas(id) on delete cascade,
  role text not null default 'gestor_rh', -- 'gestor_rh', 'admin'
  created_at timestamptz default now(),
  primary key (user_id, loja_id)
);

-- Tabela de Setores Operacionais
create table if not exists public.setores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade,
  nome text unique not null,
  descricao text,
  rodizio_id text,
  min_funcionarios_dia int,
  min_funcionarios_domingo int,
  min_funcionarios_feriado int,
  created_at timestamptz default now()
);

-- MIGRATION: Garantir colunas em public.setores
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS loja_id uuid references public.lojas(id) on delete cascade;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS rodizio_id text;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS min_funcionarios_dia int;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS min_funcionarios_domingo int;
ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS min_funcionarios_feriado int;

-- Tabelas de Regras de Rodízio e Grupos Persistidos
create table if not exists public.rodizios (
  id text primary key,
  nome text not null,
  versao int not null default 1,
  inicio_vigencia date not null,
  fim_vigencia date,
  domingos_trabalhados int not null,
  domingos_folga int not null,
  quantidade_grupos int not null,
  usa_grupo boolean not null default true,
  descricao text,
  created_at timestamptz default now()
);

create table if not exists public.rodizio_grupos (
  id text primary key,
  rodizio_id text not null references public.rodizios(id) on delete cascade,
  codigo text not null,
  ordem int not null,
  descricao text,
  unique (rodizio_id, codigo)
);

-- Tabela de Cargos e Funções Interligados com Setores
create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  setor_nome text references public.setores(nome) on delete cascade on update cascade not null,
  nome text not null,
  descricao text,
  created_at timestamptz default now(),
  constraint unique_setor_cargo unique (setor_nome, nome)
);

-- Tabela de Funcionários (Minimização LGPD & Retenção Legal CLT)
-- Tabela de Funcionários (Minimização LGPD & Retenção Legal CLT)
create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete restrict not null,
  primeiro_nome text not null, -- LGPD: Apenas primeiro nome (ou apelido)
  matricula_aleatoria text unique not null, -- LGPD: Matrícula de 6 dígitos não sequencial
  setor text not null, -- 'Açougue', 'Hortifruti', 'Caixa', 'Reposição', etc.
  cargo text not null,
  turno_padrao text default '08:00 às 16:20',
  genero text default 'F' check (genero in ('M', 'F', 'OUTRO')),
  rodizio_id text,
  grupo_domingo text,
  grupo_feriado text,
  grupo text,
  setores_cobertura text[] default '{}', -- Cobertura de folga / função multisetor
  ativo boolean default true not null, -- Exclusão Lógica para conformidade CLT/LGPD
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MIGRATIONS: Garantir colunas em tabelas existentes
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS rodizio_id text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS grupo_domingo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS grupo_feriado text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS grupo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS setores_cobertura text[] DEFAULT '{}';

-- Trigger de Atualização Automática do campo updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_funcionarios_updated_at on public.funcionarios;
create trigger update_funcionarios_updated_at
  before update on public.funcionarios
  for each row execute function public.update_updated_at_column();

-- Tabela de Escalas Mensais
create table if not exists public.escalas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete restrict not null,
  mes_referencia date not null, -- Ex: '2026-08-01'
  setor text not null,
  dados jsonb not null, -- Estrutura da escala (dias, turnos, folgas dos funcionários)
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz default now(),
  constraint unique_loja_mes_setor unique (loja_id, mes_referencia, setor)
);

-- Tabela de Feriados (Nacionais, Estaduais BA, Municipais Poções-BA)
create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  tipo text not null check (tipo in ('Nacional', 'Estadual', 'Municipal', 'Ponto Facultativo')),
  abrangencia text default 'Brasil',
  descricao text,
  funcionamento_proibido boolean default false not null,
  created_at timestamptz default now(),
  constraint unique_feriado_nome_data unique (nome, data)
);

-- MIGRATION: garantir coluna mesmo em banco existente
ALTER TABLE public.feriados ADD COLUMN IF NOT EXISTS funcionamento_proibido boolean DEFAULT false NOT NULL;

ALTER TABLE public.feriados DROP CONSTRAINT IF EXISTS feriados_tipo_check;
ALTER TABLE public.feriados ADD CONSTRAINT feriados_tipo_check
  CHECK (tipo IN ('Nacional', 'Estadual', 'Municipal', 'Ponto Facultativo'));

-- Tabela de Regras de Escala (CLT & Solicitações RH)
create table if not exists public.regras_escala (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade,
  titulo text unique not null,
  descricao text not null,
  categoria text not null check (categoria in ('CLT', 'Acordo Coletivo', 'Interna RH', 'Solicitação RH')),
  status text not null default 'PENDENTE_PROGRAMADOR' check (status in ('IMPLEMENTADA', 'EM_DESENVOLVIMENTO', 'PENDENTE_PROGRAMADOR')),
  obrigatoria boolean default true,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ==============================================================================
-- 1.1 ESTADOS DE REGRA (CARRY-OVER INTER-MENSAL) & GOVERNANÇA (PRD v4.0)
-- ==============================================================================

-- Tabela de Estado de Carry-Over por Regra (Inter-Mensal)
create table if not exists public.funcionario_estados_regra (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade not null,
  funcionario_id uuid references public.funcionarios(id) on delete cascade not null,
  mes_referencia date not null default date_trunc('month', now())::date,
  ultimo_domingo_trabalhado date,
  domingos_descanso_restantes int default 0,
  ultimo_feriado_trabalhado date,
  grupo_ultimo_feriado_trabalhado varchar(1) default 'A',
  dias_consecutivos_acumulados int default 0,
  updated_at timestamptz default now(),
  constraint unique_funcionario_estado unique (funcionario_id, mes_referencia)
);

ALTER TABLE public.funcionario_estados_regra ADD COLUMN IF NOT EXISTS mes_referencia date DEFAULT date_trunc('month', now())::date;
UPDATE public.funcionario_estados_regra SET mes_referencia = date_trunc('month', now())::date WHERE mes_referencia IS NULL;
ALTER TABLE public.funcionario_estados_regra ALTER COLUMN mes_referencia SET NOT NULL;
ALTER TABLE public.funcionario_estados_regra ADD COLUMN IF NOT EXISTS ultimo_feriado_trabalhado date;
ALTER TABLE public.funcionario_estados_regra DROP CONSTRAINT IF EXISTS unique_funcionario_estado;
ALTER TABLE public.funcionario_estados_regra ADD CONSTRAINT unique_funcionario_estado UNIQUE (funcionario_id, mes_referencia);

-- Tabela de Execuções e Telemetria do Solver
create table if not exists public.solver_runs (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade not null,
  setor text not null,
  mes int not null,
  ano int not null,
  tempo_execucao_ms int not null,
  nos_explorados int default 0,
  score_qualidade int not null,
  status varchar(30) not null, -- 'SUCCESS', 'NO_SOLUTION', 'TIMEOUT', 'PARTIAL', 'CANCELLED'
  created_at timestamptz default now()
);

-- Tabela de Falhas de Restrição para Diagnóstico Fino (Modo NO_SOLUTION)
create table if not exists public.constraint_failures (
  id uuid primary key default gen_random_uuid(),
  solver_run_id uuid references public.solver_runs(id) on delete cascade not null,
  categoria_falha varchar(40) not null, -- 'RESOURCE_SHORTAGE', 'RULE_CONFLICT', 'TENANT_CONFIGURATION'
  restricao_violada varchar(50) not null,
  detalhes text not null,
  created_at timestamptz default now()
);

-- Tabela de Versionamento Imutável de Escalas com Hash SHA-256
create table if not exists public.escala_versions (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade not null,
  escala_id uuid references public.escalas(id) on delete cascade not null,
  versao int not null,
  hash_sha256 varchar(64) not null,
  dados_json jsonb not null,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  constraint unique_escala_versao unique (escala_id, versao)
);

-- Tabela de Audit Log LGPD e Conformidade Fiscal
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade not null,
  usuario_id uuid references auth.users(id) on delete set null,
  origem varchar(20) default 'MANUAL', -- 'MANUAL', 'SOLVER', 'IA', 'IMPORTACAO'
  acao varchar(50) not null,
  recurso varchar(50) not null,
  detalhes jsonb,
  ip_address varchar(45),
  created_at timestamptz default now()
);

alter table public.funcionario_estados_regra enable row level security;
alter table public.solver_runs enable row level security;
alter table public.constraint_failures enable row level security;
alter table public.escala_versions enable row level security;
alter table public.audit_log enable row level security;
alter table public.rodizios enable row level security;
alter table public.rodizio_grupos enable row level security;

drop policy if exists "rodizios_select_policy" on public.rodizios;
create policy "rodizios_select_policy" on public.rodizios
  for select using (auth.uid() is not null);

drop policy if exists "rodizio_grupos_select_policy" on public.rodizio_grupos;
create policy "rodizio_grupos_select_policy" on public.rodizio_grupos
  for select using (auth.uid() is not null);




-- ==============================================================================
-- 2. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.empresas enable row level security;
alter table public.lojas enable row level security;
alter table public.usuario_lojas enable row level security;
alter table public.setores enable row level security;
alter table public.cargos enable row level security;
alter table public.funcionarios enable row level security;
alter table public.escalas enable row level security;
alter table public.feriados enable row level security;
alter table public.regras_escala enable row level security;

-- Função utilitária para checar se o usuário autenticado tem acesso à loja
create or replace function public.user_has_loja_access(target_loja_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.usuario_lojas ul
    where ul.user_id = auth.uid()
      and ul.loja_id = target_loja_id
  );
$$;

-- RLS: Empresas
drop policy if exists "empresas_select_policy" on public.empresas;
create policy "empresas_select_policy" on public.empresas
  for select using (
    exists (
      select 1 from public.lojas l
      join public.usuario_lojas ul on ul.loja_id = l.id
      where l.empresa_id = empresas.id and ul.user_id = auth.uid()
    )
  );

-- RLS: Lojas
drop policy if exists "lojas_select_policy" on public.lojas;
create policy "lojas_select_policy" on public.lojas
  for select using (
    public.user_has_loja_access(id)
  );

-- RLS: Usuario_Lojas
drop policy if exists "usuario_lojas_select_policy" on public.usuario_lojas;
create policy "usuario_lojas_select_policy" on public.usuario_lojas
  for select using (user_id = auth.uid());

-- Função utilitária para checar se o usuário autenticado tem papel de gestão (admin/gestor_rh)
create or replace function public.user_is_gestor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.usuario_lojas ul
    where ul.user_id = auth.uid()
      and ul.role in ('admin', 'gestor_rh')
  );
$$;

-- RLS: Setores & Cargos — leitura para autenticados, escrita restrita a gestores
drop policy if exists "setores_all_policy" on public.setores;
drop policy if exists "setores_select_policy" on public.setores;
drop policy if exists "setores_write_policy" on public.setores;

create policy "setores_select_policy" on public.setores
  for select using (auth.uid() is not null);

create policy "setores_write_policy" on public.setores
  for all using (public.user_is_gestor()) with check (public.user_is_gestor());

drop policy if exists "cargos_all_policy" on public.cargos;
drop policy if exists "cargos_select_policy" on public.cargos;
drop policy if exists "cargos_write_policy" on public.cargos;

create policy "cargos_select_policy" on public.cargos
  for select using (auth.uid() is not null);

create policy "cargos_write_policy" on public.cargos
  for all using (public.user_is_gestor()) with check (public.user_is_gestor());

-- RLS: Funcionários
drop policy if exists "funcionarios_select_policy" on public.funcionarios;
create policy "funcionarios_select_policy" on public.funcionarios
  for select using (public.user_has_loja_access(loja_id));

drop policy if exists "funcionarios_insert_policy" on public.funcionarios;
create policy "funcionarios_insert_policy" on public.funcionarios
  for insert with check (public.user_has_loja_access(loja_id));

drop policy if exists "funcionarios_update_policy" on public.funcionarios;
create policy "funcionarios_update_policy" on public.funcionarios
  for update using (public.user_has_loja_access(loja_id))
  with check (public.user_has_loja_access(loja_id));

drop policy if exists "funcionarios_delete_policy" on public.funcionarios;
-- Hard delete revogado para proteger histórico trabalhista e fiscal da escala. Usar UPDATE com ativo = false.
create policy "funcionarios_delete_policy" on public.funcionarios
  for delete using (false);

-- RLS: Escalas
drop policy if exists "escalas_select_policy" on public.escalas;
create policy "escalas_select_policy" on public.escalas
  for select using (public.user_has_loja_access(loja_id));

drop policy if exists "escalas_insert_policy" on public.escalas;
create policy "escalas_insert_policy" on public.escalas
  for insert with check (public.user_has_loja_access(loja_id));

drop policy if exists "escalas_update_policy" on public.escalas;
create policy "escalas_update_policy" on public.escalas
  for update using (public.user_has_loja_access(loja_id))
  with check (public.user_has_loja_access(loja_id));

drop policy if exists "escalas_delete_policy" on public.escalas;
create policy "escalas_delete_policy" on public.escalas
  for delete using (public.user_has_loja_access(loja_id));

-- RLS: Feriados & Regras — leitura para autenticados, escrita restrita a gestores
drop policy if exists "feriados_all_policy" on public.feriados;
drop policy if exists "feriados_select_policy" on public.feriados;
drop policy if exists "feriados_write_policy" on public.feriados;

create policy "feriados_select_policy" on public.feriados
  for select using (auth.uid() is not null);

create policy "feriados_write_policy" on public.feriados
  for all using (public.user_is_gestor()) with check (public.user_is_gestor());

drop policy if exists "regras_all_policy" on public.regras_escala;
drop policy if exists "regras_select_policy" on public.regras_escala;
drop policy if exists "regras_write_policy" on public.regras_escala;

create policy "regras_select_policy" on public.regras_escala
  for select using (auth.uid() is not null);

create policy "regras_write_policy" on public.regras_escala
  for all using (public.user_is_gestor()) with check (public.user_is_gestor());


-- ==============================================================================
-- 3. SEED / DADOS INICIAIS DE DEMONSTRAÇÃO
-- ==============================================================================

do $$
declare
  v_empresa_id uuid;
  v_loja_id uuid;
begin
  select id into v_empresa_id from public.empresas limit 1;
  if v_empresa_id is null then
    insert into public.empresas (nome) values ('Grupo João Henrique Atacadista')
    returning id into v_empresa_id;
  end if;

  select id into v_loja_id from public.lojas where codigo = 'LOJA002' limit 1;
  if v_loja_id is null then
    insert into public.lojas (empresa_id, nome, codigo)
    values (v_empresa_id, 'Filial - Loja 002', 'LOJA002')
    returning id into v_loja_id;
  end if;

  -- Inserir todos os 75 colaboradores reais da Loja 002 com matrículas aleatórias de 6 dígitos (LGPD Art. 6º, III)
  insert into public.funcionarios (loja_id, primeiro_nome, matricula_aleatoria, setor, cargo, turno_padrao) values
  -- 1. Frente de Caixa
  (v_loja_id, 'Nayle', '748291', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Alane', '482019', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Ana Paula', '920148', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'John', '830194', 'Frente de Caixa', 'Operador de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Ana Luísa', '502918', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Jaqueline', '392018', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Ana Beatriz', '719204', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_id, 'Jaine', '640192', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_id, 'Kamilly', '649201', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_id, 'Ana Félix', '319482', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_id, 'Sabrina', '619284', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_id, 'Viviane', '840192', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_id, 'Laísa', '183920', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Ana Cláudia', '572910', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Claudia', '294018', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Joesiane', '940182', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Sueli', '381029', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Luciene', '729104', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Luciana', '610294', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Mateus', '492018', 'Frente de Caixa', 'Operador de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Natália', '819204', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_id, 'Edma', '302948', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_id, 'Analandia', '694018', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_id, 'Roseli', '192048', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_id, 'Edinalia', '583920', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),

  -- 2. Reposição
  (v_loja_id, 'Jovando', '402919', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_id, 'Cláudio', '918205', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_id, 'Daniel', '673921', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_id, 'Mateus (Rep)', '204919', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_id, 'Suzaine', '859202', 'Reposição', 'Repositora', '07:00 às 15:00'),
  (v_loja_id, 'Wellington', '392015', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_id, 'Roberto Jose', '740193', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_id, 'Danilo', '294811', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_id, 'Marcelo (Rep)', '683020', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_id, 'Catarino', '104929', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_id, 'André Santana', '930292', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_id, 'Giovanne', '482911', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_id, 'Emerson', '104921', 'Reposição', 'Repositor Líder', '12:00 às 20:00'),
  (v_loja_id, 'Leandro', '759202', 'Reposição', 'Repositor', '14:00 às 22:00'),
  (v_loja_id, 'Fagner', '392019', 'Reposição', 'Repositor', '14:00 às 22:00'),
  (v_loja_id, 'Rafael (Rep)', '602942', 'Reposição', 'Repositor', '14:00 às 22:00'),

  -- 3. Assistente de Lanchonete
  (v_loja_id, 'Eduarda', '194029', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_id, 'Valdenice', '850193', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_id, 'Nicole', '302949', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_id, 'Normelia', '694019', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_id, 'Marielle', '192049', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '10:00 às 18:00'),
  (v_loja_id, 'Angela', '583921', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '10:00 às 18:00'),
  (v_loja_id, 'Ivonete', '402920', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '12:00 às 20:00'),
  (v_loja_id, 'Claudio (Lanch)', '918206', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '12:00 às 20:00'),

  -- 4. Açougue
  (v_loja_id, 'Gabriel', '673922', 'Açougue', 'Açougueiro', '08:00 às 16:00'),
  (v_loja_id, 'Erick (Açougue)', '204920', 'Açougue', 'Açougueiro', '08:00 às 16:00'),
  (v_loja_id, 'Roberto (Açougue)', '859203', 'Açougue', 'Açougueiro Líder', '08:00 às 16:00'),
  (v_loja_id, 'Ana (Açougue)', '392016', 'Açougue', 'Auxiliar de Açougue', '08:00 às 16:00'),
  (v_loja_id, 'Paulo', '740194', 'Açougue', 'Açougueiro', '09:00 às 18:00'),
  (v_loja_id, 'Vagner', '294812', 'Açougue', 'Auxiliar de Açougue', '09:00 às 18:00'),
  (v_loja_id, 'Marcos', '683021', 'Açougue', 'Açougueiro', '12:00 às 20:00'),
  (v_loja_id, 'Kauam', '104930', 'Açougue', 'Auxiliar de Açougue', '12:00 às 20:00'),
  (v_loja_id, 'Rafael', '930293', 'Açougue', 'Auxiliar de Açougue', '09:00 às 18:00'),
  (v_loja_id, 'Marcelo', '482912', 'Açougue', 'Atendente', '12:00 às 20:00'),

  -- 5. Padaria (Produção)
  (v_loja_id, 'Evandro', '104922', 'Padaria (Produção)', 'Padeiro Líder', '05:00 às 15:00'),
  (v_loja_id, 'Maisa', '759203', 'Padaria (Produção)', 'Auxiliar de Padaria', '05:00 às 15:00'),
  (v_loja_id, 'Erick (Padaria)', '392020', 'Padaria (Produção)', 'Padeiro', '05:00 às 15:00'),
  (v_loja_id, 'Jeane', '602943', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_id, 'Raquel', '194030', 'Padaria (Produção)', 'Auxiliar de Padaria', '05:00 às 15:00'),
  (v_loja_id, 'Yuri', '850194', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_id, 'Thais', '302950', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_id, 'Ivandro', '694020', 'Padaria (Produção)', 'Padeiro Líder', '05:00 às 15:00'),

  -- 6. Fiscal de Caixa
  (v_loja_id, 'Walta', '192050', 'Fiscal de Caixa', 'Fiscal de Caixa Líder', '08:00 às 17:00'),
  (v_loja_id, 'Ualas', '583922', 'Fiscal de Caixa', 'Fiscal de Caixa', '10:00 às 20:00'),
  (v_loja_id, 'Lane', '402921', 'Fiscal de Caixa', 'Fiscal de Caixa', '08:00 às 17:00'),
  (v_loja_id, 'Romildo', '918207', 'Fiscal de Caixa', 'Fiscal de Caixa', '10:00 às 20:00'),

  -- 7. Operador de Empilhadeira
  (v_loja_id, 'Reginaldo', '673923', 'Operador de Empilhadeira', 'Operador de Empilhadeira', '07:00 às 15:00'),

  -- 8. Higienização
  (v_loja_id, 'Eliomar', '204921', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),
  (v_loja_id, 'Acleia', '859204', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),
  (v_loja_id, 'Gilvan', '392017', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),

  -- 9. Manutenção
  (v_loja_id, 'Thiago', '100001', 'Manutenção', 'Supervisor de TI & Manutenção', '07:30 às 17:18'),
  (v_loja_id, 'Marcos (Manut)', '710294', 'Manutenção', 'Oficial de Manutenção Líder', '07:30 às 17:18'),
  (v_loja_id, 'José (Manut)', '492019', 'Manutenção', 'Auxiliar de Manutenção Predial', '07:30 às 17:18'),
  (v_loja_id, 'Edilson', '839202', 'Manutenção', 'Eletricista de Manutenção', '07:30 às 17:18')
  on conflict (matricula_aleatoria) do update set
    primeiro_nome = excluded.primeiro_nome,
    setor = excluded.setor,
    cargo = excluded.cargo,
    turno_padrao = excluded.turno_padrao;

  -- Inserir Feriados Oficiais (Nacionais, Bahia e Poções-BA)
  insert into public.feriados (nome, data, tipo, abrangencia, descricao) values
    ('Ano Novo (Confraternização Universal)', '2026-01-01', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Carnaval (Terça-Feira)', '2026-02-17', 'Nacional', 'Brasil', 'Ponto Facultativo / Feriado Nacional'),
    ('Paixão de Cristo (Sexta-Feira Santa)', '2026-04-03', 'Nacional', 'Brasil', 'Feriado Religioso Nacional'),
    ('Tiradentes', '2026-04-21', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Dia do Trabalhador', '2026-05-01', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Corpus Christi', '2026-06-04', 'Nacional', 'Brasil', 'Feriado Religioso Nacional'),
    ('Independência do Brasil (7 de Setembro)', '2026-09-07', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Nossa Senhora Aparecida (Padroeira do Brasil)', '2026-10-12', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Finados', '2026-11-02', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Proclamação da República', '2026-11-15', 'Nacional', 'Brasil', 'Feriado Nacional'),
    ('Dia da Consciência Negra', '2026-11-20', 'Nacional', 'Brasil', 'Feriado Nacional Zumbi dos Palmares'),
    ('Natal', '2026-12-25', 'Nacional', 'Brasil', 'Celebração de Natal'),
    ('São João', '2026-06-24', 'Estadual', 'Bahia', 'Festa Junina Tradicional da Bahia'),
    ('Independência da Bahia', '2026-07-02', 'Estadual', 'Bahia', '2 de Julho - Data Magna da Bahia'),
    ('Festa do Divino Espírito Santo', '2026-05-24', 'Municipal', 'Poções - BA', 'Festa do Padroeiro da Cidade de Poções'),
    ('Emancipação Política de Poções', '2026-06-26', 'Municipal', 'Poções - BA', 'Aniversário da Cidade de Poções - BA'),
    ('Dia da Consciência Evangélica', '2026-10-31', 'Municipal', 'Poções - BA', 'Dia da Cultura Evangélica de Poções')
  on conflict (nome, data) do update set
    tipo = excluded.tipo,
    abrangencia = excluded.abrangencia,
    descricao = excluded.descricao;

  -- Inserir Regras de Escala (CLT, Acordo Coletivo e Solicitações RH)
  insert into public.regras_escala (loja_id, titulo, descricao, categoria, status, obrigatoria) values
    (v_loja_id, 'Descanso Semanal Remunerado (DSR 6x1)', 'Todo colaborador tem direito a 1 folga semanal preferencialmente no domingo após no máximo 6 dias consecutivos de trabalho (Art. 67 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_id, 'Revezamento Dominical Quinzenal (Mulheres)', 'Para colaboradoras do sexo feminino, é obrigatória a concessão de folga no domingo a cada 15 dias (Art. 386 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_id, 'Revezamento Dominical Mensal (CCT)', 'Garantia de pelo menos 1 folga no domingo dentro de cada mês trabalhado para todos os colaboradores (Convenção Coletiva de Trabalho).', 'Acordo Coletivo', 'IMPLEMENTADA', true),
    (v_loja_id, 'Intervalo Interjornada de 11 Horas', 'Entre duas jornadas de trabalho é obrigatório o intervalo mínimo de 11 horas consecutivas para descanso (Art. 66 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_id, 'Intervalo Intrajornada Flexível (Refeição)', 'Concessão de intervalo de refeição ajustável em 30 min, 1h, 1h30min, 2h, 2h30min, 2h40min ou 3h para jornadas acima de 6 horas (Salvo Convenção Coletiva).', 'Acordo Coletivo', 'IMPLEMENTADA', true),
    (v_loja_id, 'Feriados Municipais de Poções-BA', 'Garantir folga ou compensação em dobro para feriados municipais de Poções (Festa do Divino Espírito Santo e Emancipação).', 'Interna RH', 'IMPLEMENTADA', true),
    (v_loja_id, 'Prioridade de Folga Véspera de Feriado (Reposição)', 'Solicitação do RH: O pessoal da reposição que folgar no sábado véspera de feriado estadual não deve dobrar o turno na segunda-feira.', 'Solicitação RH', 'PENDENTE_PROGRAMADOR', false)
  on conflict (titulo) do update set
    descricao = excluded.descricao,
    categoria = excluded.categoria;

  -- Inserir Rodízios Padrão
  insert into public.rodizios (id, nome, versao, inicio_vigencia, domingos_trabalhados, domingos_folga, quantidade_grupos, usa_grupo, descricao) values
    ('rod_normal_1x2', 'Rodízio Geral CLT / CCT (1T : 2F)', 1, '2026-01-01', 1, 2, 3, true, 'Trabalha 1 domingo e folga nos 2 domingos seguintes (Grupos A, B e C).'),
    ('rod_especial_2x1', 'Rodízio CCT Açougue & Padaria (2T : 1F)', 1, '2026-01-01', 2, 1, 2, true, 'Regra de exceção da CCT para produções de Açougue e Padaria.')
  on conflict (id) do update set
    nome = excluded.nome,
    domingos_trabalhados = excluded.domingos_trabalhados,
    domingos_folga = excluded.domingos_folga,
    quantidade_grupos = excluded.quantidade_grupos;

  insert into public.rodizio_grupos (id, rodizio_id, codigo, ordem, descricao) values
    ('rg_norm_a', 'rod_normal_1x2', 'A', 1, 'Grupo A (Trabalha 1º domingo)'),
    ('rg_norm_b', 'rod_normal_1x2', 'B', 2, 'Grupo B (Trabalha 2º domingo)'),
    ('rg_norm_c', 'rod_normal_1x2', 'C', 3, 'Grupo C (Trabalha 3º domingo)'),
    ('rg_esp_a', 'rod_especial_2x1', 'A', 1, 'Grupo A Especial'),
    ('rg_esp_b', 'rod_especial_2x1', 'B', 2, 'Grupo B Especial')
  on conflict (id) do update set
    codigo = excluded.codigo,
    ordem = excluded.ordem,
    descricao = excluded.descricao;

end $$;
