/** Genera claves estables por texto y número de repetición, en el orden de la lista. */
export const occurrenceKeys = <T>(items: T[], text: (item: T) => string): string[] => {
  const occurrences = new Map<string, number>();

  return items.map(item => {
    const value = text(item);
    const occurrence = occurrences.get(value) ?? 0;
    occurrences.set(value, occurrence + 1);
    return JSON.stringify([value, occurrence]);
  });
};
