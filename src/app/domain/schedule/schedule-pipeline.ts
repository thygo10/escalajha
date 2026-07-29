import type { ScheduleContext, ScheduleEntry, ScheduleRule, GenerateScheduleResult } from './schedule.types';
import { planShiftBlocks } from './planner';
import { allocateEmployees } from './allocator';
import { validateEntries } from './validator';
import { optimizeSchedule } from './optimizer';
import { buildResult } from './reporter';
import { ConsecutiveWorkRule } from './rules/consecutive-work.rule';
import { SundayRotationRule } from './rules/sunday-rotation.rule';

const DEFAULT_RULES: ScheduleRule[] = [
  new ConsecutiveWorkRule(),
  new SundayRotationRule(),
];

export function executePipeline(
  context: ScheduleContext,
  rules: ScheduleRule[] = DEFAULT_RULES,
): GenerateScheduleResult {
  // Phase 1: Plan shift blocks based on demand
  const plan = planShiftBlocks(context);

  // Phase 2: Allocate employees to shifts
  let entries = allocateEmployees(plan, context);

  // Phase 3: Optimize (if enabled)
  if (context.config?.optimizationPasses && context.config.optimizationPasses > 0) {
    entries = optimizeSchedule(entries, context);
  }

  // Phase 4: Validate against all rules
  const violations = validateEntries(entries, context, rules);

  // Phase 5: Build result with score
  return buildResult(entries, violations, context);
}
