import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, name, type, image, url }) {
  const defaultSiteName = 'AgriFlow';
  const siteName = name || defaultSiteName;
  const defaultTitle = 'AgriFlow | Harvest-Backed Investments';
  const defaultDesc = 'Invest in sustainable agriculture. Empower farmers and earn harvest-backed returns through our milestone-driven platform.';
  const defaultImage = '/hero.png';

  const siteUrl =
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://agriflow-hackathon.vercel.app');

  const toAbsoluteUrl = (value) => {
    if (!value) return '';

    try {
      return new URL(value, siteUrl).href;
    } catch {
      return value;
    }
  };

  const fullTitle = title
    ? (title.includes('|') ? title : `${title} | ${siteName}`)
    : defaultTitle;
  const resolvedDescription = description || defaultDesc;
  const resolvedImage = toAbsoluteUrl(image || defaultImage);
  const resolvedUrl = toAbsoluteUrl(url || (typeof window !== 'undefined' ? window.location.href : '/'));

  return (
    <Helmet>
      {/* Standard tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="author" content={siteName} />
      <link rel="canonical" href={resolvedUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type || 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:url" content={resolvedUrl} />
    </Helmet>
  );
}
