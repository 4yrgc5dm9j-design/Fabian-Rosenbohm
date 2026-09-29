import { useMemo } from 'react';

import { entriesForMonth, viewFor, type Entry } from './budget.ts';
import { useStore } from './store.tsx';

/** Einträge eines Monats aus Sicht der gewählten Ansicht (Haushalt oder Person). */
export function useMonthEntries(month: string): Entry[] {
  const { transactions, fixed, viewer } = useStore();
  return useMemo(
    () => viewFor(entriesForMonth(transactions, fixed, month), viewer),
    [transactions, fixed, month, viewer],
  );
}
