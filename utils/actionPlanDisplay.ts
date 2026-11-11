import type { DiagnosisAction } from '../types';

export const getActionPlanDisplay = (actionPlan?: DiagnosisAction[] | null) => {
  const actions = actionPlan ?? [];
  return { actionPlan: actions, topActions: actions.slice(0, 3) };
};
