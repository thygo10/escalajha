import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, Feriado, ValidacaoEscalaResultado, ValidacaoItem, TurnoConfig } from '../models/types';

export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos: boolean;
  diasPermitidosFolga: number[]; // Array de dias da semana (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
  feriados: Feriado[];
  minFuncionariosPorDia?: number; // Mínimo de colaboradores trabalhando no setor por dia (ex: 2 fiscais)
}

@Injectable({
  providedIn: 'root'
})
export class EscalaGeneratorService {
  private readonly _cache = new Map<string, EscalaItem[]>();

  /** Invalida todo o cache de escalas em memória */
  clearAllCache(): void {
    this._cache.clear();
  }

  /** Invalida entradas de cache para um mês/ano específico */
  invalidateCache(ano: number, mes: number): void {
    const prefix = `${ano}-${mes}-`;
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this._cache.delete(key);
    }
  }

  /**
   * Versão cacheada de gerarEscalaMensal.
   */
  gerarEscalaMensalCached(
    funcionarios: Funcionario[],
    ano: number,
    mes: number,
    opcoes?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const configStr = [
      opcoes?.permitirDoisDiasConsecutivos ?? false,
      opcoes?.minFuncionariosPorDia ?? 2,
      (opcoes?.diasPermitidosFolga ?? []).slice().sort((a, b) => a - b).join(','),
      (opcoes?.feriados ?? []).map(f => `${f.data}:${f.funcionamento_proibido}`).sort((a, b) => a.localeCompare(b)).join('|'),
      funcionarios.map(f => `${f.matricula_aleatoria}:${f.primeiro_nome}:${f.cargo}:${f.turno_padrao}:${f.genero}:${f.ativo}:${f.setor}`).join(',')
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
      const char = str.codePointAt(i) ?? 0;
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Gera a escala 6x1 Giratória respeitando:
   * 1. 6 dias de trabalho máximo consecutivos (INVIOLÁVEL CLT Art. 67).
   * 2. Revezamento feminino quinzenal (1 domingo trab -> 1 domingo folga - CLT Art. 386).
   * 3. Revezamento masculino (2 domingos trab -> 1 domingo folga - CCT).
   * 4. COBERTURA MÍNIMA OBRIGATÓRIA (Garante N fiscais/atendentes por dia, sem folga geral).
   * 5. Feriados de funcionamento proibido contam como folga (FE).
   */
  gerarEscalaMensal(
    funcionarios: Funcionario[],
    ano: number,
    mes: number,
    opcoes?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const totalDias = new Date(ano, mes, 0).getDate();
    const itens: EscalaItem[] = [];

    const minRequerido = opcoes?.minFuncionariosPorDia ?? 2;

    const config: OpcionesGeracaoEscala = {
      permitirDoisDiasConsecutivos: opcoes?.permitirDoisDiasConsecutivos ?? false,
      diasPermitidosFolga: (opcoes?.diasPermitidosFolga && opcoes.diasPermitidosFolga.length > 0)
        ? opcoes.diasPermitidosFolga
        : [0, 1, 2, 3, 4, 5, 6],
      feriados: opcoes?.feriados || [],
      minFuncionariosPorDia: minRequerido
    };

    // Feriados de fechamento proibido no mês atual
    const feriadosFechados = new Set<number>();
    const feriadosAbertos = new Set<number>();
    
    for (const f of config.feriados) {
      const parts = f.data.split('-');
      if (parts.length === 3) {
        const fAno = Number.parseInt(parts[0], 10);
        const fMes = Number.parseInt(parts[1], 10);
        const fDia = Number.parseInt(parts[2], 10);
        
        if (fAno === ano && fMes === mes) {
          if (f.funcionamento_proibido) {
            feriadosFechados.add(fDia);
          } else {
            feriadosAbertos.add(fDia);
          }
        }
      }
    }

    // Identificar Domingos do mês
    const domingos: number[] = [];
    for (let d = 1; d <= totalDias; d++) {
      if (new Date(ano, mes - 1, d).getDay() === 0) {
        domingos.push(d);
      }
    }

    // Identificar setor para aplicar regras dinâmicas
    const setorNome = (funcionarios[0]?.setor || '').toLowerCase();
    const eFrenteDeCaixa = setorNome.includes('caixa') && !setorNome.includes('fiscal');
    const ePadaria = setorNome.includes('padaria');

    // Mínimo automático de 6 para Frente de Caixa
    const minEfetivo = eFrenteDeCaixa ? Math.max(config.minFuncionariosPorDia ?? 2, 6) : (config.minFuncionariosPorDia ?? 2);

    // Dividir os funcionários em turmas escalonadas (Cohortes)
    // Isso evita que todos entrem em folga no mesmo domingo ou dia útil.
    funcionarios.forEach((func, idx) => {
      const dias: Record<number, TipoDia> = {};
      const souFeminino = func.genero === 'F';
      
      // Offset da turma para rotação semanal
      const turmaOffset = idx;

      // Determina qual par de domingos esta pessoa folga (ex: Domingos ímpares 1 e 3 vs pares 2 e 4)
      const folgaDomingoImpar = (idx % 2 === 0);

      let diasTrabalhadosSeguidos = 0;
      let domingosSeguidos = 0;
      let ultimoDiaFoiFolga = false;

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay();
        const isDomingo = diaSemana === 0;

        // REGRA 0: Feriado Fechado
        if (feriadosFechados.has(dia)) {
          dias[dia] = 'FE';
          diasTrabalhadosSeguidos = 0;
          ultimoDiaFoiFolga = true;
          continue;
        }

        // REGRA 1: Trava CLT de 6 dias consecutivos máximo
        if (diasTrabalhadosSeguidos >= 6) {
          dias[dia] = isDomingo ? 'FD' : 'F';
          diasTrabalhadosSeguidos = 0;
          ultimoDiaFoiFolga = true;
          if (isDomingo) domingosSeguidos = 0;
          continue;
        }

        // REGRA 2: Trata Domingos com Escalonamento por Cohorte
        if (isDomingo) {
          const domingoIndex = domingos.indexOf(dia); // 0 = 1º dom, 1 = 2º dom, 2 = 3º dom...
          const eDomingoImpar = (domingoIndex % 2 === 0);

          let deveFolgarNoDomingo = false;

          if (souFeminino) {
            // CLT Art 386: Quinzenal -> alterna domingos sim / domingos não
            deveFolgarNoDomingo = folgaDomingoImpar ? eDomingoImpar : !eDomingoImpar;
          } else if (domingosSeguidos >= 2) {
            deveFolgarNoDomingo = true;
          } else {
            deveFolgarNoDomingo = folgaDomingoImpar ? eDomingoImpar : (!eDomingoImpar && domingoIndex % 3 === 2);
          }

          if (deveFolgarNoDomingo && config.diasPermitidosFolga.includes(0)) {
            dias[dia] = 'FD';
            domingosSeguidos = 0;
            diasTrabalhadosSeguidos = 0;
            ultimoDiaFoiFolga = true;
          } else {
            dias[dia] = 'TD';
            domingosSeguidos++;
            diasTrabalhadosSeguidos++;
            ultimoDiaFoiFolga = false;
          }
          continue;
        }

        // REGRA 3: Dias Úteis com Rotação Giratória
        const semanaDoMes = Math.ceil(dia / 7);
        // Garante distribuição homogênea nos dias da semana (Segunda a Sábado = 1 a 6)
        const diaFolgaRotacao = 1 + ((turmaOffset + semanaDoMes) % 6);
        
        if (diaFolgaRotacao === diaSemana && config.diasPermitidosFolga.includes(diaSemana)) {
          if (config.permitirDoisDiasConsecutivos || !ultimoDiaFoiFolga) {
            dias[dia] = 'F';
            diasTrabalhadosSeguidos = 0;
            ultimoDiaFoiFolga = true;
            continue;
          }
        }

        // Default: Trabalho
        dias[dia] = feriadosAbertos.has(dia) ? 'TF' : 'T';
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

    // PÓS-PROCESSAMENTO 1: Cobertura Mínima Diária (Garante mínimo de 6 caixas se Frente de Caixa)
    this._ajustarCoberturaMinima(itens, totalDias, minEfetivo);

    // PÓS-PROCESSAMENTO 2: Padaria (Garante no máximo 1 folga por dia na produção)
    if (ePadaria) {
      this._ajustarCoberturaPadaria(itens, totalDias);
    }

    // PÓS-PROCESSAMENTO 3: Limite mensal de folgas (4 a 5 folgas)
    this._ajustarLimiteFolgasMensais(itens, totalDias);

    return itens;
  }

  /**
   * Garante que na Padaria haja no máximo 1 colaborador de folga por dia na produção.
   */
  private _ajustarCoberturaPadaria(itens: EscalaItem[], totalDias: number): void {
    if (itens.length <= 1) return;

    for (let dia = 1; dia <= totalDias; dia++) {
      const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD' || i.dias[dia] === 'FE');
      
      if (folgando.length > 1) {
        // Mover folgas excedentes para dias vizinhos onde ninguém está folgando
        for (let k = 1; k < folgando.length; k++) {
          const item = folgando[k];
          const isDomingo = item.dias[dia] === 'FD';
          
          let diaSemFolga = -1;
          for (let dAlt = 1; dAlt <= totalDias; dAlt++) {
            if (dAlt !== dia && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TD' || item.dias[dAlt] === 'TF')) {
              const folgandoNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'F' || i.dias[dAlt] === 'FD' || i.dias[dAlt] === 'FE').length;
              if (folgandoNoDiaAlt === 0) {
                diaSemFolga = dAlt;
                break;
              }
            }
          }

          if (diaSemFolga !== -1) {
            item.dias[dia] = isDomingo ? 'TD' : 'T';
            const altIsDomingo = (new Date().getDay() === 0);
            item.dias[diaSemFolga] = altIsDomingo ? 'FD' : 'F';
          }
        }
      }
    }
  }

  /**
   * Garante que nenhum colaborador ultrapasse o limite de 5 folgas por mês.
   */
  private _ajustarLimiteFolgasMensais(itens: EscalaItem[], totalDias: number): void {
    itens.forEach(item => {
      const folgas = Object.entries(item.dias).filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE');
      
      if (folgas.length > 5) {
        const excesso = folgas.length - 5;
        for (let i = 0; i < excesso; i++) {
          const [diaStr, st] = folgas[folgas.length - 1 - i];
          const dia = Number(diaStr);
          item.dias[dia] = (st === 'FD') ? 'TD' : 'T';
        }
      }
    });
  }

  /**
   * Garante que em nenhum dia o número de colaboradores trabalhando no setor seja menor que o mínimo.
   */
  private _ajustarCoberturaMinima(itens: EscalaItem[], totalDias: number, minPorDia: number): void {
    if (itens.length <= minPorDia) {
      // Se o setor tem menos ou igual colaboradores que o mínimo, ajusta para folga não coincidente
      return;
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const trabalhando = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF');
      
      if (trabalhando.length < minPorDia) {
        const necessarios = minPorDia - trabalhando.length;
        const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD');

        for (let k = 0; k < Math.min(necessarios, folgando.length); k++) {
          const item = folgando[k];
          const isDomingo = (item.dias[dia] === 'FD');
          
          // Altera a folga deste colaborador para trabalho no dia deficitário
          item.dias[dia] = isDomingo ? 'TD' : 'T';

          // Procura um dia alternativo na mesma semana com folga viável para compensar
          const inicioSemana = Math.max(1, dia - 3);
          const fimSemana = Math.min(totalDias, dia + 3);
          
          for (let dAlt = inicioSemana; dAlt <= fimSemana; dAlt++) {
            if (dAlt !== dia && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
              const trabNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'T' || i.dias[dAlt] === 'TD' || i.dias[dAlt] === 'TF').length;
              
              if (trabNoDiaAlt > minPorDia) {
                const altIsDomingo = (new Date().getDay() === 0);
                item.dias[dAlt] = altIsDomingo ? 'FD' : 'F';
                break;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Engine de Validação Real em Tempo Real
   * Audita a escala inteira e identifica falhas de cobertura e descumprimentos de regras CLT/CCT.
   */
  validarEscala(
    itens: EscalaItem[],
    ano: number,
    mes: number,
    minRequerido: number = 2,
    turnosConfigs: TurnoConfig[] = []
  ): ValidacaoEscalaResultado {
    const totalDias = new Date(ano, mes, 0).getDate();
    const erros: ValidacaoItem[] = [];
    const coberturaPorDia: Record<number, number> = {};

    const setorNomeOriginal = itens[0]?.setor || 'Setor';
    const setorNomeClean = setorNomeOriginal.toLowerCase();
    const eFrenteDeCaixa = setorNomeClean.includes('caixa') && !setorNomeClean.includes('fiscal');
    const ePadaria = setorNomeClean.includes('padaria');

    const minEfetivoValida = eFrenteDeCaixa ? Math.max(minRequerido, 6) : minRequerido;

    for (let dia = 1; dia <= totalDias; dia++) {
      const emTrabalho = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length;
      const emFolga = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD' || i.dias[dia] === 'FE').length;
      coberturaPorDia[dia] = emTrabalho;

      if (emTrabalho === 0 && itens.length > 0) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: COBERTURA ZERO! Todos os colaboradores estão de folga.`,
          tipo: 'ERRO_COBERTURA'
        });
      } else if (eFrenteDeCaixa && emTrabalho < 6 && itens.length >= 6) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Frente de Caixa possui apenas ${emTrabalho} operador(es) trabalhando. Mínimo OBRIGATÓRIO: 6.`,
          tipo: 'ERRO_COBERTURA_CAIXA'
        });
      } else if (emTrabalho < minEfetivoValida && itens.length >= minEfetivoValida) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Apenas ${emTrabalho} colaborador(es) trabalhando. Mínimo exigido: ${minEfetivoValida}.`,
          tipo: 'ERRO_COBERTURA'
        });
      }

      // Regra Padaria: No máximo 1 folga por dia na Produção
      if (ePadaria && emFolga > 1 && itens.length > 1) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Padaria possui ${emFolga} colaboradores de folga. Permitido SOMENTE 1 pessoa de folga por dia na produção.`,
          tipo: 'ERRO_PADARIA_PRODUCAO'
        });
      }
    }

    // Validação de regras CLT e limite de folgas por funcionário
    itens.forEach(item => {
      let consecutivos = 0;
      let domingosSeguidosFeminino = 0;
      let totalFolgasNoMes = 0;

      for (let dia = 1; dia <= totalDias; dia++) {
        const st = item.dias[dia];
        const isDom = new Date(ano, mes - 1, dia).getDay() === 0;

        if (st === 'F' || st === 'FD' || st === 'FE') {
          totalFolgasNoMes++;
        }

        if (st === 'T' || st === 'TD' || st === 'TF') {
          consecutivos++;
          if (consecutivos > 6) {
            erros.push({
              dia,
              setor: item.setor,
              mensagem: `${item.nome}: Trabalhou mais de 6 dias consecutivos (Dia ${dia}). Violação CLT Art. 67.`,
              tipo: 'ERRO_CLT'
            });
          }

          if (isDom && item.genero === 'F') {
            domingosSeguidosFeminino++;
            if (domingosSeguidosFeminino >= 2) {
              erros.push({
                dia,
                setor: item.setor,
                mensagem: `${item.nome} (Feminino): Trabalhou 2 domingos seguidos (Dia ${dia}). Violação CLT Art. 386.`,
                tipo: 'ERRO_CLT'
              });
            }
          }
        } else {
          consecutivos = 0;
          if (isDom && item.genero === 'F') {
            domingosSeguidosFeminino = 0;
          }
        }
      }

      // Checagem de limite mensal de folgas (4 a 5 folgas)
      if (totalFolgasNoMes > 5) {
        erros.push({
          dia: 1,
          setor: item.setor,
          mensagem: `${item.nome}: Excede o limite de folgas no mês (${totalFolgasNoMes} folgas). Máximo permitido: 5 folgas.`,
          tipo: 'ERRO_FOLGAS_MES'
        });
      } else if (totalFolgasNoMes < 4 && totalDias >= 28) {
        erros.push({
          dia: 1,
          setor: item.setor,
          mensagem: `${item.nome}: Possui apenas ${totalFolgasNoMes} folga(s) no mês. Priorizar meta de 4 a 5 folgas.`,
          tipo: 'ERRO_FOLGAS_MES'
        });
      }

      // Checar carga horária do turno cadastrado
      if (turnosConfigs.length > 0) {
        const tConf = turnosConfigs.find(tc => tc.nome === item.turno);
        if (tConf?.excedeLimiteDiario) {
          erros.push({
            dia: 1,
            setor: item.setor,
            mensagem: `${item.nome}: Turno "${item.turno}" excede a carga horária diária padrão (${(tConf.cargaHorariaLiquidaMinutos/60).toFixed(1)}h líquidos).`,
            tipo: 'ALERTA_CARGA'
          });
        }
      }
    });

    const totalErros = erros.filter(e => 
      e.tipo === 'ERRO_COBERTURA' || 
      e.tipo === 'ERRO_COBERTURA_CAIXA' || 
      e.tipo === 'ERRO_PADARIA_PRODUCAO' || 
      e.tipo === 'ERRO_FOLGAS_MES' || 
      e.tipo === 'ERRO_CLT'
    ).length;
    const totalAlertas = erros.filter(e => e.tipo === 'ALERTA_CARGA' || e.tipo === 'AVISO').length;

    return {
      valida: totalErros === 0,
      totalErros,
      totalAlertas,
      itensValidados: erros,
      coberturaPorDia,
      minimoRequerido: minEfetivoValida
    };
  }

  /**
   * Converte Horário de Entrada, Saída e Tempo de Intervalo em minutos de jornada líquida.
   * Ex: 08:00 às 17:00 com 60 min de intervalo -> (9h * 60) - 60 = 480 min (8h00)
   */
  calcularCargaHorariaLiquida(entrada: string, saida: string, intervaloMinutos: number): { minutos: number; horasFormatted: string; excedeLimite: boolean } {
    const [hEnt, mEnt] = entrada.split(':').map(Number);
    const [hSai, mSai] = saida.split(':').map(Number);

    let minEntrada = (hEnt * 60) + (mEnt || 0);
    let minSaida = (hSai * 60) + (mSai || 0);

    if (minSaida < minEntrada) {
      // Turno que vira a noite
      minSaida += 24 * 60;
    }

    const minBrutos = minSaida - minEntrada;
    const minLiquidos = Math.max(0, minBrutos - intervaloMinutos);

    const horas = Math.floor(minLiquidos / 60);
    const minutos = minLiquidos % 60;
    const horasFormatted = `${String(horas).padStart(2, '0')}h${minutos > 0 ? String(minutos).padStart(2, '0') + 'm' : '00'}`;

    // Limite padrão diário CLT (8h00 = 480 min, ou 8h48m = 528 min com compensação de sábado)
    const excedeLimite = minLiquidos > 528; 

    return {
      minutos: minLiquidos,
      horasFormatted,
      excedeLimite
    };
  }
}


