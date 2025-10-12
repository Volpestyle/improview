import { useEffect, useState } from 'react';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const usePersistedState = <T,>(
  key: string,
  defaultValue: T,
  { serialize = JSON.stringify, deserialize = JSON.parse }: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {},
) => {
  const [state, setState] = useState<T>(() => {
    if (!isBrowser()) {
      return defaultValue;
    }
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    try {
      return deserialize(stored);
    } catch (error) {
      console.warn('Failed to deserialize state', error);
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    try {
      window.localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn('Failed to persist state', error);
    }
  }, [key, serialize, state]);

  return [state, setState] as const;
};
