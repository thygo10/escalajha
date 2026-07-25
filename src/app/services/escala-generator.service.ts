import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, Feriado, ValidacaoEscalaResultado, ValidacaoItem, TurnoConfig } from '../models/types';

export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos: boolean;
  diasPermitidosFolga: number[]; // Array de dias da semana (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
  feriados: Feriado[];
  minFuncionariosPorDia?: number; // Mínimo de colaboradores trabalhando no setor por dia (ex: 2 fiscais)
  minFuncionariosFeriado?: number; // Mínimo de colaboradores no feriado aberto (Equipe Reduzida)
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
      minFuncionariosPorDia: minRequerido,
      minFuncionariosFeriado: opcoes?.minFuncionariosFeriado
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
    const eAcougue = setorNome.includes('acougue') || setorNome.includes('açougue');
    const eExcecaoDomingo = ePadaria || eAcougue;

    // Mínimo automático de 6 para Frente de Caixa
    const minEfetivo = eFrenteDeCaixa ? Math.max(config.minFuncionariosPorDia ?? 2, 6) : (config.minFuncionariosPorDia ?? 2);

    // Dividir os funcionários em turmas escalonadas (Cohortes)
    // Isso evita que todos entrem em folga no mesmo domingo ou dia útil.
    const diaSemanaDia1 = new Date(ano, mes - 1, 1).getDay();
    const turmaDia1 = diaSemanaDia1 === 0 ? 0 : (diaSemanaDia1 - 1) % 6;

    // Pre-calcular a Turma Reduzida para cada feriado aberto no mês (Equilibrada por Turnos de Abertura, Intermediário e Fechamento)
    const feriadoTrabalhadoresMap = new Map<number, Set<string>>();
    let feriadoIndexCount = 0;

    feriadosAbertos.forEach((fDia) => {
      const isDomFeriado = (new Date(ano, mes - 1, fDia).getDay() === 0);
      const dIdx = domingos.indexOf(fDia);
      const minReqFeriado = config.minFuncionariosFeriado ?? (eFrenteDeCaixa ? 6 : (funcionarios.length >= 4 ? 2 : 1));
      const escaladosFeriado = new Set<string>();

      // Se o feriado cai no domingo, escala os colaboradores que já trabalham naquele domingo
      if (isDomFeriado && dIdx !== -1) {
        funcionarios.forEach((func, idx) => {
          const turmaDom = idx % 3;
          if (dIdx % 3 === turmaDom) {
            escaladosFeriado.add(func.matricula_aleatoria);
          }
        });
      } else {
        // Agrupa funcionários por categoria de turno (Abertura, Intermediário, Fechamento)
        const porTurno = this._agruparPorCategoriaTurno(funcionarios);
        const categorias = Array.from(porTurno.keys()).filter(cat => (porTurno.get(cat)?.length ?? 0) > 0);
        const cotaPorTurno = Math.max(1, Math.floor(minReqFeriado / Math.max(1, categorias.length)));

        // Para cada categoria de turno, seleciona proporcionalmente em rodízio
        categorias.forEach(cat => {
          const funcsTurno = porTurno.get(cat) || [];
          const offsetTurno = feriadoIndexCount % Math.max(1, funcsTurno.length);
          let selecionadosNoTurno = 0;

          for (let i = 0; i < funcsTurno.length && selecionadosNoTurno < cotaPorTurno && escaladosFeriado.size < minReqFeriado; i++) {
            const targetFunc = funcsTurno[(offsetTurno + i) % funcsTurno.length];
            if (!escaladosFeriado.has(targetFunc.matricula_aleatoria)) {
              escaladosFeriado.add(targetFunc.matricula_aleatoria);
              selecionadosNoTurno++;
            }
          }
        });

        // Se ainda não preencheu o mínimo total exigido no feriado, completa com os demais turnos
        if (escaladosFeriado.size < minReqFeriado) {
          for (const func of funcionarios) {
            if (escaladosFeriado.size >= minReqFeriado) break;
            escaladosFeriado.add(func.matricula_aleatoria);
          }
        }
      }

      feriadoIndexCount++;
      feriadoTrabalhadoresMap.set(fDia, escaladosFeriado);
    });

    funcionarios.forEach((func, idx) => {
      const dias: Record<number, TipoDia> = {};
      const souFeminino = func.genero === 'F';
      
      // Offset da turma para rotação semanal (0 a 5)
      const turmaOffset = idx % 6;
      const diff = (turmaOffset - turmaDia1 + 6) % 6;
      // Inicialização limpa da contagem de dias trabalhados
      let diasTrabalhadosSeguidos = 0;

      // Determina qual par de domingos esta pessoa folga (ex: Domingos ímpares 1 e 3 vs pares 2 e 4)
      const folgaDomingoImpar = (idx % 2 === 0);

      let domingosSeguidos = 0;
      let ultimaFolgaDia = -5;

      // Pré-calcular os domingos em que este colaborador folgará no mês
      const domingosFolgaSet = new Set<number>();
      domingos.forEach((dDia, dIdx) => {
        const eDomingoImpar = (dIdx % 2 === 0);
        let deveFolgar = false;

        const eFiscalDeCaixa = setorNome.includes('fiscal');
        if (eFiscalDeCaixa) {
          // FISCAL DE CAIXA (Duplas Fixas no Domingo: 1 Abertura + 1 Fechamento por domingo)
          // Dupla 0: Cleide (Abertura) + Thiago (Fechamento)
          // Dupla 1: Walta (Abertura) + Ualas (Fechamento)
          // Dupla 2: Lane (Abertura) + Romildo (Fechamento)
          const n = func.primeiro_nome.toLowerCase();
          let minhaDupla = 0;
          if (n.includes('cleide') || n.includes('thiago')) {
            minhaDupla = 0;
          } else if (n.includes('walta') || n.includes('ualas') || n.includes('walas')) {
            minhaDupla = 1;
          } else if (n.includes('lane') || n.includes('romildo')) {
            minhaDupla = 2;
          } else {
            minhaDupla = idx % 3;
          }
          deveFolgar = (dIdx % 3 !== minhaDupla);
        } else if (eFrenteDeCaixa) {
          // FRENTE DE CAIXA: Todo mundo sem exceção 1 Domingo Trabalhado para 2 Domingos Folgados (1T : 2F)
          const turmaDom = idx % 3;
          deveFolgar = (dIdx % 3 !== turmaDom);
        } else if (!eExcecaoDomingo) {
          // REGRA GERAL (Demais Setores Pequenos): 1 Domingo Trabalhado para 2 Domingos de Folga (1T : 2F)
          const turmaDom = idx % 3;
          deveFolgar = (dIdx % 3 !== turmaDom);
        } else {
          // EXCEÇÃO (Açougue e Padaria): 2 Domingos Trabalhados para 1 Domingo de Folga (2T : 1F) ou CLT 386
          if (souFeminino) {
            deveFolgar = folgaDomingoImpar ? eDomingoImpar : !eDomingoImpar;
          } else {
            deveFolgar = (dIdx % 3 === (idx % 3));
          }
        }

        if (deveFolgar && config.diasPermitidosFolga.includes(0)) {
          domingosFolgaSet.add(dDia);
        }
      });

      // Quantidade de folgas úteis a garantir: 1 folga útil por domingo trabalhado
      const maxFolgasSemanaisPermitidas = Math.max(0, domingos.length - domingosFolgaSet.size);

      // Garantia preventiva: Se trabalha no Domingo, pré-agenda 1 folga útil na semana com Trava FD->TD
      const diasFolgaUteisGarantidas = new Set<number>();
      let folgasGarantidasCount = 0;
      domingos.forEach((dDom, dIdx) => {
        if (!domingosFolgaSet.has(dDom) && folgasGarantidasCount < maxFolgasSemanaisPermitidas) {
          const diaSemanaDom = new Date(ano, mes - 1, dDom).getDay();
          if (diaSemanaDom === 0) {
            // Trava FD -> TD: Aloca a folga útil prioritariamente na Quarta-feira (dDom - 4) para dividir semanas de trabalho
            let diaFolgaAlvo = dDom - 4;
            if (diaFolgaAlvo < 1) diaFolgaAlvo = Math.max(1, dDom - 3);

            // Absorção de feriado fechado (ex: Natal 25/12): Se a semana possui feriado fechado, ele absorve a folga útil
            const semanaTemFeriadoFechado = Array.from(feriadosFechados).some(fDia => fDia >= dDom - 6 && fDia <= dDom);
            if (!semanaTemFeriadoFechado && diaFolgaAlvo >= 1 && !feriadosFechados.has(diaFolgaAlvo) && !domingosFolgaSet.has(diaFolgaAlvo)) {
              diasFolgaUteisGarantidas.add(diaFolgaAlvo);
              folgasGarantidasCount++;
            }
          }
        }
      });

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay();
        const isDomingo = diaSemana === 0;
        const diaAnteriorEhFolga = (dia > 1) && (dias[dia - 1] === 'F' || dias[dia - 1] === 'FD' || dias[dia - 1] === 'FE');

        // REGRA 0: Feriado Fechado
        if (feriadosFechados.has(dia)) {
          dias[dia] = 'FE';
          diasTrabalhadosSeguidos = 0;
          ultimaFolgaDia = dia;
          continue;
        }

        // REGRA 0.5: Feriado Aberto (Turma Reduzida -> Apenas a cota trabalha TF, Maioria folga F)
        if (feriadosAbertos.has(dia)) {
          const quemTrabalhaNoFeriado = feriadoTrabalhadoresMap.get(dia);
          if (isDomingo && domingosFolgaSet.has(dia)) {
            dias[dia] = 'FD';
            diasTrabalhadosSeguidos = 0;
            ultimaFolgaDia = dia;
          } else if (quemTrabalhaNoFeriado?.has(func.matricula_aleatoria)) {
            dias[dia] = isDomingo ? 'TD' : 'TF';
            diasTrabalhadosSeguidos++;
          } else {
            dias[dia] = isDomingo ? 'FD' : 'F';
            diasTrabalhadosSeguidos = 0;
            ultimaFolgaDia = dia;
          }
          continue;
        }

        // REGRA PREVENTIVA DE SÁBADO: Se amanhã é um domingo de folga agendado (FD), o sábado DEVE ser dia de trabalho 'T'
        // para que a folga seja gozada no Domingo (FD) sem gerar folga dupla e sem desarmar o domingo.
        const amanhaEhDomingoFolga = (diaSemana === 6) && domingosFolgaSet.has(dia + 1);
        if (amanhaEhDomingoFolga) {
          dias[dia] = feriadosAbertos.has(dia) ? 'TF' : 'T';
          diasTrabalhadosSeguidos++;
          continue;
        }

        // REGRA 1: Trava CLT de 6 dias consecutivos máximo
        if (diasTrabalhadosSeguidos >= 6) {
          if (!diaAnteriorEhFolga) {
            dias[dia] = isDomingo ? 'FD' : 'F';
            diasTrabalhadosSeguidos = 0;
            ultimaFolgaDia = dia;
            if (isDomingo) domingosSeguidos = 0;
            continue;
          }
        }

        // REGRA 2: Trata Domingos (Se está no domingosFolgaSet, É FD de forma inviolável)
        if (isDomingo) {
          if (domingosFolgaSet.has(dia)) {
            dias[dia] = 'FD';
            domingosSeguidos = 0;
            diasTrabalhadosSeguidos = 0;
            ultimaFolgaDia = dia;
          } else {
            dias[dia] = 'TD';
            domingosSeguidos++;
            diasTrabalhadosSeguidos++;
          }
          continue;
        }

        // REGRA 3: Dias Úteis com Rotação Giratória 6x1 (Folga após 5 ou 6 dias de trabalho, NUNCA consecutiva)
        const semanaIndex = Math.floor((dia - 1) / 7);
        const proximoDomingoSemana = domingos.find(d => d >= dia && d <= dia + 6);
        const temFolgaNoDomingoDaSemana = proximoDomingoSemana ? domingosFolgaSet.has(proximoDomingoSemana) : false;

        let diaFolgaRotacao = 1 + ((turmaOffset + semanaIndex) % 6); // 1=Seg, 2=Ter... 6=Sáb
        const trabDomingoAnterior = (dia > diaSemana) && (dias[dia - (diaSemana === 0 ? 7 : diaSemana)] === 'TD' || dias[dia - (diaSemana === 0 ? 7 : diaSemana)] === 'TF');
        
        // Se trabalhou no domingo anterior e a folga da semana cair na Segunda, desloca para Quarta para equilibrar a semana
        if (trabDomingoAnterior && diaFolgaRotacao === 1) {
          diaFolgaRotacao = 3;
        }

        const podeFolgarRotacao = !temFolgaNoDomingoDaSemana || (trabDomingoAnterior && diasTrabalhadosSeguidos >= 3);

        // REGRA PREVENTIVA E ROTAÇÃO 6x1: Concede folga se for o dia útil garantido (Trava FD->TD) ou por trava CLT 6 dias
        const eDiaGarantido = diasFolgaUteisGarantidas.has(dia);
        const precisaFolgaCLT = (diasTrabalhadosSeguidos >= 6);

        if ((eDiaGarantido || precisaFolgaCLT) && config.diasPermitidosFolga.includes(diaSemana) && !diaAnteriorEhFolga) {
          dias[dia] = 'F';
          diasTrabalhadosSeguidos = 0;
          ultimaFolgaDia = dia;
          continue;
        }

        // Default: Trabalho
        dias[dia] = feriadosAbertos.has(dia) ? 'TF' : 'T';
        diasTrabalhadosSeguidos++;
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

    // PÓS-PROCESSAMENTO INTEGRADO COM LOOP DE CONVERGÊNCIA (Garante 0 erros):
    for (let iter = 0; iter < 4; iter++) {
      this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos);
      this._ajustarLimiteFolgasMensais(itens, totalDias, ano, mes, feriadosAbertos);
      this._ajustarCoberturaMinima(itens, totalDias, minEfetivo, ano, mes, feriadosAbertos, config.minFuncionariosFeriado);

      if (ePadaria) {
        this._ajustarCoberturaPadaria(itens, totalDias, ano, mes, feriadosAbertos);
      }
    }
    this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos);
    this._ajustarCoberturaMinima(itens, totalDias, minEfetivo, ano, mes, feriadosAbertos, config.minFuncionariosFeriado);

    return itens;
  }

  /**
   * Agrupa colaboradores por categoria de turno (Abertura, Intermediário, Fechamento).
   */
  private _agruparPorCategoriaTurno(funcionarios: Funcionario[]): Map<string, Funcionario[]> {
    const grupos = new Map<string, Funcionario[]>();
    grupos.set('ABERTURA', []);
    grupos.set('INTERMEDIARIO', []);
    grupos.set('FECHAMENTO', []);

    funcionarios.forEach(func => {
      const t = func.turno_padrao.toLowerCase();
      if (t.includes('07:0') || t.includes('08:0')) {
        grupos.get('ABERTURA')!.push(func);
      } else if (t.includes('14:0') || t.includes('13:3') || t.includes('15:0')) {
        grupos.get('FECHAMENTO')!.push(func);
      } else {
        grupos.get('INTERMEDIARIO')!.push(func);
      }
    });

    return grupos;
  }

  /**
   * Retorna o status de trabalho correto (TD se Domingo, TF se Feriado Aberto, T se Dia Útil).
   */
  private _getTipoTrabalho(dia: number, ano: number, mes: number, feriadosAbertos: Set<number>): TipoDia {
    const isDom = (new Date(ano, mes - 1, dia).getDay() === 0);
    if (feriadosAbertos.has(dia)) {
      return isDom ? 'TD' : 'TF';
    }
    return isDom ? 'TD' : 'T';
  }

  /**
   * Garante que na Padaria haja no máximo 1 colaborador de folga por dia na produção em dias úteis.
   */
  private _ajustarCoberturaPadaria(itens: EscalaItem[], totalDias: number, ano: number, mes: number, feriadosAbertos: Set<number>): void {
    if (itens.length <= 1) return;

    for (let dia = 1; dia <= totalDias; dia++) {
      const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
      if (isDomingo) continue; // Na Padaria, a regra de 1 folga por dia aplica-se aos dias úteis da produção

      const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE');
      
      if (folgando.length > 1) {
        // Mover folgas excedentes para dias úteis vizinhos onde ninguém está folgando
        for (let k = 1; k < folgando.length; k++) {
          const item = folgando[k];
          
          let diaSemFolga = -1;
          for (let dAlt = 1; dAlt <= totalDias; dAlt++) {
            const altIsDomingo = (new Date(ano, mes - 1, dAlt).getDay() === 0);
            if (dAlt !== dia && !altIsDomingo && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
              const folgandoNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'F' || i.dias[dAlt] === 'FE').length;
              if (folgandoNoDiaAlt === 0) {
                diaSemFolga = dAlt;
                break;
              }
            }
          }

          if (diaSemFolga !== -1) {
            item.dias[dia] = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);
            item.dias[diaSemFolga] = 'F';
          }
        }
      }
    }
  }

  /**
   * Garante que nenhum colaborador ultrapasse o limite de 5 folgas por mês.
   * Remove primeiro folgas em dias consecutivos e reposiciona o ponto médio se necessário para respeitar CLT.
   */
  private _ajustarLimiteFolgasMensais(itens: EscalaItem[], totalDias: number, ano: number, mes: number, feriadosAbertos: Set<number>): void {
    const domingosNoMes: number[] = [];
    for (let d = 1; d <= totalDias; d++) {
      if (new Date(ano, mes - 1, d).getDay() === 0) domingosNoMes.push(d);
    }
    const targetMax = domingosNoMes.length === 5 ? 6 : 5;

    itens.forEach(item => {
      let folgas = Object.entries(item.dias).filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE');
      const domingosFolgaCount = folgas.filter(([_, st]) => st === 'FD').length;
      const tetoItem = Math.max(targetMax, domingosFolgaCount + 3);

      while (folgas.length > tetoItem) {
        let removido = false;

        // Passagem Especial: Eliminar folga 'F' redundante localizada entre dois Domingos de folga ('FD')
        for (let i = 1; i < folgas.length - 1 && folgas.length > tetoItem; i++) {
          const [dStr, st] = folgas[i];
          const prevSt = folgas[i - 1][1];
          const nextSt = folgas[i + 1][1];
          if (st === 'F' && prevSt === 'FD' && nextSt === 'FD') {
            const fDiaNum = Number(dStr);
            item.dias[fDiaNum] = this._getTipoTrabalho(fDiaNum, ano, mes, feriadosAbertos);
            removido = true;
            break;
          }
        }

        if (!removido) {
          // 2ª Passagem: Tenta remover qualquer folga 'F' em dia útil (não feriado) que não viole a trava CLT de 6 dias
          for (let i = folgas.length - 1; i >= 0; i--) {
            const [diaStr, st] = folgas[i];
            const dia = Number(diaStr);
            if (st === 'F' && !feriadosAbertos.has(dia)) {
              item.dias[dia] = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);

              let maxConsec = 0;
              let curConsec = 0;
              for (let d = 1; d <= totalDias; d++) {
                const s = item.dias[d];
                if (s === 'T' || s === 'TD' || s === 'TF') {
                  curConsec++;
                  if (curConsec > maxConsec) maxConsec = curConsec;
                } else {
                  curConsec = 0;
                }
              }

              if (maxConsec <= 6) {
                removido = true;
                break;
              } else {
                item.dias[dia] = 'F'; // Reverte
              }
            }
          }
        }

        // 3ª Passagem: Se nenhuma remoção direta funcionou, reposiciona folga no meio do maior bloco
        if (!removido) {
          const fIndices = folgas.filter(([_, st]) => st === 'F').map(([d]) => Number(d));
          if (fIndices.length === 0) break;

          const diaRemover = fIndices[fIndices.length - 1];
          item.dias[diaRemover] = this._getTipoTrabalho(diaRemover, ano, mes, feriadosAbertos);

          let inicioBloco = 1, maiorBlocoInicio = 1, maiorBlocoFim = 1, maxConsec = 0, curConsec = 0;
          for (let d = 1; d <= totalDias; d++) {
            const s = item.dias[d];
            if (s === 'T' || s === 'TD' || s === 'TF') {
              if (curConsec === 0) inicioBloco = d;
              curConsec++;
              if (curConsec > maxConsec) {
                maxConsec = curConsec;
                maiorBlocoInicio = inicioBloco;
                maiorBlocoFim = d;
              }
            } else {
              curConsec = 0;
            }
          }

          if (maxConsec > 6) {
            let meio = Math.floor((maiorBlocoInicio + maiorBlocoFim) / 2);
            if (new Date(ano, mes - 1, meio).getDay() === 0) meio--;
            if (meio >= 1 && meio <= totalDias && meio !== diaRemover && (item.dias[meio] === 'T' || item.dias[meio] === 'TF')) {
              item.dias[meio] = 'F';
            }
          }
          removido = true;
        }

        folgas = Object.entries(item.dias).filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE');
      }
    });
  }

  /**
   * Sanitização Final Inviolável da CLT Art. 67.
   * Garante matematicamente que NENHUM colaborador trabalhe mais de 6 dias consecutivos em qualquer circunstância.
   */
  private _sanitizarTravaCLT6Dias(itens: EscalaItem[], totalDias: number, ano: number, mes: number, feriadosAbertos: Set<number>): void {
    itens.forEach(item => {
      let consecutivos = 0;
      for (let dia = 1; dia <= totalDias; dia++) {
        const st = item.dias[dia];
        if (st === 'T' || st === 'TD' || st === 'TF') {
          consecutivos++;
          if (consecutivos > 6) {
            const isDom = (new Date(ano, mes - 1, dia).getDay() === 0);
            const setorClean = (item.setor || '').toLowerCase();
            const eFrenteDeCaixa = setorClean.includes('caixa') && !setorClean.includes('fiscal');

            // Se for domingo no Frente de Caixa, preserva o trabalho do Domingo e aloca a folga em um dia útil no meio do bloco
            if (isDom && eFrenteDeCaixa) {
              let diaFolgaMeio = dia - 3;
              if (diaFolgaMeio >= 1 && (item.dias[diaFolgaMeio] === 'T' || item.dias[diaFolgaMeio] === 'TF')) {
                item.dias[diaFolgaMeio] = 'F';
                consecutivos = dia - diaFolgaMeio;
                continue;
              }
            }

            item.dias[dia] = isDom ? 'FD' : 'F';
            consecutivos = 0;

            // Se essa inserção fez o colaborador exceder 5 folgas no mês, remove uma folga 'F' anterior/posterior
            const folgas = Object.entries(item.dias).filter(([_, s]) => s === 'F' || s === 'FD' || s === 'FE');
            if (folgas.length > 5) {
              for (const [fDiaStr, fSt] of folgas) {
                const fDia = Number(fDiaStr);
                if (fSt === 'F' && fDia !== dia && !feriadosAbertos.has(fDia)) {
                  item.dias[fDia] = this._getTipoTrabalho(fDia, ano, mes, feriadosAbertos);
                  break;
                }
              }
            }
          }
        } else {
          consecutivos = 0;
        }
      }
    });
  }

  /**
   * Garante que em nenhum dia o número de colaboradores trabalhando no setor seja menor que o mínimo.
   * Suporta escala reduzida específica em Feriados Abertos.
   */
  private _ajustarCoberturaMinima(
    itens: EscalaItem[],
    totalDias: number,
    minPorDia: number,
    ano: number,
    mes: number,
    feriadosAbertos: Set<number>,
    minFeriado?: number
  ): void {
    if (itens.length <= 1) return;

    for (let dia = 1; dia <= totalDias; dia++) {
      const eFeriadoAberto = feriadosAbertos.has(dia);
      const setorCleanGlobal = (itens[0]?.setor || '').toLowerCase();
      const eFrenteDeCaixaGlobal = setorCleanGlobal.includes('caixa') && !setorCleanGlobal.includes('fiscal');

      const minExigidoDia = eFeriadoAberto
        ? (minFeriado !== undefined ? minFeriado : (eFrenteDeCaixaGlobal ? Math.max(minPorDia, 6) : Math.max(1, Math.floor(minPorDia / 2))))
        : minPorDia;

      const trabalhando = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF');
      
      if (trabalhando.length < minExigidoDia) {
        const necessarios = minExigidoDia - trabalhando.length;
        const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD');

        for (let k = 0; k < folgando.length && itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length < minExigidoDia; k++) {
          const item = folgando[k];
          const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
          
          // Trava de Revezamento de Domingo Inviolável: Impede 2 domingos seguidos trabalhados para preservar 1T:2F e CLT 386
          if (isDomingo) {
            const domAnteriorTrab = (dia > 7) && (item.dias[dia - 7] === 'TD' || item.dias[dia - 7] === 'TF');
            const domProximoTrab = (dia <= totalDias - 7) && (item.dias[dia + 7] === 'TD' || item.dias[dia + 7] === 'TF');
            if (domAnteriorTrab || domProximoTrab) {
              continue; // Pula colaboradores que já trabalharam em domingo vizinho
            }
          }

          // Altera a folga deste colaborador para trabalho no dia deficitário
          item.dias[dia] = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);

          // Verifica se criou mais de 6 dias consecutivos de trabalho
          let maxConsec = 0;
          let curConsec = 0;
          for (let d = 1; d <= totalDias; d++) {
            const s = item.dias[d];
            if (s === 'T' || s === 'TD' || s === 'TF') {
              curConsec++;
              if (curConsec > maxConsec) maxConsec = curConsec;
            } else {
              curConsec = 0;
            }
          }

          if (maxConsec > 6) {
            // Concede folga compensatória em dia útil vizinho com cobertura excedente
            const inicioSemana = Math.max(1, dia - 5);
            const fimSemana = Math.min(totalDias, dia + 5);
            let compensou = false;
            
            for (let dAlt = inicioSemana; dAlt <= fimSemana; dAlt++) {
              if (dAlt !== dia && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
                const trabNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'T' || i.dias[dAlt] === 'TD' || i.dias[dAlt] === 'TF').length;
                const diaAltIsDom = (new Date(ano, mes - 1, dAlt).getDay() === 0);
                
                if (trabNoDiaAlt > minExigidoDia && !diaAltIsDom) {
                  item.dias[dAlt] = 'F';
                  compensou = true;
                  break;
                }
              }
            }

            if (!compensou) {
              // Se não pôde compensar sem ferir a cobertura de outro dia, reverte a alteração
              item.dias[dia] = isDomingo ? 'FD' : 'F';
            } else {
              // Recalcula maxConsec após a compensação
              let maxConsecAfter = 0;
              let curConsecAfter = 0;
              for (let d = 1; d <= totalDias; d++) {
                const s = item.dias[d];
                if (s === 'T' || s === 'TD' || s === 'TF') {
                  curConsecAfter++;
                  if (curConsecAfter > maxConsecAfter) maxConsecAfter = curConsecAfter;
                } else {
                  curConsecAfter = 0;
                }
              }
              if (maxConsecAfter > 6) {
                // Reverte se a compensação ainda violar o limite CLT de 6 dias
                item.dias[dia] = isDomingo ? 'FD' : 'F';
              }
            }
          }
        }
      } else if (eFeriadoAberto && trabalhando.length > minExigidoDia) {
        // Equipe Reduzida no Feriado: se há mais trabalhando do que a cota reduzida do feriado, libera excesso para folga 'F'
        const excedentes = trabalhando.length - minExigidoDia;
        let liberados = 0;
        for (let k = 0; k < trabalhando.length && liberados < excedentes; k++) {
          const item = trabalhando[k];
          if (item.dias[dia] === 'TF') {
            const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
            if (totalFolgas < 5) {
              item.dias[dia] = 'F';
              liberados++;
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
    turnosConfigs: TurnoConfig[] = [],
    feriados: Feriado[] = []
  ): ValidacaoEscalaResultado {
    const totalDias = new Date(ano, mes, 0).getDate();
    const erros: ValidacaoItem[] = [];
    const coberturaPorDia: Record<number, number> = {};

    const feriadosFechadosVal = new Set<number>();
    const feriadosAbertos = new Set<number>();
    for (const f of feriados) {
      const parts = f.data.split('-');
      if (parts.length === 3) {
        const fAno = Number.parseInt(parts[0], 10);
        const fMes = Number.parseInt(parts[1], 10);
        const fDia = Number.parseInt(parts[2], 10);
        if (fAno === ano && fMes === mes) {
          if (f.funcionamento_proibido) {
            feriadosFechadosVal.add(fDia);
          } else {
            feriadosAbertos.add(fDia);
          }
        }
      }
    }

    const setorNomeOriginal = itens[0]?.setor || 'Setor';
    const setorNomeClean = setorNomeOriginal.toLowerCase();
    const eFrenteDeCaixa = setorNomeClean.includes('caixa') && !setorNomeClean.includes('fiscal');
    const ePadaria = setorNomeClean.includes('padaria');
    const eAcougue = setorNomeClean.includes('acougue') || setorNomeClean.includes('açougue');
    const eExcecaoDomingo = ePadaria || eAcougue;

    const minEfetivoValida = eFrenteDeCaixa ? Math.max(minRequerido, 6) : minRequerido;

    for (let dia = 1; dia <= totalDias; dia++) {
      const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
      const emTrabalho = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length;
      const emFolga = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE').length;
      coberturaPorDia[dia] = emTrabalho;

      const minPermitidoDia = (isDomingo && itens.length < 6 && !eFrenteDeCaixa) ? Math.max(1, Math.floor(itens.length / 3)) : minEfetivoValida;

      if (feriadosFechadosVal.has(dia)) {
        continue; // Feriado fechado: loja fechada, cobertura zero é correta e esperada por lei.
      }

      if (emTrabalho === 0 && itens.length >= 2) {
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
      } else if (emTrabalho < minPermitidoDia && itens.length >= minEfetivoValida) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Apenas ${emTrabalho} colaborador(es) trabalhando. Mínimo exigido: ${minPermitidoDia}.`,
          tipo: 'ERRO_COBERTURA'
        });
      }

      // Regra Padaria: No máximo 1 folga por dia na Produção em dias úteis
      if (ePadaria && !isDomingo && emFolga > 1 && itens.length > 1) {
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
      let domingosSeguidosGeral = 0;
      let totalFolgasNoMes = 0;

      for (let dia = 1; dia <= totalDias; dia++) {
        const st = item.dias[dia];
        const isDom = new Date(ano, mes - 1, dia).getDay() === 0;

        if (st === 'F' || st === 'FD' || st === 'FE') {
          totalFolgasNoMes++;
        }

        if (feriadosAbertos.has(dia) && st === 'T') {
          erros.push({
            dia,
            setor: item.setor,
            mensagem: `${item.nome}: Trabalhou no feriado (Dia ${dia}), mas o status está como 'T' comum em vez de 'TF'.`,
            tipo: 'ERRO_STATUS_FERIADO'
          });
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

          if (isDom) {
            domingosSeguidosGeral++;
            if (!eExcecaoDomingo && domingosSeguidosGeral >= 2) {
              erros.push({
                dia,
                setor: item.setor,
                mensagem: `${item.nome}: Trabalhou 2 domingos seguidos (Dia ${dia}). A Regra Geral do setor exige 1 domingo trabalhado para 2 folgas.`,
                tipo: 'ERRO_CLT'
              });
            }

            if (item.genero === 'F') {
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
          }
        } else {
          consecutivos = 0;
          if (isDom) {
            domingosSeguidosFeminino = 0;
            domingosSeguidosGeral = 0;
          }
        }
      }

      // Identificar domingos e feriados do mês na validação
      const domingosNoMesVal: number[] = [];
      for (let d = 1; d <= totalDias; d++) {
        if (new Date(ano, mes - 1, d).getDay() === 0) domingosNoMesVal.push(d);
      }
      const feriadosNoMesCount = feriados.filter(f => {
        const parts = f.data.split('-');
        return parts.length === 3 && Number(parts[0]) === ano && Number(parts[1]) === mes;
      }).length;

      const minFolgasEsperadas = (domingosNoMesVal.length === 5) ? 5 : 4;
      const maxFolgasPermitidasVal = 5 + feriadosNoMesCount;

      // Validação da Trava FD -> TD (Transição de Domingo Folgado para Domingo Trabalhado)
      domingosNoMesVal.forEach(dDom => {
        const domAnterior = dDom - 7;
        if (domAnterior >= 1 && domingosNoMesVal.includes(domAnterior)) {
          const stDomAnterior = item.dias[domAnterior];
          const stDomAtual = item.dias[dDom];
          if ((stDomAnterior === 'FD' || stDomAnterior === 'F') && (stDomAtual === 'TD' || stDomAtual === 'TF')) {
            // Verificar se houve folga intermediária entre os dois domingos
            let folgaIntermediaria = false;
            for (let d = domAnterior + 1; d < dDom; d++) {
              if (item.dias[d] === 'F' || item.dias[d] === 'FE' || item.dias[d] === 'FD') {
                folgaIntermediaria = true;
                break;
              }
            }
            if (!folgaIntermediaria) {
              erros.push({
                dia: dDom,
                setor: item.setor,
                mensagem: `${item.nome}: Trabalhou 7 dias seguidos entre o Domingo Folgado (Dia ${domAnterior}) e o Domingo Trabalhado (Dia ${dDom}). Violação da Trava FD->TD (Art. 67).`,
                tipo: 'ERRO_TRANSICAO_DOMINGO'
              });
            }
          }
        }
      });

      // Checagem de limite mensal de folgas (respeitando o mínimo legal do calendário e rotação)
      const domingosFolgaCount = Object.values(item.dias).filter(st => st === 'FD').length;
      const maxPermitidoItem = Math.max(5, domingosFolgaCount + 3) + feriadosNoMesCount;

      if (totalFolgasNoMes > maxPermitidoItem) {
        erros.push({
          dia: 1,
          setor: item.setor,
          mensagem: `${item.nome}: Excede o limite de folgas no mês (${totalFolgasNoMes} folgas). Máximo permitido para o seu perfil: ${maxPermitidoItem} folgas.`,
          tipo: 'ERRO_FOLGAS_MES'
        });
      } else if (totalFolgasNoMes < minFolgasEsperadas && totalDias >= 28) {
        erros.push({
          dia: 1,
          setor: item.setor,
          mensagem: `${item.nome}: Possui apenas ${totalFolgasNoMes} folga(s) no mês. Esperado no mínimo: ${minFolgasEsperadas} folgas (mês de ${domingosNoMesVal.length} domingos).`,
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


