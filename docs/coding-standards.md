# Coding Standards, Performance & Acessibilidade

> **Módulo:** Boas Práticas de Código Angular, Otimização de Performance e WCAG 2.1 AA  
> **Repositório:** EscalaJHA  
> **Status:** Ativo / Vinculante  

---

## 1. Proibições Estritas de Código (Angular & CSS)

> [!CAUTION]
> - ❌ **PROIBIDO `::ng-deep`**: O uso de `::ng-deep` está estritamente desativado. Utilize Design Tokens (`--p-*`) ou PassThrough (`pt`).
> - ❌ **PROIBIDO `ViewEncapsulation.None`**: Sem justificativa técnica prévia documentada.
> - ❌ **PROIBIDO Lógica de Negócios no HTML**: Manter expressões no template simples.
> - ❌ **PROIBIDO `!important`**: O uso de `!important` no CSS é vetado.
> - ❌ **PROIBIDO `style="..."` inline**: Utilize classes utilitárias PrimeFlex.
> - ❌ **PROIBIDO Cores Hardcoded**: NUNCA declarar `#3b82f6` ou `#000000` direto no CSS. Use variáveis `--p-*`.

---

## 2. Acessibilidade (WCAG 2.1 AA)

1. **Rótulos ARIA:** Botões apenas com ícone e campos de entrada sem label visível DEVEM conter `aria-label` ou `aria-labelledby`.
2. **Focus Visível:** NUNCA remover o indicador visual de foco (`var(--p-focus-ring-shadow)`).
3. **Navegação por Teclado:** Garantir que modais, dropdowns e tabelas sejam 100% navegáveis via teclado (`Tab`, `Enter`, `Space`, `Escape`).
4. **Contraste Mínimo:** Manter taxa de contraste mínima de 4.5:1 para textos normais.

---

## 3. Performance & Otimização de Renders

1. **Evitar Reflows:** Não duplicar seletores nem usar estilos em tempo de execução que causem repinturas de layout desnecessárias.
2. **DOM Enxuto:** Evitar aninhamento desnecessário de containers `<div>`.
3. **Seletores Rápidos:** Limitar aninhamento CSS a no máximo 2 níveis.
