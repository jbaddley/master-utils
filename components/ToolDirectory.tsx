"use client";

import { useState } from "react";
import Link from "next/link";
import { LuChevronDown } from "react-icons/lu";
import { NAV_GROUPS } from "@/lib/nav-groups";
import {
  TOOL_CATEGORIES,
  TOOL_CATALOG,
  getCatalogHref,
  getMenuCategoryCount,
  getMenuToolsByCategory,
  getToolsByCategory,
  type CatalogEntry,
  type ToolCategory,
} from "@/lib/tool-catalog";

const COLLAPSIBLE_CATEGORIES: ToolCategory[] = ["format-conversions"];

function ToolCard({ entry }: { entry: CatalogEntry }) {
  const Icon = entry.icon;
  return (
    <Link href={getCatalogHref(entry.slug)} className="tool-card">
      {Icon && <Icon className="tc-icon" aria-hidden />}
      <h3>{entry.title}</h3>
      <p>{entry.tagline}</p>
    </Link>
  );
}

function CollapsibleSection({
  categoryId,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  categoryId: ToolCategory;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={`category-${categoryId}`}
      className="tool-directory-section collapsible-section"
      data-category={categoryId}
    >
      <button
        type="button"
        className="collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tool-directory-heading">
          <span className="tool-directory-title">{title}</span>
          <span className="tool-directory-desc">{description}</span>
        </span>
        <LuChevronDown className={`collapsible-chevron${open ? " is-open" : ""}`} aria-hidden />
      </button>
      {open && <div className="collapsible-content">{children}</div>}
    </section>
  );
}

function CategorySection({
  categoryId,
  title,
  description,
  entries,
}: {
  categoryId: ToolCategory;
  title: string;
  description: string;
  entries: CatalogEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <section
      id={`category-${categoryId}`}
      className="tool-directory-section"
      data-category={categoryId}
    >
      <div className="tool-directory-header">
        <h2 className="tool-directory-title">{title}</h2>
        <span className="tool-directory-count">{entries.length}</span>
      </div>
      <p className="tool-directory-desc">{description}</p>
      <div className="tool-grid">
        {entries.map((entry) => (
          <ToolCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export function ToolDirectory() {
  const featuredByCategory = new Map<ToolCategory, CatalogEntry[]>();
  for (const cat of TOOL_CATEGORIES) {
    const featured = TOOL_CATALOG.filter((e) => e.category === cat.id && e.featured);
    if (featured.length > 0) {
      featuredByCategory.set(cat.id, featured);
    }
  }

  return (
    <div className="tool-directory">
      <div className="category-pills" role="navigation" aria-label="Browse by category">
        {NAV_GROUPS.map((group) => {
          const count = group.categories.reduce(
            (sum, cat) => sum + getMenuCategoryCount(cat),
            0,
          );
          return (
            <Link key={group.id} href={group.href} className="category-pill">
              {group.label}
              <span className="category-pill-count">{count}</span>
            </Link>
          );
        })}
      </div>

      {TOOL_CATEGORIES.map((cat) => {
        if (COLLAPSIBLE_CATEGORIES.includes(cat.id)) {
          const menuEntries = getMenuToolsByCategory(cat.id);
          const hub = menuEntries[0];
          const popular = menuEntries.slice(1);
          return (
            <CollapsibleSection
              key={cat.id}
              categoryId={cat.id}
              title={cat.label}
              description={cat.description}
            >
              {hub && (
                <div className="tool-grid tool-grid--compact" style={{ marginBottom: "1rem" }}>
                  <ToolCard entry={hub} />
                </div>
              )}
              {popular.length > 0 && (
                <div className="related conversion-chips">
                  {popular.map((entry) => (
                    <Link key={entry.slug} href={getCatalogHref(entry.slug)}>
                      {entry.title}
                    </Link>
                  ))}
                </div>
              )}
              <p className="tool-directory-more" style={{ marginTop: "0.75rem" }}>
                <Link href="/image-studio/">Convert &amp; edit any image in Image Studio →</Link>
              </p>
            </CollapsibleSection>
          );
        }

        const featured = featuredByCategory.get(cat.id);
        const entries =
          featured && featured.length > 0
            ? featured
            : getToolsByCategory(cat.id)
                .filter((e) => e.inNav !== false)
                .slice(0, 8);

        return (
          <CategorySection
            key={cat.id}
            categoryId={cat.id}
            title={cat.label}
            description={cat.description}
            entries={entries}
          />
        );
      })}
    </div>
  );
}
