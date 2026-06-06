"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isSwimAppPath, isSwimSubdomainHost } from "@/lib/swim-nav";

export function useSwimApp(initialIsSwimSubdomain = false) {
  const pathname = usePathname();
  const [isSubdomain, setIsSubdomain] = useState(initialIsSwimSubdomain);

  useEffect(() => {
    setIsSubdomain(isSwimSubdomainHost(window.location.hostname));
  }, []);

  const isSwim = isSwimAppPath(pathname, isSubdomain ? "swim.utilio.solutions" : null);

  return { pathname, isSubdomain, isSwim };
}
