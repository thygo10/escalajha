import type { ScheduleEntry, ScheduleContext, Violation, CoverageGap, ScheduleScore, GenerateScheduleResult } from './schedule.types';
import { isTrabalho, isFolgaNormal } from './schedule.types';
import { isSunday } from '../shared/year-month';
import { computeCoverageMetrics } from './coverage';

export function buildResult(
  entries: ScheduleEntry[],
  violations: Violation[],
  context: ScheduleContext,
): GenerateScheduleResult {
  const { coveragePercent, gaps } = computeCoverageMetrics(entries, context);
  const score = computeScore(entries, violations, gaps, context);

  return {
    entries,
    coverageGaps: gaps,
    score,
    violations,
  };
}

function computeScore(
  entries: ScheduleEntry[],
  violations: Violation[],
  coverageGaps: CoverageGap[],
  context: ScheduleContext,
): ScheduleScore {
  const severityWeights: Record<string, number> = { error: 10, warning: 3 };
  const violationPenalty = violations.reduce((sum, v) => sum + (severityWeights[v.severity] || 5), 0);
  const coveragePenalty = coverageGaps.reduce((sum, g) => sum + g.shortfall, 0);

  const maxScore = 100;
  const rawScore = maxScore - violationPenalty - coveragePenalty;
  const total = Math.max(0, Math.min(100, rawScore));

  const coverage = coverageGaps.length === 0 ? 100 : Math.max(0, 100 - coveragePenalty * 5);

  const totalDays = new Date(context.month.year, context.month.month, 0).getDate();
  const workDaysCounts = entries.map(e =>
    Object.keys(e.dias).filter(d => isTrabalho(e.dias[Number(d)])).length
  );
  const avgLoad = workDaysCounts.length > 0
    ? workDaysCounts.reduce((a, b) => a + b, 0) / workDaysCounts.length
    : 0;
  const variance = workDaysCounts.length > 0
    ? workDaysCounts.reduce((sum, val) => sum + (val - avgLoad) ** 2, 0) / workDaysCounts.length
    : 0;
  const loadStdDev = Math.sqrt(variance);
  const fairness = loadStdDev <= 1 ? 100 : Math.max(0, 100 - (loadStdDev - 1) * 20);

  const sundayCounts = entries.map(e => {
    return Object.keys(e.dias)
      .map(Number)
      .filter(d => isSunday(context.month, d) && isTrabalho(e.dias[d]))
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
