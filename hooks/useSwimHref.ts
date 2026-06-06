"use client";

import { useCallback } from "react";
import { swimMeetPublicHref, swimPublicHref } from "@/lib/swim-nav";
import { useSwimApp } from "@/hooks/useSwimApp";

export function useSwimHref() {
  const { isSubdomain } = useSwimApp();

  const href = useCallback(
    (internalPath: string) => swimPublicHref(internalPath, isSubdomain),
    [isSubdomain],
  );

  const meetHref = useCallback(
    (slug: string) => swimMeetPublicHref(slug, isSubdomain),
    [isSubdomain],
  );

  const absoluteUrl = useCallback(
    (internalPath: string) => {
      if (typeof window === "undefined") return internalPath;
      return `${window.location.origin}${swimPublicHref(internalPath, isSubdomain)}`;
    },
    [isSubdomain],
  );

  return { href, meetHref, absoluteUrl, isSubdomain };
}
