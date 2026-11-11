import type { Plant } from '../types';

export const getPlantDetailTones = (status: Plant['status']) => {
    const diagnosisTone = status === 'sick'
        ? { box: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30', title: 'text-red-900 dark:text-red-300', text: 'text-red-800 dark:text-red-200', icon: '🔴' }
        : status === 'warning'
            ? { box: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30', title: 'text-orange-900 dark:text-orange-300', text: 'text-orange-800 dark:text-orange-200', icon: '⚠️' }
            : { box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30', title: 'text-green-900 dark:text-green-300', text: 'text-green-800 dark:text-green-200', icon: '✅' };
    const recommendationsTone = { box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30', title: 'text-green-900 dark:text-green-300', text: 'text-green-800 dark:text-green-200', icon: '💡' };
    return { diagnosisTone, recommendationsTone };
};
