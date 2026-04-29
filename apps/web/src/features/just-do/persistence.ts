import type { AppState } from "@/types/domain";

export type PersistedView = Pick<
  AppState["view"],
  "tab" | "year" | "month" | "selectedDate" | "dark"
>;

export type Persisted = {
  view: PersistedView;
  tasks: AppState["tasks"];
  habits: AppState["habits"];
  settings: AppState["settings"];
};

export interface JustDoStorage {
  load(): Promise<Persisted | null>;
  save(value: Persisted): Promise<void>;
}

export const toPersisted = (state: AppState): Persisted => ({
  view: {
    tab: state.view.tab,
    year: state.view.year,
    month: state.view.month,
    selectedDate: state.view.selectedDate,
    dark: state.view.dark,
  },
  tasks: state.tasks,
  habits: state.habits,
  settings: state.settings,
});

export const mergePersisted = (initial: AppState, saved: Persisted): AppState => ({
  ...initial,
  tasks: saved.tasks,
  habits: saved.habits,
  settings: { ...initial.settings, ...saved.settings },
  view: {
    ...initial.view,
    ...saved.view,
    sheet: null,
    detailTaskId: null,
  },
});

export const createLocalStorageStorage = (key: string): JustDoStorage => ({
  async load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as Persisted;
    } catch {
      return null;
    }
  },
  async save(value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },
});

export const createMemoryStorage = (initial: Persisted | null = null): JustDoStorage => {
  let current = initial;
  return {
    async load() {
      return current;
    },
    async save(value) {
      current = value;
    },
  };
};
