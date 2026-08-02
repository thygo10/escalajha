import { TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday } from '../../shared/year-month';

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
  grupoFolgaCompensatoria: string
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

  sundayDays.forEach((sunDay) => {
    const sundayTipo = result[sunDay];
    const isSundayRest = sundayTipo === 'FD' || sundayTipo === 'F' || sundayTipo === 'FE';

    if (isSundayRest) {
      // Domingo JÁ É a folga semanal. Não inserir outra folga nessa semana.
      return;
    }

    // Domingo trabalhado (TD ou T): precisa de folga compensatória na semana.
    // Candidatos = dias Seg-Sáb que PRECEDEM esse domingo (mesma semana).
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

    // Candidatos da semana seguinte (folga pós-domingo), como fallback
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

    // Prefer semana que precede se tiver pelo menos 3 dias disponíveis
    let candidates = candidatesPreceding.length >= 3
      ? candidatesPreceding
      : (candidatesFollowing.length > 0 ? candidatesFollowing : candidatesPreceding);

    if (candidates.length === 0) return;

    // 1ª escolha: dia preferencial do grupo nessa janela
    let targetDay = candidates.find(d =>
      getDayOfWeek(month, d) === preferredWeekday &&
      result[d] !== 'FE' && result[d] !== 'FD' && result[d] !== 'F'
    );

    // 2ª escolha: dia preferencial na janela oposta
    if (!targetDay) {
      const secondary = candidates === candidatesPreceding ? candidatesFollowing : candidatesPreceding;
      targetDay = secondary.find(d =>
        getDayOfWeek(month, d) === preferredWeekday &&
        result[d] !== 'FE' && result[d] !== 'FD' && result[d] !== 'F'
      );
    }

    // 3ª escolha: qualquer dia útil disponível na janela primária
    if (!targetDay) {
      targetDay = candidates.find(d =>
        result[d] !== 'FE' && result[d] !== 'FD' && result[d] !== 'F'
      );
    }

    if (targetDay) {
      result[targetDay] = 'F';
    }
  });

  return result;
}
