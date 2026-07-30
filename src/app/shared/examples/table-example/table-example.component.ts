import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-table-example',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
  template: `
    <div class="card">
      <p-table [value]="colaboradores" [paginator]="true" [rows]="5" responsiveLayout="scroll" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="nome">Nome <p-sortIcon field="nome"></p-sortIcon></th>
            <th pSortableColumn="setor">Setor <p-sortIcon field="setor"></p-sortIcon></th>
            <th>Turno</th>
            <th>Status</th>
            <th style="width: 5rem">Ações</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td class="font-medium">{{ item.nome }}</td>
            <td>{{ item.setor }}</td>
            <td>{{ item.turno }}</td>
            <td>
              <p-tag [value]="item.status" [severity]="item.status === 'Ativo' ? 'success' : 'warn'"></p-tag>
            </td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-rounded p-button-sm" aria-label="Editar"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class TableExampleComponent {
  colaboradores = [
    { nome: 'Carlos Silva', setor: 'Caixa', turno: 'Manhã', status: 'Ativo' },
    { nome: 'Ana Costa', setor: 'Reposição', turno: 'Tarde', status: 'Ativo' },
    { nome: 'João Souza', setor: 'Açougue', turno: 'Noite', status: 'Pendente' }
  ];
}
