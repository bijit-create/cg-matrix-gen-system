// In-memory bank store. Holds the most recent completed run's questions +
// context so the Bank and Audit views can read them. Not persistent — refresh
// clears it. Deliberately tiny: no zustand, no context provider, no subscriber
// graph. Consumers snapshot it on render via `useBank()`.
//
// Stage E2. If we ever want session persistence, swap the internal store for
// localStorage here and the API stays the same.

import { useSyncExternalStore } from 'react';
import type { AuditResult } from '../agents/audit';

export type BankMode = 'pipeline' | 'quick';

export interface BankState {
  mode: BankMode | null;
  questions: any[];
  metadata: any | null;
  lo: string;
  skill: string;
  boardProfile: 'cbse' | 'state';
  /** Grade-scope profile from GradeScopeAgent (drives grade-aware audit flags) */
  gradeScopeProfile: any | null;
  chapterContent?: string;
  questionImages: Record<string, string>;
  /** Last audit run against the current questions, or null if never audited */
  audit: AuditResult | null;
  /** Monotonic version bumped on every set() so useSyncExternalStore fires */
  version: number;
}

const INITIAL: BankState = {
  mode: null,
  questions: [],
  metadata: null,
  lo: '',
  skill: '',
  boardProfile: 'cbse',
  gradeScopeProfile: null,
  chapterContent: '',
  questionImages: {},
  audit: null,
  version: 0,
};

let state: BankState = INITIAL;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());

export const bankStore = {
  get: (): BankState => state,
  set: (patch: Partial<BankState>) => {
    state = { ...state, ...patch, version: state.version + 1 };
    emit();
  },
  /** Replace the questions array (used by audit regen flow so the same ref
   *  doesn't linger across re-audits). */
  setQuestions: (questions: any[]) => {
    state = { ...state, questions, version: state.version + 1 };
    emit();
  },
  setAudit: (audit: AuditResult | null) => {
    state = { ...state, audit, version: state.version + 1 };
    emit();
  },
  reset: () => {
    state = { ...INITIAL, version: state.version + 1 };
    emit();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

export function useBank(): BankState {
  return useSyncExternalStore(
    bankStore.subscribe,
    bankStore.get,
    bankStore.get,
  );
}
