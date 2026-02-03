import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHelmet = ({ 
  title, 
  description, 
  keywords,
  canonicalUrl,
  ogImage = '/logo.png',
  type = 'website'
}) => {
  const fullTitle = title 
    ? `${title} | Zurcher Septic - Florida` 
    : 'Septic Tank Installation Florida | ATU Aerobic Systems | Zurcher Septic';
  
  const defaultDescription = description || 
    'Professional septic system installation in Southwest Florida. ATU aerobic systems, drain field replacement, FHA inspections. Licensed & insured septic contractors.';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={defaultDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={defaultDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEOHelmet;
