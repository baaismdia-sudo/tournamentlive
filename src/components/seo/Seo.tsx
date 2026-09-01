/**
 * Seo.tsx
 *
 * React 19 hoists <title> and <meta> tags rendered anywhere in the tree up
 * into <head> automatically, so this component can be dropped into any page
 * without a separate head-management library. Note: since this is a Vite
 * SPA, these tags apply after hydration — for guaranteed crawler-visible
 * meta tags (esp. for link previews on the marketing pages), pair this with
 * prerendering/SSG at build time (e.g. vite-plugin-ssr or a Vercel Edge
 * prerender) before launch. This component is what every page should render
 * either way.
 */
import { getBaseUrl } from "../../lib/publicUrls";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

const SITE_NAME = "TournamentLive";

export function Seo({ title, description, path, imageUrl, type = "website", noindex = false }: SeoProps) {
  const baseUrl = getBaseUrl();
  const fullTitle = `${title} · ${SITE_NAME}`;
  const canonicalUrl = `${baseUrl}${path}`;
  const ogImage = imageUrl ?? `${baseUrl}/og-default.png`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </>
  );
}

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    description:
      "Rent a fully customizable tournament website with live scores, fixtures, and no-code branding.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: "499",
      highPrice: "14999",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
    },
  };
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}

export function FaqSchema({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}
