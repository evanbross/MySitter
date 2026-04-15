import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
}

/**
 * Sets document.title and meta/OG tags for the current page.
 * Uses direct DOM manipulation since this is a client-rendered SPA.
 * For full SSR-level SEO, a server-rendered framework would be needed.
 */
export default function SeoHead({ title, description, image, canonicalUrl }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;

    upsertMeta("name", "description", description ?? "");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description ?? "");
    upsertMeta("property", "og:type", "profile");
    if (image) upsertMeta("property", "og:image", image);
    if (canonicalUrl) upsertMeta("property", "og:url", canonicalUrl);

    return () => {
      document.title = "mysitter";
    };
  }, [title, description, image, canonicalUrl]);

  return null;
}

function upsertMeta(attrName: string, attrValue: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
