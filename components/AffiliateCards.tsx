import { getAffiliates } from "@/lib/affiliates";

export function AffiliateCards({ toolSlug }: { toolSlug: string }) {
  const links = getAffiliates(toolSlug);
  if (!links.length) return null;

  return (
    <div className="affiliate-section">
      <h3 className="affiliate-heading">Next steps</h3>
      <div className="affiliate-grid">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="affiliate-card"
          >
            <div className="affiliate-label">{link.label}</div>
            <div className="affiliate-desc">{link.description}</div>
            <div className="affiliate-cta">{link.cta}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
