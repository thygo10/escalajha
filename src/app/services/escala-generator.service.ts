import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, Feriado } from '../models/types';

export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos: boolean;
  diasPermitidosFolga: number[]; // Array de dias da semana (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
  feriados: Feriado[];
}

@Injectable({
  providedIn: 'root'
})
export class EscalaGeneratorService {
  private readonly _cache = new Map<string, EscalaItem[]>();

  /** Invalida entradas de cache para um mês/ano específico */
  invalidateCache(ano: number, mes: number): void {
    const prefix = `${ano}-${mes}-`;
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this._cache.delete(key);
    }
  }

  /**
   * Versão cacheada de gerarEscalaMensal.
   * Usa um hash composto das entradas para garantir cache-hit preciso.
   */
  gerarEscalaMensalCached(
    funcionarios: Funcionario[],
    ano: number,
    mes: number,
    opcoes?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const configStr = [
      opcoes?.permitirDoisDiasConsecutivos ?? false,
      (opcoes?.diasPermitidosFolga ?? []).slice().sort().join(','),
      (opcoes?.feriados ?? []).map(f => `${f.data}:${f.funcionamento_proibido}`).sort().join('|'),
      funcionarios.map(f => `${f.matricula_aleatoria}:${f.genero}:${f.ativo}`).join(',')
    ].join(';');

    const cacheKey = `${ano}-${mes}-${this._simpleHash(configStr)}`;

    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)!;
    }

    const resultado = this.gerarEscalaMensal(funcionarios, ano, mes, opcoes);
    this._cache.set(cacheKey, resultado);
    return resultado;
  }

  private _simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }


  /**
   * Gera a escala 6x1 Giratória respeitando:
   * 1. 6 dias de trabalho máximo consecutivos (INVIOLÁVEL).
   * 2. Revezamento feminino: quinzenal (1 trab -> 1 folga).
   * 3. Revezamento masculino: ciclo 2x1 (2 trab -> 1 folga).
   * 4. Feriados de funcionamento proibido contam como folga.
   * 5. Rotação giratória justa baseada na semana do mês.
   */
  gerarEscalaMensal(
    funcionarios: Funcionario[],
    ano: number,
    mes: number,
    opcoes?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const totalDias = new Date(ano, mes, 0).getDate();
    const itens: EscalaItem[] = [];

    const config: OpcionesGeracaoEscala = {
      permitirDoisDiasConsecutivos: opcoes?.permitirDoisDiasConsecutivos ?? false,
      diasPermitidosFolga: (opcoes?.diasPermitidosFolga && opcoes.diasPermitidosFolga.length > 0)
        ? opcoes.diasPermitidosFolga
        : [0, 1, 2, 3, 4, 5, 6],
      feriados: opcoes?.feriados || []
    };

    // Feriados de fechamento proibido no mês atual
    const feriadosFechados = new Set<number>();
    const feriadosAbertos = new Set<number>();
    
    for (const f of config.feriados) {
      const parts = f.data.split('-');
      if (parts.length === 3) {
        const fAno = parseInt(parts[0], 10);
        const fMes = parseInt(parts[1], 10);
        const fDia = parseInt(parts[2], 10);
        
        if (fAno === ano && fMes === mes) {
          if (f.funcionamento_proibido) {
            feriadosFechados.add(fDia);
          } else {
            feriadosAbertos.add(fDia);
          }
        }
      }
    }

    funcionarios.forEach((func, idx) => {
      const dias: Record<number, TipoDia> = {};
      const souFeminino = func.genero === 'F';
      
      const turmaOffset = idx % 7; // Distribui em 7 turmas

      let diasTrabalhadosSeguidos = 0;
      let domingosSeguidos = 0;
      let ultimoDomingoTrabalhado = false; // Em um sistema real viria do DB
      let ultimoDiaFoiFolga = false;

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay();
        const isDomingo = diaSemana === 0;

        // REGRA 0: Feriado de fechamento obrigatório
        if (feriadosFechados.has(dia)) {
          dias[dia] = 'FE';
          diasTrabalhadosSeguidos = 0;
          ultimoDiaFoiFolga = true;
          continue;
        }

        // REGRA 1: Limite inviolável de 6 dias
        if (diasTrabalhadosSeguidos >= 6) {
          dias[dia] = isDomingo ? 'FD' : 'F';
          diasTrabalhadosSeguidos = 0;
          ultimoDiaFoiFolga = true;
          if (isDomingo) {
             domingosSeguidos = 0;
             ultimoDomingoTrabalhado = false;
          }
          continue;
        }

        // REGRA 2: Domingos
        if (isDomingo) {
          if (souFeminino) {
            // CLT Art 386 - quinzenal
            if (ultimoDomingoTrabalhado) {
              dias[dia] = 'FD';
              domingosSeguidos = 0;
              ultimoDomingoTrabalhado = false;
              diasTrabalhadosSeguidos = 0;
              ultimoDiaFoiFolga = true;
              continue;
            }
          } else {
            // CCT - 2x1
            if (domingosSeguidos >= 2) {
              dias[dia] = 'FD';
              domingosSeguidos = 0;
              ultimoDomingoTrabalhado = false;
              diasTrabalhadosSeguidos = 0;
              ultimoDiaFoiFolga = true;
              continue;
            }
          }

          // Checar se a folga giratória cai no domingo
          const semanaDoMes = Math.ceil(dia / 7);
          const diaFolgaRotacao = (turmaOffset + semanaDoMes) % 7;
          
          if (diaFolgaRotacao === 0 && config.diasPermitidosFolga.includes(0)) {
            // Regra de proibir dias consecutivos
            if (!config.permitirDoisDiasConsecutivos && ultimoDiaFoiFolga) {
               // Perde a folga do domingo para não emendar, trabalha
               dias[dia] = 'TD';
               domingosSeguidos++;
               ultimoDomingoTrabalhado = true;
               diasTrabalhadosSeguidos++;
               ultimoDiaFoiFolga = false;
            } else {
               dias[dia] = 'FD';
               domingosSeguidos = 0;
               ultimoDomingoTrabalhado = false;
               diasTrabalhadosSeguidos = 0;
               ultimoDiaFoiFolga = true;
            }
          } else {
            dias[dia] = 'TD';
            domingosSeguidos++;
            ultimoDomingoTrabalhado = true;
            diasTrabalhadosSeguidos++;
            ultimoDiaFoiFolga = false;
          }
          continue;
        }

        // REGRA 3: Dias Úteis
        const semanaDoMes = Math.ceil(dia / 7);
        const diaFolgaRotacao = (turmaOffset + semanaDoMes) % 7;
        
        if (diaFolgaRotacao === diaSemana && config.diasPermitidosFolga.includes(diaSemana)) {
          if (config.permitirDoisDiasConsecutivos || !ultimoDiaFoiFolga) {
            dias[dia] = 'F';
            diasTrabalhadosSeguidos = 0;
            ultimoDiaFoiFolga = true;
            continue;
          }
        }

        // Default
        if (feriadosAbertos.has(dia)) {
           dias[dia] = 'TF';
        } else {
           dias[dia] = 'T';
        }
        
        diasTrabalhadosSeguidos++;
        ultimoDiaFoiFolga = false;
      }

      itens.push({
        matricula: func.matricula_aleatoria,
        nome: func.primeiro_nome,
        setor: func.setor,
        turno: func.turno_padrao,
        genero: func.genero,
        dias
      });
    });

    return itens;
  }
}

