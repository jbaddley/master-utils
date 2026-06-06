import Link from "next/link";

export default function SwimHomePage() {
  return (
    <div className="swim-hero">
      <h1>Utilio Swim</h1>
      <p className="swim-lede">
        Manage swim meet programs, publish heat sheets, and share public links with families.
      </p>
      <div className="swim-actions">
        <Link href="/swim/manage/" className="swim-btn swim-btn-primary">
          Manage meets
        </Link>
        <Link href="/swim/login/" className="swim-btn swim-btn-outline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
