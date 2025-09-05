import { useEffect } from 'react';

interface SEOHeadProps {
  symbol?: string;
  companyName?: string;
  price?: number;
}

const SEOHead: React.FC<SEOHeadProps> = ({ symbol, companyName, price }) => {
  useEffect(() => {
    if (symbol) {
      document.title = `${symbol} Stock Price - ${companyName || symbol} | WallStSmart`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          `${symbol} (${companyName}) stock price, charts, financial data and analysis. Current price: $${price || 'Loading'}`
        );
      }

      // Track page view in Google Analytics
      if (window.gtag) {
        window.gtag('config', 'G-XXXXXXXXXX', {
          page_path: `/stock/${symbol}`,
          page_title: `${symbol} Stock Analysis`
        });
      }
    } else {
      document.title = 'WallStSmart - Professional Stock Analysis';
    }
  }, [symbol, companyName, price]);

  return null;
};

export default SEOHead;
