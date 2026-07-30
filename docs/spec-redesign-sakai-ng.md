# Spec de Redesign Total - Sakai NG Design System (EscalaJHA)

> **Branch Target:** `design-new`  
> **Status:** Aprovado / Em Execução  
> **Referência:** Sakai PrimeNG (https://sakai.primeng.org/) & `docs/` Design Authority  

---

## 1. Objetivos do Redesign

Eliminar todo o CSS monolítico customizado, classes legadas, seletores inline e componentes customizados em favor de uma **aplicação 100% alinhada com o Design Authority Sakai NG**:

1. **Adocão Integral de Design Tokens (`--p-*`)**: Substituir todas as cores hardcoded, sombras e bordas por tokens nativos do PrimeNG.
2. **Componentes Nativos PrimeNG**: Substituir elementos nativos (`<select>`, `<button>`, `<table>`, `.modal-backdrop`) por `p-dropdown` / `p-select`, `p-button`, `p-table`, `p-dialog`, `p-confirmDialog`, `p-tag` e `p-inputGroup`.
3. **Tipografia Inter & Pesos Leves**: Garantir `font-family: 'Inter'` em 100% das telas com `font-weight: 400` para corpo e `500` para títulos curtos/labels.
4. **Layout Dinâmico via `LayoutService`**: Zerar larguras e alturas em pixels fixos na Sidebar e Topbar.
5. **Zero `::ng-deep` e Zero `!important`**: Limpar completamente overrides frágeis.
6. **Acessibilidade WCAG 2.1 AA & Performance**: Adicionar `aria-label`, navegação por teclado, anel de foco visível e renders otimizados.

---

## 2. Escopo Detalhado por Fase

```
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Limpeza Global de Estilos & Tokens                             │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 2: Layout Sakai NG (Topbar, Sidebar, Menu, Footer)                │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 3: Dashboard Principal & Widgets KPI                              │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 4: Tabela & Matriz de Escalas (Matriz Mensal / Diária)            │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 5: Abas de Gestão (Funcionários, Setores, Feriados, Regras CLT)   │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 6: Modais, Diálogos, Toasts & Acessibilidade                      │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 7: Validação de Build, Lint & Inspeção Visual Comparativa          │
└────────────────────────────────────────────────────────────────────────┘
```

### Fase 1: Limpeza Global de Estilos & Tokens (`styles.scss`)
- Refatorar `styles.scss` e `src/design-system/base.css` removendo declarações CSS monolíticas.
- Assegurar import correto de `Inter` e utilitários `PrimeFlex`.

### Fase 2: Layout Sakai NG
- Refatorar `app.topbar.component.ts`, `app.sidebar.component.ts`, `app.menu.component.ts`, `app.layout.component.ts`.
- Garantir consumo de `LayoutService` para colapso da sidebar, controle de tema e topbar responsiva (64px).

### Fase 3: Dashboard & KPI Widgets
- Substituir `.sakai-stat-card`, `.sakai-stat-title`, `.sakai-stat-value` pelos componentes/cards padrão do Sakai (consultando `src/app/shared/examples/kpi-card-example`).
- Substituir a barra de pesquisa e filtros em pílula por `p-inputGroup` + `pInputText` e `p-selectButton` ou `p-tag` clicáveis.
- Atualizar a grid de status da equipe por setor.

### Fase 4: Matriz & Tabela de Escalas
- Refatorar a visualização da tabela de escalas para usar `p-table` nativa.
- Utilizar `p-tag` para badges de status (Trabalho = verde, Folga = azul, Domingo = roxo, Feriado = vermelho).
- Adicionar toolbar com botões nativos `p-button` para Gerar Escala, Validar, Exportar PDF/A4 e Imprimir.

### Fase 5: Abas de Gestão
- **Funcionários:** Tabela `p-table` com filtro global, status ativo/inativo e diálogo modal `p-dialog` para cadastro/edição.
- **Setores:** Cards/tabelas com cores de setor e formulário inline/dialog.
- **Feriados:** Lista tabular com `p-table`, datepicker e badge de tipo de feriado.
- **Regras CLT:** Tabela de regras de conformidade (11x36, folga dominical, descanso semanal 24h) com toggle de status.

### Fase 6: Modais, Diálogos & Toasts
- Converter modais customizados (`openPrintOptionsModal`, `setorDetalhamentoModal`, confirmação de exclusão) para `p-dialog` e `p-confirmDialog` com `pRipple` e acessibilidade ARIA.

### Fase 7: Build & Inspeção Comparativa
- Executar `ng build --configuration=development` para validar compilação limpa.
- Comparar visualmente lado a lado com a demo do Sakai PrimeNG.

---

## 3. Matriz de Componentes & Substituições

| Elemento Atual | Novo Componente Sakai / PrimeNG | Arquivo Exemplo |
|---|---|---|
| `<button class="btn-primary">` | `<button pButton class="p-button-primary">` | `form-example.component.ts` |
| `<select>` nativo | `<p-dropdown>` ou `<p-select>` | `form-example.component.ts` |
| `<input class="form-control">` | `<input pInputText>` em `<p-inputGroup>` | `form-example.component.ts` |
| `<div class="sakai-stat-card">` | `<div class="card mb-0">` + Flex | `kpi-card-example.component.ts` |
| `<table class="escala-table">` | `<p-table styleClass="p-datatable-sm">` | `table-example.component.ts` |
| `<div class="modal-backdrop">` | `<p-dialog [modal]="true">` | `dialog-example.component.ts` |
| `<span class="badge">` | `<p-tag [severity]="...">` | `table-example.component.ts` |
