import React from 'react';
import { DiagnosisResult as IDiagnosisResult, DiagnosisAction } from '../../types';
import { occurrenceKeys } from '../../utils/occurrenceKeys';

const DiagnosisOverview = ({ result, topActions }: { result: IDiagnosisResult; topActions: DiagnosisAction[] }) => {
  const actionKeys = occurrenceKeys(topActions, action => action.title);
  const statusClasses = result.healthStatus === 'Saludable'
    ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200'
    : result.healthStatus === 'Enferma'
      ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
      : 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-200';
  return (
    <div className={`mt-4 rounded-xl border p-4 ${statusClasses}`}>
      <h2 className="text-base font-bold">¿Qué le pasa?</h2>
      {result.healthStatus === 'Saludable' ? (
        <p className="mt-1 text-sm font-semibold">No vemos problemas importantes</p>
      ) : (
        <>
          <p className="mt-1 text-sm font-bold">{result.problemName}</p>
          <p className="mt-1 text-sm leading-relaxed">{result.impact}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
            <span>Impacto: {result.severity === 'low' ? 'Bajo' : result.severity === 'moderate' ? 'Moderado' : 'Crítico'}</span>
            {result.urgency && <span>Urgencia: {result.urgency}</span>}
          </div>
        </>
      )}
      {result.healthStatus === 'Saludable' && result.urgency && <p className="mt-1 text-xs font-semibold">Urgencia: {result.urgency}</p>}
      <div className="mt-4 border-t border-current pt-3">
        <h3 className="text-sm font-bold">Qué hacer ahora</h3>
        {topActions.length ? (
          <ol className="mt-2 space-y-2 list-decimal pl-5">
            {topActions.map((action, index) => (
                <li key={actionKeys[index]} className="text-sm leading-relaxed">
                  <span className="font-bold">{action.title}</span>
                  <span className="block text-xs leading-relaxed opacity-90">{action.description}</span>
                </li>
            ))}
          </ol>
        ) : <p className="mt-1 text-sm">No hay acciones recomendadas.</p>}
      </div>
    </div>
  );
};

export default DiagnosisOverview;
