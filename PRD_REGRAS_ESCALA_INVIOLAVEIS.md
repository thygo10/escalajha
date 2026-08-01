# PRD - Regras de Escala Inviolaveis, Grupos e Cadastro de Funcionarios

Data: 2026-07-31
Repositorio: `C:\Users\thygo\escalajha`
Status: pronto para refinamento tecnico e implementacao

## 1. Resumo executivo

O EscalaJHA deve garantir que uma escala gerada, recalculada, editada ou salva nunca viole as regras criticas de folgas, domingos, feriados, cobertura minima e excecoes por setor.

As regras precisam deixar de depender apenas da posicao do funcionario na lista ou de heuristicas internas. O cadastro do funcionario deve carregar os dados operacionais que determinam o rodizio:

- `rodizio_id`: regra de rodizio aplicavel ao funcionario, com fallback para o setor.
- `grupo_domingo`: grupo de domingo, normalmente `A`, `B` ou `C`.
- `grupo_feriado`: grupo de feriado, normalmente `A` ou `B`.
- `setores_cobertura`: setores que o funcionario pode cobrir.
- estado de continuidade entre meses: ultimos domingos/feriados trabalhados e dias consecutivos acumulados.

O objetivo deste PRD e transformar essas regras em contrato de produto, dados, algoritmo e testes para que a proxima etapa possa implementar sem ambiguidade.

## 2. Contexto tecnico atual

Achados no codigo atual:

- `src/app/models/types.ts` ja possui `Funcionario.rodizio_id`, `grupo_domingo`, `grupo_feriado`, `grupo` e `setores_cobertura`.
- `src/app/domain/schedule/schedule.types.ts` ainda define `Employee` sem `rodizio_id`, `grupo_domingo`, `grupo_feriado` e `grupo`. Assim, o gerador de escala nao recebe os grupos persistidos.
- `src/app/services/supabase.service.ts` ja tenta inserir/atualizar `rodizio_id`, `grupo_domingo` e `grupo_feriado`.
- `supabase_schema.sql` cria `funcionarios` sem `rodizio_id`, `grupo_domingo`, `grupo_feriado` e `grupo`.
- O service usa `funcionario_estado_rotacao`, mas o schema cria `funcionario_estados_regra`. A implementacao deve escolher um nome unico.
- O service espera tabelas `rodizios` e `rodizio_grupos`, mas o schema atual nao declara essas tabelas.
- O gerador atual ancora domingos por posicao ordenada/seed, nao por `grupo_domingo`.
- O feriado aberto hoje e distribuido por heuristica de 50%, nao por alternancia persistida de `grupo_feriado`.

Conclusao: sim, os types do cadastro dos funcionarios precisam conter esses campos, e o Supabase precisa ter as colunas/tabelas correspondentes para qualquer funcionario que ainda nao tenha essas informacoes.

## 3. Objetivos

1. Garantir teto de folgas programaveis por funcionario.
2. Garantir espacamento minimo entre folgas.
3. Garantir descanso semanal e maximo de 6 dias consecutivos trabalhados.
4. Garantir rodizio dominical baseado em grupos.
5. Garantir feriados abertos por grupos A/B.
6. Garantir feriados fechados como `FE` para todos.
7. Garantir excecoes por setor, incluindo Padaria, Acougue e Fiscal de Caixa.
8. Bloquear salvamento de escala com erro hard.
9. Criar diagnostico claro quando nao existir solucao viavel.
10. Persistir grupos e estado no Supabase, com backfill para funcionarios existentes.

## 4. Nao objetivos desta etapa

- Implementar folha de pagamento.
- Calcular banco de horas financeiro.
- Substituir regras legais por IA.
- Permitir override manual que viole CLT/CCT sem trilha formal de excecao.
- Alterar visual completo do dashboard.

## 5. Glossario operacional

Tipos de dia:

- `T`: trabalho em dia comum.
- `TD`: trabalho em domingo.
- `TF`: trabalho em feriado aberto.
- `F`: folga programada em dia comum ou feriado aberto.
- `FD`: folga dominical.
- `FE`: feriado fechado, loja sem funcionamento.
- `AF`: afastamento, atestado ou licenca.
- `FR`: ferias.

Tipos de folga para regra mensal:

- Folgas programaveis: `F` e `FD`.
- Folga por fechamento obrigatorio: `FE`.
- Ausencias nao programaveis: `AF` e `FR`.

Regra recomendada: o teto de 5 deve valer para folgas programaveis (`F` + `FD`). `FE`, `AF` e `FR` devem aparecer nos totais visuais, mas nao devem consumir a cota de folgas programaveis, porque nao sao escolhas do gerador.

## 6. Regras hard

### RH-01: Teto mensal de folgas

Cada funcionario deve ter no maximo 5 folgas programaveis por mes.

Contrato:

- Contam para o teto: `F` e `FD`.
- Nao contam para o teto: `FE`, `AF`, `FR`.
- Meses curtos podem exigir meta menor, mas nunca acima de 5 programaveis.
- O gerador nao pode criar uma sexta folga programavel para resolver cobertura ou conforto.
- Se CLT exigir descanso e o teto de 5 tornar a escala impossivel, o sistema deve retornar `NO_SOLUTION`, nao gerar escala invalida.

Aceite:

- Nenhum funcionario ativo pode ter `count(F + FD) > 5`.
- Teste negativo deve injetar 6 folgas e gerar erro bloqueante.

### RH-02: Meta minima de folgas

Cada funcionario deve receber preferencialmente 4 a 5 folgas programaveis no mes.

Contrato:

- Meta minima padrao: 4.
- Se nao for possivel atingir 4 sem quebrar cobertura, o sistema deve gerar alerta de qualidade ou `NO_SOLUTION`, conforme severidade definida para o setor.
- Para setores com equipe muito pequena, a fase de viabilidade deve explicar a falta de recurso antes de tentar a busca.

### RH-03: Maximo de 6 dias consecutivos trabalhados

Nenhum funcionario pode trabalhar mais de 6 dias consecutivos.

Contrato:

- Contam como trabalho: `T`, `TD`, `TF`.
- Quebram sequencia: `F`, `FD`, `FE`, `AF`, `FR`.
- A contagem deve considerar carry-over do mes anterior.
- Se o funcionario terminou o mes anterior com 6 dias trabalhados, o primeiro dia do mes atual deve ser descanso ou ausencia nao trabalho.

Aceite:

- Teste para todos os setores e meses deve validar streak maximo `<= 6`.
- Teste de virada de mes deve validar continuidade.

### RH-04: Espacamento entre folgas

O sistema deve evitar folgas grudadas e folgas picadas.

Contrato:

- Proibido gerar folgas programaveis em dias consecutivos (`F/FD` ao lado de `F/FD`), salvo quando houver `FE`, `AF`, `FR` ou impossibilidade legal diagnosticada.
- Distancia ideal entre folgas programaveis: 4 a 6 dias.
- Distancia menor que 4 deve ser tratada como violacao ou alerta configuravel, mas nunca pode ser usada silenciosamente.
- A validacao deve apontar funcionario, dias envolvidos e motivo.

Aceite:

- Teste deve falhar para folgas adjacentes.
- Teste deve cobrir distancia 2 ou 3 quando a regra estiver configurada como hard.

### RH-05: Domingo padrao 1 trabalha, 2 folga

Para setores sem excecao, quem trabalha um domingo deve folgar os 2 domingos seguintes.

Contrato:

- Rodizio padrao: `rod_normal_1x2`.
- Grupos padrao de domingo: `A`, `B`, `C`.
- Em cada domingo aberto, somente o grupo do ciclo trabalha (`TD` ou `TF` se tambem for feriado aberto).
- Os outros grupos recebem `FD`.
- A sequencia precisa continuar entre meses por estado persistido.
- O algoritmo deve usar `grupo_domingo`, nao indice da lista.

Exemplo:

- Domingo 1 do ciclo: grupo A trabalha, B/C folgam.
- Domingo 2 do ciclo: grupo B trabalha, A/C folgam.
- Domingo 3 do ciclo: grupo C trabalha, A/B folgam.
- Domingo 4 do ciclo: volta para A.

Aceite:

- Um funcionario do rodizio 1x2 nunca pode trabalhar dois domingos com menos de dois domingos de folga entre eles.
- A validacao deve detectar diferenca de 7 ou 14 dias entre domingos trabalhados como erro para o rodizio 1x2.

### RH-06: Domingo em setores de excecao

Padaria e Acougue podem ter rodizio setorial diferente, desde que cadastrado e validado.

Contrato:

- O setor pode usar `rod_especial_2x1` ou outro rodizio configurado.
- A regra do setor deve vir de `rodizio_id` do funcionario ou do setor.
- Mulheres continuam protegidas pela regra aplicavel de descanso dominical, conforme CLT/CCT adotada no sistema.
- Excecao de setor nao pode quebrar maximo de 6 dias trabalhados, teto de folgas, feriado fechado ou cobertura minima.

Recomendacao inicial:

- Padaria: manter limite operacional de no maximo 1 folga programavel por dia util para equipe de producao, salvo folga inviolavel por CLT.
- Acougue: permitir rodizio especial somente se cobertura minima do setor ficar atendida e regra de mulheres continuar validada.

Aceite:

- Regression case de Padaria deve validar maximo de 1 folga voluntaria por dia util.
- Regression case de Acougue deve validar domingo e CLT 386 para mulheres.

### RH-07: Feriado fechado

Feriado com `funcionamento_proibido = true` deve virar `FE` para todos.

Contrato:

- `FE` nao depende de grupo.
- `FE` nao conta como folga programavel.
- Se cair em domingo, prevalece `FE`.

Aceite:

- Natal 25/12 com funcionamento proibido deve ser `FE` para todos.

### RH-08: Feriado aberto por grupo A/B

Feriado aberto deve alternar funcionarios por grupo de feriado.

Contrato:

- Grupos de feriado padrao: `A` e `B`.
- O cadastro do funcionario deve ter `grupo_feriado`.
- Em feriado aberto, um grupo trabalha (`TF`) e o outro folga (`F`), respeitando cobertura minima.
- A alternancia deve considerar o ultimo feriado aberto trabalhado no estado de carry-over.
- Se um feriado aberto cair no domingo, a regra dominical por `grupo_domingo` deve prevalecer. O status de trabalho pode ser `TF`, mas a escolha de quem trabalha vem do domingo A/B/C.

Aceite:

- Dois feriados abertos consecutivos nao devem chamar sempre o mesmo grupo, salvo falta de cobertura diagnosticada.
- Funcionario sem `grupo_feriado` nao pode ser escalado sem backfill ou erro de cadastro.

### RH-09: Cobertura minima por setor

Cada setor deve respeitar minimos diarios, de domingo e de feriado.

Contrato:

- Campos por setor: `min_funcionarios_dia`, `min_funcionarios_domingo`, `min_funcionarios_feriado`.
- Frente de Caixa deve manter minimo operacional configurado, atualmente 6 em dias comuns.
- Fiscal de Caixa deve garantir dupla de abertura/fechamento quando configurado.
- Padaria e Acougue devem respeitar minimo mesmo quando aplicarem regra especial.
- Se houver funcionario de cobertura cruzada, o mesmo funcionario nao pode cobrir dois setores no mesmo dia/horario.

Aceite:

- Validador deve bloquear escala abaixo do minimo.
- Diagnostico deve apontar dia, setor, minimo, realizado e funcionarios disponiveis.

## 7. Requisitos de cadastro

### RF-01: Campos obrigatorios no cadastro de funcionario

O cadastro deve permitir e persistir:

- `rodizio_id`.
- `grupo_domingo`.
- `grupo_feriado`.
- `setores_cobertura`.
- `genero`.
- `ativo`.
- `turno_padrao`.
- `setor`.
- `cargo`.

Regras:

- Ao salvar funcionario ativo, se `rodizio_id` exigir grupos, o cadastro deve exigir `grupo_domingo` e/ou `grupo_feriado`.
- Para novos funcionarios, o sistema pode sugerir grupo automatico pelo menor desequilibrio do setor.
- Para funcionarios existentes sem grupo, deve existir rotina de backfill antes da geracao.

### RF-02: Health check de dados

Antes de gerar escala, o sistema deve rodar auditoria de cadastro:

- Funcionario ativo sem `rodizio_id`.
- Funcionario ativo sem `grupo_domingo` quando o rodizio usa grupo.
- Funcionario ativo sem `grupo_feriado`.
- Setor sem minimos configurados.
- Setor sem rodizio padrao.
- Rodizio referenciado que nao existe.
- Grupo referenciado que nao existe no rodizio.

Resultado:

- Erros bloqueantes impedem gerar.
- Alertas permitem gerar apenas quando houver fallback seguro definido.

## 8. Modelo de dados Supabase

### 8.1 Tabela `funcionarios`

Adicionar ou garantir colunas:

```sql
alter table public.funcionarios
  add column if not exists rodizio_id text,
  add column if not exists grupo_domingo text,
  add column if not exists grupo_feriado text,
  add column if not exists grupo text;
```

Observacao:

- `grupo` deve ser tratado como legado/alias. A implementacao nova deve usar `grupo_feriado`.

### 8.2 Tabela `setores`

Alinhar o schema com o type `Setor`:

```sql
alter table public.setores
  add column if not exists loja_id uuid references public.lojas(id) on delete cascade,
  add column if not exists rodizio_id text,
  add column if not exists min_funcionarios_dia int,
  add column if not exists min_funcionarios_domingo int,
  add column if not exists min_funcionarios_feriado int;
```

### 8.3 Tabelas de rodizio

Criar tabelas:

```sql
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
```

Seeds minimos:

- `rod_normal_1x2`: domingos_trabalhados = 1, domingos_folga = 2, grupos A/B/C.
- `rod_especial_2x1`: domingos_trabalhados = 2, domingos_folga = 1, grupos conforme decisao operacional do setor.

### 8.4 Estado de carry-over

Escolher uma unica tabela. Recomendacao: padronizar em `funcionario_estados_regra`.

Campos necessarios:

- `funcionario_id`.
- `loja_id`.
- `mes_referencia`.
- `dias_consecutivos_acumulados`.
- `ultimo_domingo_trabalhado`.
- `domingos_descanso_restantes`.
- `ultimo_feriado_trabalhado`.
- `grupo_ultimo_feriado_trabalhado`.
- `updated_at`.

Constraint recomendada:

```sql
unique (funcionario_id, mes_referencia)
```

O service deve parar de consultar `funcionario_estado_rotacao` ou criar uma migration de compatibilidade.

### 8.5 Backfill de funcionarios existentes

Rotina necessaria:

1. Para funcionario sem `rodizio_id`, usar `setores.rodizio_id`; se ausente, usar `rod_normal_1x2`.
2. Para `grupo_domingo` vazio, distribuir por setor e turno em A/B/C, mantendo equilibrio.
3. Para setor com rodizio especial, distribuir conforme grupos do rodizio setorial.
4. Para `grupo_feriado` vazio, distribuir por setor e turno em A/B.
5. Para `grupo` vazio, copiar `grupo_feriado` apenas para compatibilidade.
6. Registrar auditoria do backfill.

## 9. Alteracoes TypeScript esperadas

### 9.1 `Employee`

`src/app/domain/schedule/schedule.types.ts` deve aceitar os mesmos campos operacionais usados em `Funcionario`:

```ts
export interface Employee {
  id?: string;
  loja_id: string;
  primeiro_nome: string;
  matricula_aleatoria: string;
  setor: string;
  cargo: string;
  turno_padrao: string;
  genero: 'M' | 'F';
  ativo: boolean;
  rodizio_id?: string;
  grupo_domingo?: string;
  grupo_feriado?: string;
  grupo?: string;
  setores_cobertura?: string[];
}
```

### 9.2 `ScheduleEntry`

`ScheduleEntry` deve carregar metadados necessarios para validacao:

```ts
rodizioId?: string;
grupoDomingo?: string;
grupoFeriado?: string;
cargo?: string;
setoresCobertura?: string[];
```

### 9.3 Catalogo de regras

Criar catalogo centralizado de hard constraints:

- `MAX_MONTHLY_RESTS`.
- `MIN_MONTHLY_RESTS`.
- `MAX_CONSECUTIVE_WORK_DAYS`.
- `REST_SPACING`.
- `SUNDAY_ROTATION_BY_GROUP`.
- `HOLIDAY_GROUP_ROTATION`.
- `CLOSED_HOLIDAY`.
- `SECTOR_COVERAGE`.
- `BAKERY_SINGLE_REST_PER_WEEKDAY`.
- `BUTCHER_SUNDAY_EXCEPTION`.
- `FISCAL_OPEN_CLOSE_PAIR`.

## 10. Comportamento do gerador

Pipeline esperado:

1. Normalizar funcionarios e grupos.
2. Carregar regras de rodizio e minimos do setor.
3. Rodar health check de cadastro.
4. Rodar fase de viabilidade estrutural.
5. Aplicar ancoras inviolaveis: `FE`, afastamentos e ferias.
6. Aplicar domingos por `grupo_domingo` e estado de carry-over.
7. Aplicar feriados abertos por `grupo_feriado`.
8. Alocar folgas comuns respeitando maximo 6 dias consecutivos, teto 5 e espacamento.
9. Reparar cobertura sem violar hard constraints.
10. Validar tudo novamente.
11. Se sobrar erro hard, retornar `NO_SOLUTION` ou bloquear salvamento.

Regra de ouro:

- Repair pass nunca pode resolver uma regra quebrando outra hard constraint.

## 11. UX esperada

### Cadastro de funcionario

Campos visiveis:

- Rodizio de domingo.
- Grupo domingo.
- Grupo feriado.
- Setores de cobertura.

Comportamento:

- Ao escolher setor, sugerir rodizio padrao.
- Ao escolher rodizio, atualizar grupos disponiveis.
- Mostrar alerta quando o grupo ficar desbalanceado no setor.
- Impedir salvar funcionario ativo se dados obrigatorios de regra estiverem faltando.

### Tela de geracao

Antes de gerar:

- Mostrar checklist de cadastro.
- Mostrar funcionarios sem grupo.
- Botao de auto corrigir grupos faltantes, quando seguro.

Depois de gerar:

- Mostrar erros hard antes de permitir salvar.
- Mostrar folgas programaveis e `FE/AF/FR` separadamente.
- Mostrar motivo de cada `FD`, `F`, `TF` e `FE` quando possivel.

## 12. Criterios de aceite

1. Nenhuma escala salva pode ter erro hard.
2. Todo funcionario ativo usado no gerador deve carregar `rodizio_id`, `grupo_domingo` e `grupo_feriado` quando aplicavel.
3. `Employee` e `Funcionario` devem ficar alinhados nos campos de regra.
4. Supabase deve aceitar insert/update de `rodizio_id`, `grupo_domingo` e `grupo_feriado`.
5. Domingo padrao deve seguir A/B/C por cadastro, nao por indice.
6. Feriado aberto deve seguir A/B por cadastro, nao por aleatoriedade.
7. Feriado fechado deve ser `FE` para todos.
8. Nenhum funcionario pode ter mais de 5 folgas programaveis.
9. Nenhum funcionario pode trabalhar mais de 6 dias consecutivos, incluindo virada de mes.
10. Padaria deve respeitar maximo de 1 folga programavel por dia util, exceto descanso inviolavel.
11. Acougue deve respeitar excecao setorial sem quebrar regra de mulheres.
12. Fiscal de Caixa deve validar cobertura por dupla quando regra configurada.
13. Testes de regressao devem cobrir os casos `BUG-001` a `BUG-006`.
14. Testes negativos devem provar que violacoes sao detectadas e bloqueadas.

## 13. Plano de implementacao sugerido

### Fase 1: Dados e tipos

- Atualizar `Employee` e `ScheduleEntry`.
- Corrigir `supabase_schema.sql` para campos de funcionario.
- Criar `rodizios` e `rodizio_grupos`.
- Alinhar `funcionario_estados_regra` no service.
- Criar backfill seguro para funcionarios sem grupos.

### Fase 2: Validadores inviolaveis

- Criar validadores independentes do gerador.
- Validar teto de 5 folgas programaveis.
- Validar espacamento.
- Validar domingo 1x2 por grupo.
- Validar feriado A/B por grupo.
- Validar excecoes Padaria, Acougue e Fiscal.

### Fase 3: Gerador orientado por grupo

- Substituir domingo por posicao/seed por `grupo_domingo`.
- Substituir feriado 50% heuristico por `grupo_feriado`.
- Respeitar carry-over de domingo e feriado.
- Garantir que repairs nao violem hard constraints.

### Fase 4: UI e bloqueio de salvamento

- Atualizar formulario de funcionario.
- Adicionar auditoria pre-geracao.
- Bloquear salvar escala com erro hard.
- Exibir diagnosticos claros para `NO_SOLUTION`.

### Fase 5: Testes e regressao

- Rodar todos os setores em todos os meses.
- Adicionar testes negativos.
- Adicionar fixtures com funcionarios sem grupo para validar backfill.
- Adicionar teste de Supabase/schema para colunas obrigatorias.

## 14. Riscos e decisoes pendentes

### Decisao 1: `FE` conta no teto de 5?

Recomendacao: nao contar `FE` no teto de 5 folgas programaveis. `FE` e fechamento obrigatorio e pode tornar a regra impossivel se for contado como folga comum.

### Decisao 2: Padaria e Acougue usam A/B/C ou rodizio especial?

Recomendacao: manter o cadastro flexivel. Domingo deve suportar A/B/C como padrao, mas cada setor pode apontar para um rodizio especial com quantidade de grupos propria.

### Decisao 3: Regra de espacamento e hard ou soft?

Recomendacao: folga adjacente deve ser hard. Distancia menor que 4 dias deve ser hard para escala normal, mas pode virar alerta apenas quando houver justificativa inviolavel por CLT, `FE`, `AF` ou `FR`.

### Decisao 4: `grupo` legado

Recomendacao: manter `grupo` apenas para compatibilidade, preenchido com `grupo_feriado`, e migrar o codigo novo para `grupo_feriado`.

## 15. Definicao de pronto

Esta demanda so deve ser considerada pronta quando:

- PRD aceito.
- Schema Supabase alinhado.
- Types alinhados.
- Cadastro salva e edita grupos.
- Gerador usa grupos persistidos.
- Validadores bloqueiam todas as regras hard.
- Regression cases passam.
- Build passa.
- Usuario consegue identificar e corrigir funcionario sem grupo antes de gerar escala.
