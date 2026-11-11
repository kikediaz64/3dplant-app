export const getActionPlanDisplay = <T>(actionPlan?: T[] | null) => {
  const actions = actionPlan ?? [];
  return { actionPlan: actions, topActions: actions.slice(0, 3) };
};
