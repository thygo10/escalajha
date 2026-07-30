# Component Guidelines - Recursos PrimeNG

> **Módulo:** Guia de Uso de Componentes e Diretivas PrimeNG  
> **Repositório:** EscalaJHA  
> **Status:** Ativo / Vinculante  

---

## 1. Recursos Nativos Obrigatórios

Ao utilizar componentes PrimeNG, explore as funcionalidades nativas para evitar código customizado:

- **`pFluid` / `fluid`:** Torna formulários e botões responsivos automaticamente.
- **`PrimeFlex`:** Utilitários para layout flexbox (`flex align-items-center gap-3`), grid (`grid col-12 md:col-6`) e espaçamentos (`p-4`, `mb-3`).
- **`p-inputGroup` & `p-inputGroupAddon`:** Para ícones e botões acoplados a campos de texto.
- **`pStyleClass`:** Para toggles de animações e classes CSS declarativamente no HTML.
- **`pRipple`:** Para feedback tátil visual de clique.
- **PassThrough (`pt`):** Para ajustes específicos em sub-elementos de componentes PrimeNG sem alterar seletores globais.

---

## 2. Padrão de Componentes

- **Button (`p-button`):** Altura 40px, font-weight 500.
- **InputText (`pInputText`) & Dropdown (`p-dropdown`):** Altura 40px, borda sutil `var(--p-surface-border)`.
- **Table (`p-table`):** Cabeçalho suave `var(--p-surface-50)`, linhas alternadas e hover suave.
- **Dialog (`p-dialog`):** Header com font-weight 600, footer com ações à direita, backdrop com blur leve.
