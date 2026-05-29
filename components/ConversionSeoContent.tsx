import Link from "next/link";
import {
  getConversionsForMedia,
  getHubSlug,
  type MediaConversionInfo,
  type MediaKind,
} from "@/lib/media-conversions";

const MEDIA_TITLES: Record<MediaKind, string> = {
  image: "Image format conversions",
  audio: "Audio format conversions",
  video: "Video format conversions",
};

export function ConversionSeoContent({ conversion }: { conversion: MediaConversionInfo }) {
  const siblings = getConversionsForMedia(conversion.media).filter(
    (c) => c.fromKey === conversion.fromKey && c.slug !== conversion.slug,
  );
  const hub = getHubSlug(conversion.media);

  return (
    <>
      <h2>
        How to convert {conversion.fromLabel} to {conversion.toLabel} without uploading files
      </h2>
      <p>
        Select {conversion.fromLabel} as the input format and {conversion.toLabel} as the output, drop your file, and
        download the result. Processing uses your browser&apos;s canvas — nothing is sent to a server.
      </p>

      {siblings.length > 0 && (
        <>
          <h3>Other {conversion.fromLabel} conversions</h3>
          <ul className="conversion-link-list">
            {siblings.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}/`}>
                  {c.fromLabel} to {c.toLabel}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>{MEDIA_TITLES[conversion.media]}</h3>
      <p>
        Use the <Link href={`/${hub}/`}>full {conversion.media} converter</Link> to switch formats freely, or jump to a
        popular conversion:
      </p>
      <ul className="conversion-link-list conversion-link-list--cols">
        {getConversionsForMedia(conversion.media)
          .slice(0, 24)
          .map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}/`}>
                {c.fromLabel} → {c.toLabel}
              </Link>
            </li>
          ))}
      </ul>
    </>
  );
}

export function ConversionHubSeoContent({ media }: { media: MediaKind }) {
  const conversions = getConversionsForMedia(media);
  const byInput = new Map<string, MediaConversionInfo[]>();
  for (const c of conversions) {
    const list = byInput.get(c.fromKey) ?? [];
    list.push(c);
    byInput.set(c.fromKey, list);
  }

  return (
    <>
      <h2>Supported {media} conversions</h2>
      <p>
        Pick input and output formats above — only valid combinations are shown. Each pairing below has its own landing
        page for search-friendly URLs.
      </p>
      {Array.from(byInput.entries()).map(([from, list]) => (
        <div key={from}>
          <h3>From {list[0]?.fromLabel ?? from}</h3>
          <ul className="conversion-link-list conversion-link-list--cols">
            {list.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}/`}>
                  {c.fromLabel} to {c.toLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
