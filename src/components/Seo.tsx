import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  path: string; // e.g. "/shop"
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
};

const SITE = "https://cleanmykicks.com";

export default function Seo({ title, description, path, image, type = "website", jsonLd, noindex }: Props) {
  const url = `${SITE}${path}`;
  const img = image ?? `${SITE}/favicon.png`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}