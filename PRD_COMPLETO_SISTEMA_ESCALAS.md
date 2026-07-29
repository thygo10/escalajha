# PRD - Sistema SaaS Enterprise de Gestão de Jornadas & Escalas Inteligentes (EscalaJHA)

**Versão:** 4.0 Production Blueprint (Roadmap Pragmático MVP $\rightarrow$ Enterprise)  
**Arquitetura:** Angular 19 + Supabase (RLS Strict) + TailwindCSS / PrimeNG  
**Motor de Cálculo:** CSP (Constraint Satisfaction Problem) em TypeScript Puro (Desacoplado em `src/solver/`), Checador de Viabilidade Estrutural $O(1)$ (Fase 0), Carry-Over por Estado de Regras, Taxonomia Fina de `NO_SOLUTION`, Imutabilidade SHA-256 e Compliance Trabalhista 100% Inviolável.

---

## 1. Visão Geral do Produto & Proposta de Valor

O **EscalaJHA** é uma plataforma SaaS enterprise desenvolvida para gerenciar jornadas de trabalho, escalas de folga e alocação de equipes em supermercados, varejo e operações de turno.

O sistema elimina o gargalo de escala mensal através de um **Motor de Otimização CSP por Estado de Regras**, garantindo:
- **100% de Conformidade Trabalhista (Hard Constraints - CLT/CCT);**
- **Zero violações de CLT mesmo em estados de Timeout ou Solução Parcial;**
- **Checagem preventiva $O(1)$ de inviabilidade estrutural ($N/3$ domingos);**
- **Continuidade temporal perfeita entre meses por Máquina de Estado de Regra;**
- **Taxonomia fina de diagnósticos para falhas de escala (`RESOURCE_SHORTAGE` vs. `RULE_CONFLICT`);**
- **Portal do Colaborador LGPD e isolamento Multi-Tenant por RLS.**

---

## 2. Arquitetura de Software & Desacoplamento do Solver (`src/solver/`)

### 2.1 Separação Rígida em Camadas

```
src/
  app/
    components/      --> Interfaces de Apresentação (Angular Signals / Sakai NG)
    services/        --> Serviços Angular (Auth, Tenant, Data Repositories)
    guards/          --> Proteção de Rotas e Autenticação RLS
    models/          --> DTOs e Tipos do Domínio
  solver/            --> Núcleo 100% TypeScript Puro (Zero dependência de UI)
    core/            --> Tipos Fundamentais, Enums e Estados de Execução
    domain/          --> Matrizes de Disponibilidade e Bitsets
    constraints/     --> Hard (CLT/CCT, 44h) & Soft (Pesos de Conforto)
    phase0/          --> Structural Feasibility Checker (Checagem N/3 em O(1))
    search/          --> Engine CSP (AC-3 + Backtracking Heurístico MRV)
    state/           --> Carry-Over por Estado de Regras Inter-Mensal
    score/           --> Calculador do Score % de Qualidade
    explainer/       --> Motor de Explicabilidade Técnica (Motivos de Folga)
    locks/           --> Lock de Concorrência e Idempotência no Supabase
```

---

## 3. As 7 Correções Cruciais de Engenharia (Versão 4.0)

### 3.1 Carry-Over por Estado de Regra (Rule-Based Carry-Over State)
Em vez de um buffer fixo de tempo (que falha na virada do mês quando a dívida do domingo 1x2 se estende até o dia 14 do mês seguinte), o sistema utiliza uma **Máquina de Estado por Regra**:
- `ultimo_domingo_trabalhado: Date`
- `domingos_descanso_restantes: number` (0, 1 ou 2)
- `grupo_ultimo_feriado_trabalhado: 'A' | 'B'`
- `dias_consecutivos_trabalhados_acumulados: number`

### 3.2 Resolução de Recursos Compartilhados (Pré-Passo para Função Cruzada)
Para evitar race conditions em alocações cruzadas (ex: Auxiliar de TI cobrindo Fiscal de Caixa):
- **Fase 0.1:** O motor executa primeiro o binding dos colaboradores com função cruzada, travando seus dias de atuação fora do setor de origem antes de rodar os solvers locais dos setores.

### 3.3 Checador de Viabilidade Estrutural Estática (Fase 0 - $O(1)$)
Antes de iniciar a busca por backtracking, a **Fase 0** aplica a fórmula analítica de cardinalidade:
- Se $N < 3 \times \text{CoberturaMinimaDomingo}$, o sistema responde imediatamente `NO_SOLUTION (RULE_CONFLICT)` em **1ms**, evitando estourar timeouts em cálculos matematicamente impossíveis.

### 3.4 Garantia Absoluta em TIMEOUT / PARTIAL
- **Regra Rígida de Inviolabilidade:** `TIMEOUT` ou `PARTIAL` **JAMAIS** violam Hard Constraints (CLT). Se o tempo de 30s esgotar, o resultado parcial atende **100% da CLT**, sacrificando apenas pontuações de preferência/conforto (*Soft Constraints*). Se for impossível respeitar a CLT a tempo, o sistema retorna `NO_SOLUTION`.

### 3.5 Taxonomia Fina do `NO_SOLUTION`
Diagnósticos transparentes para suporte e orientação do gestor:
- `RESOURCE_SHORTAGE`: Falta número absoluto de funcionários no setor.
- `RULE_CONFLICT`: Há funcionários suficientes para dias úteis, mas a regra de domingos (1x2/1x1/3x1) ou 44h entra em conflito com o mínimo operacional.
- `TENANT_CONFIGURATION`: Parâmetros de horários de funcionamento e turnos são contraditórios.
- `INVALID_PARAMETERS`: Inconsistência nos formulários do Wizard.
- `MISSING_HISTORY`: Falta a aprovação do mês anterior para calcular a continuidade.

### 3.6 Concorrência e Schemas Tipados
- **Lock de Geração no Supabase:** Lock otimista `(tenant_id, setor_id, ano, mes)` com `status = RUNNING` e expiração automática de 60s.
- **Schemas Tipados Zod/TypeScript:** Regras da empresa fortemente tipadas no banco de dados.

### 3.7 Strategic Roadmap (Foco no MVP de Produção)
- **Fase MVP (Imediata):** Solver CSP Rígido em `src/solver/` + Fase 0 Feasibility Checker + Carry-over por Estado de Regra + Supabase RLS + Explicabilidade Básica + Taxonomia NO_SOLUTION + Testes de Estresse.
- **Fase V1 (Governança):** Score % de Qualidade + Versionamento SHA-256 + Audit Log + Lock de Concorrência.
- **Fase V2 (Enterprise & IA):** Web Workers Paralelos + Simulação What-If + Assistente IA Executivo.

---

## 4. Modelo de Dados Enterprise (Supabase PostgreSQL + RLS)

```sql
-- 1. Execuções do Solver com Métrica e Telemetria
CREATE TABLE solver_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  setor_id UUID NOT NULL REFERENCES setores(id),
  mes INT NOT NULL,
  ano INT NOT NULL,
  tempo_execucao_ms INT NOT NULL,
  nos_explorados INT DEFAULT 0,
  score_qualidade INT NOT NULL,
  status VARCHAR(30) NOT NULL, -- 'SUCCESS', 'NO_SOLUTION', 'TIMEOUT', 'PARTIAL', 'CANCELLED'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Falhas de Restrição para Diagnóstico Fino
CREATE TABLE constraint_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solver_run_id UUID NOT NULL REFERENCES solver_runs(id) ON DELETE CASCADE,
  categoria_falha VARCHAR(40) NOT NULL, -- 'RESOURCE_SHORTAGE', 'RULE_CONFLICT', 'TENANT_CONFIGURATION'
  restricao_violada VARCHAR(50) NOT NULL,
  detalhes TEXT NOT NULL
);

-- 3. Estado de Carry-Over por Regra (Inter-Mensal)
CREATE TABLE funcionario_estados_regra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  ultimo_domingo_trabalhado DATE,
  domingos_descanso_restantes INT DEFAULT 0,
  grupo_ultimo_feriado_trabalhado VARCHAR(1) DEFAULT 'A',
  dias_consecutivos_acumulados INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_funcionario_estado UNIQUE(funcionario_id)
);

-- 4. Versionamento Imutável de Escalas com Hash SHA-256
CREATE TABLE escala_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  escala_id UUID NOT NULL REFERENCES escalas_mensais(id),
  versao INT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  dados_json JSONB NOT NULL,
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Audit Log LGPD e Compliance Fiscais
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  usuario_id UUID NOT NULL,
  origem VARCHAR(20) DEFAULT 'MANUAL', -- 'MANUAL', 'SOLVER', 'IA', 'IMPORTACAO'
  acao VARCHAR(50) NOT NULL,
  recurso VARCHAR(50) NOT NULL,
  detalhes JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Matriz de Aceite do MVP

1. **Zero Violação de CLT:** Validação automática garante 0 infrações de interjornada (11h), 44h semanais e teto do 6º dia contínuo (inclusive entre viradas de mês).
2. **Fase 0 Funcional:** Erros de cardinalidade $N/3$ no domingo retornam `NO_SOLUTION (RULE_CONFLICT)` em < 5ms.
3. **Carry-Over por Estado:** Transição do mês de maio/junho e agosto/setembro testadas e validadas sem perda de dívida de descanso.
4. **Isolamento RLS Supabase:** Testes de segurança confirmam 0 vazamento de dados inter-tenant.
