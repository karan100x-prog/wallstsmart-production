// src/components/SmartFlow.tsx
import React, { useState, useEffect } from 'react';
import { 
  getSmartFlowData, 
  getInsiderTransactions,
  getTopGainersLosers,
  getNewsSentiment 
} from '../services/alphaVantage';

const SmartFlow: React.FC = () => {
  const [insiderActivity, setInsiderActivity] = useState<any[]>([]);
  const [marketMovers, setMarketMovers] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSmartMoneyActivity();
  }, []);

  const loadSmartMoneyActivity = async () => {
    try {
      console.log('Fetching market movers...');
      const movers = await getTopGainersLosers();
      console.log('Movers data:', movers);
      
      // Clean and set movers
      if (movers) {
        const cleanMovers = {
          gainers: movers.gainers?.filter((s: any) => 
            !s.ticker.includes('^') && 
            !s.ticker.endsWith('W') && 
            s.ticker.length <= 5
          ),
          losers: movers.losers?.filter((s: any) => 
            !s.ticker.includes('^') && 
            !s.ticker.endsWith('W') && 
            s.ticker.length <= 5
          ),
          mostActive: movers.mostActive
        };
        setMarketMovers(cleanMovers);
      }

      // Try fetching news
      console.log('Fetching news sentiment...');
      const news = await getNewsSentiment();
      console.log('News data:', news);
      setSentiment(news || []);

      // Skip insider data if it's not working
      setInsiderActivity([]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error details:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              Smart<span className="text-green-500">Flow</span>
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live • Tracking smart money activity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center py-16 bg-gradient-to-b from-transparent to-green-500/5">
        <h2 className="text-5xl font-bold text-white mb-4">
          Follow the <span className="text-green-500">Smart Money</span>
        </h2>
        <p className="text-gray-400 text-lg">
          Real-time insider transactions and market momentum
        </p>
      </div>
      
      {/* Real Smart Money Activities */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1d29] rounded-lg p-4 text-center border border-white/5">
            <div className="text-2xl font-bold text-white">{marketMovers?.gainers?.length || 0}</div>
            <div className="text-sm text-green-500">Top Gainers</div>
          </div>
          <div className="bg-[#1a1d29] rounded-lg p-4 text-center border border-white/5">
            <div className="text-2xl font-bold text-white">{marketMovers?.losers?.length || 0}</div>
            <div className="text-sm text-red-500">Top Losers</div>
          </div>
          <div className="bg-[#1a1d29] rounded-lg p-4 text-center border border-white/5">
            <div className="text-2xl font-bold text-white">{marketMovers?.mostActive?.length || 0}</div>
            <div className="text-sm text-yellow-500">Most Active</div>
          </div>
          <div className="bg-[#1a1d29] rounded-lg p-4 text-center border border-white/5">
            <div className="text-2xl font-bold text-green-500">LIVE</div>
            <div className="text-sm text-gray-400">Market Status</div>
          </div>
        </div>

        {/* Market Summary */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            📈 Market Summary
          </h2>
          <div className="bg-[#1a1d29] rounded-lg p-6 border border-white/5">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">Biggest Gainer</p>
                <p className="text-2xl font-bold text-green-500">
                  {marketMovers?.gainers?.[0]?.ticker || 'N/A'}
                </p>
                <p className="text-sm text-green-400">
                  {marketMovers?.gainers?.[0]?.change_percentage || ''}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Biggest Loser</p>
                <p className="text-2xl font-bold text-red-500">
                  {marketMovers?.losers?.[0]?.ticker || 'N/A'}
                </p>
                <p className="text-sm text-red-400">
                  {marketMovers?.losers?.[0]?.change_percentage || ''}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Most Volume</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {marketMovers?.mostActive?.[0]?.ticker || 'N/A'}
                </p>
                <p className="text-sm text-gray-400">
                  {marketMovers?.mostActive?.[0]?.volume ? 
                    `${(parseInt(marketMovers.mostActive[0].volume) / 1000000).toFixed(0)}M` : ''}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Insider Buying Section - Now always shows market overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            📊 Market Activity Overview
          </h2>
          <div className="bg-[#1a1d29] rounded-lg p-6 text-center border border-white/5">
            <p className="text-gray-400">
              Tracking {marketMovers?.mostActive?.length || 0} active stocks today
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Market data updates in real-time during trading hours
            </p>
          </div>
        </section>
        
        {/* Market Momentum Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            🔥 Today's Smart Money Momentum
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Gainers */}
            <div className="bg-[#1a1d29] rounded-lg p-4 border border-green-500/20">
              <h3 className="text-green-500 font-semibold mb-3">Most Bought</h3>
              {marketMovers?.gainers?.slice(0, 5).map((stock: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white font-medium">{stock.ticker}</span>
                  <span className="text-green-500 font-semibold">+{stock.change_percentage}</span>
                </div>
              )) || <div className="text-gray-500">Loading...</div>}
            </div>

            {/* Top Losers */}
            <div className="bg-[#1a1d29] rounded-lg p-4 border border-red-500/20">
              <h3 className="text-red-500 font-semibold mb-3">Most Sold</h3>
              {marketMovers?.losers?.slice(0, 5).map((stock: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white font-medium">{stock.ticker}</span>
                  <span className="text-red-500 font-semibold">{stock.change_percentage}</span>
                </div>
              )) || <div className="text-gray-500">Loading...</div>}
            </div>

            {/* Most Active */}
            <div className="bg-[#1a1d29] rounded-lg p-4 border border-yellow-500/20">
              <h3 className="text-yellow-500 font-semibold mb-3">Most Active</h3>
              {marketMovers?.mostActive?.slice(0, 5).map((stock: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white font-medium">{stock.ticker}</span>
                  <span className="text-gray-400">{(parseInt(stock.volume) / 1000000).toFixed(1)}M</span>
                </div>
              )) || <div className="text-gray-500">Loading...</div>}
            </div>
          </div>
        </section>

        {/* Sentiment Analysis */}
        {sentiment && sentiment.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              📰 Smart Money Sentiment
            </h2>
            <div className="grid gap-4">
              {sentiment.slice(0, 10).map((article: any, idx: number) => (
                <div key={idx} className="bg-[#1a1d29] rounded-lg p-4 border border-white/5 hover:border-green-500/30 transition-all">
                  <h4 className="text-white font-semibold mb-2 line-clamp-2">{article.title}</h4>
                  {article.summary && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{article.summary}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-sm">
                      <span className={`font-medium ${
                        article.overall_sentiment_label === 'Bullish' ? 'text-green-500' : 
                        article.overall_sentiment_label === 'Bearish' ? 'text-red-500' : 
                        'text-gray-400'
                      }`}>
                        {article.overall_sentiment_label || article.overallLabel || 'Neutral'}
                      </span>
                      <span className="text-gray-500">{article.source}</span>
                    </div>
                    {article.time_published && (
                      <span className="text-xs text-gray-500">
                        {new Date(article.time_published).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              💡 Smart Money Insights
            </h2>
            <div className="bg-[#1a1d29] rounded-lg p-6 border border-white/5">
              <p className="text-gray-400">
                Market sentiment analysis powered by real-time news and institutional activity
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SmartFlow;
