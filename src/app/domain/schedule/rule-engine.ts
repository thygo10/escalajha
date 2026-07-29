import type { ScheduleRule, ScheduleEntry, ScheduleContext, Violation } from './schedule.types';

export function createRuleEngine(rules: ScheduleRule[]): RuleEngine {
  return new RuleEngine(rules);
}

export class RuleEngine {
  constructor(private rules: ScheduleRule[]) {}

  getRules(): ScheduleRule[] {
    return this.rules;
  }

  addRule(rule: ScheduleRule): void {
    this.rules.push(rule);
  }

  validateAll(entries: ScheduleEntry[], context: ScheduleContext): Violation[] {
    const allViolations: Violation[] = [];
    for (const rule of this.rules) {
      const violations = rule.validate(entries, context);
      allViolations.push(...violations);
    }
    return allViolations;
  }

  validateByRule(ruleId: string, entries: ScheduleEntry[], context: ScheduleContext): Violation[] {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return [];
    return rule.validate(entries, context);
  }
}
