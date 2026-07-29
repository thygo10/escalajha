import type { ScheduleEntry, ScheduleContext, Violation, ScheduleRule } from './schedule.types';

export function validateEntries(entries: ScheduleEntry[], context: ScheduleContext, rules: ScheduleRule[]): Violation[] {
  const violations: Violation[] = [];

  for (const rule of rules) {
    const result = rule.validate(entries, context);
    violations.push(...result);
  }

  return violations;
}
