import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSwimEmail } from "@/lib/email/swim";
import { SUBDOMAIN_APEX } from "@/lib/subdomains";

const authCookieDomain =
  process.env.NODE_ENV === "production" ? `.${SUBDOMAIN_APEX}` : undefined;

const sharedAuthCookies = authCookieDomain
  ? {
      sessionToken: { options: { domain: authCookieDomain } },
      callbackUrl: { options: { domain: authCookieDomain } },
      // __Host-authjs.csrf-token must not set Domain (browser rejects it).
      pkceCodeVerifier: { options: { domain: authCookieDomain } },
      state: { options: { domain: authCookieDomain } },
    }
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  ...(sharedAuthCookies ? { cookies: sharedAuthCookies } : {}),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Email({
      server: {
        host: "localhost",
        port: 25,
        auth: { user: "unused", pass: "unused" },
      },
      from: process.env.SWIM_EMAIL_FROM ?? "meets@utilio.solutions",
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendSwimEmail({
          to: identifier,
          subject: "Sign in to Utilio Swim",
          text: `Sign in to Utilio Swim: ${url}`,
          html: `<p><a href="${url}">Sign in to Utilio Swim</a></p>`,
        });
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true },
        });
        token.plan = dbUser?.plan ?? "free";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true },
        });
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { plan?: string }).plan = dbUser?.plan ?? "free";
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We use a modal, not a dedicated sign-in page
  },
});
