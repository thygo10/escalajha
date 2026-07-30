import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-form-example',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  template: `
    <div class="card p-fluid">
      <h5 class="font-semibold text-lg mb-4">Cadastro de Colaborador</h5>
      <div class="grid p-formgrid">
        <div class="col-12 md:col-6 field">
          <label for="nome" class="font-medium text-sm mb-2 block">Nome Completo</label>
          <p-inputGroup>
            <p-inputGroupAddon><i class="pi pi-user"></i></p-inputGroupAddon>
            <input pInputText id="nome" type="text" [(ngModel)]="nome" placeholder="Digite o nome..." />
          </p-inputGroup>
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="setor" class="font-medium text-sm mb-2 block">Setor</label>
          <p-dropdown id="setor" [options]="setores" optionLabel="label" [(ngModel)]="selectedSetor" placeholder="Selecione um setor"></p-dropdown>
        </div>
        
        <div class="col-12 flex justify-content-end gap-2 mt-3">
          <button pButton label="Cancelar" class="p-button-outlined p-button-secondary" style="width: auto"></button>
          <button pButton label="Salvar Colaborador" class="p-button-primary" style="width: auto"></button>
        </div>
      </div>
    </div>
  `
})
export class FormExampleComponent {
  nome = '';
  selectedSetor = null;
  setores = [
    { label: 'Caixa', value: 'caixa' },
    { label: 'Reposição', value: 'reposicao' },
    { label: 'Açougue', value: 'acougue' }
  ];
}
