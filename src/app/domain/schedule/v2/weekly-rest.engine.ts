import { TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday } from '../../shared/year-month';
import { isRestDay, isWorkDay } from './consecutive-days.engine';

const GROUP_DAY_MAP: Record<string, number> = {
  'S1': 1, // Segunda-feira
  'S2': 2, // Terça-feira
  'S3': 3, // Quarta-feira
  'S4': 4, // Quinta-feira
  'S5': 5  // Sexta-feira
};

function getDayOfWeek(ym: YearMonth, day: number): number {
  return new Date(ym.year, ym.month - 1, day).getDay();
}

/**
 * Atribui a folga compensatória/semanal (DSR - Descanso Semanal Remunerado).
 *
 * REGRA CENTRAL (CLT Art. 67 + CCT):
 * Toda semana de trabalho deve ter EXATAMENTE 1 folga.
 *
 * - Se o domingo daquela semana já for FD → o domingo É a folga da semana. NÃO inserir outra.
 * - Se o domingo daquela semana for TD (trabalhou) → inserir folga compensatória
 *   no dia preferencial do grupo (S1..S5) naquela semana.
 *
 * Semana = Segunda a Domingo (a folga pode cair em qualquer dia Seg-Sáb).
 */
export function assignWeeklyRests(
  month: YearMonth,
  diasMap: Record<number, TipoDia>,
  grupoFolgaCompensatoria: string,
  openHolidayDays: number[] = []
): Record<number, TipoDia> {
  const totalDays = totalDaysInMonth(month);
  const result: Record<number, TipoDia> = { ...diasMap };

  const preferredWeekday = GROUP_DAY_MAP[(grupoFolgaCompensatoria || 'S1').toUpperCase()] ?? 5; // Default Sexta

  // Identifica todos os domingos do mês (cada domingo é o marcador de 1 semana)
  const sundayDays: number[] = [];
  for (let d = 1; d <= totalDays; d++) {
    if (isSunday(month, d)) {
      sundayDays.push(d);
    }
  }

  // Último dia de folga já atribuído (F/FD/FE/AF/FR) — usado para evitar
  // vãos > 7 dias sem descanso (que forçariam folgas extras do Art. 67,
  // estourando o teto de folgas programáveis RH-01).
  let prevRestDay = 0;
  if (sundayDays.length > 0) {
    for (let d = 1; d < sundayDays[0]; d++) {
      if (isRestDay(result[d])) prevRestDay = d;
    }
  }

  // Próximo domingo do mês em que o funcionário está de folga (rotação),
  // após um domingo trabalhado — âncora de vão máximo de 7 dias.
  const findNextSundayRest = (sunDay: number): number | undefined => {
    for (let d = sunDay + 7; d <= totalDays; d += 7) {
      if (isRestDay(result[d])) return d;
    }
    return undefined;
  };

  // Próximo domingo trabalhado (TD/TF) após um domingo — a folga compensatória
  // dele cairá em até 6 dias após, quebrando o vão.
  const findNextSundayWorked = (sunDay: number): number | undefined => {
    for (let d = sunDay + 7; d <= totalDays; d += 7) {
      if (isWorkDay(result[d])) return d;
    }
    return undefined;
  };

  // Próximo descanso de feriado conhecido (F/FE) após um dia — quebra o vão
  // e impede folga compensatória extra (teto RH-01).
  const findNextHolidayRest = (fromDay: number): number | undefined => {
    for (let d = fromDay + 1; d <= totalDays; d++) {
      if (result[d] === 'F' || result[d] === 'FE') return d;
    }
    return undefined;
  };

  sundayDays.forEach((sunDay) => {
    const sundayTipo = result[sunDay];
    const isSundayRest = sundayTipo === 'FD' || sundayTipo === 'F' || sundayTipo === 'FE';
    if (isSundayRest) {
      // Domingo JÁ É a folga semanal. Não inserir outra folga nessa semana.
      prevRestDay = Math.max(prevRestDay, sunDay);
      return;
    }

    // Domingo trabalhado (TD ou T): precisa de folga compensatória na semana.
    // EXCEÇÃO: se a semana (Seg-Sáb anterior) já tem folga 'F' DE FERIADO ABERTO,
    // essa folga JÁ SATISFAZ o DSR da semana — não inserir outra (evita estouro
    // do teto RH-01 e folgas consecutivas com o feriado). Folgas de domingos
    // ANTERIORES não contam: cada domingo trabalhado tem direito à própria comp.
    const weekStart = Math.max(1, sunDay - 6);
    let holidayRestDay = 0;
    for (let d = weekStart; d < sunDay; d++) {
      if (result[d] === 'F' && openHolidayDays.includes(d)) {
        holidayRestDay = d;
        break;
      }
    }
    if (holidayRestDay > 0) {
      prevRestDay = Math.max(prevRestDay, holidayRestDay);
      return;
    }

    // Candidatos ANTES do domingo (mesma semana): dias Seg-Sáb que PRECEDEM o domingo
    const candidatesPreceding: number[] = [];
    for (let offset = 6; offset >= 1; offset--) {
      const candidate = sunDay - offset;
      if (candidate >= 1) {
        const dow = getDayOfWeek(month, candidate);
        if (dow >= 1 && dow <= 6) { // Seg(1) a Sáb(6)
          candidatesPreceding.push(candidate);
        }
      }
    }

    // Candidatos da semana SEGUINTE (folga pós-domingo, padrão DSR)
    const candidatesFollowing: number[] = [];
    for (let offset = 1; offset <= 6; offset++) {
      const candidate = sunDay + offset;
      if (candidate <= totalDays && !isSunday(month, candidate)) {
        const dow = getDayOfWeek(month, candidate);
        if (dow >= 1 && dow <= 6) {
          candidatesFollowing.push(candidate);
        }
      }
    }

    // Seleção do dia da folga compensatória (minimiza folgas totais do mês):
    // 1. PÓS-domingo dentro do vão de 7 dias desde a última folga (o padrão DSR).
    //    Prefere o dia preferencial do grupo; senão o MAIS RECENTE dentro do vão
    //    (colocar longe demais cria série de 7 que força folga extra do Art. 67).
    // 2. Se nenhum dia pós-domingo cabe no vão, usa PRÉ-domingo (fallback), o mais
    //    recente possível — também evita a série de 7 até o próximo domingo.
    const withinGap = (list: number[]): number[] =>
      list.filter(c =>
        c - prevRestDay <= 7 &&
        result[c] !== 'FE' && result[c] !== 'FD' && result[c] !== 'F' && result[c] !== 'TF'
      );

    // Folga pós-domingo (padrão DSR) — prefere o dia preferencial do grupo,
    // DESDE QUE seja viável: a série após esta folga deve ser quebrada por um
    // descanso real (domingo FD/FE ou feriado F/FE) a até 7 dias, ou então a
    // comp do próximo domingo trabalhado precisa ter um dia legal a até 7 dias
    // que também não deixe série de 7+ até o próximo descanso real. Senão o
    // Art. 67 força folga extra que estoura o teto RH-01 e o rebalanceamento
    // de feriados cria nova infração.
    // Fallback: o primeiro dia viável do vão; último recurso o mais tardio.
    const pickPost = (list: number[]): number | undefined => {
      const inGap = withinGap(list);
      if (inGap.length === 0) return undefined;
      const nextSundayWorked = findNextSundayWorked(sunDay);
      const nextSundayRest = findNextSundayRest(sunDay);
      const nextHolidayRest = findNextHolidayRest(sunDay);
      const nextRestAnchor = Math.min(
        nextSundayRest ?? (totalDays + 1),
        nextHolidayRest ?? (totalDays + 1)
      );
      const feasible = (d: number): boolean => {
        if (nextRestAnchor - d - 1 <= 6) return true;
        if (nextSundayWorked === undefined) return false;
        const window: number[] = [];
        for (let off = 1; off <= 6; off++) {
          const c = nextSundayWorked + off;
          if (c <= totalDays && !isSunday(month, c)) window.push(c);
        }
        for (let off = 1; off <= 6; off++) {
          const c = nextSundayWorked - off;
          if (c >= 1 && !isSunday(month, c)) window.push(c);
        }
        for (const d2 of window) {
          if (d2 - d > 7) continue;
          if (result[d2] === 'FE' || result[d2] === 'FD' || result[d2] === 'F' || result[d2] === 'TF') continue;
          if (nextRestAnchor - d2 - 1 <= 6) return true;
        }
        return false;
      };
      const byGroupDay = inGap.find(d => getDayOfWeek(month, d) === preferredWeekday && feasible(d));
      if (byGroupDay !== undefined) return byGroupDay;
      const firstFeasible = inGap.find(feasible);
      return firstFeasible ?? inGap[inGap.length - 1];
    };

    const pickPre = (list: number[]): number | undefined => {
      const inGap = withinGap(list);
      if (inGap.length === 0) return undefined;
      // Prefere o dia preferencial do grupo (escalona as folgas entre os
      // colaboradores e reduz cascatas do Art. 67), DESDE QUE não crie vão
      // de 7+ dias de trabalho até o próximo descanso conhecido (domingo de
      // folga da rotação ou feriado fechado/aberto após o candidato) — caso
      // contrário o Art. 67 força folga extra que estoura o teto RH-01.
      const stretchEndFor = (d: number): number =>
        Math.min(
          findNextSundayRest(sunDay) ?? (totalDays + 1),
          findNextHolidayRest(d) ?? (totalDays + 1)
        );
      const prevRestPlain = prevRestDay > 0 && result[prevRestDay] === 'F';
      const byGroupDay = inGap.find(
        d =>
          getDayOfWeek(month, d) === preferredWeekday &&
          stretchEndFor(d) - d - 1 <= 6 &&
          (!prevRestPlain || d - prevRestDay >= 3)
      );
      if (byGroupDay !== undefined) return byGroupDay;
      // Fallback: o mais recente possível, mas sem folga simples ('F')
      // adjacente a uma folga simples já existente (±1 = 2 folgas seguidas
      // proibidas pela CCT, ±2 = "folga picada" F-T-F). Folgas estruturais
      // (FE/FD) podem ser adjacentes — o validador as isenta.
      const isPlainF = (x: number): boolean => result[x] === 'F';
      const fallback = inGap
        .slice()
        .reverse()
        .find(
          d =>
            !isPlainF(d - 1) &&
            !isPlainF(d + 1) &&
            !isPlainF(d - 2) &&
            !isPlainF(d + 2)
        );
      return fallback ?? inGap[inGap.length - 1];
    };

    let targetDay = pickPost(candidatesFollowing);
    if (targetDay === undefined) {
      targetDay = pickPre(candidatesPreceding);
    }
    if (targetDay === undefined) {
      targetDay = candidatesFollowing[candidatesFollowing.length - 1]
        ?? candidatesPreceding[candidatesPreceding.length - 1];
    }

    if (targetDay !== undefined) {
      result[targetDay] = 'F';
      prevRestDay = Math.max(prevRestDay, targetDay);
    }
  });

  // Ajuste de "cauda" do mês: se após a última folga restarem 7+ dias úteis de
  // trabalho (estouro do Art. 67 no fim do mês), move a folga compensatória
  // para o dia mais tardio possível que preserve os vãos de ≤ 7 dias — evita
  // folga extra forçada pelo Art. 67 que estouraria o teto RH-01.
  const restDays = Object.keys(result)
    .map(Number)
    .filter(d => isRestDay(result[d]))
    .sort((a, b) => a - b);

  if (restDays.length > 0) {
    const lastRest = restDays[restDays.length - 1];
    if (totalDays - lastRest >= 7 && result[lastRest] === 'F') {
      const prevRest = restDays.length >= 2 ? restDays[restDays.length - 2] : 0;
      let target: number | undefined;
      for (let t = totalDays; t > lastRest; t--) {
        if (isSunday(month, t)) continue;
        if (isRestDay(result[t])) continue;
        if (t - prevRest > 7) continue;
        if (totalDays - t > 6) continue;
        target = t;
        break;
      }
      if (target !== undefined) {
        result[lastRest] = 'T';
        result[target] = 'F';
      }
    }
  }

  return result;
}
