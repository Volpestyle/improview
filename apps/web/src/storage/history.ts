export type AttemptStatus = 'in_progress' | 'passed' | 'failed';

export interface HistoryEntry {
  attemptId: string;
  problemId: string;
  problemTitle: string;
  category: string;
  difficulty: string;
  provider?: string;
  createdAt: number;
  updatedAt: number;
  status: AttemptStatus;
  passCount: number;
  failCount: number;
  durationMs: number;
  timeEstimateMinutes?: number;
}

const STORAGE_KEY = 'improview:history';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadHistory = (): HistoryEntry[] => {
  if (!isBrowser()) {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse history entries', error);
  }
  return [];
};

const saveHistory = (entries: HistoryEntry[]) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const upsertEntry = (entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] => {
  const idx = entries.findIndex((item) => item.attemptId === entry.attemptId);
  if (idx === -1) {
    return [...entries, entry];
  }
  const next = [...entries];
  next[idx] = entry;
  return next;
};

export const recordAttemptStart = (
  entry: Omit<HistoryEntry, 'updatedAt' | 'status' | 'passCount' | 'failCount' | 'durationMs'> & {
    createdAt: number;
  },
) => {
  const history = loadHistory();
  const nextEntry: HistoryEntry = {
    ...entry,
    updatedAt: entry.createdAt,
    status: 'in_progress',
    passCount: 0,
    failCount: 0,
    durationMs: 0,
  };
  saveHistory(upsertEntry(history, nextEntry));
};

export const recordRunUpdate = (attemptId: string, passDelta: number, failDelta: number) => {
  const history = loadHistory();
  const entry = history.find((item) => item.attemptId === attemptId);
  if (!entry) {
    return;
  }
  const nextEntry: HistoryEntry = {
    ...entry,
    passCount: entry.passCount + passDelta,
    failCount: entry.failCount + failDelta,
    updatedAt: Date.now(),
  };
  saveHistory(upsertEntry(history, nextEntry));
};

export const recordSubmission = (
  attemptId: string,
  passed: boolean,
  durationMs: number,
) => {
  const history = loadHistory();
  const entry = history.find((item) => item.attemptId === attemptId);
  if (!entry) {
    return;
  }

  const nextEntry: HistoryEntry = {
    ...entry,
    status: passed ? 'passed' : 'failed',
    durationMs,
    updatedAt: Date.now(),
  };
  saveHistory(upsertEntry(history, nextEntry));
};

export const clearHistory = () => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
};
