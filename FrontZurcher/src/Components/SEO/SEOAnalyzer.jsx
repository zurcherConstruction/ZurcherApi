import React, { useState, useEffect } from 'react';
import { FaSearch, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const SEOAnalyzer = () => {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCurrentPage = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const results = {
        title: {
          exists: !!document.title,
          length: document.title.length,
          optimal: document.title.length >= 30 && document.title.length <= 60,
          content: document.title
        },
        description: {
          exists: !!document.querySelector('meta[name="description"]'),
          length: document.querySelector('meta[name="description"]')?.content?.length || 0,
          optimal: false,
          content: document.querySelector('meta[name="description"]')?.content || ''
        },
        keywords: {
          exists: !!document.querySelector('meta[name="keywords"]'),
          content: document.querySelector('meta[name="keywords"]')?.content || ''
        },
        h1Tags: {
          count: document.querySelectorAll('h1').length,
          optimal: document.querySelectorAll('h1').length === 1,
          content: Array.from(document.querySelectorAll('h1')).map(h => h.textContent)
        },
        images: {
          total: document.querySelectorAll('img').length,
          withAlt: document.querySelectorAll('img[alt]').length,
          missingAlt: document.querySelectorAll('img').length - document.querySelectorAll('img[alt]').length
        },
        links: {
          internal: document.querySelectorAll('a[href^="/"], a[href^="#"]').length,
          external: document.querySelectorAll('a[href^="http"]').length
        },
        structuredData: {
          exists: !!document.querySelector('script[type="application/ld+json"]'),
          count: document.querySelectorAll('script[type="application/ld+json"]').length
        }
      };

      results.description.optimal = results.description.length >= 120 && results.description.length <= 160;
      setAnalysisResults(results);
      setIsAnalyzing(false);
    }, 2000);
  };

  const getScoreColor = (isOptimal, exists) => {
    if (isOptimal) return 'text-green-600';
    if (exists) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIcon = (isOptimal, exists) => {
    if (isOptimal) return <FaCheckCircle className="text-green-600" />;
    if (exists) return <FaExclamationTriangle className="text-yellow-600" />;
    return <FaTimes className="text-red-600" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border max-w-md">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">SEO Analyzer</h3>
            <button
              onClick={analyzeCurrentPage}
              disabled={isAnalyzing}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Page'}
            </button>
          </div>
        </div>

        {analysisResults && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {/* Title Analysis */}
              <div className="flex items-start gap-2">
                {getIcon(analysisResults.title.optimal, analysisResults.title.exists)}
                <div className="flex-1">
                  <div className="font-medium">Title Tag</div>
                  <div className="text-sm text-slate-600">
                    Length: {analysisResults.title.length} chars 
                    {analysisResults.title.optimal ? ' ✓' : ' (30-60 recommended)'}
                  </div>
                </div>
              </div>

              {/* Description Analysis */}
              <div className="flex items-start gap-2">
                {getIcon(analysisResults.description.optimal, analysisResults.description.exists)}
                <div className="flex-1">
                  <div className="font-medium">Meta Description</div>
                  <div className="text-sm text-slate-600">
                    Length: {analysisResults.description.length} chars
                    {analysisResults.description.optimal ? ' ✓' : ' (120-160 recommended)'}
                  </div>
                </div>
              </div>

              {/* H1 Analysis */}
              <div className="flex items-start gap-2">
                {getIcon(analysisResults.h1Tags.optimal, analysisResults.h1Tags.count > 0)}
                <div className="flex-1">
                  <div className="font-medium">H1 Tags</div>
                  <div className="text-sm text-slate-600">
                    Count: {analysisResults.h1Tags.count} (1 recommended)
                  </div>
                </div>
              </div>

              {/* Images Analysis */}
              <div className="flex items-start gap-2">
                {getIcon(analysisResults.images.missingAlt === 0, analysisResults.images.total > 0)}
                <div className="flex-1">
                  <div className="font-medium">Images Alt Text</div>
                  <div className="text-sm text-slate-600">
                    {analysisResults.images.withAlt}/{analysisResults.images.total} with alt text
                  </div>
                </div>
              </div>

              {/* Structured Data */}
              <div className="flex items-start gap-2">
                {getIcon(analysisResults.structuredData.count > 0, analysisResults.structuredData.exists)}
                <div className="flex-1">
                  <div className="font-medium">Structured Data</div>
                  <div className="text-sm text-slate-600">
                    {analysisResults.structuredData.count} schema blocks found
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t">
              <div className="text-xs text-slate-500">
                Last analyzed: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOAnalyzer;