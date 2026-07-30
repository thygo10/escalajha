# PRD + Auditoria Design System - Upgrade para Sakai NG / PrimeNG Aura

**Data:** 2026-07-29  
**Repositório:** `C:\Users\thygo\escalajha`  
**Stack:** Angular 19, PrimeNG 19 (Aura Theme), PrimeFlex, PrimeIcons, Lucide Angular  
**Branch Target:** `design2`

---

## 1. Resumo Executivo

O sistema atual possui um **MVP funcional** mas com **design system inconsistente, amador e não reutilizável**:

- **CSS monolítico** em `styles.css` (2.300+ linhas) misturando: layout, componentes, utilitários, impressão, temas, overrides PrimeNG
- **Zero micro-componentes reutilizáveis** - tudo inline nos templates (botões, inputs, cards, badges, modais, tooltips, toasts)
- **Inconsistência visual severa**: tamanhos de fonte variam (0.68rem a 1.8rem), espaçamentos inconsistentes (4px a 24px), cores hardcoded, sombras aleatórias
- **Zero design tokens** - cores, espaçamentos, tipografia, bordas, sombras hardcoded em 50+ lugares
- **PrimeNG Aura theme instalado mas subutilizado** - usa-se CSS custom em vez de tokens/temas nativos
- **Layout custom (Sakai-like) mas sem padronização** - sidebar, topbar, menu, configurator replicam Sakai mas com CSS próprio inconsistente
- **Micro-componentes inexistentes**: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Toast`, `Tooltip`, `Table`, `Select`, `DatePicker`, `Icon` - todos inline

**Objetivo:** Implementar **Sakai NG Design System** completo com:
- **Design Tokens centralizados** (cores, espaçamento, tipografia, bordas, sombras, z-index, breakpoints)
- **Micro-componentes reutilizáveis** (15+ componentes atômicos)
- **PrimeNG Aura Theme nativo** como base (zero CSS custom para componentes PrimeNG)
- **Layout Sakai NG padronizado** (Topbar, Sidebar, Menu, Configurator, Footer)
- **Dark/Light mode nativo** via PrimeNG CSS variables
- **Acessibilidade WCAG 2.1 AA** nativa do PrimeNG
- **Responsividade mobile-first** via PrimeFlex
- **Zero trabalho dobrado** - cada componente usado em 100% dos locais

---

## 2. Auditoria do Estado Atual (AS-IS)

### 2.1 Estrutura de Arquivos Atual

```
src/
├── styles.css                    # 2.300+ linhas - MONOLÍTICO (layout + componentes + tokens + print + overrides)
├── app/
│   ├── layout/                   # Layout custom Sakai-like (7 componentes)
│   │   ├── app.layout.component.ts
│   │   ├── app.topbar.component.ts
│   │   ├── app.sidebar.component.ts
│   │   ├── app.menu.component.ts
│   │   ├── app.menuitem.component.ts
│   │   ├── app.configurator.component.ts
│   │   ├── app.footer.component.ts
│   │   └── service/layout.service.ts
│   ├── components/
│   │   ├── shared/icon.component.ts      # ÚNICO micro-componente (SVG inline)
│   │   ├── dashboard/                    # 1 componente gigante (dashboard.component.ts/html/css)
│   │   ├── login/login.component.ts
│   │   └── not-found/not-found.component.ts
│   ├── services/               # Serviços de negócio
│   └── ...
```

### 2.2 Problemas Críticos Identificados

| Categoria | Problema | Impacto |
|-----------|----------|---------|
| **Tokens** | 50+ cores hardcoded (#0b2a52, #f7c600, #e2e8f0, etc.) | Impossível tema dark consistente, manutenção impossível |
| **Espaçamento** | 15+ valores diferentes (4px, 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 22px, 24px) | Inconsistência visual, não escala |
| **Tipografia** | 12+ tamanhos (0.68rem a 1.8rem), 6+ pesos, line-heights aleatórios | Hierarquia visual quebrada |
| **Bordas** | 4+ radius (4px, 8px, 10px, 12px, 14px, 16px) | Cards/botões/inputs inconsistentes |
| **Sombras** | 8+ valores diferentes | Profundidade visual quebrada |
| **Componentes** | 0 micro-componentes reutilizáveis | Código duplicado em 20+ lugares |
| **PrimeNG** | Tema Aura instalado mas CSS custom sobrescreve tudo | Bundle grande, manutenção difícil, tema dark quebrado |
| **Acessibilidade** | ARIA ausente, focus visible custom, contrastes falhos | Não conformidade WCAG |
| **Responsividade** | Media queries custom em 15+ lugares | Breakpoints inconsistentes |
| **Impressão** | CSS print misturado no styles.css | Manutenção difícil |

### 2.3 Componentes Duplicados (Exemplos)

**Botões** - 8 variações inline:
- `.btn-premium`, `.btn-primary-solid`, `.btn-yellow-solid`, `.btn-danger-solid`, `.btn-ghost`
- `p-button` com `styleClass` custom em 15+ lugares
- Botões nativos `<button>` com classes custom em 10+ lugares

**Inputs** - 5 variações inline:
- `.form-control` com styles custom
- `p-inputtext` com styles custom
- `select` nativo com styles custom
- `p-datepicker` com styles custom
- `p-dropdown` com styles custom

**Cards** - 4 variações:
- `.clean-card`, `.card`, `.hero-banner`, `.filter-pill-bar`

**Badges/Status** - 12+ variações:
- `.badge-categoria-sm`, `.status-trabalho`, `.status-folga`, `.status-domingo`, `.status-feriado`
- `.badge-status-implementada`, `.badge-status-pendente`
- `p-tag` com `severity` custom

**Modais** - 3 implementações:
- `.modal-backdrop` + `.modal-card` (CSS custom)
- `.blur-backdrop` (glassmorphism)
- `p-dialog` com template custom

**Toasts** - 2 implementações:
- `.toast-container` + `.toast-item` (CSS custom)
- `p-toast` (PrimeNG) - subutilizado

**Tabelas** - 2 implementações:
- `.escala-table` (CSS custom complexo)
- `p-table` (PrimeNG) - subutilizado

---

## 3. Estado Desejado (TO-BE) - Sakai NG Design System

### 3.1 Arquitetura de Design Tokens (Single Source of Truth)

```
src/
├── design-system/
│   ├── tokens/
│   │   ├── colors.ts              # Paleta JH + PrimeNG semantic tokens
│   │   ├── spacing.ts             # Escala 4px base (0-24)
│   │   ├── typography.ts          # Escala tipográfica (xs-4xl)
│   │   ├── border-radius.ts       # Radius scale (none-full)
│   │   ├── shadows.ts             # Elevation scale (0-5)
│   │   ├── z-index.ts             # Camadas (dropdown, modal, toast, etc)
│   │   ├── breakpoints.ts         # PrimeFlex breakpoints
│   │   ├── transitions.ts         # Easing/duration standards
│   │   └── index.ts               # Barrel export
│   ├── components/                # 15+ Micro-componentes atômicos
│   │   ├── button/
│   │   ├── input/
│   │   ├── card/
│   │   ├── badge/
│   │   ├── modal/
│   │   ├── toast/
│   │   ├── tooltip/
│   │   ├── table/
│   │   ├── select/
│   │   ├── datepicker/
│   │   ├── icon/
│   │   ├── avatar/
│   │   ├── divider/
│   │   ├── spinner/
│   │   └── index.ts
│   ├── layout/                    # Layout components (Sakai NG)
│   │   ├── topbar/
│   │   ├── sidebar/
│   │   ├── menu/
│   │   ├── footer/
│   │   ├── configurator/
│   │   └── layout.component.ts
│   ├── directives/                # Diretivas utilitárias
│   │   ├── focus-trap.directive.ts
│   │   ├── click-outside.directive.ts
│   │   └── auto-focus.directive.ts
│   ├── pipes/                     # Pipes reutilizáveis
│   │   ├── format-date.pipe.ts
│   │   ├── format-currency.pipe.ts
│   │   └── truncate.pipe.ts
│   ├── utils/
│   │   ├── class-merge.util.ts    # clsx/twMerge equivalent
│   │   └── css-vars.util.ts       # CSS var helpers
│   └── index.ts                   # Public API
├── styles.scss                    # APENAS: @import design-system + tailwind-like utilities
└── app/                           # App components (consumem design-system)
```

### 3.2 Design Tokens - Especificação Completa

#### 3.2.1 Cores (Semantic Tokens - PrimeNG Aura Compatible)

```typescript
// Primitive Colors (JH Brand)
const jhBrand = {
  navy: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 
          800: '#1e40af', 900: '#1e3a8a', 950: '#0b2a52' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
            400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
            800: '#854d0e', 900: '#713f12', 950: '#422006' },
  // Setores
  sectors: {
    caixa: '#0b2a52', reposicao: '#16a34a', lanchonete: '#d97706',
    acougue: '#dc2626', padaria: '#ea580c', fiscal: '#7c3aed',
    empilhadeira: '#0d9488', higienizacao: '#475569', manutencao: '#0284c7'
  }
};

// Semantic Tokens (PrimeNG Aura compatible)
const semantic = {
  // Primary
  primary: { 50: '#eff6ff', ..., 950: '#0b2a52' }, // JH Navy
  primaryContrast: '#ffffff',
  
  // Surface
  surface: { 0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
             300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569',
             700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  
  // State colors
  success: { 50: '#f0fdf4', ..., 950: '#052e16' },    // Green
  warning: { 50: '#fffbeb', ..., 950: '#422006' },    // Amber
  danger: { 50: '#fef2f2', ..., 950: '#450a0a' },     // Red
  info: { 50: '#eff6ff', ..., 950: '#0b2a52' },       // Blue
  
  // Text
  text: { primary: '#0f172a', secondary: '#475569', muted: '#94a3b8', inverse: '#ffffff' },
  
  // Border
  border: { light: '#e2e8f0', DEFAULT: '#cbd5e1', dark: '#94a3b8', focus: '#2563eb' },
  
  // Focus ring
  focusRing: { width: '2px', style: 'solid', color: '{primary.500}', offset: '2px', shadow: '0 0 0 2px {primary.100}' }
};

// Dark mode overrides (automatic via .p-dark)
const darkSemantic = {
  surface: { 0: '#0f172a', 50: '#1e293b', ... },
  text: { primary: '#f8fafc', secondary: '#cbd5e1', muted: '#64748b', inverse: '#0f172a' },
  border: { light: '#334155', DEFAULT: '#475569', dark: '#64748b', focus: '#3b82f6' }
};
```

#### 3.2.2 Espaçamento (4px base scale)

```typescript
const spacing = {
  0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem',
  6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem', 10: '2.5rem',
  11: '2.75rem', 12: '3rem', 14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem'
};
// Component-specific: padding-sm=2, padding-md=4, padding-lg=6, gap-sm=2, gap-md=3, gap-lg=4
```

#### 3.2.3 Tipografia (Plus Jakarta Sans - já no projeto)

```typescript
const typography = {
  fontFamily: { 
    primary: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', monospace"
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem'  // 36px
  },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  letterSpacing: { tight: '-0.02em', normal: '0', wide: '0.02em' }
};
```

#### 3.2.4 Border Radius

```typescript
const borderRadius = {
  none: '0', sm: '4px', DEFAULT: '8px', md: '10px', lg: '12px', xl: '16px', 
  '2xl': '20px', full: '9999px'
};
```

#### 3.2.5 Sombras (Elevation)

```typescript
const shadows = {
  0: 'none',
  1: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  2: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  3: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  4: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  5: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
};
```

### 3.3 Micro-Componentes (15 Componentes Atômicos)

| Componente | Seletor | Props/Inputs | Uso Atual Substituído |
|------------|---------|--------------|----------------------|
| **Button** | `ds-button` | variant, size, loading, disabled, icon, fullWidth | 8 variações inline + p-button custom |
| **Input** | `ds-input` | type, label, error, hint, prefix, suffix, mask | 5 variações inline + p-inputtext |
| **Select** | `ds-select` | options, placeholder, filter, grouped | select nativo + p-dropdown custom |
| **DatePicker** | `ds-datepicker` | range, inline, min/max, format | p-datepicker custom |
| **Card** | `ds-card` | variant, padding, hoverable, header, footer | .clean-card, .card, hero-banner |
| **Badge** | `ds-badge` | variant, size, dot, removable | 12+ badge variations inline |
| **Avatar** | `ds-avatar` | src, label, size, shape, badge | user-avatar, brand-badge |
| **Modal** | `ds-modal` | size, closable, header, footer, centered | 3 modal implementations |
| **Toast** | `ds-toast` + `DsToastService` | type, duration, position, action | 2 toast implementations |
| **Tooltip** | `dsTooltip` (directive) | position, delay, content | .custom-tooltip CSS |
| **Table** | `ds-table` | columns, data, selection, sorting, pagination, sticky | .escala-table + p-table |
| **Icon** | `ds-icon` | name (lucide), size, color | app-icon (SVG inline) |
| **Divider** | `ds-divider` | orientation, label, dashed | `<hr>` custom styles |
| **Spinner** | `ds-spinner` | size, variant, overlay | p-progressSpinner inline |
| **Tabs** | `ds-tabs` + `ds-tab` | variant, animated, lazy | p-tabs custom |

### 3.4 Layout Components (Sakai NG Pattern)

```
layout/
├── layout.component.ts          # Root wrapper (layout-wrapper)
├── topbar/
│   ├── topbar.component.ts      # Logo, search, user menu, theme toggle
│   ├── topbar-logo.component.ts # Brand badge + title
│   ├── topbar-actions.component.ts # Theme toggle, configurator, notifications
│   └── topbar-user-menu.component.ts # User profile, logout
├── sidebar/
│   ├── sidebar.component.ts     # Wrapper
│   ├── sidebar-brand.component.ts # Logo compact
│   ├── sidebar-menu.component.ts  # Menu wrapper
│   └── sidebar-user.component.ts  # User card at bottom
├── menu/
│   ├── menu.component.ts        # Root menu
│   ├── menuitem.component.ts    # Recursive item (submenu support)
│   └── menu-separator.component.ts
├── footer/
│   └── footer.component.ts
├── configurator/
│   ├── configurator.component.ts    # Theme customizer drawer
│   ├── color-picker.component.ts
│   ├── preset-selector.component.ts
│   └── mode-toggle.component.ts
└── service/
    └── layout.service.ts        # Signals: config, state, menu events
```

---

## 4. Plano de Implementação (Fases)

### Fase 1: Foundation (Tokens + Utils) - **Dia 1-2**
- [ ] Criar pasta `src/design-system/tokens/` com todos os tokens TypeScript
- [ ] Gerar CSS Custom Properties automaticamente dos tokens
- [ ] Criar `styles.scss` importando apenas design-system + PrimeNG
- [ ] Configurar PrimeNG Aura theme com CSS variables override
- [ ] Remover 90% do `styles.css` atual

### Fase 2: Micro-Componentes Atômicos - **Dia 2-5**
- [ ] `DsButtonComponent` - 5 variants, 3 sizes, loading, icons
- [ ] `DsInputComponent` - label, error, hint, prefix/suffix, mask
- [ ] `DsSelectComponent` - filter, grouped, virtual scroll
- [ ] `DsDatePickerComponent` - range, inline, Portuguese locale
- [ ] `DsCardComponent` - 3 variants, header/footer slots
- [ ] `DsBadgeComponent` - 6 variants, 3 sizes, dot, removable
- [ ] `DsAvatarComponent` - image, initials, sizes, status badge
- [ ] `DsModalComponent` - portal, focus trap, animations, sizes
- [ ] `DsToastService` + `DsToastComponent` - singleton, queue, types
- [ ] `DsTooltipDirective` - portal, positions, delay
- [ ] `DsTableComponent` - columns, sorting, pagination, selection, sticky
- [ ] `DsIconComponent` - Lucide icons, size, color
- [ ] `DsDividerComponent` - horizontal/vertical, label, dashed
- [ ] `DsSpinnerComponent` - sizes, overlay variant
- [ ] `DsTabsComponent` + `DsTabComponent` - animated, lazy

### Fase 3: Layout Sakai NG - **Dia 5-7**
- [ ] `LayoutComponent` - root wrapper com signals
- [ ] `TopbarComponent` + sub-componentes (logo, actions, user-menu)
- [ ] `SidebarComponent` + sub-componentes (brand, menu, user)
- [ ] `MenuComponent` + `MenuItemComponent` (recursive, keyboard nav)
- [ ] `FooterComponent`
- [ ] `ConfiguratorComponent` - theme, colors, menu mode, presets
- [ ] `LayoutService` - signals para config, state, menu events
- [ ] Dark/Light mode nativo via `.p-dark` class

### Fase 4: Migração Dashboard - **Dia 7-10**
- [ ] Refatorar `DashboardComponent` usando apenas micro-componentes
- [ ] Substituir tabela custom por `DsTableComponent`
- [ ] Substituir modais por `DsModalComponent`
- [ ] Substituir toasts por `DsToastService`
- [ ] Substituir formulários por `DsInput`, `DsSelect`, `DsDatePicker`
- [ ] Substituir badges/status por `DsBadgeComponent`
- [ ] Substituir cards por `DsCardComponent`
- [ ] Remover `dashboard.component.css` (90%+ redução)

### Fase 5: Migração Login/Outras - **Dia 10-11**
- [ ] `LoginComponent` com design-system
- [ ] `NotFoundComponent` com design-system
- [ ] Limpeza final de `styles.css` → `styles.scss`

### Fase 6: Validação & Documentação - **Dia 11-12**
- [ ] Build production成功
- [ ] Testes unitários micro-componentes
- [ ] Storybook/Documentação visual (opcional)
- [ ] Checklist acessibilidade WCAG 2.1 AA
- [ ] Checklist dark mode completo
- [ ] Checklist responsividade (320px - 4K)

---

## 5. Por Que Esta Abordagem (Rationale)

### 5.1 PrimeNG Aura + Sakai NG vs Custom CSS

| Critério | Custom CSS (Atual) | PrimeNG Aura + Sakai NG |
|----------|-------------------|------------------------|
| **Bundle Size** | 2300+ linhas CSS + PrimeNG não usado | ~500 linhas tokens + PrimeNG tree-shaken |
| **Manutenção** | Impossível (50+ hardcoded values) | Single source of truth (tokens) |
| **Dark Mode** | Quebrado, overrides manuais | Nativo via CSS variables |
| **Acessibilidade** | Manual, incompleta | WCAG 2.1 AA nativo PrimeNG |
| **Componentes** | 0 reutilizáveis, duplicados | 15+ atômicos + 80+ PrimeNG |
| **Tema** | Hardcoded JH colors | Design tokens + preset system |
| **Responsividade** | Media queries custom 15+ lugares | PrimeFlex utility-first |
| **Time-to-market** | Lento (CSS custom para tudo) | Rápido (componentes prontos) |
| **Consistência** | Quebrada | Garantida por design system |

### 5.2 Por Que Micro-Componentes (Não Apenas PrimeNG Direto)

1. **Abstração de API PrimeNG** - PrimeNG muda entre versões; nosso wrapper isola breaking changes
2. **Design Tokens Enforcement** - Garante que só tokens aprovados sejam usados
3. **DX Consistente** - API padronizada (`variant`, `size`, `loading` em todos)
4. **Composição** - Slots/projection para flexibilidade sem quebrar design
5. **Type Safety** - Inputs tipados, autocompletar IDE
6. **Testabilidade** - Testes unitários isolados por componente
7. **Tree-shaking** - Importa só o que usa

### 5.3 Por Que Sakai NG Layout Pattern

- **Comprovado em produção** - Usado por milhares de apps enterprise PrimeNG
- **Keyboard navigation nativo** - Menu, tabs, modais acessíveis
- **State management via Signals** - Reactive, performático, Angular 19 native
- **Configurator integrado** - Theme switching runtime para stakeholders
- **Mobile-first** - Overlay menu, responsive breakpoints
- **Extensível** - Slots para logo, user menu, notificações, breadcrumbs

---

## 6. Critérios de Aceite (Definition of Done)

### 6.1 Técnicos
- [ ] `npm run build` passa sem warnings de budget
- [ ] `npm run test` passa (cobertura >80% micro-componentes)
- [ ] Bundle size inicial < 500kb (gzipped)
- [ ] Zero `styles.css` custom para componentes (apenas utilities)
- [ ] Zero hardcoded colors/spacings em componentes app
- [ ] Todos componentes usam `Ds*` prefix

### 6.2 Visuais
- [ ] Light/Dark mode funcionando 100% (incluindo PrimeNG components)
- [ ] Contraste WCAG AA em todos estados (hover, focus, disabled, error)
- [ ] Focus visible consistente em todos componentes interativos
- [ ] Espaçamento consistente (múltiplos de 4px)
- [ ] Tipografia consistente (escala definida)
- [ ] Bordas consistentes (radius scale)
- [ ] Sombras consistentes (elevation scale)

### 6.3 Funcionais
- [ ] Dashboard 100% funcional com novos componentes
- [ ] Login funcional
- [ ] Menu navegação (teclado + mouse + touch)
- [ ] Configurador de tema abre/fecha, muda cores, persiste
- [ ] Toasts aparecem, somem, actions funcionam
- [ ] Modais abrem/fecham (ESC, backdrop click, focus trap)
- [ ] Tabelas: sort, paginação, seleção, sticky columns
- [ ] DatePicker: range, locale pt-BR, feriados highlight
- [ ] Responsivo: 320px, 768px, 1024px, 1440px, 1920px, 4K

### 6.4 Código
- [ ] Zero duplicação de lógica de UI
- [ ] Componentes puros (OnPush, signals, no side effects)
- [ ] Barrel exports organizados
- [ ] Documentação JSDoc em todos inputs/outputs públicos
- [ ] Sem `any` types em componentes design-system

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| PrimeNG Aura breaking changes v19→v20 | Média | Alto | Wrappers isolam API; testes de regressão |
| Bundle size increase | Baixa | Médio | Tree-shaking, lazy load componentes pesados |
| Dark mode bugs PrimeNG | Média | Alto | Testes visuais automatizados (Chromatic) |
| Team learning curve | Alta | Médio | Documentação, Storybook, pair programming |
| Migração dashboard quebrar regras negócio | Baixa | Crítico | Testes integração existentes passam |

---

## 8. Métricas de Sucesso Pós-Implementação

- **Tempo para criar nova tela**: -70% (componentes prontos)
- **Bugs visuais/regressão CSS**: -90% (tokens + componentes testados)
- **Bundle size**: -30% (remoção CSS custom + tree-shaking)
- **Acessibilidade score (Lighthouse)**: 100/100
- **Dark mode bugs**: 0
- **Design consistency score**: 100% (design tokens enforcement)

---

## 9. Próximos Passos Imediatos

1. **Criar branch `design2`** ✓
2. **Criar estrutura `src/design-system/`** 
3. **Implementar tokens TypeScript + CSS variables generator**
4. **Criar `styles.scss` limpo importando design-system**
5. **Implementar primeiros 5 micro-componentes** (Button, Input, Card, Badge, Icon)
6. **Migrar LoginComponent como prova de conceito**
7. **Validar build + testes**
8. **Continuar Fase 2-6**

---

**Aprovação necessária:** Este PRD define o escopo completo. A implementação seguirá fases sequenciais com validação a cada fase. Qualquer mudança de escopo deve ser documentada aqui.