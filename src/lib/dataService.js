'use client';
// Port of src/app/Services/data.service.ts: in-memory BehaviorSubjects shared
// between pages of one browser session (lost on a full page reload, as in the
// Angular app). Initial values are the original's.
import { useSyncExternalStore } from 'react';

const readSession = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const state = {
  language: undefined, // BehaviorSubject(sessionStorage.getItem('lang')), read lazily in the browser
  productCodeForPayment: 'default message',
  freeSeatCode: 'default message',
  quantity: 1,
};
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export const dataService = {
  get: (key) => (key === 'language' && state.language === undefined ? readSession('lang') : state[key]),
  changeMessageForLanguage: (v) => ((state.language = v), emit()),
  changeMessageForCodeForPayment: (v) => ((state.productCodeForPayment = v), emit()),
  changeMessageForFreeSeatCode: (v) => ((state.freeSeatCode = v), emit()),
  changeMessageForQuantity: (v) => ((state.quantity = v), emit()),
};

/** Subscribe a component to one value (currentMessageFor…). */
export function useDataService(key) {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => dataService.get(key),
    () => (key === 'language' ? null : state[key]),
  );
}
