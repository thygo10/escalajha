# UI Patterns & Processo de Revisão Comparativa

> **Módulo:** Padrões de Interface (KPI Cards, Formulários, Tabelas, Dashboards) e Checklist de Inspeção  
> **Repositório:** EscalaJHA  
> **Status:** Ativo / Vinculante  

---

## 1. Processo de Revisão Comparativa Lado a Lado

Antes de considerar qualquer tela como finalizada:

1. **Inspeção Visual:** Abra a tela desenvolvida e o template Sakai oficial (https://sakai.primeng.org/) lado a lado.
2. **Checklist Obrigatório:**
   - [ ] Espaçamento & Padding dentro da escala (`8px`, `12px`, `16px`, `24px`, `32px`).
   - [ ] Tipografia `Inter` em pesos leves (`400` corpo, `500` títulos pequenos).
   - [ ] Fundo `--p-surface-ground` e cards `--p-surface-card`.
   - [ ] Altura padrão de 40px para inputs e botões.
   - [ ] Ícone box pastel no canto superior dos KPI Cards.
   - [ ] Responsividade testada em Mobile (<768px), Tablet (768-991px) e Desktop (≥1200px).

---

## 2. Catálogo de Padrões de Código

Os desenvolvedores e agentes de IA DEVEM consultar os exemplos práticos em código localizados em:
`src/app/shared/examples/`

- **KPI Cards:** `src/app/shared/examples/kpi-card-example/`
- **Tabelas de Dados:** `src/app/shared/examples/table-example/`
- **Formulários Responsivos:** `src/app/shared/examples/form-example/`
- **Modais & Diálogos:** `src/app/shared/examples/dialog-example/`
