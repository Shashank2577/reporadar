"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Talks to the Cloudflare Pages Functions in functions/api/auth. The session
// itself lives in an encrypted HttpOnly cookie; the browser only ever sees the
// user's name and avatar, never the GitHub token.

type SessionUser = { name: string | null; image: string | null };
type SessionState = { data: { user: SessionUser } | null; status: "loading" | "ready" };

type AuthContextValue = SessionState & { signIn: () => void; signOut: () => Promise<void> };

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ data: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((body: { user?: SessionUser }) => {
        if (!cancelled) setState({ data: body.user ? { user: body.user } : null, status: "ready" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/signin/github?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setState({ data: null, status: "ready" });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}
