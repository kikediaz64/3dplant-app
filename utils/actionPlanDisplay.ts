import type { DiagnosisAction } from '../types';

export const getActionPlanDisplay = (actionPlan?: DiagnosisAction[] | null) => {
  const actions = actionPlan ?? [];
  return { actionPlan: actions, topActions: actions.slice(0, 3) };
};

/** Conserva el primer diagnóstico al que se le cambia manualmente la especie. */
export const getOriginalDiagnosis = <T>(original: T | null, current: T): T => original ?? current;

/** Indica si el resultado mostrado difiere del diagnóstico inicial guardado. */
export const shouldShowReturnToOriginal = <T>(current: T | null, original: T | null): boolean =>
  current !== null && original !== null && current !== original;
