import { useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  // Always start from defaultValue so the server-rendered HTML and the first
  // client render match. Reading localStorage during render (even behind a
  // `typeof window` guard) produces a hydration mismatch once a key is set.
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  // Hydrate from localStorage after mount, on the client only. Syncing state
  // from an external store in an effect is the intended use of this pattern.
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      // corrupt or unavailable storage — keep the default
    }
  }, [key]);

  const setValue = (value: T) => {
    setStoredValue(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — React state already updated
    }
  };

  return [storedValue, setValue];
}
