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

/** Stage G1: provider metadata for a generated image. Stored in a parallel
 *  map (`imageProviders`) so readers that only need the dataUrl keep using
 *  `questionImages` unchanged. */
export interface ImageProviderInfo {
  provider: 'openai' | 'gemini' | 'precise';
  /** Set when OpenAI failed and the call fell back to Gemini. */
  fallbackReason?: string;
  /** Stage G3: true when the stem requires the student to read labels from
   *  the image (anatomy diagram, "label the parts of"). When provider==='gemini'
   *  AND requires_labels===true, the audit raises an image_material warn
   *  because Gemini's image model frequently misspells labels. */
  requires_labels?: boolean;
  /** The exact enriched prompt sent to the image model. Surfaced via the
   *  "Show prompt" button on the image card — the SME can copy it and paste
   *  into ChatGPT / gpt-image-2 to manually iterate when the auto-generated
   *  image isn't satisfactory. */
  prompt?: string;
}

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
  /** Stage G1 — keyed by the same question id as questionImages. */
  imageProviders: Record<string, ImageProviderInfo>;
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
  imageProviders: {},
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
