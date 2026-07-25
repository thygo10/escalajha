import { Injectable, signal, computed } from '@angular/core';
import { Funcionario, Setor, EscalaItem, Loja } from '../models/types';

/**
 * EscalaStateService (Foundation)
 * Centraliza o estado reativo da aplicação usando Signals,
 * eliminando a prop-drilling e o "God Component" (dashboard.component.ts).
 */
@Injectable({
  providedIn: 'root'
})
export class EscalaStateService {
  // Estado Principal
  readonly activeLoja = signal<Loja | null>(null);
  readonly funcionarios = signal<Funcionario[]>([]);
  readonly setores = signal<Setor[]>([]);
  readonly escalaItens = signal<EscalaItem[]>([]);
  
  // Estado de UI global
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly currentMonth = signal<string>('');
  
  // Selectors (Computed)
  readonly activeFuncionarios = computed(() => 
    this.funcionarios().filter(f => f.ativo)
  );

  readonly hasActiveLoja = computed(() => 
    this.activeLoja() !== null
  );
  
  // Ações de Mutação Controlada
  setLoja(loja: Loja) {
    this.activeLoja.set(loja);
  }

  setLoading(state: boolean) {
    this.isLoading.set(state);
  }
}
