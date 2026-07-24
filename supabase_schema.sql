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
  nome text unique not null,
  descricao text,
  created_at timestamptz default now()
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
create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete restrict not null,
  primeiro_nome text not null, -- LGPD: Apenas primeiro nome (ou apelido)
  matricula_aleatoria text unique not null, -- LGPD: Matrícula de 6 dígitos não sequencial
  setor text not null, -- 'Açougue', 'Hortifruti', 'Caixa', 'Reposição', etc.
  cargo text not null,
  turno_padrao text default '08:00 às 16:20',
  ativo boolean default true not null, -- Exclusão Lógica para conformidade CLT/LGPD
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
  tipo text not null check (tipo in ('Nacional', 'Estadual', 'Municipal')),
  abrangencia text default 'Brasil',
  descricao text,
  created_at timestamptz default now()
);

-- Tabela de Regras de Escala (CLT & Solicitações RH)
create table if not exists public.regras_escala (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) on delete cascade,
  titulo text not null,
  descricao text not null,
  categoria text not null check (categoria in ('CLT', 'Acordo Coletivo', 'Interna RH', 'Solicitação RH')),
  status text not null default 'PENDENTE_PROGRAMADOR' check (status in ('IMPLEMENTADA', 'EM_DESENVOLVIMENTO', 'PENDENTE_PROGRAMADOR')),
  obrigatoria boolean default true,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);



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

-- RLS: Empresas (Apenas usuários vinculados a alguma loja da empresa)
create policy "empresas_select_policy" on public.empresas
  for select using (
    exists (
      select 1 from public.lojas l
      join public.usuario_lojas ul on ul.loja_id = l.id
      where l.empresa_id = empresas.id and ul.user_id = auth.uid()
    )
  );

-- RLS: Lojas (Usuário só enxerga as lojas às quais tem acesso explícito)
create policy "lojas_select_policy" on public.lojas
  for select using (
    public.user_has_loja_access(id)
  );

-- RLS: Usuario_Lojas (Usuário pode ler seus próprios vínculos)
create policy "usuario_lojas_select_policy" on public.usuario_lojas
  for select using (user_id = auth.uid());

-- RLS: Funcionários (Strict Multi-Tenancy & Sanitização por Loja)
create policy "funcionarios_select_policy" on public.funcionarios
  for select using (public.user_has_loja_access(loja_id));

create policy "funcionarios_insert_policy" on public.funcionarios
  for insert with check (public.user_has_loja_access(loja_id));

create policy "funcionarios_update_policy" on public.funcionarios
  for update using (public.user_has_loja_access(loja_id))
  with check (public.user_has_loja_access(loja_id));

create policy "funcionarios_delete_policy" on public.funcionarios
  for delete using (public.user_has_loja_access(loja_id));

-- RLS: Escalas (Usuário só lê/escreve escalas da sua loja)
create policy "escalas_select_policy" on public.escalas
  for select using (public.user_has_loja_access(loja_id));

create policy "escalas_insert_policy" on public.escalas
  for insert with check (public.user_has_loja_access(loja_id));

create policy "escalas_update_policy" on public.escalas
  for update using (public.user_has_loja_access(loja_id))
  with check (public.user_has_loja_access(loja_id));

create policy "escalas_delete_policy" on public.escalas
  for delete using (public.user_has_loja_access(loja_id));


-- ==============================================================================
-- 3. SEED / DADOS INICIAIS DE DEMONSTRAÇÃO
-- ==============================================================================

-- Inserir empresa e lojas de teste
do $$
declare
  v_empresa_id uuid;
  v_loja_matriz_id uuid;
  v_loja_filial_id uuid;
begin
  insert into public.empresas (nome) values ('Grupo João Henrique Atacadista')
  returning id into v_empresa_id;

  insert into public.lojas (empresa_id, nome, codigo)
  values (v_empresa_id, 'Matriz - Centro', 'MATRIZ')
  returning id into v_loja_matriz_id;

  insert into public.lojas (empresa_id, nome, codigo)
  values (v_empresa_id, 'Filial - Loja 02', 'LOJA02')
  returning id into v_loja_filial_id;

  -- Inserir todos os 75 colaboradores reais pseudonimizados com matrículas aleatórias de 6 dígitos (LGPD Art. 6º, III)
  insert into public.funcionarios (loja_id, primeiro_nome, matricula_aleatoria, setor, cargo, turno_padrao) values
  -- 1. Frente de Caixa
  (v_loja_matriz_id, 'Nayle', '748291', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Alane', '482019', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Ana Paula', '920148', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'John', '830194', 'Frente de Caixa', 'Operador de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Ana Luísa', '502918', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Jaqueline', '392018', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Ana Beatriz', '719204', 'Frente de Caixa', 'Operadora de Caixa', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Jaine', '640192', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Kamilly', '649201', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Ana Félix', '319482', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Sabrina', '619284', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Viviane', '840192', 'Frente de Caixa', 'Operadora de Caixa', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Laísa', '183920', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Ana Cláudia', '572910', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Claudia', '294018', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Joesiane', '940182', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Sueli', '381029', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Luciene', '729104', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Luciana', '610294', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Mateus', '492018', 'Frente de Caixa', 'Operador de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Natália', '819204', 'Frente de Caixa', 'Operadora de Caixa', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Edma', '302948', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_matriz_id, 'Analandia', '694018', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_matriz_id, 'Roseli', '192048', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),
  (v_loja_matriz_id, 'Edinalia', '583920', 'Frente de Caixa', 'Operadora de Caixa', '14:00 às 22:00'),

  -- 2. Reposição
  (v_loja_matriz_id, 'Jovando', '402919', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_matriz_id, 'Cláudio', '918205', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_matriz_id, 'Daniel', '673921', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_matriz_id, 'Mateus (Rep)', '204919', 'Reposição', 'Repositor', '07:00 às 15:00'),
  (v_loja_matriz_id, 'Suzaine', '859202', 'Reposição', 'Repositora', '07:00 às 15:00'),
  (v_loja_matriz_id, 'Wellington', '392015', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_matriz_id, 'Roberto Jose', '740193', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_matriz_id, 'Danilo', '294811', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_matriz_id, 'Marcelo (Rep)', '683020', 'Reposição', 'Repositor', '09:00 às 17:00'),
  (v_loja_matriz_id, 'Catarino', '104929', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_matriz_id, 'André Santana', '930292', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Giovanne', '482911', 'Reposição', 'Repositor', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Emerson', '104921', 'Reposição', 'Repositor Líder', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Leandro', '759202', 'Reposição', 'Repositor', '14:00 às 22:00'),
  (v_loja_matriz_id, 'Fagner', '392019', 'Reposição', 'Repositor', '14:00 às 22:00'),
  (v_loja_matriz_id, 'Rafael (Rep)', '602942', 'Reposição', 'Repositor', '14:00 às 22:00'),

  -- 3. Assistente de Lanchonete
  (v_loja_matriz_id, 'Eduarda', '194029', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Valdenice', '850193', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Nicole', '302949', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Normelia', '694019', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Marielle', '192049', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Angela', '583921', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '10:00 às 18:00'),
  (v_loja_matriz_id, 'Ivonete', '402920', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Claudio (Lanch)', '918206', 'Assistente de Lanchonete', 'Atendente de Lanchonete', '12:00 às 20:00'),

  -- 4. Açougue
  (v_loja_matriz_id, 'Gabriel', '673922', 'Açougue', 'Açougueiro', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Erick (Açougue)', '204920', 'Açougue', 'Açougueiro', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Roberto (Açougue)', '859203', 'Açougue', 'Açougueiro Líder', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Ana (Açougue)', '392016', 'Açougue', 'Auxiliar de Açougue', '08:00 às 16:00'),
  (v_loja_matriz_id, 'Paulo', '740194', 'Açougue', 'Açougueiro', '09:00 às 18:00'),
  (v_loja_matriz_id, 'Vagner', '294812', 'Açougue', 'Auxiliar de Açougue', '09:00 às 18:00'),
  (v_loja_matriz_id, 'Marcos', '683021', 'Açougue', 'Açougueiro', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Kauam', '104930', 'Açougue', 'Auxiliar de Açougue', '12:00 às 20:00'),
  (v_loja_matriz_id, 'Rafael', '930293', 'Açougue', 'Auxiliar de Açougue', '09:00 às 18:00'),
  (v_loja_matriz_id, 'Marcelo', '482912', 'Açougue', 'Atendente', '12:00 às 20:00'),

  -- 5. Padaria (Produção)
  (v_loja_matriz_id, 'Evandro', '104922', 'Padaria (Produção)', 'Padeiro Líder', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Maisa', '759203', 'Padaria (Produção)', 'Auxiliar de Padaria', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Erick (Padaria)', '392020', 'Padaria (Produção)', 'Padeiro', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Jeane', '602943', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Raquel', '194030', 'Padaria (Produção)', 'Auxiliar de Padaria', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Yuri', '850194', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Thais', '302950', 'Padaria (Produção)', 'Atendente', '05:00 às 15:00'),
  (v_loja_matriz_id, 'Ivandro', '694020', 'Padaria (Produção)', 'Padeiro Líder', '05:00 às 15:00'),

  -- 6. Fiscal de Caixa
  (v_loja_matriz_id, 'Walta', '192050', 'Fiscal de Caixa', 'Fiscal de Caixa Líder', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Ualas', '583922', 'Fiscal de Caixa', 'Fiscal de Caixa', '10:00 às 20:00'),
  (v_loja_matriz_id, 'Lane', '402921', 'Fiscal de Caixa', 'Fiscal de Caixa', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Romildo', '918207', 'Fiscal de Caixa', 'Fiscal de Caixa', '10:00 às 20:00'),

  -- 7. Operador de Empilhadeira
  (v_loja_matriz_id, 'Reginaldo', '673923', 'Operador de Empilhadeira', 'Operador de Empilhadeira', '07:00 às 15:00'),

  -- 8. Higienização
  (v_loja_matriz_id, 'Eliomar', '204921', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Acleia', '859204', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),
  (v_loja_matriz_id, 'Gilvan', '392017', 'Higienização', 'Auxiliar de Serviços Gerais', '08:00 às 17:00'),

  -- 9. Manutenção
  (v_loja_matriz_id, 'Thiago', '100001', 'Manutenção', 'Supervisor de TI & Manutenção', '07:30 às 17:18'),
  (v_loja_matriz_id, 'Marcos (Manut)', '710294', 'Manutenção', 'Oficial de Manutenção Líder', '07:30 às 17:18'),
  (v_loja_matriz_id, 'José (Manut)', '492019', 'Manutenção', 'Auxiliar de Manutenção Predial', '07:30 às 17:18'),
  (v_loja_matriz_id, 'Edilson', '839202', 'Manutenção', 'Eletricista de Manutenção', '07:30 às 17:18')
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
    ('Dia da Consciência Evangélica', '2026-10-31', 'Municipal', 'Poções - BA', 'Dia da Cultura Evangélica de Poções');

  -- Inserir Regras de Escala (CLT, Acordo Coletivo e Solicitações RH)
  insert into public.regras_escala (loja_id, titulo, descricao, categoria, status, obrigatoria) values
    (v_loja_matriz_id, 'Descanso Semanal Remunerado (DSR 6x1)', 'Todo colaborador tem direito a 1 folga semanal preferencialmente no domingo após no máximo 6 dias consecutivos de trabalho (Art. 67 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Revezamento Dominical Quinzenal (Mulheres)', 'Para colaboradoras do sexo feminino, é obrigatória a concessão de folga no domingo a cada 15 dias (Art. 386 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Revezamento Dominical Máximo (Homens)', 'Colaboradores do sexo masculino não podem trabalhar mais de 7 domingos consecutivos sem folga dominical (Lei nº 10.101/2000).', 'Acordo Coletivo', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Intervalo Interjornada de 11 Horas', 'Entre duas jornadas de trabalho é obrigatório o intervalo mínimo de 11 horas consecutivas para descanso (Art. 66 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Intervalo Intrajornada (Refeição/Almoço)', 'Em qualquer trabalho contínuo superior a 6 horas é obrigatória a concessão de intervalo de 1 a 2 horas para refeição (Art. 71 da CLT).', 'CLT', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Feriados Municipais de Poções-BA', 'Garantir folga ou compensação em dobro para feriados municipais de Poções (Festa do Divino Espírito Santo e Emancipação).', 'Interna RH', 'IMPLEMENTADA', true),
    (v_loja_matriz_id, 'Prioridade de Folga Véspera de Feriado (Reposição)', 'Solicitação do RH: O pessoal da reposição que folgar no sábado véspera de feriado estadual não deve dobrar o turno na segunda-feira.', 'Solicitação RH', 'PENDENTE_PROGRAMADOR', false);

end $$;
