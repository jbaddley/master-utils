"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const LOCAL_PREFIX = "tool-pref:";

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — preference just won't persist */
  }
}

/**
 * A persisted per-tool preference. Signed-in users get it from the
 * preferences table (synced across devices); anonymous users get
 * localStorage. When a user with a local preference signs in, the local
 * copy is pushed to their account once.
 *
 * `value` is null until something has been saved — callers use that to
 * know they should prompt for initial settings.
 */
export function useToolPreference<T>(key: string): {
  value: T | null;
  save: (value: T) => void;
  loaded: boolean;
} {
  const { user } = useAuth();
  const [value, setValue] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(false);
  const signedIn = !!user;

  useEffect(() => {
    let alive = true;

    const load = async (): Promise<T | null> => {
      if (!signedIn) return readLocal<T>(key);
      try {
        const res = await fetch(`/api/preferences/?key=${encodeURIComponent(key)}`);
        const { value: remote } = res.ok
          ? ((await res.json()) as { value: T | null })
          : { value: null };
        if (remote !== null) return remote;
        // First fetch after sign-in: adopt any anonymous local preference.
        const local = readLocal<T>(key);
        if (local !== null) {
          void fetch("/api/preferences/", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: key, value: local }),
          }).catch(() => {});
        }
        return local;
      } catch {
        return readLocal<T>(key);
      }
    };

    void load().then((v) => {
      if (!alive) return;
      setValue(v);
      setLoaded(true);
    });

    return () => {
      alive = false;
    };
  }, [signedIn, key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      // Always mirror locally so the preference survives sign-out.
      writeLocal(key, next);
      if (signedIn) {
        void fetch("/api/preferences/", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: key, value: next }),
        }).catch(() => {});
      }
    },
    [signedIn, key],
  );

  return { value, save, loaded };
}
