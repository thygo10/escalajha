import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dialog-example',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <button pButton label="Abrir Modal de Confirmação" (click)="visible = true" class="p-button-primary"></button>

    <p-dialog header="Confirmar Alteração de Escala" [(visible)]="visible" [modal]="true" [style]="{ width: '450px' }" [draggable]="false" [resizable]="false">
      <div class="flex align-items-center justify-content-center pt-3">
        <i class="pi pi-exclamation-triangle text-amber-500 text-3xl mr-3"></i>
        <span>Deseja realmente alterar o turno do colaborador <strong>Carlos Silva</strong>?</span>
      </div>
      <ng-template pTemplate="footer">
        <button pButton icon="pi pi-times" label="Cancelar" class="p-button-text" (click)="visible = false"></button>
        <button pButton icon="pi pi-check" label="Confirmar" class="p-button-primary" (click)="confirmar()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class DialogExampleComponent {
  visible = false;

  confirmar() {
    this.visible = false;
  }
}
