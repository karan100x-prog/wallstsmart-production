import React, { useState, useEffect } from 'react';
import { Star, Zap, Flame } from 'lucide-react';

interface StockDetailHeaderProps {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  rsi?: number;
  volatility?: number;
  sentiment?: { value: number; label: string };
  isWatchlisted: boolean;
  onWatchlistToggle: () => void;
}

const StockDetailHeader: React.FC<StockDetailHeaderProps> = ({
  symbol,
  companyName,
  exchange,
  sector,
  industry,
  price,
  change,
  changePercent,
  rsi = 72,
  volatility = 156,
  sentiment = { value: 61, label: 'Bull' },
  isWatchlisted,
  onWatchlistToggle
}) => {
  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-400 border-red-400/30 bg-red-400/10';
    if (rsi <= 30) return 'text-green-400 border-green-400/30 bg-green-400/10';
    return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  };

  const getRSILabel = (rsi: number) => {
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  };

  const priceChangeIcon = change >= 0 ? 
    <svg className="w-3 h-3 sm:w-4 sm:h-4 fill-green-400" viewBox="0 0 24 24">
      <path d="M12 4l8 12H4z" />
    </svg> : 
    <svg className="w-3 h-3 sm:w-4 sm:h-4 fill-red-400" viewBox="0 0 24 24">
      <path d="M12 20l8-12H4z" />
    </svg>;

  return (
    <div className="w-full bg-gray-900 text-white px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-12 xl:px-20 2xl:px-32">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-green-400 flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 shadow-lg">
            {symbol}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2">{companyName}</h1>
            <div className="flex items-center gap-2 md:gap-4 text-sm md:text-base lg:text-lg text-gray-400">
              <span className="text-white font-semibold">{exchange}</span>
              <span className="text-gray-500">•</span>
              <span>{sector}</span>
              <span className="text-gray-500">•</span>
              <span>{industry}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-4">
          <div className={`flex items-center gap-3 px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 rounded-xl border ${
            change >= 0 
              ? 'border-green-400/30 bg-green-400/10' 
              : 'border-red-400/30 bg-red-400/10'
          }`}>
            <div className="flex items-center gap-2">
              <span>{priceChangeIcon}</span>
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white">{price.toFixed(2)}</div>
                <div className={`text-xs md:text-sm lg:text-base font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(change).toFixed(2)} ({changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onWatchlistToggle}
            className="p-3 lg:p-4 rounded-xl hover:bg-gray-800 transition-all duration-200 border border-gray-700"
          >
            <Star className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-4 justify-between">
        <div className={`flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 rounded-xl border ${getRSIColor(rsi)}`}>
          <Zap className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="font-semibold text-sm lg:text-base xl:text-lg whitespace-nowrap">
            RSI: {rsi} ({getRSILabel(rsi)})
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 rounded-xl border border-green-400/30 bg-green-400/10">
          <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" />
          <span className="text-gray-300 font-semibold text-sm lg:text-base xl:text-lg whitespace-nowrap">
            Vol: {volatility}% avg
          </span>
        </div>

        <div className="flex items-center gap-3 lg:gap-4 flex-1 max-w-2xl">
          <span className="text-gray-400 text-sm lg:text-base xl:text-lg">Sentiment</span>
          <div className="flex-1 relative h-2 lg:h-3 bg-gray-800 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"></div>
            <div className="relative h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                 style={{ width: `${sentiment.value}%` }}>
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 bg-white rounded-full shadow-lg"></div>
            </div>
          </div>
          <span className="text-green-400 font-bold text-sm lg:text-base xl:text-lg whitespace-nowrap">
            {sentiment.value}% Bull
          </span>
        </div>
      </div>
    </div>
  );
};

export default StockDetailHeader;
