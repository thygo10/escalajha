import { TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday, calcularFolgasEsperadasNoMes } from '../../shared/year-month';
import { GeneratorV2Input, GeneratorV2Result, ScheduleV2Item, EmployeeMonthState, SectorRuleConfig } from './schedule-v2.types';
import { validateAndNormalizeEmployeeGroups } from './group-validator.engine';
import { initializeEmployeeStates } from './employee-state.engine';
import { calculateSundayAssignments } from './sunday.engine';
import { calculateHolidayAssignments } from './holiday.engine';
import { assignWeeklyRests } from './weekly-rest.engine';
import { enforceMaxConsecutiveDays, isRestDay } from './consecutive-days.engine';
import { validateSectorCoverage } from './coverage-validator.engine';
import { repairSectorCoverage, spreadRestDays } from './coverage-repair.engine';

/**
 * Motor Determinístico de Escalas - EscalaJHA v2
 * 
 * Substitui algoritmos heurísticos/solver por um pipeline determinístico em camadas
 * baseado em regras de negócio estritas acordadas com o RH.
 */
export function generateDeterministicSchedule(input: GeneratorV2Input): GeneratorV2Result {
  const { employees, month, holidays = [], sectorRule, previousStates } = input;
  const setor = employees.length > 0 ? employees[0].setor : 'Setor Único';
  const totalDays = totalDaysInMonth(month);

  const minDia = input.minFuncionariosDia ?? sectorRule?.minFuncionariosDia;
  const minDom = input.minFuncionariosDomingo ?? sectorRule?.minFuncionariosDomingo;
  const minFer = input.minFuncionariosFeriado ?? sectorRule?.minFuncionariosFeriado;
  const hasExplicitCoverage =
    minDia !== undefined || minDom !== undefined || minFer !== undefined;

  const effectiveSectorRule: SectorRuleConfig | undefined = hasExplicitCoverage
    ? {
        setor,
        minFuncionariosDia: minDia,
        minFuncionariosDomingo: minDom,
        minFuncionariosFeriado: minFer
      }
    : undefined;

  // 1. Validação e Normalização de Grupos
  const groupValidation = validateAndNormalizeEmployeeGroups(employees);
  if (!groupValidation.isValid) {
    return {
      month,
      setor,
      items: [],
      endStates: {},
      violations: groupValidation.errors.map(err => ({ code: 'INVALID_GROUP', message: err, severity: 'ERROR' })),
      isValid: false
    };
  }

  // 2. Inicialização do Estado Inter-meses
  const normalizedEmployees = groupValidation.validatedEmployees;
  const initialStates = initializeEmployeeStates(normalizedEmployees, month, previousStates);
  const endStates: Record<string, EmployeeMonthState> = {};

  const items: ScheduleV2Item[] = [];
  const allViolations: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING' | 'INFO'; employeeId?: string; day?: number }> = [];

  // Mapa de afastamentos/férias por matrícula
  const leaveMap = buildLeaveMap(input.leaveEvents ?? [], month);

  // Registrar warnings de grupos normalizados
  groupValidation.warnings.forEach(warn => {
    allViolations.push({ code: 'GROUP_WARNING', message: warn, severity: 'WARNING' });
  });

  // 3. Processamento Individual por Funcionário
  // Detecta setores com rotação 2T:1F (exceção CCT Padaria/Açougue = apenas 2 grupos)
  const sundayGroups = new Set(normalizedEmployees.map(e => (e.grupo_domingo || 'A').toUpperCase()));
  const twoGroupSundayRotation = sundayGroups.size === 2;

  for (const emp of normalizedEmployees) {
    const key = emp.id || emp.matricula_aleatoria;
    const empState = initialStates[key];

    // Passo 3.1: Domingos (Rotação 1T:2F padrão ou 2T:1F CCT p/ Padaria/Açougue)
    const sundayAssignments = calculateSundayAssignments(month, emp.grupo_domingo, {
      genero: emp.genero,
      twoGroups: twoGroupSundayRotation
    });

    // Passo 3.2: Feriados (Alternância A/B ou Fechado FE)
    const holidayAssignments = calculateHolidayAssignments(month, emp.grupo_feriado, holidays);

    // Montar mapa base inicial para o mês
    const diasMap: Record<number, TipoDia> = {};
    for (let d = 1; d <= totalDays; d++) {
      diasMap[d] = 'T'; // Default trabalho em dia comum
    }

    // Aplicar atribuições de domingos
    sundayAssignments.forEach(sa => {
      diasMap[sa.day] = sa.tipo;
    });

    // Aplicar atribuições de feriados (ordenadas por dia p/ checagem de redundância correta)
    holidayAssignments
      .slice()
      .sort((a, b) => a.day - b.day)
      .forEach(ha => {
        if (ha.tipo === 'F') {
          // Folga de feriado redundante quando a semana já tem descanso adjacente
          // (ex.: domingo FD + feriado aberto na 2ª/3ª) — marca como TF (feriado
          // trabalhado) em vez de 'T' comum, que o validador rejeita em feriado.
          if (isRestDay(diasMap[ha.day - 1]) || isRestDay(diasMap[ha.day + 1])) {
            diasMap[ha.day] = 'TF';
            return;
          }
        }
        diasMap[ha.day] = ha.tipo;
      });

    // Passo 3.3: Folgas Compensatórias Semanais
    // Regra Ouro DSR: Folga na semana APENAS quando trabalhou no domingo daquela semana
    const openHolidayDaysThisMonth = holidays
      .filter(
        h =>
          !h.funcionamento_proibido &&
          Number(h.data?.split('-')[0]) === month.year &&
          Number(h.data?.split('-')[1]) === month.month
      )
      .map(h => Number(h.data.split('-')[2]));
    const diasWithWeeklyRest = assignWeeklyRests(month, diasMap, emp.grupo_folga_compensatoria, openHolidayDaysThisMonth);

    // Passo 3.3.1: Afastamentos / Férias (sobrepõem qualquer atribuição)
    const diasWithLeave = applyLeaveToEmployee(month, diasWithWeeklyRest, emp.matricula_aleatoria, leaveMap);

    // Passo 3.4: Regra Soberana - Máximo 6 Dias Consecutivos (Art. 67 CLT)
    const consecutiveResult = enforceMaxConsecutiveDays(
      month,
      diasWithLeave,
      empState.consecutiveDaysAtStart
    );

    // Atualizar estado final do mês para este funcionário
    let lastSunWorked: string | undefined = empState.lastSundayWorked;
    let lastHolWorked: string | undefined = empState.lastHolidayWorked;

    sundayAssignments.forEach(sa => {
      if (sa.tipo === 'TD') {
        const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(sa.day).padStart(2, '0')}`;
        lastSunWorked = dateStr;
      }
    });

    holidayAssignments.forEach(ha => {
      if (ha.tipo === 'TF') {
        const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(ha.day).padStart(2, '0')}`;
        lastHolWorked = dateStr;
      }
    });

    endStates[key] = {
      ...empState,
      consecutiveDaysAtStart: consecutiveResult.consecutiveDaysAtEnd,
      lastSundayWorked: lastSunWorked,
      lastHolidayWorked: lastHolWorked
    };

    items.push({
      funcionarioId: key,
      matricula: emp.matricula_aleatoria,
      nome: emp.primeiro_nome,
      setor: emp.setor,
      setorId: emp.setor_id,
      turno: emp.turno_padrao,
      genero: emp.genero,
      cargo: emp.cargo,
      grupoDomingo: emp.grupo_domingo,
      grupoFeriado: emp.grupo_feriado,
      grupoFolgaCompensatoria: emp.grupo_folga_compensatoria,
      dias: consecutiveResult.dias,
      motivosAlteracao: consecutiveResult.motivosAlteracao
    });
  }

  // 3.5: Reparo determinístico de cobertura mínima (apenas se mínimos explícitos)
  if (hasExplicitCoverage) {
    repairSectorCoverage(items, month, {
      minDaily: minDia,
      minSunday: minDom,
      minHoliday: minFer,
      holidays
    });
  }

  // 3.5.1: Espalhamento de folgas da produção (CCT Padaria) — limite de folgas
  // não-invioláveis por dia útil (mesmo critério do validador).
  if (setor.toLowerCase().includes('padaria')) {
    spreadRestDays(items, month, Math.max(1, Math.ceil(items.length / 6)), holidays);
  }

  // 3.6: Rebalanceamento de feriados abertos — se o colaborador excederia o
  // teto RH-01 de folgas programáveis (F/FD), a folga de feriado aberto vira
  // trabalho (TF). O direito ao descanso do feriado é realocado ao outro grupo.
  const { maxFolgas } = calcularFolgasEsperadasNoMes(month.year, month.month);
  const openHolidayDays = holidays
    .filter(
      h =>
        !h.funcionamento_proibido &&
        Number(h.data?.split('-')[0]) === month.year &&
        Number(h.data?.split('-')[1]) === month.month
    )
    .map(h => Number(h.data.split('-')[2]))
    .filter(d => !isSunday(month, d));

  for (const item of items) {
    let folgasProgramaveis = (Object.values(item.dias) as TipoDia[]).filter(
      t => t === 'F' || t === 'FD'
    ).length;
    if (folgasProgramaveis <= maxFolgas) continue;

    for (const d of openHolidayDays) {
      if (folgasProgramaveis <= maxFolgas) break;
      if (item.dias[d] === 'F') {
        item.dias[d] = 'TF';
        folgasProgramaveis--;
        item.motivosAlteracao = item.motivosAlteracao ?? {};
        item.motivosAlteracao[d] =
          'Rebalanceamento de feriado aberto: teto RH-01 de folgas programáveis atingido, feriado vira trabalho (TF).';
      }
    }
  }

  // 4. Validação de Cobertura de Setor
  const coverageViolations = validateSectorCoverage(month, items, effectiveSectorRule, {
    enforce: hasExplicitCoverage,
    holidays
  });
  coverageViolations.forEach(cv => {
    allViolations.push(cv);
  });

  // 4.1: Estados finais recalculados a partir das escalas finais (os pós-passos
  // 3.5/3.5.1/3.6 podem ter movido folgas e alterado a cauda do mês).
  const holidayDaysThisMonth = new Set(
    holidays
      .filter(
        h =>
          Number(h.data?.split('-')[0]) === month.year &&
          Number(h.data?.split('-')[1]) === month.month
      )
      .map(h => Number(h.data.split('-')[2]))
  );
  items.forEach(item => {
    let consecutiveDaysAtEnd = 0;
    for (let d = totalDays; d >= 1; d--) {
      if (item.dias[d] === 'T' || item.dias[d] === 'TD' || item.dias[d] === 'TF') consecutiveDaysAtEnd++;
      else break;
    }
    let lastSundayWorked: string | undefined;
    let lastHolidayWorked: string | undefined;
    for (let d = totalDays; d >= 1; d--) {
      const st = item.dias[d];
      if (!lastSundayWorked && isSunday(month, d) && (st === 'TD' || st === 'TF')) {
        lastSundayWorked = `${month.year}-${String(month.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      if (!lastHolidayWorked && holidayDaysThisMonth.has(d) && (st === 'TF' || st === 'TD')) {
        lastHolidayWorked = `${month.year}-${String(month.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      if (lastSundayWorked && lastHolidayWorked) break;
    }
    const prev = endStates[item.funcionarioId] ?? {};
    endStates[item.funcionarioId] = {
      ...prev,
      consecutiveDaysAtStart: consecutiveDaysAtEnd,
      lastSundayWorked,
      lastHolidayWorked
    };
  });

  const hasErrors = allViolations.some(v => v.severity === 'ERROR');

  return {
    month,
    setor,
    items,
    endStates,
    violations: allViolations,
    isValid: !hasErrors
  };
}

interface LeaveInfo {
  days: Set<number>;
  isFerias: boolean;
}

function buildLeaveMap(
  events: Array<{ matricula: string; tipo: string; data_inicio: string; data_fim: string }>,
  month: YearMonth
): Map<string, LeaveInfo> {
  const map = new Map<string, LeaveInfo>();
  for (const ev of events) {
    if (!ev?.matricula || !ev.data_inicio || !ev.data_fim) continue;
    const [sy, sm, sd] = ev.data_inicio.split('-').map(Number);
    const [ey, em, ed] = ev.data_fim.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    const info = map.get(ev.matricula) ?? { days: new Set<number>(), isFerias: ev.tipo === 'FERIAS' };
    info.isFerias = info.isFerias || ev.tipo === 'FERIAS';
    for (let d = 1; d <= totalDaysInMonth(month); d++) {
      const date = new Date(month.year, month.month - 1, d);
      if (date >= start && date <= end) {
        info.days.add(d);
      }
    }
    map.set(ev.matricula, info);
  }
  return map;
}

function applyLeaveToEmployee(
  month: YearMonth,
  diasMap: Record<number, TipoDia>,
  matricula: string,
  leaveMap: Map<string, LeaveInfo>
): Record<number, TipoDia> {
  const info = leaveMap.get(matricula);
  if (!info || info.days.size === 0) return diasMap;

  const result: Record<number, TipoDia> = { ...diasMap };
  const leaveTipo: TipoDia = info.isFerias ? 'FR' : 'AF';
  info.days.forEach(d => {
    result[d] = leaveTipo;
  });
  return result;
}
