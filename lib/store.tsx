import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { monthKey, newId, toDateString, type Transaction } from './budget';

const STORAGE_KEY = 'haushaltsbuch/transactions/v1';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;

type Store = {
  loaded: boolean;
  transactions: Transaction[];
  /** Aktuell ausgewählter Monat (YYYY-MM), geteilt zwischen den Tabs. */
  month: string;
  setMonth: (month: string) => void;
  add: (input: TransactionInput) => void;
  update: (id: string, input: TransactionInput) => void;
  remove: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(() => monthKey(toDateString(new Date())));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setTransactions(JSON.parse(raw));
      })
      .catch((e) => console.warn('Buchungen konnten nicht geladen werden', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // Erst nach dem Laden speichern, sonst würde der leere Startzustand
    // die gespeicherten Daten überschreiben.
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)).catch((e) =>
      console.warn('Buchungen konnten nicht gespeichert werden', e),
    );
  }, [loaded, transactions]);

  const add = useCallback((input: TransactionInput) => {
    setTransactions((prev) => [...prev, { ...input, id: newId(), createdAt: Date.now() }]);
  }, []);

  const update = useCallback((id: string, input: TransactionInput) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...input } : t)));
  }, []);

  const remove = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ loaded, transactions, month, setMonth, add, update, remove }),
    [loaded, transactions, month, add, update, remove],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden');
  return store;
}
