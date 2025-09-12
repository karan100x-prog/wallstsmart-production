import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Globe, Briefcase, Home, Factory, Zap, AlertTriangle, ChevronUp, ChevronDown, Info } from 'lucide-react';

const MacroDashboard = () => {
  const [selectedRegime, setSelectedRegime] = useState('current');
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch macro data from Alpha Vantage
  useEffect(() => {
    fetchMacroData();
    const interval = setInterval(fetchMacroData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMacroData = async () => {
    try {
      // You'll implement these API calls using your Alpha Vantage key
      // For now, using mock data
      setLoading(false);
    } catch (error) {
      console.error('Error fetching macro data:', error);
      setLoading(false);
    }
  };

  // Economic Regime Indicator
  const economicRegimes = {
    current: { name: 'Goldilocks', color: 'bg-green-500', description: 'Moderate growth, low inflation' },
    deflation: { name: 'Deflation', color: 'bg-blue-500', description: 'Falling prices, slow growth' },
    stagflation: { name: 'Stagflation', color: 'bg-red-500', description: 'High inflation, slow growth' },
    expansion: { name: 'Expansion', color: 'bg-emerald-500', description: 'High growth, rising inflation' }
  };

  // Key Macro Metrics Grid
  const macroMetrics = [
    {
      category: 'GROWTH INDICATORS',
      color: 'from-blue-600 to-blue-700',
      metrics: [
        { name: 'GDP Growth', value: '2.8%', change: '+0.3%', trend: 'up', spark: [2.1, 2.3, 2.5, 2.8] },
        { name: 'Unemployment', value: '3.7%', change: '-0.2%', trend: 'down', spark: [4.2, 4.0, 3.9, 3.7] },
        { name: 'Consumer Confidence', value: '102.5', change: '+3.2', trend: 'up', spark: [98, 99, 101, 102.5] },
        { name: 'PMI Manufacturing', value: '52.8', change: '+1.1', trend: 'up', spark: [51, 51.5, 52, 52.8] }
      ]
    },
    {
      category: 'INFLATION & RATES',
      color: 'from-orange-600 to-orange-700',
      metrics: [
        { name: 'CPI Inflation', value: '3.2%', change: '-0.3%', trend: 'down', spark: [3.8, 3.6, 3.4, 3.2] },
        { name: 'Fed Funds Rate', value: '5.25%', change: '0%', trend: 'flat', spark: [5.25, 5.25, 5.25, 5.25] },
        { name: '10Y Treasury', value: '4.28%', change: '+0.08%', trend: 'up', spark: [4.15, 4.20, 4.24, 4.28] },
        { name: 'Real Interest Rate', value: '2.05%', change: '+0.38%', trend: 'up', spark: [1.45, 1.65, 1.85, 2.05] }
      ]
    },
    {
      category: 'MARKET VALUATIONS',
      color: 'from-purple-600 to-purple-700',
      metrics: [
        { name: 'S&P 500 P/E', value: '19.8', change: '-0.5', trend: 'down', spark: [21.2, 20.8, 20.3, 19.8] },
        { name: 'Buffett Indicator', value: '168%', change: '-5%', trend: 'down', spark: [178, 175, 171, 168] },
        { name: 'VIX Volatility', value: '15.2', change: '-1.3', trend: 'down', spark: [18.5, 17.2, 16.5, 15.2] },
        { name: 'Dollar Index', value: '103.4', change: '+0.8', trend: 'up', spark: [102.1, 102.6, 103.0, 103.4] }
      ]
    },
    {
      category: 'COMMODITY & RATIOS',
      color: 'from-emerald-600 to-emerald-700',
      metrics: [
        { name: 'Gold/Silver', value: '83.2', change: '+1.5', trend: 'up', spark: [80.5, 81.2, 82.1, 83.2] },
        { name: 'Copper/Gold', value: '0.0048', change: '-0.0002', trend: 'down', spark: [0.0052, 0.0051, 0.0049, 0.0048] },
        { name: 'Oil (WTI)', value: '$78.25', change: '+$2.15', trend: 'up', spark: [74, 75.5, 76.8, 78.25] },
        { name: 'Stocks/Commodities', value: '18.5', change: '+0.8', trend: 'up', spark: [17.2, 17.6, 18.0, 18.5] }
      ]
    }
  ];

  // Asset Performance Matrix
  const assetPerformance = {
    'Goldilocks': { stocks: '+18%', bonds: '+5%', gold: '+2%', commodities: '+8%', realestate: '+12%' },
    'Deflation': { stocks: '-5%', bonds: '+12%', gold: '+15%', commodities: '-20%', realestate: '-8%' },
    'Stagflation': { stocks: '-12%', bonds: '-8%', gold: '+25%', commodities: '+30%', realestate: '+3%' },
    'Expansion': { stocks: '+25%', bonds: '-3%', gold: '-5%', commodities: '+15%', realestate: '+20%' }
  };

  // Yield Curve Data
  const yieldCurveData = [
    { maturity: '3M', yield: 5.45 },
    { maturity: '6M', yield: 5.38 },
    { maturity: '1Y', yield: 5.02 },
    { maturity: '2Y', yield: 4.65 },
    { maturity: '5Y', yield: 4.35 },
    { maturity: '10Y', yield: 4.28 },
    { maturity: '30Y', yield: 4.48 }
  ];

  // Sector Rotation Indicator
  const sectorRotation = [
    { sector: 'Technology', performance: '+15.2%', momentum: 'strong', phase: 'early expansion' },
    { sector: 'Financials', performance: '+12.8%', momentum: 'strong', phase: 'expansion' },
    { sector: 'Energy', performance: '+8.5%', momentum: 'moderate', phase: 'late cycle' },
    { sector: 'Consumer Disc.', performance: '+6.2%', momentum: 'moderate', phase: 'mid cycle' },
    { sector: 'Healthcare', performance: '+4.8%', momentum: 'weak', phase: 'defensive' },
    { sector: 'Utilities', performance: '-2.1%', momentum: 'weak', phase: 'recession' }
  ];

  const SparklineChart = ({ data, color = 'text-blue-500' }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="inline-block ml-2">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={color}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading macro data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WallStSmart Macro View
            </h1>
            <p className="text-gray-400 mt-1">Real-time economic indicators & market regime analysis</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Last Update</div>
            <div className="text-lg font-mono">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Economic Regime Indicator */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Economic Regime Analysis
            </h2>
            <div className="flex gap-2">
              {Object.entries(economicRegimes).map(([key, regime]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRegime(key)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    selectedRegime === key 
                      ? `${regime.color} text-white` 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {regime.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(assetPerformance[economicRegimes[selectedRegime].name]).map(([asset, performance]) => (
              <div key={asset} className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 uppercase mb-1">{asset}</div>
                <div className={`text-xl font-bold ${
                  performance.startsWith('+') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performance}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {macroMetrics.map((category, idx) => (
            <div key={idx} className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
              <div className={`bg-gradient-to-r ${category.color} px-4 py-2`}>
                <h3 className="font-semibold text-sm">{category.category}</h3>
              </div>
              <div className="p-3">
                {category.metrics.map((metric, midx) => (
                  <div 
                    key={midx} 
                    className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredMetric(`${idx}-${midx}`)}
                    onMouseLeave={() => setHoveredMetric(null)}
                  >
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">{metric.name}</div>
                      <div className="text-lg font-semibold">{metric.value}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm ${
                        metric.trend === 'up' ? 'text-green-400' : 
                        metric.trend === 'down' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {metric.change}
                        {metric.trend === 'up' && <ChevronUp className="inline w-4 h-4" />}
                        {metric.trend === 'down' && <ChevronDown className="inline w-4 h-4" />}
                      </div>
                      <SparklineChart 
                        data={metric.spark} 
                        color={metric.trend === 'up' ? 'text-green-400' : 'text-red-400'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Yield Curve & Sector Rotation */}
        <div className="grid grid-cols-2 gap-4">
          {/* Yield Curve */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              US Treasury Yield Curve
            </h3>
            <div className="h-40 flex items-end justify-between gap-2">
              {yieldCurveData.map((point, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                    style={{ height: `${(point.yield / 6) * 100}%` }}
                  />
                  <div className="text-xs text-gray-400 mt-2">{point.maturity}</div>
                  <div className="text-xs font-semibold">{point.yield}%</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Spread (10Y-2Y): <span className="text-yellow-400 font-semibold">-37 bps</span> (Inverted)
            </div>
          </div>

          {/* Sector Rotation */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Sector Rotation Monitor
            </h3>
            <div className="space-y-2">
              {sectorRotation.slice(0, 5).map((sector, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex-1">
                    <div className="text-sm">{sector.sector}</div>
                    <div className="text-xs text-gray-400">{sector.phase}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-semibold ${
                      sector.performance.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {sector.performance}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      sector.momentum === 'strong' ? 'bg-green-400' :
                      sector.momentum === 'moderate' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Indicators Bar */}
        <div className="mt-6 bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-4 border border-red-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">Market Risk Level:</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-8 h-3 rounded ${
                    i <= 3 ? 'bg-yellow-400' : 'bg-gray-600'
                  }`} />
                ))}
              </div>
              <span className="text-yellow-400 font-semibold">MODERATE</span>
            </div>
            <div className="flex gap-6 text-sm">
              <div>Credit Spreads: <span className="text-orange-400">Widening</span></div>
              <div>M2 Growth: <span className="text-green-400">+6.2% YoY</span></div>
              <div>Debt/GDP: <span className="text-red-400">122%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroDashboard;
