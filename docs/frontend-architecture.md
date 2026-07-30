# Arquitetura de Frontend - EscalaJHA

> **Módulo:** Arquitetura Angular, Gerenciamento de Estado e Layout Engine  
> **Repositório:** EscalaJHA  
> **Status:** Ativo / Vinculante  

---

## 1. Layout Engine & LayoutService

- A largura e o estado da **Sidebar** e da **Topbar** DEVEM ser gerenciados exclusivamente pelas variáveis e serviços oficiais do layout Sakai (`LayoutService`).
- **NUNCA** fixar `width: 272px` ou dimensões em pixels no CSS de componentes de layout. O comportamento responsivo e retrátil deve derivar da estrutura nativa `.layout-wrapper`.

```html
<div class="layout-wrapper" [ngClass]="containerClass">
    <app-topbar></app-topbar>
    <app-sidebar></app-sidebar>
    <div class="layout-main-container">
        <div class="layout-main">
            <router-outlet></router-outlet>
        </div>
        <app-footer></app-footer>
    </div>
</div>
```

---

## 2. Gerenciamento de Estado com Angular Signals

- Priorizar o uso de **Angular Signals** (`signal()`, `computed()`) para reatividade e gerenciamento de estado local/global em substituição a `BehaviorSubject` complexos onde aplicável.
- Manter o fluxo de dados unidirecional e previsível.

---

## 3. Estrutura de Módulos & Componentes

```
src/
├── app/
│   ├── layout/               # Layout Sakai oficial (Topbar, Sidebar, Menu, Footer, Service)
│   ├── components/           # Componentes de negócio (Dashboard, Escalas, Colaboradores)
│   ├── shared/               # Componentes, diretivas, pipes e exemplos reutilizáveis
│   │   └── examples/         # Catálogo de exemplos práticos em código
│   └── services/             # Serviços de API e Solver de Escalas
docs/                         # Arquitetura e Contrato Técnico de Frontend
```
