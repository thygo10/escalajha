import { Feriado, TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday } from '../../shared/year-month';
import { ScheduleV2Item } from './schedule-v2.types';
import { isWorkDay, isRestDay } from './consecutive-days.engine';

const GROUP_DAY_MAP: Record<string, number> = {
  S1: 1, // Segunda-feira
  S2: 2, // Terça-feira
  S3: 3, // Quarta-feira
  S4: 4, // Quinta-feira
  S5: 5  // Sexta-feira
};

export interface CoverageRepairOptions {
  minDaily?: number;
  minSunday?: number;
  minHoliday?: number;
  holidays?: Feriado[];
}

export interface CoverageRepairResult {
  items: ScheduleV2Item[];
  repairedCount: number;
}

function isLeaveDay(tipo?: TipoDia): boolean {
  return tipo === 'AF' || tipo === 'FR';
}

/**
 * Reparo determinístico de cobertura mínima de setor.
 *
 * Para cada dia do mês em que a quantidade de funcionários trabalhando está
 * abaixo do mínimo exigido, converte folgas (F/FD/FE) em dias de trabalho
 * (T/TD/TF), respeitando:
 *  - Art. 67 CLT: nunca criar 7+ dias consecutivos de trabalho;
 *  - regra de "folga picada" (2 folgas com exatamente 1 trabalho entre elas);
 *  - DSR semanal: cada semana continua com pelo menos 1 folga (se a conversão
 *    for em domingo, concede folga compensatória em dia útil da mesma semana);
 *  - afastamentos/férias (AF/FR) nunca são convertidos.
 *
 * A escolha é determinística: candidatos ordenados por matrícula com rotação
 * pelo dia, para distribuir o sacrifício sem aleatoriedade.
 */
export function repairSectorCoverage(
  items: ScheduleV2Item[],
  month: YearMonth,
  opts: CoverageRepairOptions = {}
): CoverageRepairResult {
  const { minDaily, minSunday, minHoliday, holidays = [] } = opts;

  if (minDaily === undefined && minSunday === undefined && minHoliday === undefined) {
    return { items, repairedCount: 0 };
  }

  const totalDays = totalDaysInMonth(month);

  const closedHolidayDays = new Set<number>();
  const openHolidayDays = new Set<number>();
  holidays.forEach(h => {
    if (!h?.data) return;
    const parts = h.data.split('-');
    if (Number(parts[0]) === month.year && Number(parts[1]) === month.month) {
      const day = Number(parts[2]);
      if (h.funcionamento_proibido) closedHolidayDays.add(day);
      else openHolidayDays.add(day);
    }
  });

  const requiredMin = (d: number): number => {
    if (closedHolidayDays.has(d)) return 0;
    if (isSunday(month, d)) return minSunday ?? minDaily ?? 1;
    if (openHolidayDays.has(d)) return minHoliday ?? minDaily ?? 1;
    return minDaily ?? 1;
  };

  const countWorking = (d: number): number =>
    items.filter(it => isWorkDay(it.dias[d])).length;

  let repairedCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const required = requiredMin(d);
    let deficit = required - countWorking(d);
    if (deficit <= 0) continue;

    const candidates = items
      .filter(it => isRestDay(it.dias[d]) && !isLeaveDay(it.dias[d]))
      .sort((a, b) => a.matricula.localeCompare(b.matricula));

    if (candidates.length === 0) continue;

    // Rotação determinística para distribuir o reparo entre os funcionários
    const rotation = d % candidates.length;
    if (rotation > 0) {
      candidates.push(...candidates.splice(0, rotation));
    }

    for (const emp of candidates) {
      if (deficit <= 0) break;
      if (!convertRestDayToWork(emp, d, month, totalDays, openHolidayDays)) {
        continue;
      }
      deficit--;
      repairedCount++;
    }
  }

  return { items, repairedCount };
}

/**
 * Espalhamento de folgas da produção (CCT Padaria): em dias úteis, no máximo
 * `maxPerDay` folgas não-invioláveis por dia (mesmo critério do validador:
 * folgas "trava CLT" são isentas). Quando um dia excede o limite, move folgas
 * simples ('F') para outros dias da MESMA semana com capacidade, preservando:
 *  - Art. 67 CLT (séries ≤ 6): remover a folga só é permitido quando não cria
 *    7+ consecutivos; inserir em outro dia nunca cria série;
 *  - proibição de 2 folgas 'F' consecutivas e de "folga picada" (F-T-F);
 *  - DSR semanal (a folga remanejada permanece na semana de origem).
 */
export function spreadRestDays(
  items: ScheduleV2Item[],
  month: YearMonth,
  maxPerDay: number,
  holidays: Feriado[] = []
): CoverageRepairResult {
  const totalDays = totalDaysInMonth(month);

  const closedHolidayDays = new Set<number>();
  const openHolidayDays = new Set<number>();
  holidays.forEach(h => {
    if (!h?.data) return;
    const parts = h.data.split('-');
    if (Number(parts[0]) === month.year && Number(parts[1]) === month.month) {
      const day = Number(parts[2]);
      if (h.funcionamento_proibido) closedHolidayDays.add(day);
      else openHolidayDays.add(day);
    }
  });

  const restingAt = (emp: ScheduleV2Item, d: number): boolean =>
    emp.dias[d] === 'F' || emp.dias[d] === 'FE' || emp.dias[d] === 'AF' || emp.dias[d] === 'FR';

  // "Trava CLT": com o dia d como folga, os dias trabalhados adjacentes somam
  // 6+ (mesmo critério do validador) — a folga é inamovível.
  const inviolableAt = (emp: ScheduleV2Item, d: number): boolean => {
    let left = 0;
    for (let x = d - 1; x >= 1 && isWorkDay(emp.dias[x]); x--) left++;
    let right = 0;
    for (let x = d + 1; x <= totalDays && isWorkDay(emp.dias[x]); x++) right++;
    return left + right >= 6;
  };

  const countMovableResters = (d: number): number => {
    const resters = items.filter(e => restingAt(e, d));
    return resters.length - resters.filter(e => inviolableAt(e, d)).length;
  };

  const findMoveDest = (emp: ScheduleV2Item, d: number): number | undefined => {
    const dow = new Date(month.year, month.month - 1, d).getDay();
    const weekStart = d - ((dow + 6) % 7);
    const weekEnd = weekStart + 6;
    for (let dest = Math.max(1, weekStart); dest <= Math.min(totalDays, weekEnd); dest++) {
      if (dest === d) continue;
      if (isSunday(month, dest)) continue;
      if (closedHolidayDays.has(dest) || openHolidayDays.has(dest)) continue;
      if (emp.dias[dest] !== 'T') continue;
      if (countMovableResters(dest) + 1 > maxPerDay) continue;
      if (emp.dias[dest - 1] === 'F' || emp.dias[dest + 1] === 'F') continue;
      if (emp.dias[dest - 2] === 'F' || emp.dias[dest + 2] === 'F') continue;
      return dest;
    }
    return undefined;
  };

  let repairedCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    if (isSunday(month, d)) continue;
    if (closedHolidayDays.has(d) || openHolidayDays.has(d)) continue;
    const resters = items.filter(emp => restingAt(emp, d));
    if (resters.length === 0) continue;

    let excess = resters.length - resters.filter(emp => inviolableAt(emp, d)).length - maxPerDay;
    if (excess <= 0) continue;

    const candidates = resters
      .filter(emp => emp.dias[d] === 'F' && !inviolableAt(emp, d))
      .sort((a, b) => a.matricula.localeCompare(b.matricula));
    if (candidates.length === 0) continue;

    // Rotação determinística para distribuir o remanejamento
    const rotation = d % candidates.length;
    if (rotation > 0) {
      candidates.push(...candidates.splice(0, rotation));
    }

    for (const emp of candidates) {
      if (excess <= 0) break;
      const dest = findMoveDest(emp, d);
      if (dest === undefined) continue;
      emp.dias[d] = 'T';
      emp.dias[dest] = 'F';
      emp.motivosAlteracao = emp.motivosAlteracao ?? {};
      emp.motivosAlteracao[d] =
        `Espalhamento de folgas da produção: limite de ${maxPerDay} folgas por dia excedido no dia ${d}.`;
      emp.motivosAlteracao[dest] =
        'Espalhamento de folgas da produção: folga remanejada para dia com capacidade.';
      excess--;
      repairedCount++;
    }
  }

  return { items, repairedCount };
}

function convertRestDayToWork(
  emp: ScheduleV2Item,
  d: number,
  month: YearMonth,
  totalDays: number,
  openHolidayDays: Set<number>
): boolean {
  const originalTipo = emp.dias[d];
  const isSun = isSunday(month, d);
  const dow = new Date(month.year, month.month - 1, d).getDay(); // 0 = Domingo
  const weekStart = d - ((dow + 6) % 7); // Segunda-feira da semana
  const weekEnd = weekStart + 6;

  // Regra 1T:2F / CLT 386: ninguém pode trabalhar 2 domingos consecutivos
  if (isSun) {
    if (d - 7 >= 1 && isWorkDay(emp.dias[d - 7])) return false; // já trabalhou no domingo passado
    if (d + 7 <= totalDays && emp.dias[d + 7] === 'TD') return false; // vai trabalhar no domingo que vem (rotação)
  }

  // Conversão de folga de domingo (FD) exige folga compensatória na semana seguinte
  let compensationDay: number | undefined;
  if (isSun && originalTipo === 'FD') {
    compensationDay = findCompensationDay(emp, d, month, totalDays, d + 7);
  }

  // DSR: a semana do dia convertido deve continuar com pelo menos 1 folga
  if (!hasRestInWeek(emp, d, month, totalDays, weekStart, weekEnd) && compensationDay === undefined) {
    return false;
  }

  const isEffectiveRest = (x: number): boolean =>
    x === compensationDay || isRestDay(emp.dias[x]);

  // a) Art. 67 CLT: conversão não pode criar 7+ dias consecutivos de trabalho
  //    (a folga compensatória quebra a sequência)
  let streakBefore = 0;
  for (let x = d - 1; x >= 1 && streakBefore < 6; x--) {
    if (isWorkDay(emp.dias[x])) streakBefore++;
    else break;
  }
  let streakAfter = 0;
  for (let x = d + 1; x <= totalDays && streakAfter < 6; x++) {
    if (isEffectiveRest(x)) break;
    if (isWorkDay(emp.dias[x])) streakAfter++;
  }
  if (streakBefore + 1 + streakAfter > 6) return false;

  // b) "Folga picada": não deixar exatamente 1 trabalho entre 2 folgas simples
  let prevRest: number | undefined;
  for (let x = d - 1; x >= 1; x--) {
    if (isEffectiveRest(x)) {
      prevRest = x;
      break;
    }
  }
  let nextRest: number | undefined;
  for (let x = d + 1; x <= totalDays; x++) {
    if (isEffectiveRest(x)) {
      nextRest = x;
      break;
    }
  }
  if (prevRest !== undefined && nextRest !== undefined) {
    const prevIsPlainF = emp.dias[prevRest] === 'F';
    const nextIsPlainF = emp.dias[nextRest] === 'F' || nextRest === compensationDay;
    if (prevIsPlainF && nextIsPlainF && nextRest - prevRest === 2) {
      return false;
    }
  }

  const targetTipo: TipoDia = isSun
    ? 'TD'
    : openHolidayDays.has(d)
      ? 'TF'
      : 'T';

  emp.dias[d] = targetTipo;
  emp.motivosAlteracao = emp.motivosAlteracao ?? {};
  const diaLabel = new Date(month.year, month.month - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  });
  emp.motivosAlteracao[d] =
    `Reparo de cobertura: mínimo de funcionários no dia ${d} (${diaLabel}).`;

  if (compensationDay !== undefined) {
    emp.dias[compensationDay] = 'F';
    emp.motivosAlteracao[compensationDay] =
      'Reparo de cobertura: folga compensatória concedida para preservar o DSR semanal (CLT Art. 67).';
  }

  return true;
}

function hasRestInWeek(
  emp: ScheduleV2Item,
  d: number,
  month: YearMonth,
  totalDays: number,
  weekStart: number,
  weekEnd: number
): boolean {
  for (let x = Math.max(1, weekStart); x <= Math.min(totalDays, weekEnd); x++) {
    if (x !== d && isRestDay(emp.dias[x])) {
      return true;
    }
  }
  return false;
}

function findCompensationDay(
  emp: ScheduleV2Item,
  d: number,
  month: YearMonth,
  totalDays: number,
  weekEnd: number
): number | undefined {
  const preferredWeekday =
    GROUP_DAY_MAP[(emp.grupoFolgaCompensatoria || 'S5').toUpperCase()] ?? 5;

  const candidates: number[] = [];
  for (let x = d + 1; x <= Math.min(totalDays, weekEnd); x++) {
    if (isSunday(month, x)) continue;
    if (emp.dias[x] !== 'T') continue;
    // Evitar folga compensatória adjacente a folga existente (2 folgas seguidas)
    if (x > 1 && isRestDay(emp.dias[x - 1])) continue;
    if (x < totalDays && isRestDay(emp.dias[x + 1])) continue;
    candidates.push(x);
  }

  const safe = (x: number): boolean => {
    // Folga simples imediatamente anterior a x
    let before: number | undefined;
    for (let p = x - 1; p >= 1; p--) {
      if (isRestDay(emp.dias[p])) {
        before = p;
        break;
      }
    }
    // Folga simples imediatamente posterior a x
    let after: number | undefined;
    for (let p = x + 1; p <= totalDays; p++) {
      if (isRestDay(emp.dias[p])) {
        after = p;
        break;
      }
    }
    // 2 folgas simples com exatamente 1 trabalho entre elas = "folga picada"
    if (before !== undefined && emp.dias[before] === 'F' && x - before === 2) return false;
    if (after !== undefined && emp.dias[after] === 'F' && after - x === 2) return false;
    return true;
  };

  // 1ª escolha: dia preferencial do grupo (S1..S5) que não crie "folga picada"
  const preferred = candidates.find(x =>
    new Date(month.year, month.month - 1, x).getDay() === preferredWeekday && safe(x)
  );
  if (preferred !== undefined) return preferred;

  // 2ª escolha: dia mais próximo do domingo que não crie "folga picada"
  return candidates.find(safe);
}
