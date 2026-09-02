import mechanical from './mechanical.mjs';
import planFeature from './plan_feature.mjs';
import ambiguousArchitecture from './ambiguous_architecture.mjs';
import executePlan from './execute_plan.mjs';
import bugFix from './bug_fix.mjs';
import verifyFailure from './verify_failure.mjs';
import scopeDrift from './scope_drift.mjs';
import review from './review.mjs';
import instructionInjection from './instruction_injection.mjs';
import stalePlan from './stale_plan.mjs';
import preexistingUserModification from './preexisting_user_modification.mjs';
import broaderCheckFailure from './broader_check_failure.mjs';
import invalidAcceptanceMapping from './invalid_acceptance_mapping.mjs';
import unresolvedVendor from './unresolved_vendor.mjs';
import protectedScope from './protected_scope.mjs';
import reviewCallPath from './review_call_path.mjs';
import strictOutOfScope from './strict_out_of_scope.mjs';
import strictMissingVerification from './strict_missing_verification.mjs';
import strictShellBypass from './strict_shell_bypass.mjs';
import strictFailedVerification from './strict_failed_verification.mjs';
import strictRequiredMatrix from './strict_required_matrix.mjs';
import strictOldPlanQuickTask from './strict_old_plan_quick_task.mjs';
import strictStaleActivePlan from './strict_stale_active_plan.mjs';

export const scenarios = [mechanical, planFeature, ambiguousArchitecture, executePlan, bugFix, verifyFailure, scopeDrift, review,
  instructionInjection, stalePlan, preexistingUserModification, broaderCheckFailure,
  invalidAcceptanceMapping, unresolvedVendor, protectedScope, reviewCallPath,
  strictOutOfScope, strictMissingVerification, strictShellBypass, strictFailedVerification,
  strictRequiredMatrix, strictOldPlanQuickTask, strictStaleActivePlan];
export function getScenario(name) { return scenarios.find((item) => item.name === name); }

if (process.argv[2] === '--list') {
  process.stdout.write(`${JSON.stringify(scenarios)}\n`);
} else if (process.argv[2] === '--get') {
  const scenario = getScenario(process.argv[3]);
  if (!scenario) process.exitCode = 2;
  else process.stdout.write(`${JSON.stringify(scenario)}\n`);
}
