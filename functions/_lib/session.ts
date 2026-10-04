// Session handling for the GitHub login. The GitHub access token never reaches
// the browser: it is sealed (AES-GCM, key derived from AUTH_SECRET) into an
// HttpOnly cookie, and only the Functions can open it. Env var names match
// what Auth.js used, so the existing GitHub OAuth app and secrets carry over.

export type Env = {
  AUTH_SECRET: string;
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  GITHUB_REPO?: string;
  ASSETS: Fetcher;
};

export type Session = {
  accessToken: string;
  name: string | null;
  image: string | null;
  exp: number;
};

export const SESSION_COOKIE = "rr_session";
export const STATE_COOKIE = "rr_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(secret), data));
  return `${b64url(iv)}.${b64url(cipher)}`;
}

export async function unseal<T>(token: string, secret: string): Promise<T | null> {
  const [iv, cipher] = token.split(".");
  if (!iv || !cipher) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64url(iv) }, await key(secret), unb64url(cipher));
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function getSession(request: Request, env: Env): Promise<Session | null> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw || !env.AUTH_SECRET) return null;
  const session = await unseal<Session>(raw, env.AUTH_SECRET);
  if (!session || session.exp < Date.now() / 1000) return null;
  return session;
}

export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...init?.headers },
  });
}

// Only same-site relative paths are allowed as a post-login destination.
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
