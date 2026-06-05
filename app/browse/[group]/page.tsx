import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolSearch } from "@/components/ToolSearch";
import {
  NAV_GROUPS,
  getNavGroup,
  getNavGroupSections,
  type NavGroupId,
} from "@/lib/nav-groups";
import { getCatalogHref } from "@/lib/tool-catalog";

type Props = { params: Promise<{ group: string }> };

export function generateStaticParams() {
  return NAV_GROUPS.map((g) => ({ group: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group: groupId } = await params;
  const group = getNavGroup(groupId);
  if (!group) return {};
  return {
    title: `${group.label} Tools`,
    description: group.description,
  };
}

export default async function BrowseGroupPage({ params }: Props) {
  const { group: groupId } = await params;
  const group = getNavGroup(groupId);
  if (!group) notFound();

  const sections = getNavGroupSections(groupId as NavGroupId);
  const Icon = group.icon;

  return (
    <main className="page">
      <div className="browse-hero">
        <div className="browse-hero-icon-wrap">
          <Icon className="browse-hero-icon" aria-hidden />
        </div>
        <h1>{group.label} tools</h1>
        <p className="lede">{group.description}</p>
        <div className="browse-search">
          <ToolSearch
            variant="hero"
            placeholder="Search in this category… e.g. compress, trim, pdf"
          />
        </div>
        <p className="browse-search-hint">
          Press <kbd>⌘K</kbd> anywhere to search all tools
        </p>
      </div>

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

      <div className="browse-other">
        <h2 className="text-lg font-semibold mb-3">Other categories</h2>
        <div className="category-pills">
          {NAV_GROUPS.filter((g) => g.id !== group.id).map((g) => (
            <Link key={g.id} href={g.href} className="category-pill">
              {g.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
