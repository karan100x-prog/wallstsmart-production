// src/components/SmartFlow.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ALPHA_VANTAGE_KEY = 'NMSRS0ZDIOWF3CLL';

interface InvestorPosition {
  name: string;
  manager: string;
  aum: string;
  stocks: number;
  trustScore: number;
  recentMoves: Move[];
  topHoldings: Holding[];
}

interface Move {
  action: 'BUY' | 'SELL' | 'HOLD' | 'EXIT';
  ticker: string;
  amount: string;
  percentage: string;
  position: string;
}

interface Holding {
  ticker: string;
  percent: string;
}

const SmartFlow: React.FC = () => {
  const [investors, setInvestors] = useState<InvestorPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalFlow: '$47.2B',
    consensusScore: 73,
    mostBought: 'NVDA',
    topSector: 'Tech',
    activeFunds: 1247
  });

  // Fetch insider transactions from Alpha Vantage
  const fetchInsiderTransactions = async (symbol: string) => {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching insider data:', error);
      return null;
    }
  };

  // Fetch institutional holdings (when available)
  const fetchInstitutionalData = async () => {
    // For now, we'll use sample data and gradually integrate real API calls
    // Alpha Vantage's institutional data endpoints can be integrated here
    
    const sampleInvestors: InvestorPosition[] = [
      {
        name: "Berkshire Hathaway",
        manager: "Warren Buffett",
        aum: "$358.7B",
        stocks: 45,
        trustScore: 94,
        recentMoves: [
          { action: "SELL", ticker: "AAPL", amount: "$2.3B", percentage: "-7.96%", position: "27.2%" },
          { action: "BUY", ticker: "OXY", amount: "$1.1B", percentage: "+40.48%", position: "5.9%" }
        ],
        topHoldings: [
          { ticker: "AAPL", percent: "27.2%" },
          { ticker: "BAC", percent: "15.4%" },
          { ticker: "KO", percent: "8.7%" },
          { ticker: "AXP", percent: "7.2%" }
        ]
      },
      {
        name: "ARK Invest",
        manager: "Cathie Wood",
        aum: "$7.9B",
        stocks: 35,
        trustScore: 62,
        recentMoves: [
          { action: "BUY", ticker: "TSLA", amount: "$127M", percentage: "+8.3%", position: "15.4%" },
          { action: "SELL", ticker: "COIN", amount: "$45M", percentage: "-12.1%", position: "3.2%" }
        ],
        topHoldings: [
          { ticker: "TSLA", percent: "15.4%" },
          { ticker: "ROKU", percent: "11.2%" },
          { ticker: "SQ", percent: "9.8%" },
          { ticker: "SHOP", percent: "7.6%" }
        ]
      }
    ];

    setInvestors(sampleInvestors);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstitutionalData();
    
    // Simulate live updates
    const interval = setInterval(() => {
      // Add random activity
      const activities = [
        "Berkshire reduced AAPL position",
        "Tiger Global opened META position",
        "ARK Invest increased TSLA holdings"
      ];
      
      setLiveActivity(prev => [
        {
          time: 'Just now',
          text: activities[Math.floor(Math.random() * activities.length)]
        },
        ...prev.slice(0, 4)
      ]);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
              <span>Live • {stats.activeFunds} moves today</span>
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
          Track what top institutional investors are buying and selling in real-time
        </p>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-[#1a1d29] rounded-2xl p-6 border border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Flow Today</div>
              <div className="text-3xl font-bold text-white">{stats.totalFlow}</div>
              <div className="text-sm text-green-500">↑ 12.3%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Consensus Score</div>
              <div className="text-3xl font-bold text-white">{stats.consensusScore}</div>
              <div className="text-sm text-green-500">↑ 5 points</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Most Bought</div>
              <div className="text-3xl font-bold text-white">{stats.mostBought}</div>
              <div className="text-sm text-gray-400">12 buyers</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Top Sector</div>
              <div className="text-3xl font-bold text-white">{stats.topSector}</div>
              <div className="text-sm text-green-500">↑ $8.7B</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Active Funds</div>
              <div className="text-3xl font-bold text-white">{stats.activeFunds}</div>
              <div className="text-sm text-gray-400">Trading today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Whale Alert */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🐋</span>
            <div>
              <div className="text-green-500 font-semibold text-sm mb-1">WHALE ALERT</div>
              <div className="text-white">
                Berkshire Hathaway just reduced AAPL position by $2.3B (7.96%) - Still their largest holding at 27.2%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            investors.map((investor, index) => (
              <InvestorCard key={index} investor={investor} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Investor Card Component
const InvestorCard: React.FC<{ investor: InvestorPosition }> = ({ investor }) => {
  return (
    <div className="bg-[#1a1d29] rounded-2xl p-6 border border-white/5 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/10">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{investor.name}</h3>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>{investor.aum} AUM</span>
            <span>•</span>
            <span>{investor.stocks} stocks</span>
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg">
          <span className="text-yellow-500 font-semibold text-sm">⭐ {investor.trustScore}</span>
        </div>
      </div>

      {/* Recent Moves */}
      <div className="space-y-3 mb-6 pb-6 border-b border-white/5">
        {investor.recentMoves.map((move, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                move.action === 'BUY' ? 'bg-green-500/15 text-green-500' :
                move.action === 'SELL' ? 'bg-red-500/15 text-red-500' :
                'bg-gray-500/15 text-gray-500'
              }`}>
                {move.action}
              </span>
              <div>
                <div className="text-white font-semibold">{move.ticker}</div>
                <div className="text-xs text-gray-400">{move.amount} • {move.position} of portfolio</div>
              </div>
            </div>
            <span className={`font-semibold ${
              move.percentage.startsWith('+') ? 'text-green-500' : 'text-red-500'
            }`}>
              {move.percentage}
            </span>
          </div>
        ))}
      </div>

      {/* Top Holdings */}
      <div className="flex flex-wrap gap-2">
        {investor.topHoldings.map((holding, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-sm hover:bg-green-500/10 hover:border-green-500/30 transition-colors">
            <span className="text-white font-semibold">{holding.ticker}</span>
            <span className="text-gray-400 ml-2">{holding.percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartFlow;
