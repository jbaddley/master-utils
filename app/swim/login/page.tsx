import { Suspense } from "react";
import SwimLoginPage from "./SwimLoginClient";

export default function Page() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading…</p>}>
      <SwimLoginPage />
    </Suspense>
  );
}
