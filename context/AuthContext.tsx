"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  useSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

interface AuthUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  plan?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isPro: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  openSubscribeModal: () => void;
  closeSubscribeModal: () => void;
  subscribeModalOpen: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as AuthUser).id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        plan: (session.user as AuthUser).plan ?? "free",
      }
    : null;

  const isPro = user?.plan === "pro";
  const loading = status === "loading";

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) throw new Error("Invalid email or password");
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sign up failed");
    // Sign in immediately after registering
    const signInRes = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (signInRes?.error) throw new Error("Account created but sign-in failed");
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "/";
    await nextAuthSignIn("google", { callbackUrl });
  }, []);

  const signOut = useCallback(async () => {
    await nextAuthSignOut({ redirect: false });
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const openSubscribeModal = useCallback(() => setSubscribeModalOpen(true), []);
  const closeSubscribeModal = useCallback(() => setSubscribeModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isPro,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        openSubscribeModal,
        closeSubscribeModal,
        subscribeModalOpen,
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
