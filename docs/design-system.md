# Design Authority - Sakai NG Design System & Design Tokens

> **Módulo:** Especificação de Design Tokens, Temas e Identidade Visual  
> **Repositório:** EscalaJHA  
> **Status:** Ativo / Vinculante  

---

## 1. Princípios Gerais do Design Authority

```
┌─────────────────────────────────────────────────────────┐
│ • Menos CSS.        ➜ Mais Design Tokens (--p-*).      │
│ • Menos Overrides.  ➜ Mais Configuração do Theme.       │
│ • Menos HTML.       ➜ Mais Componentes PrimeNG.        │
│ • Menos Código.     ➜ Mais Reutilização.               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tokens do Tema como Fonte da Verdade

Cores hexadecimais (ex: `#f8fafc`, `#3b82f6`) são meras referências de apoio visual. A **fonte da verdade** oficial da aplicação é a coleção de Design Tokens nativos do PrimeNG (`--p-*`), garantindo imunidade a atualizações de tema (Aura, Lara, Nora, Material):

| Categoria | Token do Tema (Fonte da Verdade) | Descrição / Uso Semântico |
|---|---|---|
| **Fundo de Página** | `var(--p-surface-ground)` | Background principal da aplicação (cinza claro) |
| **Superfície dos Cards** | `var(--p-surface-card)` | Background de containers e cartões (branco) |
| **Bordas** | `var(--p-surface-border)` | Bordas sutis de 1px em cards, tabelas e dividores |
| **Texto Principal** | `var(--p-text-color)` | Cor padrão para títulos e textos de corpo |
| **Texto Secundário** | `var(--p-text-muted-color)` | Rótulos, descrições secundárias e captions |
| **Ação Primária** | `var(--p-primary-color)` | Botões primários, links ativos e seleções |
| **Hover de Superfície** | `var(--p-surface-hover)` | Fundo em estados hover de linhas de tabela e menus |
| **Raio de Canto** | `var(--p-content-border-radius)` | Raio de curvatura padrão de componentes e cards |

---

## 3. Tipografia & Fontes

- **Família Oficial:** `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Pesos Permitidos:**
  - `400` (Regular): Corpo de texto, células de tabela, descrições, inputs e botões padrão.
  - `500` (Medium): Títulos pequenos (`h4`, `h5`, `h6`), cabeçalhos de tabela, labels de formulários e badges.
  - `600` (Semi-Bold): Reservado para títulos de páginas/seções (`h1`, `h2`, `h3`) e valores de KPI Cards.
  - `700` (Bold): Restrito a logotipos ou destaques críticos de acessibilidade.

---

## 4. Hierarquia de Estilização

```
1. Theme Oficial do PrimeNG / Presets
2. Design Tokens do PrimeNG (--p-*)
3. PrimeFlex Utility Classes (flex, gap-*, p-*, m-*)
4. CSS Variables Globais (--p-surface-ground, etc)
5. CSS Customizado (Última opção - somente quando impossível via tema/tokens)
```
