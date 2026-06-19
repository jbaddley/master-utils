import Link from "next/link";
import { NAV_GROUPS } from "@/lib/nav-groups";

export function ToolDirectory() {
  return (
    <div className="tool-directory">
      <div className="tool-grid tool-grid--hubs">
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Link
              key={group.id}
              href={group.href}
              className="tool-card tool-card--hub"
            >
              <Icon className="tc-icon" aria-hidden />
              <h2>{group.label}</h2>
              <p>{group.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
