import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid">
      <div class="col-12 md:col-6 lg:col-3">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Escalas do Mês</span>
              <div class="text-surface-900 font-semibold text-xl">142</div>
            </div>
            <div class="flex align-items-center justify-content-center bg-blue-100 border-round" style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-calendar text-blue-500 text-xl"></i>
            </div>
          </div>
          <span class="text-emerald-500 font-medium">12 novas </span>
          <span class="text-muted-color">esta semana</span>
        </div>
      </div>
      
      <div class="col-12 md:col-6 lg:col-3">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">Folgas Aprovadas</span>
              <div class="text-surface-900 font-semibold text-xl">38</div>
            </div>
            <div class="flex align-items-center justify-content-center bg-green-100 border-round" style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-check-circle text-green-500 text-xl"></i>
            </div>
          </div>
          <span class="text-emerald-500 font-medium">+15% </span>
          <span class="text-muted-color">vs mês anterior</span>
        </div>
      </div>
    </div>
  `
})
export class KpiCardExampleComponent {}
