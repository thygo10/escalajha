import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class EscalaGeneratorService {
  /**
   * Gera uma matriz de escala de folga mensal garantindo:
   * 1. Sistema 6x1 (Folga semanal obrigatória no máximo a cada 6 dias trabalhados).
   * 2. Revezamento de domingos (Revezamento quinzenal/trienal de domingo conforme CCT/CLT).
   * 3. Minimização de dados LGPD (Apenas primeiro nome e matrícula aleatória).
   */
  gerarEscalaMensal(funcionarios: Funcionario[], ano: number, mes: number): EscalaItem[] {
    const totalDias = new Date(ano, mes, 0).getDate();
    const itens: EscalaItem[] = [];

    funcionarios.forEach((func, idx) => {
      const dias: Record<number, string> = {};
      // Definir um dia fixo da semana para folga base (ex: 0 = Dom, 1 = Seg, 2 = Ter...)
      const diaFolgaBase = (idx % 6) + 1; // Distribui entre Seg (1) e Sáb (6)

      let diasTrabalhadosSeguidos = 0;

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay(); // 0 = Dom, 1 = Seg...

        const isDomingo = diaSemana === 0;

        if (isDomingo) {
          // Revezamento de domingo Convenção Coletiva: Garantia de pelo menos 1 folga de domingo no mês para cada colaborador
          const domingoNum = Math.ceil(dia / 7);
          const folgaNoDomingo = (domingoNum === ((idx % 4) + 1));

          if (folgaNoDomingo || diasTrabalhadosSeguidos >= 6) {
            dias[dia] = 'DOMINGO';
            diasTrabalhadosSeguidos = 0;
          } else {
            dias[dia] = 'TRABALHO';
            diasTrabalhadosSeguidos++;
          }
        } else if (diaSemana === diaFolgaBase || diasTrabalhadosSeguidos >= 6) {
          dias[dia] = 'FOLGA';
          diasTrabalhadosSeguidos = 0;
        } else {
          dias[dia] = 'TRABALHO';
          diasTrabalhadosSeguidos++;
        }
      }

      itens.push({
        matricula: func.matricula_aleatoria,
        nome: func.primeiro_nome,
        setor: func.setor,
        turno: func.turno_padrao,
        dias
      });
    });

    return itens;
  }
}
