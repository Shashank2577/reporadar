import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// GitHub login exists for exactly one thing: attributing repo requests to a
// real GitHub account, the way an Issue author is attributed. The
// `public_repo` scope is the minimum needed to open an issue on this
// (public) repository as the signed-in user — nothing else is requested.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel (and localhost during development) are trusted hosts; Auth.js
  // otherwise refuses requests with an unrecognized Host header as a CSRF
  // safeguard for less predictable deployment targets.
  trustHost: true,
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user public_repo" } },
    }),
  ],
  callbacks: {
    // Persist the GitHub access token into the JWT so API routes can act as
    // the signed-in user (i.e. create the request issue under their name).
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      if (typeof token.accessToken === "string") session.accessToken = token.accessToken;
      return session;
    },
  },
});
