// src/components/InstitutionalFlow.tsx

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Users, Building2, AlertTriangle,
  Eye, Filter, Download, RefreshCw, Bell, BarChart3, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, Search, Star, Zap, Home
} from 'lucide-react';

interface InsiderTransaction {
  symbol: string;
  executive: string;
  title: string;
  transaction: 'Buy' | 'Sale';
  shares: number;
  price: number;
  value: number;
  date: string;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
}

interface FlowData {
  symbol: string;
  company: string;
  flow: number;
  change: number;
  institutions: number;
  sentiment: string;
  price: number;
  priceChange: number;
}

interface FlowAnalytics {
  momentum: string;
  concentration: string;
  riskLevel: string;
  nextEarnings: number;
}

const InstitutionalFlow: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Sample data - replace with real Alpha Vantage API calls
  const institutionalFlowData = {
    totalFlow: 2840000000, // $2.84B net inflow this week
    weeklyChange: 12.4,
    activeInstitutions: 1247,
    topInflows: [
      {
        symbol: 'NVDA',
        company: 'NVIDIA Corporation',
        flow: 580000000,
        change: 15.7,
        institutions: 23,
        sentiment: 'Very Bullish',
        price: 118.50,
        priceChange: 2.45
      },
      {
        symbol: 'META',
        company: 'Meta Platforms Inc.',
        flow: 430000000,
        change: 11.2,
        institutions: 18,
        sentiment: 'Bullish',
        price: 576.36,
        priceChange: 8.92
      },
      {
        symbol: 'MSFT',
        company: 'Microsoft Corporation',
        flow: 320000000,
        change: 8.9,
        institutions: 31,
        sentiment: 'Bullish',
        price: 375.39,
        priceChange: -1.75
      }
    ] as FlowData[],
    topOutflows: [
      {
        symbol: 'TSLA',
        company: 'Tesla Inc.',
        flow: -280000000,
        change: -9.4,
        institutions: 12,
        sentiment: 'Bearish',
        price: 248.50,
        priceChange: -5.30
      },
      {
        symbol: 'AAPL',
        company: 'Apple Inc.',
        flow: -150000000,
        change: -3.2,
        institutions: 8,
        sentiment: 'Neutral',
        price: 189.50,
        priceChange: 2.45
      }
    ] as FlowData[],
    recentInsiderActivity: [
      {
        symbol: 'AAPL',
        executive: 'LEVINSON, ARTHUR D',
        title: 'Director',
        transaction: 'Sale' as const,
        shares: 90000,
        price: 232.07,
        value: 20886300,
        date: '2025-08-28',
        impact: 'Neutral' as const
      },
      {
        symbol: 'AAPL',
        executive: 'O\'BRIEN, DEIRDRE',
        title: 'Senior Vice President',
        transaction: 'Sale' as const,
        shares: 34821,
        price: 223.20,
        value: 7771607,
        date: '2025-08-08',
        impact: 'Bearish' as const
      },
      {
        symbol: 'MSFT',
        executive: 'NADELLA, SATYA',
        title: 'CEO',
        transaction: 'Sale' as const,
        shares: 8596,
        price: 378.25,
        value: 3251047,
        date: '2025-08-02',
        impact: 'Neutral' as const
      }
    ] as InsiderTransaction[],
    flowAnalytics: {
      momentum: 'Accelerating',
      concentration: 'High',
      riskLevel: 'Moderate',
      nextEarnings: 12
    } as FlowAnalytics
  };

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (absValue >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (absValue >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getFlowColor = (flow: number): string => {
    if (flow > 0) return 'text-green-600';
    if (flow < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment.toLowerCase()) {
      case 'very bullish': return 'bg-green-100 text-green-800';
      case 'bullish': return 'bg-green-50 text-green-700';
      case 'neutral': return 'bg-gray-100 text-gray-700';
      case 'bearish': return 'bg-red-50 text-red-700';
      case 'very bearish': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleRefresh = (): void => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
                WallStSmart
              </a>
              <span className="ml-2 text-gray-400">/</span>
              <span className="ml-2 text-gray-700">Institutional Flow</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="w-4 h-4" />
                Alerts
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Institutional Flow</h1>
              <p className="text-gray-600">Track where smart money is moving in real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1d">Today</option>
                <option value="7d">This Week</option>
                <option value="30d">This Month</option>
                <option value="90d">3 Months</option>
              </select>
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Flow Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Institutional Flow</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(institutionalFlowData.totalFlow)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600">+{institutionalFlowData.weeklyChange}%</span>
              <span className="text-gray-600">vs last week</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Institutions</p>
                <p className="text-2xl font-bold text-gray-900">{institutionalFlowData.activeInstitutions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-gray-600">Momentum:</span>
              <span className="text-green-600 font-medium">{institutionalFlowData.flowAnalytics.momentum}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Flow Concentration</p>
                <p className="text-2xl font-bold text-gray-900">{institutionalFlowData.flowAnalytics.concentration}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-gray-600">Risk Level:</span>
              <span className="text-orange-600 font-medium">{institutionalFlowData.flowAnalytics.riskLevel}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{institutionalFlowData.flowAnalytics.nextEarnings}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-gray-600">Next 7 days</span>
            </div>
          </div>
        </div>

        {/* Flow Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Inflows */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Largest Inflows</h3>
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  Money flowing in
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {institutionalFlowData.topInflows.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{stock.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{stock.symbol}</div>
                        <div className="text-sm text-gray-500 truncate max-w-48">{stock.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatCurrency(stock.flow)}</div>
                      <div className="text-sm text-gray-500">{stock.institutions} institutions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Outflows */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Largest Outflows</h3>
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <ArrowDownRight className="w-4 h-4" />
                  Money flowing out
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {institutionalFlowData.topOutflows.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 font-semibold text-sm">{stock.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{stock.symbol}</div>
                        <div className="text-sm text-gray-500 truncate max-w-48">{stock.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">{formatCurrency(stock.flow)}</div>
                      <div className="text-sm text-gray-500">{stock.institutions} institutions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Insider Activity */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Insider Activity</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Powered by Alpha Vantage</span>
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executive</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {institutionalFlowData.recentInsiderActivity.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">{transaction.symbol}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{transaction.symbol}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.executive}</div>
                      <div className="text-sm text-gray-500">{transaction.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.transaction === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.transaction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.shares.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${transaction.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(transaction.impact)}`}>
                        {transaction.impact}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flow Intelligence Alert */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Flow Intelligence Alert</h3>
              <p className="text-gray-700 mb-4">
                Unusual institutional activity detected: <strong>23 institutions</strong> increased NVDA positions by an average of 
                <strong> 15.7%</strong> this week, suggesting coordinated accumulation ahead of earnings.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  View Full Analysis
                </button>
                <button className="px-4 py-2 text-blue-600 border border-blue-200 text-sm rounded-lg hover:bg-blue-50 transition-colors">
                  Set Similar Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionalFlow;
