"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isPro: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchIsPro(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (!data) return false;
  return data.plan === "pro";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const pro = await fetchIsPro(session.user.id);
        setIsPro(pro);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const pro = await fetchIsPro(session.user.id);
        setIsPro(pro);
      } else {
        setIsPro(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await supabase.auth.signUp({ email, password });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isPro,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
