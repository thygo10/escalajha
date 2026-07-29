import { type ScheduleEntry, type Employee, type Holiday, type TipoDia, type TurnoConfig, type Violation, type ScheduleContext, type GenerateScheduleResult, type ScheduleScore, type CoverageGap, type ScheduleRule, isTrabalho, isFolgaNormal, DEFAULT_SCHEDULE_CONFIG } from './schedule.types';
import { type YearMonth, totalDaysInMonth, getSundays, isSunday } from '../shared/year-month';
import { extractLunchInterval } from '../shared/shift-window';

export interface GenerateScheduleInput {
  employees: Employee[];
  month: YearMonth;
  holidays: Holiday[];
  turnosConfigs?: TurnoConfig[];
  minFuncionariosPorDia?: number;
  minFuncionariosFeriado?: number;
  modeloEscala?: string;
  historicoMesAnterior?: Record<string, TipoDia[]>;
  leaveEvents?: Array<{ tipo: string; matricula: string; data_inicio: string; data_fim: string }>;
  rules?: ScheduleRule[];
}

// ─── Core Generation ───────────────────────────────────────────────────────

export function generateSchedule(input: GenerateScheduleInput): GenerateScheduleResult {
  const { employees, month, holidays } = input;
  const totalDays = totalDaysInMonth(month);
  const turnosConfigs = input.turnosConfigs || [];
  const leaveEventMap = buildLeaveEventMap(input.leaveEvents || []);

  const closedHolidays = new Set<number>();
  const openHolidays = new Set<number>();
  holidays.forEach(f => {
    const parts = f.data.split('-');
    if (Number(parts[0]) === month.year && Number(parts[1]) === month.month) {
      if (f.funcionamento_proibido) closedHolidays.add(Number(parts[2]));
      else openHolidays.add(Number(parts[2]));
    }
  });

  // Build prev-month consec map for CLT Art. 67 (virada de mês)
  const prevConsecMap = new Map<string, number>();
  if (input.historicoMesAnterior) {
    for (const [mat, days] of Object.entries(input.historicoMesAnterior)) {
      let consec = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (isTrabalho(days[i])) consec++;
        else break;
      }
      prevConsecMap.set(mat, consec);
    }
  }

  let entries: ScheduleEntry[] = employees.map(emp => ({
    matricula: emp.matricula_aleatoria,
    nome: emp.primeiro_nome,
    setor: emp.setor,
    turno: emp.turno_padrao,
    genero: emp.genero,
    dias: {},
  }));

  // Apply leave events
  entries = applyLeaveEvents(entries, leaveEventMap, month);

  // Pass 1: Fixed anchors (sundays, closed holidays)
  entries = applyFixedAnchors(entries, month, totalDays, closedHolidays, openHolidays, input.modeloEscala);

  // Pass 2: Constraint-based allocation
  allocateRestOfDays(entries, totalDays, month, closedHolidays, openHolidays, input.minFuncionariosPorDia, turnosConfigs, input.modeloEscala, prevConsecMap);

  // Single repair pass for folga picada spacing violations
  repairFolgaPicada(entries, totalDays, month, turnosConfigs, openHolidays, prevConsecMap);

  // Multiple repair passes to converge on coverage + spacing
  for (let _i = 0; _i < 3; _i++) {
    repairCoverageGaps(entries, month, totalDays, openHolidays, turnosConfigs, prevConsecMap, input.minFuncionariosPorDia);
    repairFolgaPicada(entries, totalDays, month, turnosConfigs, openHolidays, prevConsecMap);
  }
  // Final cleanup pass
  repairFolgaPicada(entries, totalDays, month, turnosConfigs, openHolidays, prevConsecMap);

  // Build violations
  const violations = findViolations(entries, month, totalDays, openHolidays);

  // Coverage gaps (simplified for now)
  const coverageGaps: CoverageGap[] = [];

  // Score
  const score = computeScore(entries, violations, coverageGaps, totalDays, month);

  return { entries, coverageGaps, score, violations };
}

// ─── Leave Events ──────────────────────────────────────────────────────────

function buildLeaveEventMap(events: Array<{ tipo: string; matricula: string; data_inicio: string; data_fim: string }>): Map<string, { start: Date; end: Date; tipo: string }[]> {
  const map = new Map<string, { start: Date; end: Date; tipo: string }[]>();
  for (const ev of events) {
    const list = map.get(ev.matricula) || [];
    const partsStart = ev.data_inicio.split('-');
    const partsEnd = ev.data_fim.split('-');
    list.push({
      start: new Date(Number(partsStart[0]), Number(partsStart[1]) - 1, Number(partsStart[2])),
      end: new Date(Number(partsEnd[0]), Number(partsEnd[1]) - 1, Number(partsEnd[2])),
      tipo: ev.tipo,
    });
    map.set(ev.matricula, list);
  }
  return map;
}

function applyLeaveEvents(entries: ScheduleEntry[], leaveMap: Map<string, { start: Date; end: Date; tipo: string }[]>, month: YearMonth): ScheduleEntry[] {
  if (leaveMap.size === 0) return entries;
  return entries.map(entry => {
    const events = leaveMap.get(entry.matricula);
    if (!events) return entry;
    const updated = { ...entry, dias: { ...entry.dias } };
    for (const ev of events) {
      for (let d = 1; d <= totalDaysInMonth(month); d++) {
        const date = new Date(month.year, month.month - 1, d);
        if (date >= ev.start && date <= ev.end) {
          const isFerias = ev.tipo === 'FERIAS';
          updated.dias[d] = isFerias ? 'FR' : 'AF';
        }
      }
    }
    return updated;
  });
}

// ─── Fixed Anchors ─────────────────────────────────────────────────────────

function applyFixedAnchors(
  items: ScheduleEntry[],
  month: YearMonth,
  totalDays: number,
  closedHolidays: Set<number>,
  openHolidays: Set<number>,
  modeloEscala?: string,
): ScheduleEntry[] {
  const sundays = getSundays(month);
  // Sort by shift start time so early shifts get even Sunday distribution,
  // ensuring morning coverage on Sundays (validator checks from 08:00).
  const shiftStartMin = items.map(item => {
    const m = item.turno?.match(/(\d{2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 999;
  });
  const priorityOrder = items.map((_, i) => i).sort((a, b) => shiftStartMin[a] - shiftStartMin[b]);
  return items.map((item, origIdx) => {
    const newDias: Record<number, TipoDia> = { ...item.dias };
    const sortedPos = priorityOrder.indexOf(origIdx);
    for (let day = 1; day <= totalDays; day++) {
      if (closedHolidays.has(day)) {
        newDias[day] = 'FE';
      } else if (sundays.includes(day)) {
        const sunIdx = sundays.indexOf(day);
        // 1T:2F rotation — use priority-sorted position for equitable distribution
        const state = (sunIdx + sortedPos) % 3;
        const shouldRest = (state !== 0);

        if (shouldRest) {
          newDias[day] = 'FD';
        } else if (openHolidays.has(day)) {
          newDias[day] = 'TF';
        } else {
          newDias[day] = 'TD';
        }
      } else if (openHolidays.has(day)) {
        newDias[day] = 'TF';
      }
    }
    return { ...item, dias: newDias };
  });
}

// ─── Rest of Days Allocation ───────────────────────────────────────────────

function allocateRestOfDays(
  items: ScheduleEntry[],
  totalDays: number,
  month: YearMonth,
  closedHolidays: Set<number>,
  openHolidays: Set<number>,
  minFuncionariosPorDia?: number,
  turnosConfigs?: TurnoConfig[],
  modeloEscala?: string,
  prevConsecMap?: Map<string, number>,
): void {
  const sectorName = items[0]?.setor?.toLowerCase() || '';
  const isFrontEnd = sectorName.includes('caixa') && !sectorName.includes('fiscal');
  const minEffective = isFrontEnd ? Math.max(minFuncionariosPorDia ?? 2, 6) : (minFuncionariosPorDia ?? 2);
  const sundayCount = getSundays(month).length;
  const isExceptionSector = sectorName.includes('padaria') || sectorName.includes('acougue') || sectorName.includes('açougue');
  // Exception sectors (bakery/açougue) keep min=4 even with 5 Sundays
  // due to production constraint (max 1 voluntary rest/day)
  // All sectors use min=4; anchor rests (FD/FE) + Phase 1 streak-breaking
  // naturally provide sufficient rest counts without forcing extras
  const minFolgas = 4;

  // Per-employee max folgas: absolute limit of 5 per month (PRD rule).
  // FE (closed holidays) don't count as a voluntary rest so we add them.
  // Total capped at 5 real folgas (F/FD) regardless of FD count.
  const getMaxFolgas = (emp: ScheduleEntry): number => {
    if (isExceptionSector) {
      return totalDays >= 30 ? 5 : 4;
    }
    const feCount = Object.values(emp.dias).filter(st => st === 'FE').length;
    // Base: 5 for months >= 30 days, else 4. FE days are free (loja fechada).
    // Hard cap: never more than 5 voluntary rests (F or FD) + FEs
    const base = totalDays >= 30 ? 5 : 4;
    return base + feCount;
  };

  // Helper to count only voluntary rests (F/FD) excluding FE
  const countVoluntaryFolgas = (emp: ScheduleEntry): number =>
    Object.values(emp.dias).filter(st => st === 'F' || st === 'FD').length;

  // Helper that includes previous month consecutive count
  const countConsecBefore = (emp: ScheduleEntry, day: number): number => {
    let count = 0;
    if (day <= 1) count = prevConsecMap?.get(emp.matricula) || 0;
    for (let d = day - 1; d >= 1; d--) {
      if (isTrabalho(emp.dias[d])) count++;
      else break;
    }
    return count;
  };

  // Initialize all empty days as work (T) or work-on-open-holiday (TF)
  items.forEach(emp => {
    for (let d = 1; d <= totalDays; d++) {
      if (!emp.dias[d]) {
        emp.dias[d] = openHolidays.has(d) ? 'TF' : 'T';
      }
    }
  });

  // ──────────────────────────────────────────────────
  // Phase 1: Enforce max 6 consecutive work days
  //   - Insert mandatory rest (F) on day 7+ of a streak,
  //     but only on regular 'T' days (never FD/FE/TD).
  //   - 'TF' on a Sunday is kept as-is (it's a worked
  //     Sunday under the holiday rotation).
  //   - 'TF' on a weekday is treated like regular 'T'.
  //   - Look-ahead: when consec=6 and next day is an
  //     unchangeable anchor (TD, FE, or Sunday TF),
  //     mark TODAY as rest instead, so the streak
  //     never reaches the anchor.
  // ──────────────────────────────────────────────────
  items.forEach(emp => {
    let consec = prevConsecMap?.get(emp.matricula) || 0;
    for (let d = 1; d <= totalDays; d++) {
      if (!isTrabalho(emp.dias[d])) {
        consec = 0;
        continue;
      }
      consec++;

      // Look-ahead: if we're at day 6 and tomorrow is an
      // unchangeable anchor, insert a rest BEFORE the anchor.
      // Distribute across employees (empIdx % 3) so not everyone
      // rests on the same day, preventing hourly coverage gaps.
      if (consec === 6 && d + 1 <= totalDays) {
        const next = emp.dias[d + 1];
        const nextIsSun = isSunday(month, d + 1);
        if (next === 'TD' || (next === 'TF' && nextIsSun)) {
          const empIdx = items.indexOf(emp);
          const offset = empIdx % 3; // 0=d, 1=d-1, 2=d-2
          let restDay = d - offset;
          if (restDay >= 1 && emp.dias[restDay] === 'T') {
            emp.dias[restDay] = 'F';
            // Recompute consec after this change
            consec = 0;
            for (let rd = restDay; rd <= d; rd++) {
              if (isTrabalho(emp.dias[rd])) consec++;
              else consec = 0;
            }
            continue;
          }
          // Fallback: mark current day
          if (emp.dias[d] === 'T') {
            emp.dias[d] = 'F';
            consec = 0;
            continue;
          }
        }
      }

      // Day 7+ of streak → mandatory rest on regular 'T'
      // or on weekday 'TF' (TF on a Sunday is preserved)
      if (consec > 6) {
        if (emp.dias[d] === 'T' || (emp.dias[d] === 'TF' && !isSunday(month, d))) {
          emp.dias[d] = 'F';
          consec = 0;
        }
      }
    }
  });

  // Phase 2: Ensure minimum daily coverage
  //   If a day has too few workers (below minEffective),
  //   revert mandatory rests — choose employees with the
  //   most total rests whose streak stays ≤6.
  // ──────────────────────────────────────────────────
  for (let d = 1; d <= totalDays; d++) {
    if (closedHolidays.has(d)) continue;

    let activeCount = items.filter(i => isTrabalho(i.dias[d])).length;
    let safety = 0;

    while (activeCount < minEffective && safety < 50) {
      safety++;

      const resting = items
        .map((emp, idx) => ({ emp, idx }))
        .filter(({ emp }) => emp.dias[d] === 'F')
        .sort((a, b) => {
          const offA = Object.values(a.emp.dias).filter(st => isFolgaNormal(st)).length;
          const offB = Object.values(b.emp.dias).filter(st => isFolgaNormal(st)).length;
          if (offA !== offB) return offB - offA;
          return a.idx - b.idx;
        });

      if (resting.length === 0) break;

      const { emp: chosen } = resting[0];

      // Check if reverting won't create a >6 streak
      const prevConsec = countConsecBefore(chosen, d);
      let nextConsec = 0;
      for (let nd = d + 1; nd <= totalDays; nd++) {
        if (isTrabalho(chosen.dias[nd])) nextConsec++;
        else break;
      }

      if (prevConsec + 1 + nextConsec <= 6) {
        chosen.dias[d] = openHolidays.has(d) ? 'TF' : 'T';
        activeCount++;
      } else if (d + 1 <= totalDays && chosen.dias[d + 1] === 'T') {
        // Swap: revert today, rest tomorrow
        chosen.dias[d] = openHolidays.has(d) ? 'TF' : 'T';
        chosen.dias[d + 1] = 'F';
        if (getMaxConsecutiveWorkDays(chosen, totalDays, prevConsecMap?.get(chosen.matricula)) <= 6) {
          activeCount++;
        } else {
          chosen.dias[d + 1] = openHolidays.has(d + 1) ? 'TF' : 'T';
          chosen.dias[d] = 'F';
        }
      }
    }
  }

  // ──────────────────────────────────────────────────
  // Phase 3: Balance rest counts per employee
  //   Ensure each employee has between minFolgas and
  //   maxFolgas rest days, respecting constraints.
  // ──────────────────────────────────────────────────

  // Track rest count per day across all employees to spread rests evenly
  const restCountByDay: Record<number, number> = {};
  items.forEach(emp => {
    for (let d = 1; d <= totalDays; d++) {
      if (isFolgaNormal(emp.dias[d])) {
        restCountByDay[d] = (restCountByDay[d] || 0) + 1;
      }
    }
  });

  items.forEach(emp => {
    const getOffDays = () =>
      Object.keys(emp.dias).map(Number).filter(d => isFolgaNormal(emp.dias[d]));

    let offDays = getOffDays();

    const empMaxFolgas = getMaxFolgas(emp);

    // 3a: Remove excess rests (> maxFolgas)
    while (offDays.length > empMaxFolgas) {
      const candidates = offDays
        .filter(d => emp.dias[d] === 'F')
        .sort((a, b) => b - a);

      if (candidates.length === 0) break;

      let removed = false;
      for (const d of candidates) {
        const prevVal = emp.dias[d];
        emp.dias[d] = openHolidays.has(d) ? 'TF' : 'T';
        if (getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula)) <= 6) {
          restCountByDay[d] = (restCountByDay[d] || 1) - 1;
          removed = true;
          break;
        }
        emp.dias[d] = prevVal;
      }
      if (!removed) break;
      offDays = getOffDays();
    }

    // 3b: Add missing rests (< minFolgas)
    while (offDays.length < minFolgas) {
      let added = false;

      // Prefer days where hourly coverage is least impacted
      const dayScore = (d: number): number => {
        if (isFrontEnd && turnosConfigs && turnosConfigs.length > 0) {
          const isDomingo = isSunday(month, d);
          const curva = calcularPresencaPorFaixaHoraria(items, turnosConfigs, d);
          for (const faixa of curva) {
            const hNum = Number(faixa.horaStr.split(':')[0]);
            const hIni = isDomingo ? 8 : 7;
            const hFim = isDomingo ? 20 : 21;
            if (hNum >= hIni && hNum < hFim) {
              const isCritica = hNum < 9 || hNum === 11 || hNum === 12;
              const isSundayWindow = isDomingo && (hNum === 8 || hNum === 11 || hNum === 12);
              const minReq = isSundayWindow ? 3 : (isCritica ? 5 : 6);
              const surplus = faixa.quantidadeTrabalhando - minReq;
              if (surplus <= 1) return 999; // avoid days with tight coverage
            }
          }
        }
        return 0;
      };

      const sortedDays = Array.from({ length: totalDays }, (_, i) => i + 1)
        .filter(d => emp.dias[d] === 'T')
        .sort((a, b) => {
          const sa = dayScore(a);
          const sb = dayScore(b);
          if (sa !== sb) return sa - sb;
          const ra = restCountByDay[a] || 0;
          const rb = restCountByDay[b] || 0;
          if (ra !== rb) return ra - rb;
          return a - b;
        });

      for (const d of sortedDays) {
        const workingCount = items.filter(i => isTrabalho(i.dias[d])).length;
        if (workingCount <= minEffective) continue;

        // Bakery: max 1 rest per day
        const isBakery = emp.setor?.toLowerCase().includes('padaria');
        if (isBakery) {
          const bakeryOff = items.filter(i =>
            i.setor?.toLowerCase().includes('padaria') && isFolgaNormal(i.dias[d])
          ).length;
          if (bakeryOff >= 1) continue;
        }

        emp.dias[d] = 'F';

        // Hourly coverage check (Frente de Caixa) - enforce min 6 on ALL operating hours
        let coberturaOk = true;
        if (isFrontEnd && turnosConfigs && turnosConfigs.length > 0) {
          const isDomingo = isSunday(month, d);
          const curva = calcularPresencaPorFaixaHoraria(items, turnosConfigs, d);
          for (const faixa of curva) {
            const hNum = Number(faixa.horaStr.split(':')[0]);
            const hIni = isDomingo ? 8 : 7;
            const hFim = isDomingo ? 20 : 21;
            if (hNum >= hIni && hNum < hFim) {
              const isCritica = hNum < 9 || hNum === 11 || hNum === 12;
              const isSundayWindow = isDomingo && (hNum === 8 || hNum === 11 || hNum === 12);
              const minReq = isSundayWindow ? 3 : (isCritica ? 5 : 6);
              if (faixa.quantidadeTrabalhando < minReq) { coberturaOk = false; break; }
            }
          }
        }

        if (coberturaOk && getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula)) <= 6) {
          restCountByDay[d] = (restCountByDay[d] || 0) + 1;
          added = true;
          break;
        }
        emp.dias[d] = openHolidays.has(d) ? 'TF' : 'T';
      }

      if (!added) break;
      offDays = getOffDays();
    }
  });

  // ──────────────────────────────────────────────────
  // Phase 4: Distribute rests on open holidays
  //   On open holidays (TF), some employees should rest
  //   to share holiday work fairly among the group.
  // ──────────────────────────────────────────────────
  if (openHolidays.size > 0) {
    for (let d = 1; d <= totalDays; d++) {
      if (!openHolidays.has(d)) continue;

      let workingCount = items.filter(i => isTrabalho(i.dias[d])).length;
      if (workingCount <= minEffective + 1) continue;

      // Employees eligible for holiday rest: currently TF,
      // won't break max consec, not maxed out on rests
      const candidates: ScheduleEntry[] = [];
      for (const emp of items) {
        if (emp.dias[d] !== 'TF') continue;
        const totalOffs = Object.values(emp.dias).filter(st => isFolgaNormal(st)).length;
        if (totalOffs >= getMaxFolgas(emp)) continue;
        // Test: temporarily set to F, check consec
        emp.dias[d] = 'F';
        if (getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula)) <= 6) {
          candidates.push(emp);
        }
        emp.dias[d] = 'TF';
      }

      // Sort by total rests (ascending) for fairness
      candidates.sort((a, b) => {
        const offA = Object.values(a.dias).filter(st => isFolgaNormal(st)).length;
        const offB = Object.values(b.dias).filter(st => isFolgaNormal(st)).length;
        if (offA !== offB) return offA - offB;
        return items.indexOf(a) - items.indexOf(b);
      });

      // Grant rest to ~50% of TF employees or as long as coverage permits
      const maxHolidayRest = Math.max(1, Math.floor(candidates.length * 0.5));
      let granted = 0;
      for (const emp of candidates) {
        if (granted >= maxHolidayRest) break;
        workingCount = items.filter(i => isTrabalho(i.dias[d])).length;
        if (workingCount <= minEffective) break;
        // Check hourly coverage before granting rest
        let coberturaOk = true;
        if (turnosConfigs && turnosConfigs.length > 0) {
          const isDomingo = isSunday(month, d);
          const curva = calcularPresencaPorFaixaHoraria(items, turnosConfigs, d);
          for (const faixa of curva) {
            const hNum = Number(faixa.horaStr.split(':')[0]);
            const hIni = isDomingo ? 8 : 7;
            const hFim = isDomingo ? 20 : 21;
            if (hNum >= hIni && hNum < hFim) {
              const minReq = isDomingo || openHolidays.has(d) ? 1 : minEffective;
              if (faixa.quantidadeTrabalhando - 1 < minReq) { coberturaOk = false; break; }
            }
          }
        }
        if (!coberturaOk) break;
        emp.dias[d] = 'F';
        granted++;
      }
    }
  }
}

// ─── Folga Picada Repair ────────────────────────────────────────────────────

function repairFolgaPicada(
  items: ScheduleEntry[],
  totalDays: number,
  month: YearMonth,
  turnosConfigs?: TurnoConfig[],
  openHolidays?: Set<number>,
  prevConsecMap?: Map<string, number>,
): void {
  const sectorName = items[0]?.setor?.toLowerCase() || '';
  const isFrontEnd = sectorName.includes('caixa') && !sectorName.includes('fiscal');
  for (const emp of items) {
    let attempts = 0;
    const triedPairs = new Set<string>();
    while (attempts < 20) {
      attempts++;
      const restDays = Object.entries(emp.dias)
        .filter(([_, st]) => st === 'F' || st === 'FD' || st === 'FE')
        .map(([d]) => Number(d))
        .sort((a, b) => a - b);
      if (restDays.length === 0) break;
      let found = false;

      for (let i = 0; i < restDays.length - 1; i++) {
        const d1 = restDays[i];
        const d2 = restDays[i + 1];
        if (d2 - d1 !== 2) continue;
        if (!isTrabalho(emp.dias[d1 + 1])) continue;

        const pairKey = `${d1}-${d2}`;
        if (triedPairs.has(pairKey)) continue;
        triedPairs.add(pairKey);

        // Collect 'F' days that can be moved
        const moveCandidates: number[] = [];
        if (emp.dias[d1] === 'F') moveCandidates.push(d1);
        if (emp.dias[d2] === 'F') moveCandidates.push(d2);

        if (moveCandidates.length > 0) {
          for (const moveDay of moveCandidates) {
            for (let candidate = 1; candidate <= totalDays; candidate++) {
              if (candidate === moveDay) continue;
              if (emp.dias[candidate] !== 'T') continue;
              // Skip if candidate would create a new folga picada (distance 2 from another rest)
              let wouldPicada = false;
              for (const rd of restDays) {
                if (rd === moveDay) continue;
                if (Math.abs(rd - candidate) === 2) { wouldPicada = true; break; }
              }
              if (wouldPicada) continue;
              emp.dias[moveDay] = 'T';
              emp.dias[candidate] = 'F';
              if (getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula)) <= 6) {
                found = true;
                break;
              }
              emp.dias[moveDay] = 'F';
              emp.dias[candidate] = 'T';
            }
            if (found) break;
          }
        }

        // Fallback: insert F on the middle day (breaks folga picada by making adjacent rests)
        // Skip for bakery (low rest limit)
        const ePadaria = sectorName.includes('padaria');
        if (!found && !ePadaria && isTrabalho(emp.dias[d1 + 1])) {
          const mid = d1 + 1;
          // Skip if no matching turno config (coverage check would be unreliable)
          const hasTurnoConfig = !isFrontEnd || (turnosConfigs && turnosConfigs.some(tc =>
            tc.nome === emp.turno || (emp.turno && emp.turno.includes(tc.entrada))
          ));
          if (!hasTurnoConfig) continue;
          emp.dias[mid] = 'F';
          let coberturaOk = true;
          if (isFrontEnd && turnosConfigs && turnosConfigs.length > 0) {
            const isDomingo = isSunday(month, mid);
            const curva = calcularPresencaPorFaixaHoraria(items, turnosConfigs, mid);
            for (const faixa of curva) {
              const hNum = Number(faixa.horaStr.split(':')[0]);
              const hIni = isDomingo ? 8 : 7;
              const hFim = isDomingo ? 20 : 21;
              if (hNum >= hIni && hNum < hFim) {
                const isCritica = hNum < 9 || hNum === 11 || hNum === 12;
                const minReq = isDomingo || (openHolidays && openHolidays.has(mid)) ? 1 : (isCritica ? 5 : 6);
                if (faixa.quantidadeTrabalhando < minReq) { coberturaOk = false; break; }
              }
            }
          }
          if (coberturaOk) {
            found = true;
          } else {
            emp.dias[mid] = 'T';
          }
        }
        if (found) break;
      }
      if (!found) break;
    }
  }
}

// ─── Coverage Repair ────────────────────────────────────────────────────────

function empCoversHour(emp: ScheduleEntry, turnosConfigs: TurnoConfig[], probHoraMin: number): boolean {
  const cfg = turnosConfigs.find(t => t.nome === emp.turno || emp.turno.includes(t.entrada));
  if (cfg) {
    const entradaMin = Number(cfg.entrada.split(':')[0]) * 60 + Number(cfg.entrada.split(':')[1]);
    const saidaMin = Number(cfg.saida.split(':')[0]) * 60 + Number(cfg.saida.split(':')[1]);
    if (probHoraMin < entradaMin || probHoraMin >= saidaMin) return false;
    const almoco = extractLunchInterval(cfg.nome, cfg.entrada, cfg.saida, cfg.intervaloMinutos);
    return !(probHoraMin >= almoco.inicio && probHoraMin < almoco.fim);
  }
  // Fallback: same parsing as calcularPresencaPorFaixaHoraria (HH:MM às HH:MM)
  if (emp.turno) {
    const mh = emp.turno.match(/(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
    if (mh) {
      const [hE, mE] = mh[1].split(':').map(Number);
      const [hS, mS] = mh[2].split(':').map(Number);
      const ent = hE * 60 + (mE || 0);
      const sai = hS * 60 + (mS || 0);
      if (probHoraMin < ent || probHoraMin >= sai) return false;
      const ma = emp.turno.match(/Almoço\s+(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
      let aI = 0, aF = 0;
      if (ma) {
        const [hIE, mIE] = ma[1].split(':').map(Number);
        const [hIS, mIS] = ma[2].split(':').map(Number);
        aI = hIE * 60 + (mIE || 0);
        aF = hIS * 60 + (mIS || 0);
      } else {
        const meio = Math.floor((ent + sai) / 2);
        aI = meio - 45;
        aF = meio + 45;
      }
      return !(probHoraMin >= aI && probHoraMin < aF);
    }
  }
  return false;
}

function repairCoverageGaps(
  items: ScheduleEntry[],
  month: YearMonth,
  totalDays: number,
  openHolidays: Set<number>,
  turnosConfigs: TurnoConfig[],
  prevConsecMap?: Map<string, number>,
  minFuncionariosPorDia?: number,
): void {
  if (!turnosConfigs || turnosConfigs.length === 0) return;
  if (items.length <= 3) return;

  const hasFiscal = items.some(e => e.setor?.toLowerCase().includes('fiscal'));
  const sectorName = items[0]?.setor?.toLowerCase() || '';
  const isFrontEnd = sectorName.includes('caixa') && !sectorName.includes('fiscal') && !hasFiscal;
  const minEffective = Math.max(minFuncionariosPorDia ?? 2, isFrontEnd ? 6 : 1);

  for (let d = 1; d <= totalDays; d++) {
    const isDomingo = isSunday(month, d);
    if (openHolidays.has(d)) continue;
    const hIni = isDomingo ? 8 : 7;
    const hFim = isDomingo ? 20 : 21;

    for (let attempt = 0; attempt < 20; attempt++) {
      const curva = calcularPresencaPorFaixaHoraria(items, turnosConfigs, d);
      let piorFaixa: { horaStr: string; quantidadeTrabalhando: number } | null = null;
      for (const faixa of curva) {
        const hNum = Number(faixa.horaStr.split(':')[0]);
        if (hNum >= hIni && hNum < hFim) {
          const isCritica = hNum < 9 || hNum === 11 || hNum === 12;
          const isSundayWindow = isDomingo && (hNum === 8 || hNum === 11 || hNum === 12);
          const minReq = isFrontEnd ? (isSundayWindow ? 3 : (isCritica ? 5 : 6)) : minEffective;
          if (faixa.quantidadeTrabalhando < minReq) {
            piorFaixa = faixa;
            break;
          }
        }
      }
      if (!piorFaixa) break;

      const probHoraMin = Number(piorFaixa.horaStr.split(':')[0]) * 60;

      // Find candidates: employees on rest (F) whose shift covers the problem hour
      const candidates: Array<{ emp: ScheduleEntry; swapDay: number }> = [];
      for (const emp of items) {
        if (emp.dias[d] !== 'F') continue;
        // Check coverage using same logic as calcularPresencaPorFaixaHoraria
        // (including fallback for non-cfg-matched turno strings)
        if (!empCoversHour(emp, turnosConfigs, probHoraMin)) continue;

        let maxTest = 0;

        // Test: revert d to T, check max consec
        emp.dias[d] = 'T';
        maxTest = getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula));
        emp.dias[d] = 'F';
        if (maxTest <= 6) {
          candidates.push({ emp, swapDay: 0 });
          continue;
        }

        // maxConsec > 6: try swap — revert d, add rest at d+1
        if (d + 1 <= totalDays && emp.dias[d + 1] === 'T') {
          emp.dias[d] = 'T';
          emp.dias[d + 1] = 'F';
          maxTest = getMaxConsecutiveWorkDays(emp, totalDays, prevConsecMap?.get(emp.matricula));
          emp.dias[d + 1] = 'T';
          emp.dias[d] = 'F';
          if (maxTest <= 6) {
            candidates.push({ emp, swapDay: d + 1 });
          }
        }

      }

      // Fallback: no resting employee covers the problem hour.
      // Try swapping a resting employee whose shift also covers the
      // problem hour (but whose rest is inviolable) with a working
      // employee who can take the rest without issues.
      if (candidates.length === 0) {
        for (const restEmp of items) {
          if (restEmp.dias[d] !== 'F') continue;
          if (!empCoversHour(restEmp, turnosConfigs, probHoraMin)) continue;
          for (const workEmp of items) {
            if (!isTrabalho(workEmp.dias[d])) continue;
            // Try swap: restEmp -> work (covers problem hour), workEmp -> rest
            restEmp.dias[d] = 'T';
            workEmp.dias[d] = 'F';
            const restMax = getMaxConsecutiveWorkDays(restEmp, totalDays, prevConsecMap?.get(restEmp.matricula));
            const workMax = getMaxConsecutiveWorkDays(workEmp, totalDays, prevConsecMap?.get(workEmp.matricula));
            if (restMax <= 6 && workMax <= 6) {
              candidates.push({ emp: restEmp, swapDay: 0 });
              break;
            }
            // Revert
            restEmp.dias[d] = 'F';
            workEmp.dias[d] = 'T';
          }
          if (candidates.length > 0) break;
        }
      }

      if (candidates.length === 0) break;
      // Prefer candidates whose revert does not create folga picada (d-1 and d+1 both rest)
      candidates.sort((a, b) => {
        const picadaA = d - 1 >= 1 && d + 1 <= totalDays &&
          isFolgaNormal(a.emp.dias[d - 1]) && isFolgaNormal(a.emp.dias[d + 1]);
        const picadaB = d - 1 >= 1 && d + 1 <= totalDays &&
          isFolgaNormal(b.emp.dias[d - 1]) && isFolgaNormal(b.emp.dias[d + 1]);
        if (picadaA !== picadaB) return picadaA ? 1 : -1;
        const getHour = (emp: ScheduleEntry): number => {
          const cfg = turnosConfigs.find(t => t.nome === emp.turno || emp.turno.includes(t.entrada));
          if (cfg) return Number(cfg.entrada.split(':')[0]);
          const mh = emp.turno?.match(/(\d{2}:\d{2})\s+às/i);
          if (mh) return Number(mh[1].split(':')[0]);
          return 12;
        };
        return getHour(a.emp) - getHour(b.emp);
      });
      const { emp: chosen, swapDay } = candidates[0];
      chosen.dias[d] = 'T';
      if (swapDay > 0) {
        chosen.dias[swapDay] = 'F';
      }
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getConsecutiveWorkDaysBefore(emp: ScheduleEntry, day: number): number {
  let count = 0;
  for (let d = day - 1; d >= 1; d--) {
    if (isTrabalho(emp.dias[d])) count++;
    else break;
  }
  return count;
}

function getMaxConsecutiveWorkDays(emp: ScheduleEntry, totalDays: number, prevConsec?: number): number {
  let maxC = 0;
  let curC = prevConsec || 0;
  for (let d = 1; d <= totalDays; d++) {
    if (isTrabalho(emp.dias[d])) {
      curC++;
      if (curC > maxC) maxC = curC;
    } else {
      curC = 0;
    }
  }
  return maxC;
}

// ─── Violations ────────────────────────────────────────────────────────────

function findViolations(entries: ScheduleEntry[], month: YearMonth, totalDays: number, openHolidays: Set<number>): Violation[] {
  const violations: Violation[] = [];

  for (const entry of entries) {
    // Check max 6 consecutive work days
    let consec = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (isTrabalho(entry.dias[d])) {
        consec++;
        if (consec > 6) {
          violations.push({
            type: 'CLT_ART_67',
            severity: 'error',
            message: `${entry.nome} trabalhou ${consec} dias consecutivos (máx 6)`,
            entry,
            day: d,
          });
        }
      } else {
        consec = 0;
      }
    }

    // Check Sunday rotation violations (1T:2F)
    const sundays = Object.keys(entry.dias)
      .map(Number)
      .filter(d => isSunday(month, d));
    const workedSundays = sundays.filter(d => entry.dias[d] === 'TD' || entry.dias[d] === 'TF');
    const isExceptionSector = entry.setor?.toLowerCase().includes('padaria') ||
      entry.setor?.toLowerCase().includes('acougue') ||
      entry.setor?.toLowerCase().includes('açougue');

    if (!isExceptionSector) {
      for (let i = 0; i < workedSundays.length - 1; i++) {
        if (workedSundays[i + 1] - workedSundays[i] <= 7) {
          violations.push({
            type: 'SUNDAY_ROTATION',
            severity: 'error',
            message: `${entry.nome} trabalhou domingos consecutivos (dias ${workedSundays[i]} e ${workedSundays[i + 1]})`,
            entry,
            day: workedSundays[i + 1],
          });
        }
      }
    } else if (entry.genero === 'F') {
      // CLT 386 for women in bakery/butcher
      for (let i = 0; i < workedSundays.length - 1; i++) {
        if (workedSundays[i + 1] - workedSundays[i] <= 7) {
          violations.push({
            type: 'CLT_386',
            severity: 'error',
            message: `${entry.nome} (Feminino - ${entry.setor}) trabalhou domingos consecutivos violando CLT Art. 386`,
            entry,
            day: workedSundays[i + 1],
          });
        }
      }
    }

    // Check FD -> TD transition (must have intermediate rest)
    for (let i = 0; i < sundays.length - 1; i++) {
      const dDom = sundays[i];
      const dNext = sundays[i + 1];
      if ((entry.dias[dDom] === 'FD' || entry.dias[dDom] === 'F') &&
        (entry.dias[dNext] === 'TD' || entry.dias[dNext] === 'TF')) {
        let hasIntermediateRest = false;
        for (let d = dDom + 1; d < dNext; d++) {
          if (isFolgaNormal(entry.dias[d])) {
            hasIntermediateRest = true;
            break;
          }
        }
        if (!hasIntermediateRest) {
          violations.push({
            type: 'FD_TD_TRANSITION',
            severity: 'error',
            message: `${entry.nome} passou de FD (dia ${dDom}) para TD (dia ${dNext}) sem folga intermediária`,
            entry,
            day: dNext,
          });
        }
      }
    }
  }

  return violations;
}

// ─── Score ─────────────────────────────────────────────────────────────────

function computeScore(
  entries: ScheduleEntry[],
  violations: Violation[],
  coverageGaps: CoverageGap[],
  totalDays: number,
  month: YearMonth,
): ScheduleScore {
  const severityWeights: Record<string, number> = { error: 10, warning: 3 };
  const violationPenalty = violations.reduce((sum, v) => sum + (severityWeights[v.severity] || 5), 0);
  const coveragePenalty = coverageGaps.reduce((sum, g) => sum + g.shortfall, 0);

  const maxScore = 100;
  const rawScore = maxScore - violationPenalty - coveragePenalty;
  const total = Math.max(0, Math.min(100, rawScore));

  const coverage = coverageGaps.length === 0 ? 100 : Math.max(0, 100 - coveragePenalty * 5);

  // Fairness: std dev of work days distribution
  const workDaysCounts = entries.map(e =>
    Object.values(e.dias).filter(d => isTrabalho(d)).length
  );
  const avgLoad = workDaysCounts.length > 0
    ? workDaysCounts.reduce((a, b) => a + b, 0) / workDaysCounts.length
    : 0;
  const variance = workDaysCounts.length > 0
    ? workDaysCounts.reduce((sum, val) => sum + (val - avgLoad) ** 2, 0) / workDaysCounts.length
    : 0;
  const loadStdDev = Math.sqrt(variance);
  const fairness = loadStdDev <= 1 ? 100 : Math.max(0, 100 - (loadStdDev - 1) * 20);

  // Sunday distribution
  const sundayCounts = entries.map(e => {
    return Object.keys(e.dias)
      .map(Number)
      .filter(d => isSunday(month, d) && isTrabalho(e.dias[d]))
      .length;
  });
  const sundayAvg = sundayCounts.length > 0
    ? sundayCounts.reduce((a, b) => a + b, 0) / sundayCounts.length
    : 0;
  const sundayVar = sundayCounts.length > 0
    ? sundayCounts.reduce((sum, val) => sum + (val - sundayAvg) ** 2, 0) / sundayCounts.length
    : 0;
  const sundayDistribution = Math.sqrt(sundayVar);

  return {
    total: Math.round(total * 10) / 10,
    coverage: Math.round(coverage * 10) / 10,
    fairness: Math.round(fairness * 10) / 10,
    violations: violations.length,
    warnings: violations.filter(v => v.severity === 'warning').map(v => v.message),
    balance: {
      sundayDistribution: Math.round(sundayDistribution * 100) / 100,
      averageLoad: Math.round(avgLoad * 10) / 10,
      loadStdDev: Math.round(loadStdDev * 10) / 10,
    },
  };
}

// ─── Facade for backward compatibility ────────────────────────────────────

export function calcularCargaHorariaLiquida(entrada: string, saida: string, intervaloMinutos: number): {
  minutos: number;
  horas: number;
  horasFormatted: string;
  excedeLimite: boolean;
} {
  const [hIn, mIn] = entrada.split(':').map(Number);
  const [hOut, mOut] = saida.split(':').map(Number);
  const totalMinutos = (hOut * 60 + mOut) - (hIn * 60 + mIn) - intervaloMinutos;
  const horas = totalMinutos / 60;
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return {
    minutos: totalMinutos,
    horas,
    horasFormatted: `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`,
    excedeLimite: totalMinutos > 528,
  };
}

export function calcularPresencaPorFaixaHoraria(
  items: ScheduleEntry[],
  turnosConfigs: TurnoConfig[],
  dia: number,
): { horaStr: string; quantidadeTrabalhando: number; funcionariosNomes: string[] }[] {
  const faixas: { horaStr: string; quantidadeTrabalhando: number; funcionariosNomes: string[] }[] = [];
  for (let h = 7; h <= 22; h++) {
    const horaStr = `${String(h).padStart(2, '0')}:00`;
    const ativos = items.filter(item => {
      if (!isTrabalho(item.dias[dia])) return false;
      const turno = item.turno;
      const cfg = turnosConfigs.find(t => t.nome === turno || (item.turno && item.turno.includes(t.entrada)));
      if (cfg) {
        const horaMin = h * 60;
        const entradaMin = Number(cfg.entrada.split(':')[0]) * 60 + Number(cfg.entrada.split(':')[1]);
        const saidaMin = Number(cfg.saida.split(':')[0]) * 60 + Number(cfg.saida.split(':')[1]);
        const { inicio: almocoIni, fim: almocoFim } = extractLunchInterval(cfg.nome, cfg.entrada, cfg.saida, cfg.intervaloMinutos);
        return horaMin >= entradaMin && horaMin < saidaMin && !(horaMin >= almocoIni && horaMin < almocoFim);
      }
      // Fallback: try to parse HH:MM às HH:MM from turno string
      if (item.turno) {
        const matchHoras = item.turno.match(/(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
        if (matchHoras) {
          const [hEnt, mEnt] = matchHoras[1].split(':').map(Number);
          const [hSai, mSai] = matchHoras[2].split(':').map(Number);
          const entradaMin = hEnt * 60 + (mEnt || 0);
          const saidaMin = hSai * 60 + (mSai || 0);
          const almocoMatch = item.turno.match(/Almoço\s+(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
          let almocoIni = 0, almocoFim = 0;
          if (almocoMatch) {
            const [hIE, mIE] = almocoMatch[1].split(':').map(Number);
            const [hIS, mIS] = almocoMatch[2].split(':').map(Number);
            almocoIni = hIE * 60 + (mIE || 0);
            almocoFim = hIS * 60 + (mIS || 0);
          } else {
            const meio = Math.floor((entradaMin + saidaMin) / 2);
            almocoIni = meio - 45;
            almocoFim = meio + 45;
          }
          const horaMin = h * 60;
          return horaMin >= entradaMin && horaMin < saidaMin && !(horaMin >= almocoIni && horaMin < almocoFim);
        }
      }
      return false;
    });
    faixas.push({
      horaStr,
      quantidadeTrabalhando: ativos.length,
      funcionariosNomes: ativos.map(a => a.nome),
    });
  }
  return faixas;
}

export function calcularResumoMetrics(
  items: ScheduleEntry[],
  funcionarios: Employee[],
  turnosConfigs: TurnoConfig[],
  ano: number,
  mes: number,
): Array<{
  matricula: string;
  nome: string;
  setor: string;
  cargo: string;
  turno: string;
  genero: 'M' | 'F';
  totalFolgas: number;
  domingosFolgados: number;
  feriadosFolgados: number;
  diasTrabalhados: number;
  horasLiquidasMinutos: number;
  horasLiquidasFormatted: string;
  statusConformidade: 'OK' | 'ALERTA' | 'VIOLACAO';
  alertas: string[];
}> {
  const empMap = new Map(funcionarios.map(f => [f.matricula_aleatoria, f]));
  const totalDays = totalDaysInMonth({ year: ano, month: mes });
  const sundays: number[] = [];
  for (let d = 1; d <= totalDays; d++) {
    if (isSunday({ year: ano, month: mes }, d)) sundays.push(d);
  }

  return items.map(item => {
    const emp = empMap.get(item.matricula);
    const dias = Object.keys(item.dias).map(Number);
    const totalFolgas = dias.filter(d => isFolgaNormal(item.dias[d])).length;
    const domingosFolgados = sundays.filter(d => isFolgaNormal(item.dias[d])).length;
    const diasTrabalhados = dias.filter(d => isTrabalho(item.dias[d])).length;
    const feriadosFolgados = 0; // simplified

    const turnoCfg = turnosConfigs.find(t => t.nome === item.turno || item.turno.includes(t.entrada));
    const horasLiquidasMinutos = turnoCfg ? turnoCfg.cargaHorariaLiquidaMinutos * diasTrabalhados : diasTrabalhados * 480;
    const h = Math.floor(horasLiquidasMinutos / 60);
    const m = horasLiquidasMinutos % 60;
    const horasLiquidasFormatted = `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;

    const alertas: string[] = [];
    const violations = findViolationsInEntry(item, { year: ano, month: mes }, totalDays);
    violations.forEach(v => alertas.push(v.message));
    const statusConformidade = alertas.length === 0 ? 'OK' : alertas.some(a => a.includes('viola')) ? 'VIOLACAO' : 'ALERTA';

    return {
      matricula: item.matricula,
      nome: item.nome,
      setor: item.setor,
      cargo: emp?.cargo || '',
      turno: item.turno,
      genero: item.genero,
      totalFolgas,
      domingosFolgados,
      feriadosFolgados,
      diasTrabalhados,
      horasLiquidasMinutos,
      horasLiquidasFormatted,
      statusConformidade,
      alertas,
    };
  });
}

function findViolationsInEntry(entry: ScheduleEntry, month: YearMonth, totalDays: number): Violation[] {
  const violations: Violation[] = [];
  let consec = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (isTrabalho(entry.dias[d])) {
      consec++;
      if (consec > 6) {
        violations.push({
          type: 'CLT_ART_67',
          severity: 'error',
          message: `${entry.nome} trabalhou ${consec} dias consecutivos`,
          entry,
          day: d,
        });
      }
    } else {
      consec = 0;
    }
  }
  return violations;
}

export function extrairHistoricoMesAnterior(itens: ScheduleEntry[]): Record<string, TipoDia[]> {
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
