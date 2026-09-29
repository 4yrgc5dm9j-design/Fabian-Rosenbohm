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

import {
  MEMBER_COLORS,
  monthKey,
  newId,
  toDateString,
  type FixedItem,
  type Member,
  type Settlement,
  type Shop,
  type Transaction,
} from './budget.ts';
import {
  createHousehold,
  mergeHouseholds,
  migrateV1,
  normalize,
  type HouseholdData,
  type Settings,
} from './household.ts';

const STORAGE_KEY = 'haushaltsbuch/household/v2';
const LEGACY_KEY = 'haushaltsbuch/transactions/v1';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
export type FixedInput = Omit<FixedItem, 'id' | 'updatedAt'>;

type Store = HouseholdData & {
  loaded: boolean;
  /** Aktuell ausgewählter Monat (YYYY-MM), geteilt zwischen den Tabs. */
  month: string;
  setMonth: (month: string) => void;
  /** Ansicht: `null` = ganzer Haushalt, sonst die ID einer Person. */
  viewer: string | null;
  setViewer: (memberId: string | null) => void;
  addTransaction: (input: TransactionInput) => string;
  updateTransaction: (id: string, input: TransactionInput) => void;
  removeTransaction: (id: string) => void;
  addFixed: (input: FixedInput) => void;
  updateFixed: (id: string, input: Partial<FixedInput>) => void;
  removeFixed: (id: string) => void;
  addMember: (name: string) => void;
  renameMember: (id: string, name: string) => void;
  removeMember: (id: string) => boolean;
  addShop: (name: string, category: string) => void;
  removeShop: (id: string) => void;
  moveShop: (id: string, delta: number) => void;
  addSettlement: (s: Omit<Settlement, 'id' | 'createdAt'>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importHousehold: (other: HouseholdData) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

async function loadHousehold(): Promise<HouseholdData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) return normalize(JSON.parse(raw));
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) return migrateV1(JSON.parse(legacy));
  return createHousehold();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<HouseholdData>(() => createHousehold());
  const [month, setMonth] = useState(() => monthKey(toDateString(new Date())));
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    loadHousehold()
      .then(setData)
      .catch((e) => console.warn('Daten konnten nicht geladen werden', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // Erst nach dem Laden speichern, sonst würde der leere Startzustand
    // die gespeicherten Daten überschreiben.
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) =>
      console.warn('Daten konnten nicht gespeichert werden', e),
    );
  }, [loaded, data]);

  // Ansicht zurücksetzen, wenn die gewählte Person gelöscht wurde.
  useEffect(() => {
    if (viewer && !data.members.some((m) => m.id === viewer)) setViewer(null);
  }, [viewer, data.members]);

  const patch = useCallback((fn: (d: HouseholdData) => Partial<HouseholdData>) => {
    setData((d) => ({ ...d, ...fn(d) }));
  }, []);

  const actions = useMemo(
    () => ({
      addTransaction: (input: TransactionInput) => {
        const id = newId();
        const now = Date.now();
        patch((d) => ({
          transactions: [...d.transactions, { ...input, id, createdAt: now, updatedAt: now }],
        }));
        return id;
      },
      updateTransaction: (id: string, input: TransactionInput) =>
        patch((d) => ({
          transactions: d.transactions.map((t) =>
            t.id === id ? { ...t, ...input, updatedAt: Date.now() } : t,
          ),
        })),
      removeTransaction: (id: string) =>
        patch((d) => ({ transactions: d.transactions.filter((t) => t.id !== id) })),
      addFixed: (input: FixedInput) =>
        patch((d) => ({ fixed: [...d.fixed, { ...input, id: newId(), updatedAt: Date.now() }] })),
      updateFixed: (id: string, input: Partial<FixedInput>) =>
        patch((d) => ({
          fixed: d.fixed.map((f) => (f.id === id ? { ...f, ...input, updatedAt: Date.now() } : f)),
        })),
      removeFixed: (id: string) => patch((d) => ({ fixed: d.fixed.filter((f) => f.id !== id) })),
      addMember: (name: string) =>
        patch((d) => {
          const used = new Set(d.members.map((m) => m.color));
          const color =
            MEMBER_COLORS.find((c) => !used.has(c)) ??
            MEMBER_COLORS[d.members.length % MEMBER_COLORS.length];
          const member: Member = { id: newId(), name, color, updatedAt: Date.now() };
          return { members: [...d.members, member] };
        }),
      renameMember: (id: string, name: string) =>
        patch((d) => ({
          members: d.members.map((m) => (m.id === id ? { ...m, name, updatedAt: Date.now() } : m)),
        })),
      removeMember: (id: string) => {
        // Nur Personen ohne Buchungen, Fixposten oder Anteile dürfen gelöscht werden,
        // sonst stimmen die Summen nicht mehr.
        const inUse =
          data.members.length <= 1 ||
          [...data.transactions, ...data.fixed].some(
            (t) => t.paidBy === id || t.split?.some((s) => s.memberId === id),
          ) ||
          data.settlements.some((s) => s.from === id || s.to === id);
        if (inUse) return false;
        patch((d) => ({ members: d.members.filter((m) => m.id !== id) }));
        return true;
      },
      addShop: (name: string, category: string) =>
        patch((d) => ({ shops: [...d.shops, { id: newId(), name, category } satisfies Shop] })),
      removeShop: (id: string) => patch((d) => ({ shops: d.shops.filter((s) => s.id !== id) })),
      moveShop: (id: string, delta: number) =>
        patch((d) => {
          const shops = [...d.shops];
          const i = shops.findIndex((s) => s.id === id);
          const j = i + delta;
          if (i < 0 || j < 0 || j >= shops.length) return {};
          [shops[i], shops[j]] = [shops[j], shops[i]];
          return { shops };
        }),
      addSettlement: (s: Omit<Settlement, 'id' | 'createdAt'>) =>
        patch((d) => ({
          settlements: [...d.settlements, { ...s, id: newId(), createdAt: Date.now() }],
        })),
      updateSettings: (p: Partial<Settings>) =>
        patch((d) => ({ settings: { ...d.settings, ...p } })),
      importHousehold: (other: HouseholdData) => setData((d) => mergeHouseholds(d, other)),
      resetAll: () => setData(createHousehold()),
    }),
    [patch, data.members, data.transactions, data.fixed, data.settlements],
  );

  const value = useMemo<Store>(
    () => ({ ...data, ...actions, loaded, month, setMonth, viewer, setViewer }),
    [data, actions, loaded, month, viewer],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden');
  return store;
}

export function useMemberName(): (id: string) => string {
  const { members } = useStore();
  return useCallback((id: string) => members.find((m) => m.id === id)?.name ?? '?', [members]);
}
