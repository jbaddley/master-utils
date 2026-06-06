import Link from "next/link";
import { auth } from "@/auth";

export default async function SwimLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="swim-app">
      <header className="swim-header">
        <Link href="/swim/" className="swim-logo">
          Utilio Swim
        </Link>
        <nav className="swim-nav">
          <Link href="/swim/manage/">Dashboard</Link>
          {session?.user ? (
            <span className="swim-nav-user">{session.user.email}</span>
          ) : (
            <Link href="/swim/login/">Sign in</Link>
          )}
        </nav>
      </header>
      <main className="swim-main">{children}</main>
    </div>
  );
}
