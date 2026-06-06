import subdomainConfig from "@/config/subdomains.json";

export type SubdomainEntry = {
  path: string;
  description?: string;
  prefixAllPaths?: boolean;
};

export const SUBDOMAIN_APEX = subdomainConfig.apex;

const subdomainMap = subdomainConfig.subdomains as Record<string, SubdomainEntry>;

/** First label of a configured utility subdomain, or null for apex/www/other hosts. */
export function getSubdomainLabel(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }
  if (hostname === SUBDOMAIN_APEX || hostname === `www.${SUBDOMAIN_APEX}`) {
    return null;
  }
  if (!hostname.endsWith(`.${SUBDOMAIN_APEX}`)) {
    return null;
  }

  const label = hostname.slice(0, -(SUBDOMAIN_APEX.length + 1));
  if (!label || label.includes(".")) {
    return null;
  }
  return label;
}

export function getSubdomainPath(label: string): string | null {
  return subdomainMap[label]?.path ?? null;
}

export function shouldPrefixAllPaths(label: string): boolean {
  return subdomainMap[label]?.prefixAllPaths === true;
}

export function listSubdomainRoutes(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(subdomainMap).map(([label, entry]) => [label, entry.path]),
  );
}
