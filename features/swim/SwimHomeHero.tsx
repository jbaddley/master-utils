import Link from "next/link";
import { swimPublicHref } from "@/lib/swim-nav";

type Props = {
  isSignedIn: boolean;
  orgCount: number;
  isSubdomain: boolean;
};

export function SwimHomeHero({ isSignedIn, orgCount, isSubdomain }: Props) {
  const manageHref = swimPublicHref("/swim/manage/", isSubdomain);
  const loginHref = swimPublicHref("/swim/login/", isSubdomain);

  return (
    <div className="swim-hero">
      <h1>Utilio Swim</h1>
      <p className="swim-lede">
        {isSignedIn && orgCount === 0
          ? "Create your organization to start building meet programs and sharing heat sheets with families."
          : "Manage swim meet programs, publish heat sheets, and share public links with families."}
      </p>
      <div className="swim-actions">
        {!isSignedIn && (
          <>
            <Link href={loginHref} className="swim-btn swim-btn-primary">
              Sign in
            </Link>
            <Link href={manageHref} className="swim-btn swim-btn-outline">
              Manage meets
            </Link>
          </>
        )}
        {isSignedIn && orgCount === 0 && (
          <Link href={manageHref} className="swim-btn swim-btn-primary">
            Create organization
          </Link>
        )}
        {isSignedIn && orgCount > 0 && (
          <Link href={manageHref} className="swim-btn swim-btn-primary">
            Manage meets
          </Link>
        )}
      </div>
    </div>
  );
}
