# Diretrizes Globais do Agente - EscalaJHA

## Regra de Ouro da Arquitetura & Design System Sakai NG

Qualquer alteração visual, desenvolvimento de telas, refatoração de CSS ou uso de componentes PrimeNG neste repositório DEVE respeitar integralmente a suite de documentação localizada em `docs/` e o documento mestre `design-system.md`.

### Princípios Gerais de Desenvolvimento:
- **Menos CSS** ➜ Mais Design Tokens (`--p-*`).
- **Menos Overrides** ➜ Mais Configuração do Theme.
- **Menos HTML** ➜ Mais Componentes PrimeNG.
- **Menos Código** ➜ Mais Reutilização.

### Documentos Vinculantes:
1. **[docs/design-system.md](file:///c:/Users/thygo/escalajha/docs/design-system.md)**: Tokens do tema como fonte da verdade, Tipografia Inter.
2. **[docs/frontend-architecture.md](file:///c:/Users/thygo/escalajha/docs/frontend-architecture.md)**: LayoutService, Signals, Arquitetura Angular.
3. **[docs/coding-standards.md](file:///c:/Users/thygo/escalajha/docs/coding-standards.md)**: Proibido `::ng-deep`, `!important`, `ViewEncapsulation.None`, WCAG AA.
4. **[docs/component-guidelines.md](file:///c:/Users/thygo/escalajha/docs/component-guidelines.md)**: Recursos nativos PrimeNG (`pFluid`, `p-inputGroup`, `pt`).
5. **[docs/ui-patterns.md](file:///c:/Users/thygo/escalajha/docs/ui-patterns.md)**: Padrões visuais e revisão comparativa.
6. **Catálogo de Exemplos**: Consultar `src/app/shared/examples/` antes de criar novo código.

### Diretrizes de Ação para o Agente:
- **Reutilização Prática**: Copie e adapte o código dos exemplos em `src/app/shared/examples/`.
- **Tratamento de Conflitos**: Notifique o usuário se uma solicitação violar as regras do `docs/`.
- **Equivalência Visual**: Mantenha as telas equivalentes ao template oficial Sakai.
