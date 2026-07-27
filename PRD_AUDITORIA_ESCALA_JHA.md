# PRD + Auditoria Tecnica - Escala de Folgas JH

Data: 2026-07-27
Repositorio: `C:\Users\thygo\escalajha`
Stack: Angular 19, Supabase, TypeScript strict

## 1. Resumo executivo

O sistema ja tem um MVP funcional para gerar escala mensal de folgas por setor, com cadastro de colaboradores, setores, cargos, feriados, regras e persistencia em Supabase com fallback local.

O gerador principal (`src/app/services/escala-generator.service.ts`) passou em uma bateria ampla de testes com dados mockados: 132 escalas geradas e 47.450 dias/colaborador validados para 2026. O build Angular tambem passou.

Mesmo assim, a resposta tecnica e: as regras principais estao parcialmente corretas, mas ainda nao estao totalmente blindadas para producao. O motivo e que ha diferenca entre o que a UI/schema prometem e o que o algoritmo realmente usa. Tambem ha lacunas de banco, persistencia e testes que podem deixar o RH acreditar que uma regra esta travada quando ela ainda nao esta.

## 2. Objetivo do produto

Construir um sistema confiavel para RH/gestao montar, validar, salvar e imprimir escalas de folgas mensais por loja e setor, respeitando regras CLT/CCT, feriados, cobertura minima operacional e politicas internas.

O produto deve reduzir risco trabalhista, evitar falta de cobertura por setor e dar rastreabilidade para toda escala gerada ou editada.

## 3. Usuarios e necessidades

Gestor de RH:
- Gerar escala mensal com pouco retrabalho.
- Ver erros de regra antes de salvar.
- Cadastrar colaboradores, feriados e regras.
- Imprimir escala em formato A4.

Gestor de loja:
- Saber quem esta trabalhando ou de folga hoje.
- Conferir cobertura por setor.
- Ajustar a operacao sem quebrar regra legal.

Administrador:
- Controlar lojas, usuarios autorizados e regras.
- Garantir que dados de funcionarios nao sejam expostos entre lojas.
- Auditar geracoes, edicoes e overrides.

## 4. Estrutura avaliada

Arquivos principais:
- `package.json`: scripts de build/test e dependencias Angular/Supabase.
- `angular.json`: build, assets, styles e file replacements de ambiente.
- `supabase_schema.sql`: schema, RLS, seeds de funcionarios, feriados e regras.
- `src/app/models/types.ts`: contratos de dados do dominio.
- `src/app/models/mock-data.ts`: base local de funcionarios, feriados e regras.
- `src/app/services/escala-generator.service.ts`: motor de geracao e validacao.
- `src/app/services/supabase.service.ts`: auth, CRUD, persistencia e fallback local.
- `src/app/components/dashboard/*`: interface principal, geracao, validacao, salvamento e impressao.
- `src/app/components/login/login.component.ts`: login.
- `src/app/guards/auth.guard.ts`: protecao de rotas.

## 5. Requisitos funcionais atuais

RF-01: Login e acesso restrito
- O usuario deve autenticar via Supabase ou usar fallback demo quando configurado.
- Rotas de dashboard devem exigir usuario autenticado.

RF-02: Multi-loja
- O usuario deve ver somente lojas autorizadas pela RLS.
- A loja ativa deve filtrar funcionarios e escalas.

RF-03: Cadastro operacional
- CRUD de funcionarios, setores, cargos, feriados e regras.
- Funcionarios devem usar exclusao logica (`ativo = false`).

RF-04: Geracao de escala
- Gerar escala mensal por setor.
- Respeitar feriados abertos/fechados.
- Respeitar minimo de colaboradores por dia.
- Permitir geracao guiada.

RF-05: Validacao antes de salvar
- Bloquear salvamento quando houver erro de cobertura, CLT, excesso/falta de folgas ou regra setorial.

RF-06: Persistencia
- Salvar escala em Supabase.
- Manter fallback em `localStorage` para nao perder trabalho local.

RF-07: Impressao e acompanhamento
- Exibir dashboard de folgas por setor.
- Exibir metricas da escala.
- Imprimir escala A4.

## 6. Regras de negocio auditadas

Regra: maximo de 6 dias consecutivos
- Status: forte no motor e nos testes.
- Evidencia: sanitizacao em `escala-generator.service.ts:718` e validacao em `escala-generator.service.ts:1059`.
- Teste: suite passou para 12 meses e 11 setores.

Regra: cobertura minima por setor
- Status: parcialmente correta.
- Evidencia: ajuste em `escala-generator.service.ts:772` e validacao em `escala-generator.service.ts:971`.
- Problema: cobertura por hora depende de `turnosConfigs`, mas os testes anuais de cobertura horaria passam `[]`, entao nao exercitam a checagem real de faixa horaria.

Regra: frente de caixa minimo 6
- Status: implementada no gerador e validador.
- Evidencia: minimo automatico em `escala-generator.service.ts:143` e erro especifico em `escala-generator.service.ts:978`.

Regra: fiscais em dupla nos domingos
- Status: implementada no gerador/validador para grupo fiscal.
- Evidencia: regra de domingo fiscal em `escala-generator.service.ts:261` e validacao de exatamente 2 em `escala-generator.service.ts:985`.

Regra: padaria com limite de folgas em dias uteis
- Status: implementada.
- Evidencia: ajuste setorial em `escala-generator.service.ts:521` e validacao em `escala-generator.service.ts:1001`.

Regra: feriados fechados e abertos
- Status: implementada no motor, mas nao esta totalmente travada na UI.
- Evidencia do motor: `escala-generator.service.ts:332` e `escala-generator.service.ts:340`.
- Problema: a validacao computada do dashboard chama `validarEscala` sem passar `this.feriados()` em `dashboard.component.ts:218`. Assim, o bloqueio de salvar pode ignorar feriado fechado/aberto.

Regra: revezamento dominical
- Status: parcialmente correto.
- Evidencia: regra geral e excecoes em `escala-generator.service.ts:255`.
- Problema: a validacao de setores gerais so bloqueia domingos consecutivos, mas nao prova uma regra estrita 1T:2F para todos os perfis. Se a regra oficial exige exatamente 1 domingo trabalhado e 2 folgados, falta validacao explicita.

Regra: intervalo interjornada de 11 horas
- Status: declarado como implementado, mas nao esta implementado de forma verificavel.
- Evidencia: o tipo `ERRO_CLT_INTERJORNADA_11H` aparece no total de erros em `escala-generator.service.ts:1191`, mas nao ha logica que compare saida de um dia com entrada do proximo.

Regra: escala 5x1
- Status: exposta na UI, mas nao implementada no motor.
- Evidencia: a UI define `modeloEscalaAtivo` e envia `modeloEscala` em `dashboard.component.ts:1245`; o motor aceita `modeloEscala` em `escala-generator.service.ts:11`, mas nao usa essa opcao na geracao.

Regra: permitir 2 folgas consecutivas
- Status: exposta na UI, mas nao aplicada.
- Evidencia: a opcao aparece no cache/config em `escala-generator.service.ts:47` e `escala-generator.service.ts:95`, mas nao e usada nas decisoes de folga.

Regra: afastamentos, ferias e estado de transicao entre meses
- Status: modelado, mas nao implementado.
- Evidencia: `estadosTransicao` e `afastamentos` existem em `escala-generator.service.ts:12` e `escala-generator.service.ts:13`, mas o algoritmo inicia `diasTrabalhadosSeguidos = 0` para cada mes em `escala-generator.service.ts:247`.
- Risco: alguem que trabalhou os ultimos 6 dias do mes anterior pode iniciar o mes atual trabalhando de novo, violando a regra de 6 dias quando se olha a continuidade real.

## 7. Travas e seguranca

O que esta bom:
- RLS esta habilitado nas tabelas principais.
- `user_has_loja_access` centraliza acesso por loja.
- Funcionarios sao filtrados por loja no fetch.
- O app usa soft-delete em `SupabaseService.softDeleteFuncionario`.

Lacunas:
- `loadUserLojas` faz `.from('lojas').select('*')` e depende 100% da RLS para filtrar (`supabase.service.ts:149`). Isso e aceitavel se a RLS estiver perfeita, mas deve ter teste de RLS.
- O schema permite hard delete de funcionarios para quem tem acesso a loja (`supabase_schema.sql:231`). Isso contradiz a promessa de exclusao logica/retencao CLT.
- O schema `funcionarios` nao tem `setores_cobertura`, mas o app envia esse campo em insert/update (`supabase.service.ts:218` e `supabase.service.ts:269`). Em banco real, isso pode falhar e cair silenciosamente para o estado local.
- `saveEscala` salva primeiro em `localStorage` e engole erro do Supabase (`supabase.service.ts:422` e `supabase.service.ts:443`). O dashboard depois mostra "Salvo no Supabase!" mesmo se salvou apenas localmente (`dashboard.component.ts:1312`).
- Existem arquivos de ambiente duplicados em `src/environments` e `src/app/environments`; o Angular usa `src/environments` conforme `angular.json:41`. Isso aumenta risco de editar o ambiente errado.

## 8. Testes e verificacoes executadas

Comando: `npm.cmd test`
- Resultado: passou.
- Cobertura real observada: 132 escalas geradas e 47.450 dias/colaborador validados para 2026.
- Observacao: a primeira tentativa falhou dentro do sandbox porque `npx tsx` tentou acessar registry/cache. Como `tsx` nao esta em `package.json`, a suite pode ser fragil em CI/offline.

Comando: `npm.cmd run build`
- Resultado: passou.
- Warning: bundle inicial `560.73 kB`, acima do budget de aviso `500 kB` por `60.73 kB`.

Lacunas de teste:
- Nao ha teste de componente garantindo que `validacaoResultado` passa feriados para o validador.
- Nao ha teste de 5x1.
- Nao ha teste provando que `permitirDoisDiasConsecutivos` muda a geracao.
- Nao ha teste de transicao entre meses com estado anterior.
- Nao ha teste de afastamentos/ferias.
- Nao ha teste de RLS real no Supabase.
- Nao ha teste de falha de persistencia Supabase vs mensagem de sucesso.
- Nao ha teste de schema para `setores_cobertura`.

## 9. Diagnostico final

As regras centrais do gerador 6x1 estao boas nos cenarios mockados:
- maximo 6 dias consecutivos;
- feriado fechado como FE no motor;
- feriado aberto com TF/equipe reduzida;
- cobertura minima por dia;
- frente de caixa minimo 6;
- fiscal de caixa em dupla;
- regra operacional da padaria.

Mas o produto ainda nao esta 100% correto porque:
- algumas regras aparecem como "implementadas" mas nao sao executadas;
- algumas opcoes da UI nao alteram o algoritmo;
- o validador usado antes de salvar nao recebe feriados;
- o banco nao esta alinhado com os campos usados pelo app;
- falhas de Supabase podem ser mascaradas como sucesso local;
- os testes passam, mas nao cobrem os principais riscos de integracao/producao.

## 10. Prioridades de correcao

P0 - antes de confiar em producao:
1. Passar `this.feriados()` para `validarEscala` no dashboard.
2. Corrigir `saveEscala` para retornar status `remote` ou `localFallback` e ajustar o toast.
3. Adicionar `setores_cobertura text[] default '{}'` ao schema ou remover o envio desse campo.
4. Implementar ou remover da UI as opcoes `5x1`, `permitirDoisDiasConsecutivos`, `estadosTransicao`, `afastamentos` e `regrasConformidade`.
5. Remover policy de hard delete de funcionarios ou restringir a administradores/auditoria.

P1 - confiabilidade juridica/operacional:
1. Implementar validacao real de interjornada 11h.
2. Implementar transicao entre meses.
3. Definir regra oficial de domingo por setor e validar exatamente, nao apenas "nao consecutivo".
4. Criar tabela/log de auditoria para geracao, edicao manual, override e publicacao.
5. Criar testes de RLS e persistencia Supabase.

P2 - qualidade de entrega:
1. Adicionar `tsx` como devDependency direta ou trocar o script de teste.
2. Reduzir bundle inicial ou ajustar budget se o tamanho for aceito.
3. Consolidar ambientes em uma unica pasta.
4. Evitar depender de `localStorage` para dados de escala sem sinalizacao clara ao usuario.

## 11. Criterios de aceite para considerar "blindado"

Uma escala so pode ser salva se:
- todos os feriados do mes foram considerados pelo validador;
- nenhum funcionario passa de 6 dias consecutivos, inclusive na virada de mes;
- funcionarios afastados/ferias nao sao escalados;
- mulheres respeitam a regra dominical aplicavel;
- cada setor respeita cobertura minima diaria e por faixa horaria;
- frente de caixa nunca fica abaixo de 6 quando a loja esta aberta;
- fiscal de caixa tem a dupla exigida em domingos/dias criticos;
- feriado fechado gera FE para todos;
- feriado aberto gera TF apenas para a equipe reduzida configurada;
- a persistencia remota foi confirmada ou o usuario foi avisado claramente que ficou apenas local.

Um release so pode ser aprovado se:
- `npm.cmd test` passa sem baixar dependencia dinamica;
- `npm.cmd run build` passa sem warning critico ou com budget aprovado;
- existe teste cobrindo cada regra listada;
- existe teste de RLS por loja;
- existe teste de falha de rede/Supabase;
- schema e models TypeScript estao alinhados.

