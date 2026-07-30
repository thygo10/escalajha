import { Injectable } from '@angular/core';
import { EscalaItem, Feriado, ValidacaoEscalaResultado, ValidacaoItem, TurnoConfig, HorarioPresenca, ResumoFuncionarioMetrics, TipoDia, Funcionario } from '../models/types';

@Injectable({
    providedIn: 'root'
})
export class EscalaValidatorService {

    validarEscala(
        itens: EscalaItem[],
        ano: number,
        mes: number,
        minRequerido: number = 2,
        turnosConfigs: TurnoConfig[] = [],
        feriados: Feriado[] = [],
        opcoesExtra?: { historicoMesAnterior?: Record<string, TipoDia[]>; minDomingo?: number; minFeriado?: number; permitirDoisDiasConsecutivos?: boolean } | Record<string, TipoDia[]>
    ): ValidacaoEscalaResultado {
        let historicoMesAnterior: Record<string, TipoDia[]> | undefined;
        let minDomingo: number | undefined;
        let minFeriado: number | undefined;
        let permitirDoisDiasConsecutivos = false;

        if (opcoesExtra) {
            if ('historicoMesAnterior' in opcoesExtra || 'minDomingo' in opcoesExtra || 'minFeriado' in opcoesExtra || 'permitirDoisDiasConsecutivos' in opcoesExtra) {
                const opts = opcoesExtra as { historicoMesAnterior?: Record<string, TipoDia[]>; minDomingo?: number; minFeriado?: number; permitirDoisDiasConsecutivos?: boolean };
                historicoMesAnterior = opts.historicoMesAnterior;
                minDomingo = opts.minDomingo;
                minFeriado = opts.minFeriado;
                permitirDoisDiasConsecutivos = opts.permitirDoisDiasConsecutivos ?? false;
            } else {
                historicoMesAnterior = opcoesExtra as Record<string, TipoDia[]>;
            }
        }

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
                    if (f.funcionamento_proibido) feriadosFechadosVal.add(fDia);
                    else feriadosAbertos.add(fDia);
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

        let minEfetivoValida = minRequerido;
        if (eFrenteDeCaixa) {
            minEfetivoValida = Math.max(minRequerido, 6);
        } else if (eAdm || itens.length <= 4) {
            minEfetivoValida = 1;
        }

        for (let dia = 1; dia <= totalDias; dia++) {
            const isDomingo = (new Date(ano, mes - 1, dia).getDay() === 0);
            const isFeriadoAberto = feriadosAbertos.has(dia);
            const emTrabalho = itens.filter(i => i.dias[dia] === 'T' || i.dias[dia] === 'TD' || i.dias[dia] === 'TF').length;
            const emFolga = itens.filter(i => i.dias[dia] === 'F' || i.dias[dia] === 'FE' || i.dias[dia] === 'AF' || i.dias[dia] === 'FR').length;
            coberturaPorDia[dia] = emTrabalho;

            let minPermitidoDia = minEfetivoValida;
            if (isFeriadoAberto && minFeriado !== undefined) {
                minPermitidoDia = minFeriado;
            } else if (isDomingo) {
                minPermitidoDia = minDomingo ?? (eFrenteDeCaixa ? 3 : Math.max(1, Math.floor(itens.length / 3)));
            } else if (eAdm || itens.length <= 4) {
                minPermitidoDia = 1;
            }

            if (feriadosFechadosVal.has(dia)) continue;

            if (emTrabalho === 0 && itens.length >= 2) {
                erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: COBERTURA ZERO! Todos os colaboradores estão de folga.`, tipo: 'ERRO_COBERTURA' });
            } else if (eFrenteDeCaixa && emTrabalho < 6 && itens.length >= 6) {
                erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: Frente de Caixa possui apenas ${emTrabalho} operador(es) trabalhando. Mínimo OBRIGATÓRIO: 6.`, tipo: 'ERRO_COBERTURA_CAIXA' });
            } else if (eFiscalDeCaixa && isDomingo && emTrabalho !== 2 && itens.length >= 2) {
                erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: Fiscal de Caixa no domingo exige EXATAMENTE 2 fiscais (1 dupla trabalhando, 1 dupla folgando). Encontrado(s): ${emTrabalho}.`, tipo: 'ERRO_COBERTURA' });
            } else if (emTrabalho < minPermitidoDia && itens.length >= 2 && itens.length >= minEfetivoValida) {
                erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: Apenas ${emTrabalho} colaborador(es) trabalhando. Mínimo exigido: ${minPermitidoDia}.`, tipo: 'ERRO_COBERTURA' });
            }

            const maxFolgasPadariaPermitido = Math.max(1, Math.ceil(itens.length / 6));
            if (ePadaria && !isDomingo && !feriadosFechadosVal.has(dia) && !feriadosAbertos.has(dia) && emFolga > maxFolgasPadariaPermitido && itens.length > 1) {
                const folgasInviolaveis = itens.filter(i => {
                    if (i.dias[dia] !== 'F') return false;
                    const itemCopy: EscalaItem = { ...i, dias: { ...i.dias, [dia]: 'T' as TipoDia } };
                    return this.simularConsecutivos(itemCopy, dia, totalDias) > 6;
                }).length;

                if (emFolga - folgasInviolaveis > maxFolgasPadariaPermitido) {
                    erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: Padaria possui ${emFolga} colaboradores de folga (${folgasInviolaveis} por trava CLT). Permitido no máximo ${maxFolgasPadariaPermitido} pessoa(s) de folga por dia na produção.`, tipo: 'ERRO_PADARIA_PRODUCAO' });
                }
            }

            if (!feriadosFechadosVal.has(dia) && itens.length >= 2 && turnosConfigs.length > 0) {
                const curva = this.calcularPresencaPorFaixaHoraria(itens, turnosConfigs, dia);
                if (eFrenteDeCaixa) {
                    const hIni = isDomingo ? 8 : 7;
                    const hFim = isDomingo ? 20 : 21;
                    for (const faixa of curva) {
                        const hNum = Number.parseInt(faixa.horaStr.split(':')[0], 10);
                        if (hNum >= hIni && hNum < hFim) {
                            const isCritica = hNum < 9 || hNum === 11 || hNum === 12;
                            // On Sunday opening (08:00) and lunch window (11:00-12:30), 1T:2F rotation yields 3-4 active operators
                            const isSundayWindow = isDomingo && (hNum === 8 || hNum === 11 || hNum === 12);
                            let minReqHora = 6;
                            if (isSundayWindow) {
                                minReqHora = 3;
                            } else if (isCritica) {
                                minReqHora = 5;
                            }
                            if (faixa.quantidadeTrabalhando < minReqHora) {
                                erros.push({ dia, setor: setorNomeOriginal, mensagem: `Dia ${dia}: Cobertura horária insuficiente às ${faixa.horaStr} (${faixa.quantidadeTrabalhando} colaborador(es) trabalhando). Mínimo exigido: ${minReqHora}.`, tipo: 'ERRO_COBERTURA_HORARIA' });
                                break;
                            }
                        }
                    }
                }
            }
        }

        itens.forEach(item => {
            let consecutivos = 0;
            if (historicoMesAnterior && Object.hasOwn(historicoMesAnterior, item.matricula)) {
                const histAnt = historicoMesAnterior[item.matricula];
                for (let hIdx = histAnt.length - 1; hIdx >= 0; hIdx--) {
                    const sAnt = histAnt[hIdx];
                    if (sAnt === 'T' || sAnt === 'TD' || sAnt === 'TF') consecutivos++;
                    else break;
                }
            }

            let domingosSeguidosFeminino = 0;
            let domingosSeguidosGeral = 0;
            let totalFolgasNoMes = 0;

            for (let dia = 1; dia <= totalDias; dia++) {
                const st = item.dias[dia];
                const isDom = new Date(ano, mes - 1, dia).getDay() === 0;

                if (st === 'F' || st === 'FD' || st === 'FE' || st === 'AF' || st === 'FR') totalFolgasNoMes++;

                if (feriadosAbertos.has(dia) && st === 'T') {
                    erros.push({ dia, setor: item.setor, mensagem: `${item.nome}: Trabalhou no feriado (Dia ${dia}), mas o status está como 'T' comum em vez de 'TF'.`, tipo: 'ERRO_STATUS_FERIADO' });
                }

                if (st === 'T' || st === 'TD' || st === 'TF') {
                    consecutivos++;
                    if (consecutivos > 6) {
                        erros.push({ dia, setor: item.setor, mensagem: `${item.nome}: Trabalhou mais de 6 dias consecutivos (Dia ${dia}). Violação CLT Art. 67.`, tipo: 'ERRO_CLT' });
                    }

                    if (isDom) {
                        domingosSeguidosGeral++;
                        if (!eExcecaoDomingo) {
                            if (domingosSeguidosGeral >= 2) {
                                erros.push({ dia, setor: item.setor, mensagem: `${item.nome}: Trabalhou 2 domingos seguidos (Dia ${dia}). Regra do setor exige 1 domingo trabalhado para 2 folgas (1T:2F).`, tipo: 'ERRO_CLT' });
                            }
                        } else if (item.genero === 'F') {
                            domingosSeguidosFeminino++;
                            if (domingosSeguidosFeminino >= 2) {
                                erros.push({ dia, setor: item.setor, mensagem: `${item.nome} (Feminino - ${item.setor}): Trabalhou 2 domingos seguidos (Dia ${dia}). Violação CLT Art. 386.`, tipo: 'ERRO_CLT' });
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

            for (let dia = 1; dia < totalDias; dia++) {
                const stHoje = item.dias[dia];
                const stAmanha = item.dias[dia + 1];
                const ehTrabHoje = stHoje === 'T' || stHoje === 'TD' || stHoje === 'TF';
                const ehTrabAmanha = stAmanha === 'T' || stAmanha === 'TD' || stAmanha === 'TF';

                if (ehTrabHoje && ehTrabAmanha) {
                    const tHoje = this.getMinutosEntradaSaida(item, turnosConfigs);
                    const tAmanha = this.getMinutosEntradaSaida(item, turnosConfigs);
                    const descansoMin = (24 * 60 - tHoje.saidaMin) + tAmanha.entradaMin;

                    if (descansoMin < 11 * 60) {
                        erros.push({ dia: dia + 1, setor: item.setor, mensagem: `${item.nome}: Intervalo interjornada entre o dia ${dia} e o dia ${dia + 1} foi de apenas ${(descansoMin / 60).toFixed(1)}h. Mínimo legal exigido (CLT Art. 66): 11h.`, tipo: 'ERRO_CLT_INTERJORNADA_11H' });
                    }
                }
            }

            const domingosNoMesVal: number[] = [];
            for (let d = 1; d <= totalDias; d++) {
                if (new Date(ano, mes - 1, d).getDay() === 0) domingosNoMesVal.push(d);
            }

            domingosNoMesVal.forEach(dDom => {
                const domAnterior = dDom - 7;
                if (domAnterior >= 1 && domingosNoMesVal.includes(domAnterior)) {
                    const stDomAnterior = item.dias[domAnterior];
                    const stDomAtual = item.dias[dDom];
                    if ((stDomAnterior === 'FD' || stDomAnterior === 'F') && (stDomAtual === 'TD' || stDomAtual === 'TF')) {
                        let folgaIntermediaria = false;
                        for (let d = domAnterior + 1; d < dDom; d++) {
                            if (item.dias[d] === 'F' || item.dias[d] === 'FE' || item.dias[d] === 'FD') {
                                folgaIntermediaria = true;
                                break;
                            }
                        }
                        if (!folgaIntermediaria) {
                            erros.push({ dia: dDom, setor: item.setor, mensagem: `${item.nome}: Trabalhou 7 dias seguidos entre o Domingo Folgado (Dia ${domAnterior}) e o Domingo Trabalhado (Dia ${dDom}). Violação da Trava FD->TD (Art. 67).`, tipo: 'ERRO_TRANSICAO_DOMINGO' });
                        }
                    }
                }
            });

            const folgasVoluntariasNoMes = Object.values(item.dias).filter(st => st === 'F' || st === 'FD').length;
            const domingosFolgaValCount = Object.values(item.dias).filter(st => st === 'FD').length;
            let maxPermitidoVoluntario = (domingosNoMesVal.length === 5 ? 7 : 6) + feriadosFechadosVal.size;
            if (domingosFolgaValCount >= 3) {
                maxPermitidoVoluntario = Math.max(maxPermitidoVoluntario, domingosFolgaValCount + 4);
            }
            if (historicoMesAnterior && Object.hasOwn(historicoMesAnterior, item.matricula)) {
                maxPermitidoVoluntario += 1;
            }
            const minFolgasEsperadas = (domingosNoMesVal.length === 5) ? 5 : 4;

            if (folgasVoluntariasNoMes > maxPermitidoVoluntario) {
                erros.push({ dia: 1, setor: item.setor, mensagem: `${item.nome}: Excede o limite de folgas no mês (${folgasVoluntariasNoMes} folgas). Máximo permitido: ${maxPermitidoVoluntario} folgas.`, tipo: 'ERRO_FOLGAS_MES' });
            } else if (totalFolgasNoMes < minFolgasEsperadas && totalDias >= 28) {
                erros.push({ dia: 1, setor: item.setor, mensagem: `${item.nome}: Possui apenas ${totalFolgasNoMes} folga(s) no mês. Esperado no mínimo: ${minFolgasEsperadas} folgas (mês de ${domingosNoMesVal.length} domingos).`, tipo: 'ERRO_FOLGAS_MES' });
            }

            const diasFolgaOrd = Object.entries(item.dias)
                .filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE' || st === 'FR' || st === 'AF')
                .map(([d]) => Number(d))
                .sort((a, b) => a - b);

            for (let i = 0; i < diasFolgaOrd.length - 1; i++) {
                const d1 = diasFolgaOrd[i];
                const d2 = diasFolgaOrd[i + 1];
                // Exempt picada when both ends are calendar anchors (FD/FE, not voluntary F)
                const st1 = item.dias[d1];
                const st2 = item.dias[d2];
                if (st1 !== 'F' && st2 !== 'F') continue;
                let diasTrabalhadosEfetivos = 0;
                for (let d = d1 + 1; d < d2; d++) {
                    const st = item.dias[d];
                    if (st === 'T' || st === 'TD' || st === 'TF') diasTrabalhadosEfetivos++;
                }
                if (d2 - d1 === 1 && !permitirDoisDiasConsecutivos) {
                    const isVol1 = st1 === 'F' || st1 === 'FD';
                    const isVol2 = st2 === 'F' || st2 === 'FD';
                    if (isVol1 && isVol2) {
                        erros.push({ dia: d2, setor: item.setor, mensagem: `${item.nome}: Possui 2 folgas consecutivas não permitidas nos dias ${d1} e ${d2} (${st1} e ${st2}).`, tipo: 'ERRO_CLT' });
                    }
                }
                const gapDias = d2 - d1 - 1;
                if (gapDias > 0 && diasTrabalhadosEfetivos === 1) {
                    erros.push({ dia: d2, setor: item.setor, mensagem: `${item.nome}: Espaçamento irregular ("Folga Picada") entre o dia ${d1} e o dia ${d2} (apenas 1 dia trabalhado em intervalo de 6x1).`, tipo: 'ERRO_CLT' });
                }
            }

            if (turnosConfigs.length > 0) {
                const tConf = turnosConfigs.find(tc => tc.nome === item.turno);
                if (tConf?.excedeLimiteDiario) {
                    erros.push({ dia: 1, setor: item.setor, mensagem: `${item.nome}: Turno "${item.turno}" excede a carga horária diária padrão (${(tConf.cargaHorariaLiquidaMinutos / 60).toFixed(1)}h líquidos).`, tipo: 'ALERTA_CARGA' });
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

        return { valida: totalErros === 0, totalErros, totalAlertas, itensValidados: erros, coberturaPorDia, minimoRequerido: minEfetivoValida };
    }

    calcularCargaHorariaLiquida(entrada: string, saida: string, intervaloMinutos: number): { minutos: number; horasFormatted: string; excedeLimite: boolean } {
        const [hEnt, mEnt] = entrada.split(':').map(Number);
        const [hSai, mSai] = saida.split(':').map(Number);

        let minEntrada = (hEnt * 60) + (mEnt || 0);
        let minSaida = (hSai * 60) + (mSai || 0);

        if (minSaida < minEntrada) minSaida += 24 * 60;

        const minBrutos = minSaida - minEntrada;
        const minLiquidos = Math.max(0, minBrutos - intervaloMinutos);

        const horas = Math.floor(minLiquidos / 60);
        const minutos = minLiquidos % 60;
        const horasFormatted = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}`;

        const excedeLimite = minLiquidos > 528;

        return { minutos: minLiquidos, horasFormatted, excedeLimite };
    }

    calcularPresencaPorFaixaHoraria(
        itens: EscalaItem[],
        turnosConfigs: TurnoConfig[],
        dia: number
    ): HorarioPresenca[] {
        const horasFaixas = [
            '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
            '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
        ];

        const resultado: HorarioPresenca[] = horasFaixas.map(hStr => ({
            horaStr: hStr, quantidadeTrabalhando: 0, funcionariosNomes: []
        }));

        const regexHoras = /(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/;
        const regexAlmoco = /Almoço\s+(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i;

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

                const lunchMatch = regexAlmoco.exec(turnoConf.nome);
                if (lunchMatch) {
                    const [hIE, mIE] = lunchMatch[1].split(':').map(Number);
                    const [hIS, mIS] = lunchMatch[2].split(':').map(Number);
                    intInicioMin = hIE * 60 + (mIE || 0);
                    intFimMin = hIS * 60 + (mIS || 0);
                } else {
                    const meio = Math.floor((entradaMin + saidaMin) / 2);
                    const halfInt = Math.floor(turnoConf.intervaloMinutos / 2);
                    intInicioMin = meio - halfInt;
                    intFimMin = meio + halfInt;
                }
            } else {
                const matchHoras = regexHoras.exec(item.turno);
                if (matchHoras) {
                    const [hE, mE] = matchHoras[1].split(':').map(Number);
                    const [hS, mS] = matchHoras[2].split(':').map(Number);
                    entradaMin = hE * 60 + (mE || 0);
                    saidaMin = hS * 60 + (mS || 0);
                    if (saidaMin < entradaMin) saidaMin += 24 * 60;
                }
                const matchAlmoco = regexAlmoco.exec(item.turno);
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

            let minPorDia: number;
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
                matricula: item.matricula, nome: item.nome, setor: item.setor, cargo: funcObj?.cargo || 'Colaborador',
                turno: item.turno, genero: item.genero, totalFolgas: folgas, domingosFolgados,
                feriadosFolgados, diasTrabalhados, horasLiquidasMinutos, horasLiquidasFormatted,
                statusConformidade, alertas
            };
        });
    }

    private getMinutosEntradaSaida(item: EscalaItem, turnosConfigs: TurnoConfig[]): { entradaMin: number; saidaMin: number } {
        let entradaMin = 8 * 60;
        let saidaMin = 16 * 60 + 20;
        const regexHoras = /(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/;

        const turnoConf = turnosConfigs.find(tc => tc.nome === item.turno);
        if (turnoConf) {
            const [hE, mE] = turnoConf.entrada.split(':').map(Number);
            const [hS, mS] = turnoConf.saida.split(':').map(Number);
            entradaMin = hE * 60 + (mE || 0);
            saidaMin = hS * 60 + (mS || 0);
            if (saidaMin < entradaMin) saidaMin += 24 * 60;
        } else if (item.turno) {
            const matchHoras = regexHoras.exec(item.turno);
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

    private simularConsecutivos(item: EscalaItem, dia: number, totalDias: number): number {
        let count = 1;
        for (let d = dia - 1; d >= 1; d--) {
            if (['T', 'TD', 'TF'].includes(item.dias[d])) count++;
            else break;
        }
        for (let d = dia + 1; d <= totalDias; d++) {
            if (['T', 'TD', 'TF'].includes(item.dias[d])) count++;
            else break;
        }
        return count;
    }
}