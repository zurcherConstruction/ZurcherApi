import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHelmet = ({ 
  title, 
  description, 
  keywords,
  canonicalUrl,
  ogImage = '/logo.png',
  type = 'website',
  author = 'Zurcher Septic',
  publishedTime,
  modifiedTime,
  locale = 'en_US',
  siteName = 'Zurcher Septic',
  twitterHandle = '@ZurcherSeptic',
  schema
}) => {
  const fullTitle = title 
    ? `${title} | ${siteName}` 
    : 'Septic Tank Installation Florida | ATU Aerobic Systems | Zurcher Septic';
  
  const defaultDescription = description || 
    'Professional septic system installation in Southwest Florida. ATU aerobic systems, drain field replacement, FHA inspections. Licensed & insured septic contractors.';

  // Base URL for absolute paths  
  const baseUrl = 'https://zurcherseptic.com';
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;
  
  // Normalizar canonical URL para evitar duplicados
  const normalizeUrl = (url) => {
    if (!url) return baseUrl;
    
    try {
      let normalized = url;
      
      // Si es una URL relativa del navegador, construir URL completa
      if (typeof window !== 'undefined' && !url.startsWith('http')) {
        normalized = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
      }
      
      // Si viene de window.location.href, parsear
      if (normalized.startsWith('http')) {
        const urlObj = new URL(normalized);
        
        // Remover www. si existe
        let hostname = urlObj.hostname.replace(/^www\./, '');
        
        // Remover trailing slash (excepto para la raíz)
        let pathname = urlObj.pathname;
        if (pathname !== '/' && pathname.endsWith('/')) {
          pathname = pathname.slice(0, -1);
        }
        
        // Construir URL normalizada (sin query params ni fragments para canonical)
        normalized = `https://${hostname}${pathname}`;
      }
      
      return normalized;
    } catch (error) {
      console.error('Error normalizando URL:', error);
      return baseUrl;
    }
  };
  
  const fullCanonicalUrl = normalizeUrl(
    canonicalUrl || (typeof window !== 'undefined' ? window.location.href : baseUrl)
  );

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={defaultDescription} />
      <meta name="author" content={author} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Advanced SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content="es_US" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={defaultDescription} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="format-detection" content="telephone=yes" />
      <meta name="geo.region" content="US-FL" />
      <meta name="geo.placename" content="Southwest Florida" />
      <meta name="geo.position" content="26.6256;-81.6248" />
      <meta name="ICBM" content="26.6256, -81.6248" />
      
      {/* Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHelmet;
