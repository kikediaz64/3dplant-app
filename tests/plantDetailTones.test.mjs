import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { getPlantDetailTones } = await import('../utils/plantDetailTones.ts');

const greenClasses = {
  box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30',
  title: 'text-green-900 dark:text-green-300',
  text: 'text-green-800 dark:text-green-200',
};

for (const [status, color, icon] of [
  ['sick', 'red', '🔴'],
  ['warning', 'orange', '⚠️'],
  ['healthy', 'green', '✅'],
]) {
  test(`${status}: recomendaciones verdes con 💡 y problemas con su tono de estado`, () => {
    const { diagnosisTone, recommendationsTone } = getPlantDetailTones(status);
    assert.deepEqual(recommendationsTone, { ...greenClasses, icon: '💡' });
    assert.deepEqual(diagnosisTone, {
      box: `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-900/30`,
      title: `text-${color}-900 dark:text-${color}-300`,
      text: `text-${color}-800 dark:text-${color}-200`,
      icon,
    });
  });
}
