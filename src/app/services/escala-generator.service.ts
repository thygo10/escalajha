import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, Feriado, ValidacaoEscalaResultado, ValidacaoItem, TurnoConfig, ModeloEscala, EstadoTransicao, EventoAfastamento, RegraConformidade, HorarioPresenca, ResumoFuncionarioMetrics } from '../models/types';

export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos: boolean;
  diasPermitidosFolga: number[]; // Array de dias da semana (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
  feriados: Feriado[];
  minFuncionariosPorDia?: number; // Mínimo de colaboradores trabalhando no setor por dia (ex: 2 fiscais)
  minFuncionariosFeriado?: number; // Mínimo de colaboradores no feriado aberto (Equipe Reduzida)
  minOperadoresPorHora?: number; // Mínimo de colaboradores ativos por faixa horária (ex: 2 por hora nas faixas operacionais)
  modeloEscala?: ModeloEscala;
  estadosTransicao?: Map<string, EstadoTransicao>;
  afastamentos?: EventoAfastamento[];
  regrasConformidade?: RegraConformidade[];
  historicoMesAnterior?: Record<string, TipoDia[]>;
  turnosConfigs?: TurnoConfig[];
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
   * 2. Revezamento feminino quinzenal (1 domingo trab -> 1 domingo folga - CLT Art. 386) em Padaria e Açougue.
   * 3. Regra Geral 1T:2F (1 domingo trab -> 2 domingos folga) para todos os colaboradores nos demais setores.
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

    // Identificar setor para aplicar regras dinâmicas (priorizando o setor alvo em equipes com cobertura)
    const candFiscal = funcionarios.find(f => f.setor.toLowerCase().includes('fiscal'));
    const setorNome = (candFiscal ? candFiscal.setor : (funcionarios[0]?.setor || '')).toLowerCase();
    const eFrenteDeCaixa = setorNome.includes('caixa') && !setorNome.includes('fiscal');
    const eFiscalDeCaixa = setorNome.includes('fiscal');
    const ePadaria = setorNome.includes('padaria');
    const eAcougue = setorNome.includes('acougue') || setorNome.includes('açougue');
    const eExcecaoDomingo = ePadaria || eAcougue;
    const eAdmSetor = setorNome.includes('adm') || setorNome.includes('geren') || setorNome.includes('gerên');

    // Mínimo automático de 6 para Frente de Caixa e 1 para ADM
    const minEfetivo = eFrenteDeCaixa ? Math.max(config.minFuncionariosPorDia ?? 2, 6) : (eAdmSetor ? 1 : (config.minFuncionariosPorDia ?? 2));

    // Dividir os funcionários em turmas escalonadas (Cohortes)
    // Isso evita que todos entrem em folga no mesmo domingo ou dia útil.
    const diaSemanaDia1 = new Date(ano, mes - 1, 1).getDay();
    const turmaDia1 = diaSemanaDia1 === 0 ? 0 : (diaSemanaDia1 - 1) % 6;

    // Pre-calcular a Turma Reduzida para cada feriado aberto no mês (Equilibrada por Turnos de Abertura, Intermediário e Fechamento)
    const feriadoTrabalhadoresMap = new Map<number, Set<string>>();
    let feriadoIndexCount = 0;

    const eFrenteDeCaixaSetor = setorNome.includes('caixa') && !setorNome.includes('fiscal');
    const ePadariaSetorFeriado = setorNome.toLowerCase().includes('padaria');
    const minPadariaFeriado = ePadariaSetorFeriado ? Math.max(1, funcionarios.length - Math.max(1, Math.ceil(funcionarios.length / 6))) : 0;
    const minCaixaFeriado = eFrenteDeCaixaSetor ? 6 : 0;
    const cotaFeriado = Math.max(minCaixaFeriado, minPadariaFeriado, config.minFuncionariosFeriado ?? 0, Math.ceil(funcionarios.length * 0.3));

    feriadosAbertos.forEach((fDia) => {
      const isDomFeriado = (new Date(ano, mes - 1, fDia).getDay() === 0);
      const dIdx = domingos.indexOf(fDia);
      const minReqFeriado = Math.max(cotaFeriado, config.minFuncionariosFeriado ?? (eFrenteDeCaixa ? 6 : (funcionarios.length >= 4 ? 2 : 1)));
      const escaladosFeriado = new Set<string>();

      // Se o feriado cai no domingo, escala os colaboradores que já trabalham naquele domingo
      if (isDomFeriado && dIdx !== -1) {
        const eFiscalDeCaixa = setorNome.includes('fiscal');
        funcionarios.forEach((func, idx) => {
          const souFeminino = func.genero === 'F';
          const folgaDomingoImpar = (idx % 2 === 0);
          const eDomingoImpar = (dIdx % 2 === 0);

          let deveFolgar = false;
          if (eFiscalDeCaixa) {
            const totalDuplas = Math.max(1, Math.ceil(funcionarios.length / 2));
            const minhaDupla = Math.floor(idx / 2) % totalDuplas;
            deveFolgar = (dIdx % totalDuplas !== minhaDupla);
          } else if (eExcecaoDomingo) {
            if (souFeminino) {
              deveFolgar = folgaDomingoImpar ? eDomingoImpar : !eDomingoImpar;
            } else {
              deveFolgar = (dIdx % 3 === (idx % 3));
            }
          } else {
            const ratio = souFeminino ? 2 : 3;
            const turmaDom = idx % ratio;
            deveFolgar = (dIdx % ratio !== turmaDom);
          }

          if (!deveFolgar) {
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

    const porTurnoMap = this._agruparPorCategoriaTurno(funcionarios);
    const funcIndexNoTurno = new Map<string, number>();
    porTurnoMap.forEach((funcsInTurno) => {
      funcsInTurno.forEach((f, iTurno) => {
        funcIndexNoTurno.set(f.matricula_aleatoria, iTurno);
      });
    });

    funcionarios.forEach((func, idx) => {
      const dias: Record<number, TipoDia> = {};
      const souFeminino = func.genero === 'F';
      const idxNoTurno = funcIndexNoTurno.get(func.matricula_aleatoria) ?? idx;
      
      // Offset da turma para rotação semanal (0 a 5)
      const turmaOffset = idx % 6;
      const diff = (turmaOffset - turmaDia1 + 6) % 6;

      // Inicialização da contagem de dias trabalhados seguidos a partir do histórico do mês anterior
      let diasTrabalhadosSeguidos = 0;
      if (opcoes?.historicoMesAnterior && opcoes.historicoMesAnterior[func.matricula_aleatoria]) {
        const histAnt = opcoes.historicoMesAnterior[func.matricula_aleatoria];
        for (let hIdx = histAnt.length - 1; hIdx >= 0; hIdx--) {
          const sAnt = histAnt[hIdx];
          if (sAnt === 'T' || sAnt === 'TD' || sAnt === 'TF') {
            diasTrabalhadosSeguidos++;
          } else {
            break;
          }
        }
      }

      const maxDiasConsecutivosPermitidos = config.modeloEscala === '5x1' ? 5 : 6;

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
          // FISCAL DE CAIXA (Duplas Dinâmicas no Domingo: 1 Abertura + 1 Fechamento por domingo)
          // Agrupa colaboradores dinamicamente em duplas pelo índice na lista (100% dinâmico, sem nomes hardcoded)
          const totalDuplas = Math.max(1, Math.ceil(funcionarios.length / 2));
          const minhaDupla = Math.floor(idx / 2) % totalDuplas;
          deveFolgar = (dIdx % totalDuplas !== minhaDupla);
        } else if (eExcecaoDomingo) {
          // EXCEÇÃO (Açougue e Padaria): 2 Domingos Trabalhados para 1 Domingo de Folga (2T : 1F) para homens ou CLT 386 para mulheres
          if (souFeminino) {
            deveFolgar = folgaDomingoImpar ? eDomingoImpar : !eDomingoImpar;
          } else {
            deveFolgar = (dIdx % 3 === (idx % 3));
          }
        } else {
          // REGRA GERAL UNIFICADA (Frente de Caixa, Reposição, Depósito, Hortifrúti, ADM, etc.):
          // Mulheres: Revezamento 1T:1F alternado (CLT Art. 386). Homens: Revezamento 1T:2F (Convenção Coletiva).
          const femaleIndex = funcionarios.filter((f, i) => f.genero === 'F' && i < idx).length;
          const ratio = souFeminino ? 2 : 3;
          const turmaDom = souFeminino ? (femaleIndex % 2) : (idx % ratio);
          deveFolgar = (dIdx % ratio !== turmaDom);
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
      const ePadariaSetor = setorNome.toLowerCase().includes('padaria');

      domingos.forEach((dDom, dIdx) => {
        if (!domingosFolgaSet.has(dDom) && folgasGarantidasCount < maxFolgasSemanaisPermitidas) {
          const diaSemanaDom = new Date(ano, mes - 1, dDom).getDay();
          if (diaSemanaDom === 0) {
            let diaFolgaAlvo: number;
            const domAnteriorEhFolga = domingosFolgaSet.has(dDom - 7);
            if (dDom < 7) {
              diaFolgaAlvo = dDom + 1 + (idxNoTurno % 3);
            } else if (ePadariaSetor) {
              const offsetsPadaria = [-6, -5, -4, -3, -2, -1]; // Seg, Ter, Qua, Qui, Sex, Sáb
              diaFolgaAlvo = dDom + offsetsPadaria[idxNoTurno % offsetsPadaria.length];
            } else if (domAnteriorEhFolga) {
              // Se o domingo anterior foi folga, agenda a folga útil no meio/fim da semana (Qua, Qui, Sex) para evitar a folga picada no Terça (apenas 1 dia trabalhado)
              diaFolgaAlvo = dDom - 4 + (idxNoTurno % 3);
            } else {
              diaFolgaAlvo = dDom - 5 + (idxNoTurno % 4);
            }

            if (diaFolgaAlvo < 1 || feriadosFechados.has(diaFolgaAlvo)) {
              diaFolgaAlvo = Math.min(totalDias, dDom + 2 + (idxNoTurno % 3));
            }

            if (diaFolgaAlvo < 1) diaFolgaAlvo = Math.max(1, dDom - 4);

            // Absorção de feriado fechado (ex: Natal 25/12)
            if (diaFolgaAlvo >= 1 && !feriadosFechados.has(diaFolgaAlvo) && !domingosFolgaSet.has(diaFolgaAlvo)) {
              diasFolgaUteisGarantidas.add(diaFolgaAlvo);
              folgasGarantidasCount++;
            }
          }
        }
      });

      // Pré-calcular mapa de afastamentos e férias para este funcionário
      const afastamentosFuncMap = new Map<number, TipoDia>();
      if (opcoes?.afastamentos) {
        opcoes.afastamentos.forEach(af => {
          if (af.matricula === func.matricula_aleatoria) {
            const [sY, sM, sD] = af.data_inicio.split('-').map(Number);
            const [eY, eM, eD] = af.data_fim.split('-').map(Number);
            const dInicio = new Date(sY, sM - 1, sD);
            const dFim = new Date(eY, eM - 1, eD);

            for (let d = 1; d <= totalDias; d++) {
              const curDate = new Date(ano, mes - 1, d);
              if (curDate >= dInicio && curDate <= dFim) {
                afastamentosFuncMap.set(d, af.tipo === 'FERIAS' ? 'FR' : 'AF');
              }
            }
          }
        });
      }

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay();
        const isDomingo = diaSemana === 0;
        const diaAnteriorEhFolga = (dia > 1) && (dias[dia - 1] === 'F' || dias[dia - 1] === 'FD' || dias[dia - 1] === 'FE' || dias[dia - 1] === 'AF' || dias[dia - 1] === 'FR');

        // REGRA 0.0: Afastamento ou Férias do Colaborador
        if (afastamentosFuncMap.has(dia)) {
          dias[dia] = afastamentosFuncMap.get(dia)!;
          diasTrabalhadosSeguidos = 0;
          ultimaFolgaDia = dia;
          continue;
        }

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

        // REGRA 1: Trava CLT/CCT de dias consecutivos máximo (6 para 6x1 ou 5 para 5x1)
        if (diasTrabalhadosSeguidos >= maxDiasConsecutivosPermitidos) {
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
        const proximoDomingoSemana = domingos.find(d => d >= dia && d <= dia + 6);
        const temFolgaNoDomingoDaSemana = proximoDomingoSemana ? domingosFolgaSet.has(proximoDomingoSemana) : false;

        const inicioSemana = Math.floor((dia - 1) / 7) * 7 + 1;
        const fimSemana = Math.min(totalDias, inicioSemana + 6);
        const temFolgaGarantidaNaSemana = Array.from(diasFolgaUteisGarantidas).some(d => d >= inicioSemana && d <= fimSemana);

        const podeFolgarRotacao = !temFolgaNoDomingoDaSemana && !temFolgaGarantidaNaSemana;

        const eDiaGarantido = diasFolgaUteisGarantidas.has(dia);
        const precisaFolgaCLT = (diasTrabalhadosSeguidos >= 6);
        const diaProximoEhFolga = (dia < totalDias) && (dias[dia + 1] === 'F' || dias[dia + 1] === 'FD' || dias[dia + 1] === 'FE');

        if ((eDiaGarantido || (podeFolgarRotacao && precisaFolgaCLT)) && config.diasPermitidosFolga.includes(diaSemana) && !diaAnteriorEhFolga && !diaProximoEhFolga) {
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
        this._ajustarCoberturaPadaria(itens, totalDias, ano, mes, feriadosAbertos, feriadosFechados);
      }
    }
    this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos);
    this._ajustarCoberturaMinima(itens, totalDias, minEfetivo, ano, mes, feriadosAbertos, config.minFuncionariosFeriado);
    // Garantia de Cobertura Mínima no Domingo (Evita Domingo Zerado sem violar CLT)
    domingos.forEach(dDom => {
      if (!feriadosFechados.has(dDom) && itens.length > 1) {
        const trabDom = itens.filter(i => i.dias[dDom] === 'TD' || i.dias[dDom] === 'TF' || i.dias[dDom] === 'T').length;
        if (trabDom === 0) {
          for (const item of itens) {
            const domAntTrab = (dDom > 7) && (item.dias[dDom - 7] === 'TD' || item.dias[dDom - 7] === 'TF');
            const domProxTrab = (dDom <= totalDias - 7) && (item.dias[dDom + 7] === 'TD' || item.dias[dDom + 7] === 'TF');
            const podeTrabalharDom = (item.genero === 'F') ? !domAntTrab : (!domAntTrab && !domProxTrab);

            if (podeTrabalharDom) {
              item.dias[dDom] = feriadosAbertos.has(dDom) ? 'TF' : 'TD';
              break;
            }
          }
        }
      }
    });

    if (eFiscalDeCaixa) {
      domingos.forEach(dDom => {
        if (!feriadosFechados.has(dDom) && itens.length >= 2) {
          const trabDomItens = itens.filter(i => i.dias[dDom] === 'TD' || i.dias[dDom] === 'TF' || i.dias[dDom] === 'T');
          if (trabDomItens.length > 2) {
            for (let k = 2; k < trabDomItens.length; k++) {
              trabDomItens[k].dias[dDom] = 'FD';
            }
          } else if (trabDomItens.length < 2) {
            for (const item of itens) {
              if (itens.filter(i => i.dias[dDom] === 'TD' || i.dias[dDom] === 'TF' || i.dias[dDom] === 'T').length >= 2) break;
              if (item.dias[dDom] === 'FD' || item.dias[dDom] === 'F') {
                const domAntTrab = (dDom > 7) && (item.dias[dDom - 7] === 'TD' || item.dias[dDom - 7] === 'TF' || item.dias[dDom - 7] === 'T');
                if (!domAntTrab) {
                  item.dias[dDom] = feriadosAbertos.has(dDom) ? 'TF' : 'TD';
                }
              }
            }
          }
        }
      });
    }

    this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos, opcoes?.historicoMesAnterior);
    if (ePadaria) {
      this._ajustarCoberturaPadaria(itens, totalDias, ano, mes, feriadosAbertos, feriadosFechados);
      this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos, opcoes?.historicoMesAnterior);
    }

    this._ajustarCoberturaHoraria(itens, totalDias, ano, mes, feriadosAbertos, feriadosFechados, opcoes?.turnosConfigs, config.minOperadoresPorHora);
    this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos, opcoes?.historicoMesAnterior);
    this._sanitizarTravaCLT6Dias(itens, totalDias, ano, mes, feriadosAbertos, opcoes?.historicoMesAnterior);

    if (eFiscalDeCaixa) {
      domingos.forEach(dDom => {
        if (!feriadosFechados.has(dDom) && itens.length >= 2) {
          const trabDomItens = itens.filter(i => i.dias[dDom] === 'TD' || i.dias[dDom] === 'TF' || i.dias[dDom] === 'T');
          if (trabDomItens.length > 2) {
            for (let k = 2; k < trabDomItens.length; k++) {
              trabDomItens[k].dias[dDom] = 'FD';
            }
          }
        }
      });
    }

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
      // Classificação abrangente de turnos:
      // FECHAMENTO: Turnos terminando a partir das 20:00 (ex: 21:30, 21:00, 22:00, 20:00) ou contendo os termos de fechamento
      const eFechamento = t.includes('21:') || t.includes('22:') || t.includes('20:') ||
                          t.includes('14:0') || t.includes('13:3') || t.includes('15:0') || t.includes('fechamento');
      const eAbertura = t.includes('07:0') || t.includes('08:0') || t.includes('abertura');

      if (eFechamento && !eAbertura) {
        grupos.get('FECHAMENTO')!.push(func);
      } else if (eAbertura) {
        grupos.get('ABERTURA')!.push(func);
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
   * Garante cobertura horária mínima (ex: 6 operadores em Frente de Caixa em todas as faixas horárias do funcionamento).
   */
  private _ajustarCoberturaHoraria(
    itens: EscalaItem[],
    totalDias: number,
    ano: number,
    mes: number,
    feriadosAbertos: Set<number>,
    feriadosFechados: Set<number>,
    turnosConfigs: TurnoConfig[] = [],
    minOperadoresPorHora?: number
  ): void {
    if (itens.length === 0) return;

    const setorCleanGlobal = (itens[0]?.setor || '').toLowerCase();
    const eFrenteDeCaixaGlobal = setorCleanGlobal.includes('caixa') && !setorCleanGlobal.includes('fiscal');
    const eFiscalGlobal = setorCleanGlobal.includes('fiscal');
    if (eFiscalGlobal) return;

    const minReqHoraPadrao = minOperadoresPorHora ?? (eFrenteDeCaixaGlobal ? 6 : 0);
    if (minReqHoraPadrao <= 0) return;

    const tConfigs = (turnosConfigs && turnosConfigs.length > 0) ? turnosConfigs : [
      { id: 't1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
      { id: 't2', nome: '09:00 às 17:50 (Almoço 13:00 às 14:30)', entrada: '09:00', saida: '17:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
      { id: 't3', nome: '12:40 às 21:30 (Almoço 14:20 às 15:50)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
      { id: 't4', nome: '12:40 às 21:30 (Almoço 15:30 às 17:00)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false }
    ];

    for (let outer = 0; outer < 3; outer++) {
      for (let dia = 1; dia <= totalDias; dia++) {
        if (feriadosFechados.has(dia)) continue;

      const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
      const eFeriadoAberto = feriadosAbertos.has(dia);

      const horaInicio = isDomingo ? 8 : 7;
      const horaFim = isDomingo ? 20 : 21;

      const minReqDia = (eFeriadoAberto || isDomingo) ? Math.min(minReqHoraPadrao, 4) : minReqHoraPadrao;
      if (itens.length < minReqDia) continue;

      for (let iter = 0; iter < 4; iter++) {
        const presenca = this.calcularPresencaPorFaixaHoraria(itens, tConfigs, dia);

        let faixaDeficit: HorarioPresenca | undefined;
        for (const p of presenca) {
          const h = Number.parseInt(p.horaStr.split(':')[0], 10);
          if (h >= horaInicio && h < horaFim && p.quantidadeTrabalhando < minReqDia) {
            faixaDeficit = p;
            break;
          }
        }

        if (!faixaDeficit) break;

        const hDeficit = Number.parseInt(faixaDeficit.horaStr.split(':')[0], 10);

        const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD');
        if (folgando.length === 0) break;

        const candidatos = folgando.slice().sort((a, b) => {
          const cobreA = this._itemCobreHoraEmTrabalho(a, hDeficit, tConfigs);
          const cobreB = this._itemCobreHoraEmTrabalho(b, hDeficit, tConfigs);
          return (cobreB ? 1 : 0) - (cobreA ? 1 : 0);
        });

        let ajustado = false;
        for (const cand of candidatos) {
          if (!this._itemCobreHoraEmTrabalho(cand, hDeficit, tConfigs)) continue;
          if (isDomingo && !this._podeTrabalharDomingo(cand, dia, totalDias)) continue;

          const stOrig = cand.dias[dia];
          const tipoTrabalho = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);
          cand.dias[dia] = tipoTrabalho;

          if (this._validarMaxConsecutivos(cand, totalDias) <= 6) {
            ajustado = true;
            break;
          }

          const inicioSemana = Math.max(1, dia - 5);
          const fimSemana = Math.min(totalDias, dia + 5);
          let compensado = false;

          for (let dAlt = inicioSemana; dAlt <= fimSemana; dAlt++) {
            if (dAlt !== dia && (cand.dias[dAlt] === 'T' || cand.dias[dAlt] === 'TF')) {
              const dAltIsDom = (new Date(ano, mes - 1, dAlt).getDay() === 0);
              if (dAltIsDom || feriadosFechados.has(dAlt)) continue;

              const stAltOrig = cand.dias[dAlt];
              cand.dias[dAlt] = 'F';

              const presdAlt = this.calcularPresencaPorFaixaHoraria(itens, tConfigs, dAlt);
              const inicioAlt = dAltIsDom ? 8 : 7;
              const fimAlt = dAltIsDom ? 20 : 21;
              const temDeficitAlt = presdAlt.some(p => {
                const h = Number.parseInt(p.horaStr.split(':')[0], 10);
                return h >= inicioAlt && h < fimAlt && p.quantidadeTrabalhando < minReqDia;
              });

              if (!temDeficitAlt && this._validarMaxConsecutivos(cand, totalDias) <= 6) {
                compensado = true;
                break;
              } else {
                cand.dias[dAlt] = stAltOrig;
              }
            }
          }

          if (compensado) {
            ajustado = true;
            break;
          } else {
            cand.dias[dia] = stOrig;
          }
        }

        if (!ajustado) break;
      }
    }
  }
  }

  private _itemCobreHoraEmTrabalho(item: EscalaItem, hora: number, turnosConfigs: TurnoConfig[]): boolean {
    const itemSim: EscalaItem = { ...item, dias: { 1: 'T' } };
    const pres = this.calcularPresencaPorFaixaHoraria([itemSim], turnosConfigs, 1);
    const targetHoraStr = `${String(hora).padStart(2, '0')}:00`;
    const f = pres.find(p => p.horaStr === targetHoraStr);
    return (f?.quantidadeTrabalhando ?? 0) > 0;
  }

  private _validarMaxConsecutivos(item: EscalaItem, totalDias: number): number {
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
    return maxConsec;
  }

  private _podeTrabalharDomingo(item: EscalaItem, dia: number, totalDias: number): boolean {
    const setorClean = (item.setor || '').toLowerCase();
    const eExcecaoSetor = setorClean.includes('açougue') || setorClean.includes('acougue') || setorClean.includes('padaria');
    const permite2Seguidos = eExcecaoSetor && (item.genero !== 'F');

    const domAnteriorTrab = (dia > 7) && (item.dias[dia - 7] === 'TD' || item.dias[dia - 7] === 'TF' || item.dias[dia - 7] === 'T');
    const domProximoTrab = (dia <= totalDias - 7) && (item.dias[dia + 7] === 'TD' || item.dias[dia + 7] === 'TF' || item.dias[dia + 7] === 'T');

    if (permite2Seguidos) {
      return !(domAnteriorTrab && domProximoTrab);
    } else {
      return !(domAnteriorTrab || domProximoTrab);
    }
  }

  /**
   * Garante que na Padaria a quantidade de folgas em dias úteis não ultrapasse a cota proporcional da equipe.
   */
  private _ajustarCoberturaPadaria(itens: EscalaItem[], totalDias: number, ano: number, mes: number, feriadosAbertos: Set<number>, feriadosFechados: Set<number>): void {
    if (itens.length <= 1) return;
    const maxFolgasDia = Math.max(1, Math.ceil(itens.length / 6));

    for (let dia = 1; dia <= totalDias; dia++) {
      const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
      if (isDomingo || feriadosFechados.has(dia) || feriadosAbertos.has(dia)) continue;

      const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE');
      
      if (folgando.length > maxFolgasDia) {
        for (let k = 0; k < folgando.length && itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE').length > maxFolgasDia; k++) {
          const item = folgando[k];
          
          let diaSemFolga = -1;
          const dAlts: number[] = [];
          const offsetsPrioridade = [-2, -3, -1, -4, -5, 1, 2, 3, 4, 5];
          for (const off of offsetsPrioridade) {
            const candidate = dia + off;
            if (candidate >= 1 && candidate <= totalDias) dAlts.push(candidate);
          }

          for (const dAlt of dAlts) {
            const altIsDomingo = (new Date(ano, mes - 1, dAlt).getDay() === 0);
            if (dAlt !== dia && !altIsDomingo && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
              const folgandoNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'F' || i.dias[dAlt] === 'FE').length;
              if (folgandoNoDiaAlt < maxFolgasDia) {
                const stDiaOrig = item.dias[dia];
                const stAltOrig = item.dias[dAlt];

                // Testa se a troca preserva maxConsec <= 6
                item.dias[dia] = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);
                item.dias[dAlt] = 'F';

                let maxConsec = 0, curConsec = 0;
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
                  diaSemFolga = dAlt;
                  break;
                } else {
                  item.dias[dia] = stDiaOrig;
                  item.dias[dAlt] = stAltOrig;

                  // Tenta um SWAP entre item (folgando no dia) e outro colaborador (trabalhando no dia e folgando em dAlt)
                  for (const otherItem of itens) {
                    if (otherItem.matricula !== item.matricula && (otherItem.dias[dia] === 'T' || otherItem.dias[dia] === 'TF') && otherItem.dias[dAlt] === 'F') {
                      const stOtherDiaOrig = otherItem.dias[dia];
                      const stOtherAltOrig = otherItem.dias[dAlt];

                      item.dias[dia] = this._getTipoTrabalho(dia, ano, mes, feriadosAbertos);
                      item.dias[dAlt] = 'F';
                      otherItem.dias[dia] = 'F';
                      otherItem.dias[dAlt] = this._getTipoTrabalho(dAlt, ano, mes, feriadosAbertos);

                      let c1 = 0, mc1 = 0, c2 = 0, mc2 = 0;
                      for (let d = 1; d <= totalDias; d++) {
                        if (item.dias[d] === 'T' || item.dias[d] === 'TD' || item.dias[d] === 'TF') { c1++; if (c1 > mc1) mc1 = c1; } else c1 = 0;
                        if (otherItem.dias[d] === 'T' || otherItem.dias[d] === 'TD' || otherItem.dias[d] === 'TF') { c2++; if (c2 > mc2) mc2 = c2; } else c2 = 0;
                      }

                      if (mc1 <= 6 && mc2 <= 6) {
                        diaSemFolga = dAlt;
                        break;
                      } else {
                        // Reverte o swap
                        item.dias[dia] = stDiaOrig;
                        item.dias[dAlt] = stAltOrig;
                        otherItem.dias[dia] = stOtherDiaOrig;
                        otherItem.dias[dAlt] = stOtherAltOrig;
                      }
                    }
                  }
                  if (diaSemFolga !== -1) break;
                }
              }
            }
          }

          if (diaSemFolga === -1) {
            // Se nenhuma movimentação ou swap direto respeitou maxConsec <= 6, preserva 'F' para não violar a CLT Art. 67
            item.dias[dia] = 'F';
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
    // Em meses de 31 dias na escala 6x1, a base de folgas no mês é 5 (ou 4 para meses de 28/30 dias)
    const targetBase = (totalDias >= 31 || domingosNoMes.length === 5) ? 5 : 4;

    itens.forEach(item => {
      let folgas = Object.entries(item.dias).filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE');
      const feriadosFolgaCount = folgas.filter(([dStr, st]) => st === 'FE' || (st === 'F' && feriadosAbertos.has(Number(dStr)))).length;
      const domingosFolgaCount = folgas.filter(([_, st]) => st === 'FD').length;
      // Teto dinâmico: base 5 (máx 5 em Julho), expande para até 7 em meses com feriado fechado + domingos folgados
      const tetoItem = Math.min(7, targetBase + (domingosFolgaCount >= 2 ? (totalDias >= 31 ? 1 : 0) : 0) + feriadosFolgaCount);

      let loopCount = 0;
      while (folgas.length > tetoItem && loopCount < 15) {
        loopCount++;
        let removido = false;

        // Passagem 1: Remova qualquer folga 'F' cuja remoção mantenha a distância entre folgas vizinhas <= 6 dias
        const folgaDias = Object.entries(item.dias)
          .filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE')
          .map(([d]) => Number(d));

        const fronteiras = [0, ...folgaDias, totalDias + 1];

        for (let i = 1; i < fronteiras.length - 1; i++) {
          const diaFolga = fronteiras[i];
          if (item.dias[diaFolga] === 'F' && !feriadosAbertos.has(diaFolga)) {
            const prevFolga = fronteiras[i - 1];
            const nextFolga = fronteiras[i + 1];
            const gapSeRemover = (nextFolga - prevFolga - 1);

            if (gapSeRemover <= 6) {
              item.dias[diaFolga] = this._getTipoTrabalho(diaFolga, ano, mes, feriadosAbertos);

              let maxConsec = 0, curConsec = 0;
              for (let d = 1; d <= totalDias; d++) {
                const st = item.dias[d];
                if (st === 'T' || st === 'TD' || st === 'TF') {
                  curConsec++;
                  if (curConsec > maxConsec) maxConsec = curConsec;
                } else {
                  curConsec = 0;
                }
              }

              let temViolacaoFD = false;
              domingosNoMes.forEach(dDom => {
                const domAnt = dDom - 7;
                if (domAnt >= 1 && (item.dias[domAnt] === 'FD' || item.dias[domAnt] === 'F') && (item.dias[dDom] === 'TD' || item.dias[dDom] === 'TF')) {
                  let temFolgaEntre = false;
                  for (let d = domAnt + 1; d < dDom; d++) {
                    if (item.dias[d] === 'F' || item.dias[d] === 'FE' || item.dias[d] === 'FD') temFolgaEntre = true;
                  }
                  if (!temFolgaEntre) temViolacaoFD = true;
                }
              });

              if (maxConsec <= 6 && !temViolacaoFD) {
                removido = true;
                break;
              } else {
                item.dias[diaFolga] = 'F';
              }
            }
          }
        }

        // Passagem 2: Otimização de vãos longos - substitui excesso de 'F' pelo mínimo estritamente necessário
        if (!removido) {
          const folgaFixos = Object.entries(item.dias)
            .filter(([_, st]) => st === 'FD' || st === 'FE')
            .map(([d]) => Number(d));

          const boundaries = [0, ...folgaFixos, totalDias + 1];

          for (let b = 0; b < boundaries.length - 1; b++) {
            const start = boundaries[b];
            const end = boundaries[b + 1];
            const spanLength = end - start - 1;

            if (spanLength > 6) {
              const folgasNecessarias = Math.ceil(spanLength / 7) - 1;
              const fNoVao = Object.keys(item.dias)
                .map(Number)
                .filter(d => d > start && d < end && item.dias[d] === 'F');

              if (fNoVao.length > folgasNecessarias) {
                const backupDias = { ...item.dias };

                fNoVao.forEach(d => {
                  if (!feriadosAbertos.has(d)) {
                    item.dias[d] = this._getTipoTrabalho(d, ano, mes, feriadosAbertos);
                  }
                });

                const passo = (spanLength + 1) / (folgasNecessarias + 1);
                for (let k = 1; k <= folgasNecessarias; k++) {
                  let novoDiaF = Math.round(start + k * passo);
                  const diaSemanaF = new Date(ano, mes - 1, novoDiaF).getDay();
                  
                  if (diaSemanaF === 0) novoDiaF--;
                  if (new Date(ano, mes - 1, novoDiaF).getDay() === 6 && (novoDiaF + 1 <= totalDias) && (item.dias[novoDiaF + 1] === 'TD' || item.dias[novoDiaF + 1] === 'TF')) {
                    novoDiaF = Math.max(start + 1, novoDiaF - 2); // Recua para Quinta-feira
                  }

                  if (novoDiaF > start && novoDiaF < end && (item.dias[novoDiaF] === 'T' || item.dias[novoDiaF] === 'TF')) {
                    item.dias[novoDiaF] = 'F';
                  }
                }

                if (this._validarMaxConsecutivos(item, totalDias) <= 6) {
                  removido = true;
                  break;
                } else {
                  item.dias = backupDias;
                }
              }
            }
          }
        }

        // Passagem 3: Emergência - remoção estritamente VÁLIDA (maxConsec <= 6 e sem violação FD->TD)
        if (!removido) {
          const fIndices = Object.keys(item.dias).map(Number).filter(d => item.dias[d] === 'F' && !feriadosAbertos.has(d));
          for (const diaRem of fIndices.reverse()) {
            item.dias[diaRem] = this._getTipoTrabalho(diaRem, ano, mes, feriadosAbertos);
            let maxConsec = 0, curConsec = 0;
            for (let d = 1; d <= totalDias; d++) {
              const st = item.dias[d];
              if (st === 'T' || st === 'TD' || st === 'TF') {
                curConsec++;
                if (curConsec > maxConsec) maxConsec = curConsec;
              } else {
                curConsec = 0;
              }
            }

            let temViolacaoFD = false;
            domingosNoMes.forEach(dDom => {
              const domAnt = dDom - 7;
              if (domAnt >= 1 && (item.dias[domAnt] === 'FD' || item.dias[domAnt] === 'F') && (item.dias[dDom] === 'TD' || item.dias[dDom] === 'TF')) {
                let temFolgaEntre = false;
                for (let d = domAnt + 1; d < dDom; d++) {
                  if (item.dias[d] === 'F' || item.dias[d] === 'FE' || item.dias[d] === 'FD') temFolgaEntre = true;
                }
                if (!temFolgaEntre) temViolacaoFD = true;
              }
            });

            if (maxConsec <= 6 && !temViolacaoFD) {
              removido = true;
              break;
            } else {
              item.dias[diaRem] = 'F';
            }
          }
        }

        folgas = Object.entries(item.dias).filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE');
      }
    });
  }

  /**
   * Sanitização Final Inviolável da CLT Art. 67.
   * Garante matematicamente que NENHUM colaborador trabalhe mais de 6 dias consecutivos em qualquer circunstância.
   */
  private _sanitizarTravaCLT6Dias(
    itens: EscalaItem[],
    totalDias: number,
    ano: number,
    mes: number,
    feriadosAbertos: Set<number>,
    historicoMesAnterior?: Record<string, TipoDia[]>
  ): void {
    itens.forEach(item => {
      let consecutivos = 0;
      if (historicoMesAnterior && historicoMesAnterior[item.matricula]) {
        const hist = historicoMesAnterior[item.matricula];
        for (let h = hist.length - 1; h >= 0; h--) {
          const s = hist[h];
          if (s === 'T' || s === 'TD' || s === 'TF') {
            consecutivos++;
          } else {
            break;
          }
        }
      }

      for (let dia = 1; dia <= totalDias; dia++) {
        const st = item.dias[dia];
        if (st === 'T' || st === 'TD' || st === 'TF') {
          consecutivos++;
          if (consecutivos > 6) {
            const isDom = (new Date(ano, mes - 1, dia).getDay() === 0);
            const setorClean = (item.setor || '').toLowerCase();
            const eFrenteDeCaixa = setorClean.includes('caixa') && !setorClean.includes('fiscal');

            // Tenta alocar a folga no meio do bloco (dia - 3 ou dia - 2) para preservar trabalho no fim do bloco e evitar acúmulo no mesmo dia
            let diaFolgaMeio = dia - 3;
            let diaSemanaMeio = diaFolgaMeio >= 1 ? new Date(ano, mes - 1, diaFolgaMeio).getDay() : -1;
            if (diaFolgaMeio >= 1 && diaSemanaMeio !== 0 && (item.dias[diaFolgaMeio] === 'T' || item.dias[diaFolgaMeio] === 'TF')) {
              item.dias[diaFolgaMeio] = 'F';
              consecutivos = dia - diaFolgaMeio;
            } else {
              diaFolgaMeio = dia - 2;
              diaSemanaMeio = diaFolgaMeio >= 1 ? new Date(ano, mes - 1, diaFolgaMeio).getDay() : -1;
              if (diaFolgaMeio >= 1 && diaSemanaMeio !== 0 && (item.dias[diaFolgaMeio] === 'T' || item.dias[diaFolgaMeio] === 'TF')) {
                item.dias[diaFolgaMeio] = 'F';
                consecutivos = dia - diaFolgaMeio;
              } else {
                item.dias[dia] = isDom ? 'FD' : 'F';
                consecutivos = 0;
              }
            }

            // Se essa inserção fez o colaborador exceder o teto de folgas no mês, remove uma folga 'F' anterior/posterior
            const folgas = Object.entries(item.dias).filter(([_, s]) => s === 'F' || s === 'FD' || s === 'FE');
            const domingosNoMesCount = Array.from({ length: totalDias }, (_, i) => i + 1).filter(d => new Date(ano, mes - 1, d).getDay() === 0).length;
            const domingosFolgaCount = folgas.filter(([_, s]) => s === 'FD').length;
            const feriadosFolgaCount = folgas.filter(([dStr, s]) => s === 'FE' || (s === 'F' && feriadosAbertos.has(Number(dStr)))).length;
            const targetBase = (totalDias >= 31 || domingosNoMesCount === 5) ? 5 : 4;
            const tetoSanitizar = Math.min(7, targetBase + (domingosFolgaCount >= 2 ? (totalDias >= 31 ? 1 : 0) : 0) + feriadosFolgaCount);

            if (folgas.length > tetoSanitizar) {
              for (const [fDiaStr, fSt] of folgas) {
                const fDia = Number(fDiaStr);
                if (fSt === 'F' && fDia !== dia && fDia !== diaFolgaMeio && !feriadosAbertos.has(fDia)) {
                  item.dias[fDia] = this._getTipoTrabalho(fDia, ano, mes, feriadosAbertos);
                  if (this._validarMaxConsecutivos(item, totalDias) <= 6) {
                    break;
                  } else {
                    item.dias[fDia] = 'F';
                  }
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
      const ePadariaGlobal = setorCleanGlobal.includes('padaria');
      const eFiscalGlobal = setorCleanGlobal.includes('fiscal');
      const eAdmGlobal = setorCleanGlobal.includes('adm') || setorCleanGlobal.includes('geren') || setorCleanGlobal.includes('gerên');

      const minExigidoDia = eFeriadoAberto
        ? (minFeriado !== undefined ? minFeriado : (eFrenteDeCaixaGlobal ? Math.max(minPorDia, 6) : ((ePadariaGlobal || eFiscalGlobal) ? Math.max(minPorDia, 2) : Math.max(1, Math.floor(minPorDia / 2)))))
        : (eAdmGlobal ? 1 : minPorDia);

      const trabalhando = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF');
      
      if (trabalhando.length < minExigidoDia) {
        const necessarios = minExigidoDia - trabalhando.length;
        const folgando = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FD');

        for (let k = 0; k < folgando.length && itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length < minExigidoDia; k++) {
          const item = folgando[k];
          const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
          
          // Trava de Revezamento de Domingo Inviolável: Respeita 2T:1F para Açougue/Padaria masculinos e 1T:2F para demais
          if (isDomingo) {
            const setorClean = (item.setor || '').toLowerCase();
            const eExcecaoSetor = setorClean.includes('açougue') || setorClean.includes('acougue') || setorClean.includes('padaria');
            const permite2Seguidos = eExcecaoSetor && (item.genero !== 'F');

            const domAnteriorTrab = (dia > 7) && (item.dias[dia - 7] === 'TD' || item.dias[dia - 7] === 'TF');
            const domProximoTrab = (dia <= totalDias - 7) && (item.dias[dia + 7] === 'TD' || item.dias[dia + 7] === 'TF');

            if (permite2Seguidos) {
              if (domAnteriorTrab && domProximoTrab) continue;
            } else {
              if (domAnteriorTrab || domProximoTrab) continue;
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
            let dAltCompensado = -1;
            let compensou = false;
            for (let dAlt = inicioSemana; dAlt <= fimSemana; dAlt++) {
              if (dAlt !== dia && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
                const trabNoDiaAlt = itens.filter(i => i.dias[dAlt] === 'T' || i.dias[dAlt] === 'TD' || i.dias[dAlt] === 'TF').length;
                const diaAltIsDom = (new Date(ano, mes - 1, dAlt).getDay() === 0);
                
                if (trabNoDiaAlt > minExigidoDia && !diaAltIsDom) {
                  item.dias[dAlt] = 'F';
                  dAltCompensado = dAlt;
                  compensou = true;
                  break;
                }
              }
            }

            if (!compensou) {
              if (trabalhando.length === 0) {
                for (let dAlt = 1; dAlt <= totalDias; dAlt++) {
                  if (dAlt !== dia && (item.dias[dAlt] === 'T' || item.dias[dAlt] === 'TF')) {
                    const trabAlt = itens.filter(i => i.dias[dAlt] === 'T' || i.dias[dAlt] === 'TD' || i.dias[dAlt] === 'TF').length;
                    const diaAltIsDom = (new Date(ano, mes - 1, dAlt).getDay() === 0);
                    if (trabAlt > 1 && !diaAltIsDom) {
                      item.dias[dAlt] = 'F';
                      break;
                    }
                  }
                }
              } else {
                item.dias[dia] = isDomingo ? 'FD' : 'F';
              }
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
                // Reverte AMBAS as alterações para não vazar folgas extras
                item.dias[dia] = isDomingo ? 'FD' : 'F';
                if (dAltCompensado !== -1) {
                  item.dias[dAltCompensado] = this._getTipoTrabalho(dAltCompensado, ano, mes, feriadosAbertos);
                }
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
    feriados: Feriado[] = [],
    historicoMesAnterior?: Record<string, TipoDia[]>
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

    const candFiscalVal = itens.find(i => i.setor.toLowerCase().includes('fiscal'));
    const setorNomeOriginal = candFiscalVal ? candFiscalVal.setor : (itens[0]?.setor || 'Setor');
    const setorNomeClean = setorNomeOriginal.toLowerCase();
    const eFrenteDeCaixa = setorNomeClean.includes('caixa') && !setorNomeClean.includes('fiscal');
    const eFiscalDeCaixa = setorNomeClean.includes('fiscal');
    const eAdm = setorNomeClean.includes('adm') || setorNomeClean.includes('geren') || setorNomeClean.includes('gerên');
    const ePadaria = setorNomeClean.includes('padaria');
    const eAcougue = setorNomeClean.includes('acougue') || setorNomeClean.includes('açougue');
    const eExcecaoDomingo = ePadaria || eAcougue;

    const minEfetivoValida = eFrenteDeCaixa ? Math.max(minRequerido, 6) : (eAdm ? 1 : minRequerido);

    for (let dia = 1; dia <= totalDias; dia++) {
      const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
      const emTrabalho = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length;
      const emFolga = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE' || i.dias[dia] === 'AF' || i.dias[dia] === 'FR').length;
      coberturaPorDia[dia] = emTrabalho;

      const minPermitidoDia = (isDomingo && itens.length < 6 && !eFrenteDeCaixa) ? Math.max(1, Math.floor(itens.length / 3)) : (eAdm ? 1 : minEfetivoValida);

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
      } else if (eFiscalDeCaixa && isDomingo && emTrabalho !== 2 && itens.length >= 2) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Fiscal de Caixa no domingo exige EXATAMENTE 2 fiscais (1 dupla trabalhando, 1 dupla folgando). Encontrado(s): ${emTrabalho}.`,
          tipo: 'ERRO_COBERTURA'
        });
      } else if (emTrabalho < minPermitidoDia && itens.length >= minEfetivoValida) {
        erros.push({
          dia,
          setor: setorNomeOriginal,
          mensagem: `Dia ${dia}: Apenas ${emTrabalho} colaborador(es) trabalhando. Mínimo exigido: ${minPermitidoDia}.`,
          tipo: 'ERRO_COBERTURA'
        });
      }

      // Regra Padaria: Folgas em dias úteis na Produção limitadas à cota da equipe
      const maxFolgasPadariaPermitido = Math.max(1, Math.ceil(itens.length / 6));
      if (ePadaria && !isDomingo && !feriadosFechadosVal.has(dia) && !feriadosAbertos.has(dia) && emFolga > maxFolgasPadariaPermitido && itens.length > 1) {
        const folgasInviolaveis = itens.filter(i => {
          if (i.dias[dia] !== 'F') return false;
          const itemCopy: EscalaItem = { ...i, dias: { ...i.dias, [dia]: 'T' as TipoDia } };
          return this._validarMaxConsecutivos(itemCopy, totalDias) > 6;
        }).length;

        if (emFolga - folgasInviolaveis > maxFolgasPadariaPermitido) {
          erros.push({
            dia,
            setor: setorNomeOriginal,
            mensagem: `Dia ${dia}: Padaria possui ${emFolga} colaboradores de folga (${folgasInviolaveis} por trava CLT). Permitido no máximo ${maxFolgasPadariaPermitido} pessoa(s) de folga por dia na produção.`,
            tipo: 'ERRO_PADARIA_PRODUCAO'
          });
        }
      }

      // Regra de Cobertura Horária por Faixa (07:00 às 21:00 em dias úteis / 08:00 às 20:00 aos domingos)
      if (!feriadosFechadosVal.has(dia) && itens.length >= 2 && turnosConfigs.length > 0) {
        const curva = this.calcularPresencaPorFaixaHoraria(itens, turnosConfigs, dia);
        if (eFrenteDeCaixa) {
          const hIni = isDomingo ? 8 : 7;
          const hFim = isDomingo ? 20 : 21;
          for (const faixa of curva) {
            const hNum = Number.parseInt(faixa.horaStr.split(':')[0], 10);
            if (hNum >= hIni && hNum < hFim) {
              const isJanelaAberturaOuAlmoco = hNum < 9 || hNum === 11 || hNum === 12;
              const minReqHora = (isDomingo || feriadosAbertos.has(dia)) ? 1 : (isJanelaAberturaOuAlmoco ? 5 : 6);
              if (faixa.quantidadeTrabalhando < minReqHora) {
                erros.push({
                  dia,
                  setor: setorNomeOriginal,
                  mensagem: `Dia ${dia}: Cobertura horária insuficiente às ${faixa.horaStr} (${faixa.quantidadeTrabalhando} colaborador(es) trabalhando). Mínimo exigido: ${minReqHora}.`,
                  tipo: 'ERRO_COBERTURA_HORARIA'
                });
                break;
              }
            }
          }
        }
      }
    }

    // Validação de regras CLT e limite de folgas por funcionário
    itens.forEach(item => {
      let consecutivos = 0;
      if (historicoMesAnterior && historicoMesAnterior[item.matricula]) {
        const histAnt = historicoMesAnterior[item.matricula];
        for (let hIdx = histAnt.length - 1; hIdx >= 0; hIdx--) {
          const sAnt = histAnt[hIdx];
          if (sAnt === 'T' || sAnt === 'TD' || sAnt === 'TF') {
            consecutivos++;
          } else {
            break;
          }
        }
      }

      let domingosSeguidosFeminino = 0;
      let domingosSeguidosGeral = 0;
      let totalFolgasNoMes = 0;

      for (let dia = 1; dia <= totalDias; dia++) {
        const st = item.dias[dia];
        const isDom = new Date(ano, mes - 1, dia).getDay() === 0;

        if (st === 'F' || st === 'FD' || st === 'FE' || st === 'AF' || st === 'FR') {
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

            if (!eExcecaoDomingo) {
              // Para setores gerais, NINGUÉM (homem ou mulher) pode trabalhar 2 domingos seguidos (Regra 1T:2F)
              if (domingosSeguidosGeral >= 2) {
                erros.push({
                  dia,
                  setor: item.setor,
                  mensagem: `${item.nome}: Trabalhou 2 domingos seguidos (Dia ${dia}). Regra do setor exige 1 domingo trabalhado para 2 folgas (1T:2F).`,
                  tipo: 'ERRO_CLT'
                });
              }
            } else {
              // Para Padaria e Açougue (Exceções):
              // Mulheres têm restrição de 1T:1F (CLT 386) -> Não podem trabalhar 2 domingos seguidos
              if (item.genero === 'F') {
                domingosSeguidosFeminino++;
                if (domingosSeguidosFeminino >= 2) {
                  erros.push({
                    dia,
                    setor: item.setor,
                    mensagem: `${item.nome} (Feminino - ${item.setor}): Trabalhou 2 domingos seguidos (Dia ${dia}). Violação CLT Art. 386.`,
                    tipo: 'ERRO_CLT'
                  });
                }
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

      // Validação de Interjornada de 11 Horas (CLT Art. 66)
      for (let dia = 1; dia < totalDias; dia++) {
        const stHoje = item.dias[dia];
        const stAmanha = item.dias[dia + 1];
        const ehTrabHoje = stHoje === 'T' || stHoje === 'TD' || stHoje === 'TF';
        const ehTrabAmanha = stAmanha === 'T' || stAmanha === 'TD' || stAmanha === 'TF';

        if (ehTrabHoje && ehTrabAmanha) {
          const tHoje = this._getMinutosEntradaSaida(item, turnosConfigs);
          const tAmanha = this._getMinutosEntradaSaida(item, turnosConfigs);
          const descansoMin = (24 * 60 - tHoje.saidaMin) + tAmanha.entradaMin;

          if (descansoMin < 11 * 60) {
            erros.push({
              dia: dia + 1,
              setor: item.setor,
              mensagem: `${item.nome}: Intervalo interjornada entre o dia ${dia} e o dia ${dia + 1} foi de apenas ${(descansoMin / 60).toFixed(1)}h. Mínimo legal exigido (CLT Art. 66): 11h.`,
              tipo: 'ERRO_CLT_INTERJORNADA_11H'
            });
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
      const feriadosFolgaCount = Object.entries(item.dias).filter(([dStr, st]) => st === 'FE' || (st === 'F' && feriadosAbertos.has(Number(dStr))) || st === 'TF').length;
      const targetMaxVal = (totalDias >= 31 || domingosNoMesVal.length === 5) ? 6 : 5;
      const maxPermitidoItem = targetMaxVal + (domingosFolgaCount >= 2 ? 1 : 0) + feriadosFolgaCount;

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
      e.tipo === 'ERRO_COBERTURA_HORARIA' || 
      e.tipo === 'ERRO_PADARIA_PRODUCAO' || 
      e.tipo === 'ERRO_FOLGAS_MES' || 
      e.tipo === 'ERRO_CLT' ||
      e.tipo === 'ERRO_CLT_INTERJORNADA_11H' ||
      e.tipo === 'ERRO_CARGA_HORARIA_MENSAL'
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
    const horasFormatted = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}`;

    // Limite padrão diário CLT (8h00 = 480 min, ou 8h48m = 528 min com compensação de sábado)
    const excedeLimite = minLiquidos > 528; 

    return {
      minutos: minLiquidos,
      horasFormatted,
      excedeLimite
    };
  }

  /**
   * Calcula a curva de presença de colaboradores no mercado por faixa horária (07:00 às 22:00) para um dia específico.
   * Considera entrada, saída e intervalo de refeição/descanso cadastrados.
   */
  calcularPresencaPorFaixaHoraria(
    itens: EscalaItem[],
    turnosConfigs: TurnoConfig[],
    dia: number
  ): HorarioPresenca[] {
    const horasFaixas = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
      '19:00', '20:00', '21:00', '22:00'
    ];

    const resultado: HorarioPresenca[] = horasFaixas.map(hStr => ({
      horaStr: hStr,
      quantidadeTrabalhando: 0,
      funcionariosNomes: []
    }));

    itens.forEach(item => {
      const st = item.dias[dia];
      if (st !== 'T' && st !== 'TD' && st !== 'TF') return;

      let entradaMin = 7 * 60;
      let saidaMin = 16 * 60;
      let intInicioMin = 12 * 60;
      let intFimMin = 13 * 60;

      const turnoConf = turnosConfigs.find(tc => tc.nome === item.turno);
      if (turnoConf) {
        const [hE, mE] = turnoConf.entrada.split(':').map(Number);
        const [hS, mS] = turnoConf.saida.split(':').map(Number);
        entradaMin = hE * 60 + (mE || 0);
        saidaMin = hS * 60 + (mS || 0);
        if (saidaMin < entradaMin) saidaMin += 24 * 60;

        const meio = Math.floor((entradaMin + saidaMin) / 2);
        const halfInt = Math.floor(turnoConf.intervaloMinutos / 2);
        intInicioMin = meio - halfInt;
        intFimMin = meio + halfInt;
      } else {
        const matchHoras = item.turno.match(/(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/);
        if (matchHoras) {
          const [hE, mE] = matchHoras[1].split(':').map(Number);
          const [hS, mS] = matchHoras[2].split(':').map(Number);
          entradaMin = hE * 60 + (mE || 0);
          saidaMin = hS * 60 + (mS || 0);
          if (saidaMin < entradaMin) saidaMin += 24 * 60;
        }
        const matchAlmoco = item.turno.match(/Almoço\s+(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
        if (matchAlmoco) {
          const [hIE, mIE] = matchAlmoco[1].split(':').map(Number);
          const [hIS, mIS] = matchAlmoco[2].split(':').map(Number);
          intInicioMin = hIE * 60 + (mIE || 0);
          intFimMin = hIS * 60 + (mIS || 0);
        } else {
          const meio = Math.floor((entradaMin + saidaMin) / 2);
          intInicioMin = meio - 45;
          intFimMin = meio + 45;
        }
      }

      resultado.forEach(res => {
        const [hH, mH] = res.horaStr.split(':').map(Number);
        const horaAtualMin = hH * 60 + (mH || 0);

        const estaEmJornada = horaAtualMin >= entradaMin && horaAtualMin < saidaMin;
        const estaEmIntervalo = horaAtualMin >= intInicioMin && horaAtualMin < intFimMin;

        if (estaEmJornada && !estaEmIntervalo) {
          res.quantidadeTrabalhando++;
          res.funcionariosNomes.push(item.nome);
        }
      });
    });

    return resultado;
  }

  /**
   * Calcula o resumo individual de métricas (folgas totais, folgas domingos, horas líquidas) para cada funcionário.
   */
  calcularResumoMetrics(
    itens: EscalaItem[],
    funcionarios: Funcionario[],
    turnosConfigs: TurnoConfig[],
    ano: number,
    mes: number
  ): ResumoFuncionarioMetrics[] {
    const totalDias = new Date(ano, mes, 0).getDate();

    return itens.map(item => {
      const funcObj = funcionarios.find(f => f.matricula_aleatoria === item.matricula);
      let folgas = 0;
      let domingosFolgados = 0;
      let feriadosFolgados = 0;
      let diasTrabalhados = 0;
      const alertas: string[] = [];

      for (let d = 1; d <= totalDias; d++) {
        const st = item.dias[d];
        if (st === 'F' || st === 'FD' || st === 'FE') {
          folgas++;
          if (st === 'FD') domingosFolgados++;
          if (st === 'FE') feriadosFolgados++;
        } else if (st === 'T' || st === 'TD' || st === 'TF') {
          diasTrabalhados++;
        }
      }

      let minPorDia = 440;
      const tConf = turnosConfigs.find(tc => tc.nome === item.turno);
      if (tConf) {
        minPorDia = tConf.cargaHorariaLiquidaMinutos;
      } else {
        const calc = this.calcularCargaHorariaLiquida('08:00', '17:00', 60);
        minPorDia = calc.minutos;
      }

      const horasLiquidasMinutos = diasTrabalhados * minPorDia;
      const hTot = Math.floor(horasLiquidasMinutos / 60);
      const mTot = horasLiquidasMinutos % 60;
      const horasLiquidasFormatted = `${hTot}h${mTot > 0 ? String(mTot).padStart(2, '0') + 'm' : '00'}`;

      let statusConformidade: 'OK' | 'ALERTA' | 'VIOLACAO' = 'OK';
      if (folgas < 4) {
        statusConformidade = 'ALERTA';
        alertas.push(`Folgas no mês (${folgas}) abaixo do esperado (mín. 4)`);
      } else if (folgas > 6) {
        statusConformidade = 'ALERTA';
        alertas.push(`Excesso de folgas no mês (${folgas})`);
      }

      return {
        matricula: item.matricula,
        nome: item.nome,
        setor: item.setor,
        cargo: funcObj?.cargo || 'Colaborador',
        turno: item.turno,
        genero: item.genero,
        totalFolgas: folgas,
        domingosFolgados,
        feriadosFolgados,
        diasTrabalhados,
        horasLiquidasMinutos,
        horasLiquidasFormatted,
        statusConformidade,
        alertas
      };
    });
  }

  private _getMinutosEntradaSaida(item: EscalaItem, turnosConfigs: TurnoConfig[]): { entradaMin: number; saidaMin: number } {
    let entradaMin = 8 * 60;
    let saidaMin = 16 * 60 + 20;

    const turnoConf = turnosConfigs.find(tc => tc.nome === item.turno);
    if (turnoConf) {
      const [hE, mE] = turnoConf.entrada.split(':').map(Number);
      const [hS, mS] = turnoConf.saida.split(':').map(Number);
      entradaMin = hE * 60 + (mE || 0);
      saidaMin = hS * 60 + (mS || 0);
      if (saidaMin < entradaMin) saidaMin += 24 * 60;
    } else if (item.turno) {
      const matchHoras = item.turno.match(/(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/);
      if (matchHoras) {
        const [hE, mE] = matchHoras[1].split(':').map(Number);
        const [hS, mS] = matchHoras[2].split(':').map(Number);
        entradaMin = hE * 60 + (mE || 0);
        saidaMin = hS * 60 + (mS || 0);
        if (saidaMin < entradaMin) saidaMin += 24 * 60;
      }
    }
    return { entradaMin, saidaMin };
  }

  /**
   * Extrai os últimos 7 dias da escala de um mês para servir de entrada no parâmetro historicoMesAnterior ao gerar o mês seguinte.
   */
  extrairHistoricoMesAnterior(itens: EscalaItem[]): Record<string, TipoDia[]> {
    const res: Record<string, TipoDia[]> = {};
    if (!itens) return res;
    itens.forEach(item => {
      if (item.matricula && item.dias) {
        const diasKeys = Object.keys(item.dias).map(Number).sort((a, b) => a - b);
        const ultimosDias = diasKeys.slice(-7).map(d => item.dias[d]);
        res[item.matricula] = ultimosDias;
      }
    });
    return res;
  }
}



