// Update your SmartFlow.tsx to show REAL smart money activities

const SmartFlow: React.FC = () => {
  const [insiderActivity, setInsiderActivity] = useState<any[]>([]);
  const [marketMovers, setMarketMovers] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  export default SmartFlow;  // ← This line is required!
  
  useEffect(() => {
    loadSmartMoneyActivity();
  }, []);

  const loadSmartMoneyActivity = async () => {
    try {
      // 1. Get REAL insider transactions (executives buying/selling)
      const topStocks = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'META'];
      const insiderPromises = topStocks.map(s => getInsiderTransactions(s));
      const allInsiders = await Promise.all(insiderPromises);
      
      // Flatten and sort by date
      const recentInsiders = allInsiders
        .flat()
        .filter(t => t.acquisitionDisposition === 'A') // Focus on acquisitions
        .sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())
        .slice(0, 20);

      setInsiderActivity(recentInsiders);

      // 2. Get REAL market movers (what's being bought/sold heavily)
      const movers = await getTopGainersLosers();
      setMarketMovers(movers);

      // 3. Get REAL sentiment (what institutions are talking about)
      const news = await getNewsSentiment();
      setSentiment(news);

      setLoading(false);
    } catch (error) {
      console.error('Error loading:', error);
      setLoading(false);
    }
  };

  // Show this REAL data in cards
  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Your existing header */}
      
      {/* Real Smart Money Activities */}
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Insider Buying Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            🎯 Recent Insider Buying
          </h2>
          <div className="grid gap-4">
            {insiderActivity.map((insider, idx) => (
              <div key={idx} className="bg-[#1a1d29] rounded-lg p-4 border border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-green-500 font-semibold">BUY</span>
                    <span className="text-white ml-3 font-semibold">{insider.symbol}</span>
                    <span className="text-gray-400 ml-3">{insider.reportingName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white">{insider.securitiesTransacted.toLocaleString()} shares</div>
                    <div className="text-gray-400 text-sm">{insider.filingDate}</div>
                  </div>
                </div>
              </div>
            ))}
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
                <div key={idx} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white">{stock.ticker}</span>
                  <span className="text-green-500">+{stock.change_percentage}</span>
                </div>
              ))}
            </div>

            {/* Top Losers */}
            <div className="bg-[#1a1d29] rounded-lg p-4 border border-red-500/20">
              <h3 className="text-red-500 font-semibold mb-3">Most Sold</h3>
              {marketMovers?.losers?.slice(0, 5).map((stock: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white">{stock.ticker}</span>
                  <span className="text-red-500">{stock.change_percentage}</span>
                </div>
              ))}
            </div>

            {/* Most Active */}
            <div className="bg-[#1a1d29] rounded-lg p-4 border border-yellow-500/20">
              <h3 className="text-yellow-500 font-semibold mb-3">Most Active</h3>
              {marketMovers?.mostActive?.slice(0, 5).map((stock: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white">{stock.ticker}</span>
                  <span className="text-gray-400">{(stock.volume / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sentiment Analysis */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            📰 Smart Money Sentiment
          </h2>
          <div className="grid gap-4">
            {sentiment?.slice(0, 5).map((article: any, idx: number) => (
              <div key={idx} className="bg-[#1a1d29] rounded-lg p-4 border border-white/5">
                <h4 className="text-white font-semibold mb-2">{article.title}</h4>
                <div className="flex gap-4 text-sm">
                  <span className={`${
                    article.overallLabel === 'Bullish' ? 'text-green-500' : 
                    article.overallLabel === 'Bearish' ? 'text-red-500' : 
                    'text-gray-400'
                  }`}>
                    {article.overallLabel}
                  </span>
                  <span className="text-gray-400">{article.source}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
