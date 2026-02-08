import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaChevronRight } from 'react-icons/fa';

const Breadcrumbs = ({ customItems }) => {
  const location = useLocation();
  
  // Default breadcrumb mapping
  const pathMap = {
    '/': 'Home',
    '/services': 'Services',
    '/about': 'About Us',
    '/contact': 'Contact',
    '/installation': 'Installation Process',
    '/gallery': 'Work Gallery',
    '/maintenance-services': 'Maintenance Services',
    '/repairs': 'Emergency Repairs',
    '/thank-you': 'Thank You',
    '/privacy-policy': 'Privacy Policy'
  };

  // Use custom items if provided, otherwise generate from path
  const items = customItems || (() => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    
    if (pathSegments.length === 0) return []; // Don't show breadcrumbs on homepage
    
    let breadcrumbs = [{ path: '/', label: 'Home' }];
    let currentPath = '';
    
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const label = pathMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ path: currentPath, label });
    });
    
    return breadcrumbs;
  })();

  if (items.length <= 1) return null;

  // Schema.org BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `https://zurcherseptic.com${item.path}`
    }))
  };

  return (
    <>
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      
      {/* Breadcrumb Navigation */}
      <nav 
        className="bg-slate-100 py-3 px-6"
        aria-label="Breadcrumb"
      >
        <div className="max-w-7xl mx-auto">
          <ol className="flex items-center space-x-2 text-sm">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              
              return (
                <li key={item.path} className="flex items-center">
                  {index === 0 && (
                    <FaHome className="text-blue-600 mr-2" />
                  )}
                  
                  {isLast ? (
                    <span 
                      className="text-slate-600 font-medium"
                      aria-current="page"
                    >
                      {item.label}
                    </span>
                  ) : (
                    <Link 
                      to={item.path}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                  
                  {!isLast && (
                    <FaChevronRight className="text-slate-400 mx-2 text-xs" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </>
  );
};

export default Breadcrumbs;