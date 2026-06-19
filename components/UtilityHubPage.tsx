import Link from "next/link";
import { ToolSearch } from "@/components/ToolSearch";
import {
  getNavGroup,
  getNavGroupSections,
  NAV_GROUPS,
  type NavGroupId,
} from "@/lib/nav-groups";
import { getCatalogHref } from "@/lib/tool-catalog";

export function UtilityHubPage({ groupId }: { groupId: NavGroupId }) {
  const group = getNavGroup(groupId)!;
  const Icon = group.icon;

  return (
    <main className="page">
      <div className="browse-hero">
        <div className="browse-hero-icon-wrap">
          <Icon className="browse-hero-icon" aria-hidden />
        </div>
        <h1>{group.label}</h1>
        <p className="lede">{group.description}</p>
        <div className="utility-primary">
          <Link href={group.primaryHref} className="utility-primary-link">
            {group.primaryLabel}
          </Link>
          <p>{group.primaryDescription}</p>
        </div>
        <div className="browse-search">
          <ToolSearch variant="hero" placeholder={group.searchPlaceholder} />
        </div>
        <p className="browse-search-hint">
          Press <kbd>⌘K</kbd> anywhere to search all tools
        </p>
      </div>

      <UtilityHubSections groupId={groupId} />
      <OtherUtilityHubs currentGroupId={groupId} />
    </main>
  );
}

export function UtilityHubSections({ groupId }: { groupId: NavGroupId }) {
  const sections = getNavGroupSections(groupId);

  return (
    <>
      {sections.map((section) => (
        <section
          key={section.id}
          id={`section-${section.id}`}
          className="tool-directory-section"
        >
          <div className="tool-directory-header">
            <h2 className="tool-directory-title">{section.label}</h2>
            <span className="tool-directory-count">{section.tools.length}</span>
          </div>
          <p className="tool-directory-desc">{section.description}</p>
          <div className="tool-grid">
            {section.tools.map((entry) => {
              const EntryIcon = entry.icon;
              return (
                <Link
                  key={entry.slug}
                  href={getCatalogHref(entry.slug)}
                  className="tool-card"
                >
                  {EntryIcon && <EntryIcon className="tc-icon" aria-hidden />}
                  <h3>{entry.title}</h3>
                  <p>{entry.tagline}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

export function OtherUtilityHubs({
  currentGroupId,
}: {
  currentGroupId: NavGroupId;
}) {
  return (
    <div className="browse-other">
      <h2 className="text-lg font-semibold mb-3">Other utility categories</h2>
      <div className="category-pills">
        {NAV_GROUPS.filter((g) => g.id !== currentGroupId).map((g) => (
          <Link key={g.id} href={g.href} className="category-pill">
            {g.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
