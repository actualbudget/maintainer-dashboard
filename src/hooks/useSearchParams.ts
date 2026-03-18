import { useCallback, useSyncExternalStore } from "react";

function getSnapshot() {
  return window.location.search;
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

/**
 * Read/write a single URL search parameter.
 * Updates the URL without a page reload and keeps state in sync across components.
 */
export function useSearchParam(key: string, defaultValue = ""): [string, (value: string) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const params = new URLSearchParams(search);
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const p = new URLSearchParams(window.location.search);
      if (next === defaultValue || next === "") {
        p.delete(key);
      } else {
        p.set(key, next);
      }
      const qs = p.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.pushState(null, "", url);
      // Notify all subscribers
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [key, defaultValue],
  );

  return [value, setValue];
}

/** Boolean variant — stores "1" / absent. */
export function useSearchParamBool(key: string, defaultValue = false): [boolean, (value: boolean) => void] {
  const [raw, setRaw] = useSearchParam(key, defaultValue ? "1" : "");
  const value = raw === "1";
  const setValue = useCallback((v: boolean) => setRaw(v ? "1" : ""), [setRaw]);
  return [value, setValue];
}
