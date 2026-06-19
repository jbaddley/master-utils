import type { Metadata } from "next";
import { UtilityHubPage } from "@/components/UtilityHubPage";
import { getNavGroup } from "@/lib/nav-groups";

const GROUP_ID = "dev-tools" as const;

export function generateMetadata(): Metadata {
  const group = getNavGroup(GROUP_ID);
  return {
    title: group?.label ?? "Dev Tools",
    description: group?.description,
  };
}

export default function DevToolsPage() {
  return <UtilityHubPage groupId={GROUP_ID} />;
}
