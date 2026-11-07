import React from 'react';
import { normalizeCareGuide, toxicityState } from '../services/careGuide';

export default function ToxicityNotice(props: { careGuide?: unknown; isToxic?: boolean }) {
  const toxicity = normalizeCareGuide(props.careGuide)?.toxicity;
  const toxic = toxicityState(props);
  if (toxic === false) return null;
  const messages: string[] = [];
  if (toxicity && toxic === true && toxicity.pets !== 'tóxica' && toxicity.people !== 'tóxica') {
    messages.push('⚠️ Puede ser tóxica para mascotas o personas');
  } else if (toxicity) {
    if (toxicity.pets === 'tóxica') messages.push('⚠️ Tóxica para mascotas');
    if (toxicity.people === 'tóxica') messages.push('⚠️ Tóxica para personas');
    if (toxicity.pets === 'desconocido' && toxicity.people === 'desconocido') {
      messages.push('Toxicidad: sin datos fiables');
    } else {
      if (toxicity.pets === 'desconocido') messages.push('Toxicidad para mascotas: sin datos fiables');
      if (toxicity.people === 'desconocido') messages.push('Toxicidad para personas: sin datos fiables');
    }
  } else {
    messages.push(toxic ? '⚠️ Tóxica para mascotas o personas' : 'Toxicidad: sin datos fiables');
  }
  return (
    <div role="status" className={`rounded-xl border p-4 mb-4 ${toxic ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100' : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-surface-dark dark:text-gray-300'}`}>
      <p className="font-bold">{messages.join(' · ')}</p>
      {toxicity?.note && <p className="mt-1 text-sm">{toxicity.note}</p>}
    </div>
  );
}
