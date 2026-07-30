# Master Design Authority & Frontend Architecture - Sakai NG

> **Documento Raiz de Entrada & Índice Supremo de Especificações**  
> **Repositório:** EscalaJHA  
> **Referência:** Template Oficial Sakai PrimeNG (https://sakai.primeng.org/)  
> **Status:** Ativo / Vinculante  

Toda a arquitetura visual, padrões de código e diretrizes de interface da aplicação **EscalaJHA** estão modularizados no diretório `docs/`. Os desenvolvedores e agentes de IA DEVEM seguir rigorosamente os documentos abaixo:

---

## Suite de Documentação de Frontend (`docs/`)

1. 📘 **[docs/design-system.md](file:///c:/Users/thygo/escalajha/docs/design-system.md)**  
   *Design Authority, Design Tokens (`--p-*`) como Fonte da Verdade, Tipografia Inter e Hierarquia de Estilização.*

2. 🏗️ **[docs/frontend-architecture.md](file:///c:/Users/thygo/escalajha/docs/frontend-architecture.md)**  
   *Arquitetura Angular, Layout Engine dinâmico (`LayoutService`), Signals e Estrutura de Módulos.*

3. 🛡️ **[docs/coding-standards.md](file:///c:/Users/thygo/escalajha/docs/coding-standards.md)**  
   *Proibições Estritas (Zero `::ng-deep`, zero `!important`, zero `ViewEncapsulation.None`), Performance e Acessibilidade WCAG 2.1 AA.*

4. 🧩 **[docs/component-guidelines.md](file:///c:/Users/thygo/escalajha/docs/component-guidelines.md)**  
   *Guia de uso de recursos nativos PrimeNG (`pFluid`, `PrimeFlex`, `p-inputGroup`, `pStyleClass`, `PassThrough`).*

5. 🎨 **[docs/ui-patterns.md](file:///c:/Users/thygo/escalajha/docs/ui-patterns.md)**  
   *Padrões de Interface (KPI Cards, Formulários, DataTables) e Processo de Revisão Comparativa Lado a Lado.*

---

## Catálogo de Exemplos Executáveis em Código

Para evitar que a IA ou desenvolvedores inventem marcação HTML/CSS, os exemplos práticos executáveis estão salvos em:
👉 **[src/app/shared/examples/](file:///c:/Users/thygo/escalajha/src/app/shared/examples/)**
