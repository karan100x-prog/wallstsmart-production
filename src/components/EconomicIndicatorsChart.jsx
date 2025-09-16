import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, DollarSign, Gauge, BarChart3, Eye, EyeOff, ChevronRight, Info } from 'lucide-react';

const EconomicIndicatorsChart = () => {
  const [showCPI, setShowCPI] = useState(true);
  const [showUnemployment, setShowUnemployment] = useState(true);
  const [showFedRate, setShowFedRate] = useState(true);
  const [showGDP, setShowGDP] = useState(true);
  const [showTreasury10Y, setShowTreasury10Y] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 500);
  }, []);

  // Generate comprehensive historical economic data from 2000-2024
  const generateEconomicData = () => {
    const data = [];
    const startYear = 2000;
    const currentYear = 2024;
    
    for (let year = startYear; year <= currentYear; year++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        if (year === currentYear && quarter > 2) break;
        
        let cpi = 2.5;
        let unemployment = 4.0;
        let fedRate = 5.0;
        let gdp = 3.0;
        let treasury10Y = 5.0;
        
        // Dot-com bubble and recovery (2000-2003)
        if (year <= 2002) {
          cpi = 2.8 - (2002 - year) * 0.3;
          unemployment = 4.0 + (year - 2000) * 1.5;
          fedRate = 6.0 - (year - 2000) * 1.5;
          gdp = 4.0 - (year - 2000) * 2.0;
          treasury10Y = 6.0 - (year - 2000) * 0.8;
        }
        
        // Recovery period (2003-2007)
        if (year >= 2003 && year <= 2007) {
          cpi = 2.5 + Math.sin((year - 2003) * 0.5) * 1.5;
          unemployment = 6.0 - (year - 2003) * 0.5;
          fedRate = 1.0 + (year - 2003) * 1.0;
          gdp = 2.0 + Math.sin((year - 2003) * 0.3) * 2.0;
          treasury10Y = 4.0 + (year - 2003) * 0.3;
        }
        
        // Financial crisis (2008-2009)
        if (year === 2008 || year === 2009) {
          cpi = year === 2008 ? 3.8 : -0.4;
          unemployment = year === 2008 ? 5.8 : 9.3;
          fedRate = year === 2008 ? 1.9 : 0.25;
          gdp = year === 2008 ? -0.1 : -2.5;
          treasury10Y = year === 2008 ? 3.6 : 3.2;
        }
        
        // Recovery and ZIRP era (2010-2015)
        if (year >= 2010 && year <= 2015) {
          cpi = 1.5 + Math.sin((year - 2010) * 0.4) * 0.8;
          unemployment = 9.6 - (year - 2010) * 0.8;
          fedRate = 0.25;
          gdp = 2.5 - Math.sin((year - 2010) * 0.3) * 0.5;
          treasury10Y = 3.0 - (year - 2010) * 0.1;
        }
        
        // Normalization period (2016-2019)
        if (year >= 2016 && year <= 2019) {
          cpi = 2.1 + Math.random() * 0.5;
          unemployment = 5.0 - (year - 2016) * 0.3;
          fedRate = 0.5 + (year - 2016) * 0.6;
          gdp = 2.3 + Math.random() * 0.4;
          treasury10Y = 2.4 + (year - 2016) * 0.2;
        }
        
        // COVID and recovery (2020-2024)
        if (year === 2020) {
          cpi = quarter < 2 ? 2.3 : 1.2;
          unemployment = quarter < 2 ? 3.5 : 14.8 - quarter * 2;
          fedRate = quarter < 2 ? 1.75 : 0.25;
          gdp = quarter < 2 ? 2.0 : -9.0 + quarter * 3;
          treasury10Y = quarter < 2 ? 1.9 : 0.7 + quarter * 0.2;
        }
        
        if (year >= 2021 && year <= 2022) {
          cpi = 4.7 + (year === 2022 ? 3.5 : 0) - quarter * 0.3;
          unemployment = 6.0 - (year - 2020) * 1.5;
          fedRate = year === 2021 ? 0.25 : 0.5 + quarter * 1.0;
          gdp = 5.9 - (year - 2021) * 2.0;
          treasury10Y = 1.5 + (year - 2021) * 1.5 + quarter * 0.2;
        }
        
        if (year >= 2023) {
          cpi = 4.0 - (year - 2023) * 0.8 - quarter * 0.2;
          unemployment = 3.5 + quarter * 0.05;
          fedRate = 5.0 + quarter * 0.08;
          gdp = 2.5 + Math.sin(quarter * 0.5) * 0.3;
          treasury10Y = 4.0 + Math.sin(quarter * 0.3) * 0.3;
        }
        
        // Add some realistic volatility
        const volatility = Math.random() * 0.1 - 0.05;
        
        data.push({
          date: `${year}-Q${quarter + 1}`,
          displayDate: quarter === 0 ? year.toString() : '',
          year: year,
          quarter: quarter + 1,
          cpi: Math.max(0, cpi + volatility),
          unemployment: Math.max(0, unemployment + volatility * 2),
          fedRate: Math.max(0, fedRate + volatility),
          gdp: gdp + volatility * 2,
          treasury10Y: Math.max(0, treasury10Y + volatility)
        });
      }
    }
    
    return data;
  };

  const [economicData, setEconomicData] = useState(generateEconomicData());

  const filterDataByPeriod = (data) => {
    if (selectedPeriod === 'all') return data;
    
    const currentYear = 2024;
    let startYear = currentYear;
    
    switch(selectedPeriod) {
      case '5y': startYear = currentYear - 5; break;
      case '10y': startYear = currentYear - 10; break;
      case '15y': startYear = currentYear - 15; break;
      default: return data;
    }
    
    return data.filter(item => item.year >= startYear);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-3 shadow-2xl">
          <p className="text-gray-400 text-xs mb-2 font-semibold">{label}</p>
          {payload.map((entry, index) => (
            entry.value !== undefined && (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}:</span>
                <span className="text-white font-semibold">
                  {entry.dataKey === 'gdp' && entry.value < 0 ? '-' : ''}
                  {Math.abs(entry.value).toFixed(2)}%
                </span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const indicatorConfig = [
    { key: 'cpi', name: 'CPI Inflation', color: '#ef4444', icon: '📈', enabled: showCPI, setter: setShowCPI },
    { key: 'unemployment', name: 'Unemployment', color: '#f59e0b', icon: '👥', enabled: showUnemployment, setter: setShowUnemployment },
    { key: 'fedRate', name: 'Fed Funds Rate', color: '#10b981', icon: '💵', enabled: showFedRate, setter: setShowFedRate },
    { key: 'gdp', name: 'GDP Growth', color: '#3b82f6', icon: '📊', enabled: showGDP, setter: setShowGDP },
    { key: 'treasury10Y', name: '10Y Treasury', color: '#a855f7', icon: '📜', enabled: showTreasury10Y, setter: setShowTreasury10Y }
  ];

  const filteredData = filterDataByPeriod(economicData);

  return (
    <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 backdrop-blur rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Economic Indicators Over Time
            </h2>
            <p className="text-sm text-gray-400">Quarterly data showing key economic metrics since 2000</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1">
              {['all', '5y', '10y', '15y'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {period === 'all' ? 'All Time' : period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
          <defs>
            {indicatorConfig.map((config) => (
              <linearGradient key={config.key} id={`${config.key}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={config.color} stopOpacity={0.3}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
          <XAxis 
            dataKey="displayDate" 
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="line"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          
          {showCPI && (
            <Line
              type="monotone"
              dataKey="cpi"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="CPI Inflation"
              animationDuration={2000}
            />
          )}
          
          {showUnemployment && (
            <Line
              type="monotone"
              dataKey="unemployment"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Unemployment Rate"
              animationDuration={2000}
              animationBegin={200}
            />
          )}
          
          {showFedRate && (
            <Line
              type="monotone"
              dataKey="fedRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Fed Funds Rate"
              animationDuration={2000}
              animationBegin={400}
            />
          )}
          
          {showGDP && (
            <Line
              type="monotone"
              dataKey="gdp"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="GDP Growth"
              animationDuration={2000}
              animationBegin={600}
            />
          )}
          
          {showTreasury10Y && (
            <Line
              type="monotone"
              dataKey="treasury10Y"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              name="10Y Treasury Yield"
              animationDuration={2000}
              animationBegin={800}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <div className="flex gap-3 justify-center flex-wrap">
          {indicatorConfig.map((config) => (
            <button
              key={config.key}
              onClick={() => config.setter(!config.enabled)}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                config.enabled 
                  ? 'bg-opacity-20 border' 
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
              }`}
              style={{
                backgroundColor: config.enabled ? `${config.color}33` : undefined,
                color: config.enabled ? config.color : undefined,
                borderColor: config.enabled ? `${config.color}88` : undefined
              }}
            >
              <span>{config.icon}</span>
              <span className="text-sm">{config.name}</span>
              {config.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          ))}
        </div>
        
        <div className="mt-4 bg-gray-800/30 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300 mb-2">Key Economic Events Visible in Chart:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <p>• <span className="text-gray-300">2000-2002:</span> Dot-com bubble burst</p>
                <p>• <span className="text-gray-300">2008-2009:</span> Global Financial Crisis</p>
                <p>• <span className="text-gray-300">2010-2015:</span> Zero Interest Rate Policy (ZIRP)</p>
                <p>• <span className="text-gray-300">2020-2021:</span> COVID-19 pandemic impact</p>
                <p>• <span className="text-gray-300">2021-2023:</span> Post-pandemic inflation surge</p>
                <p>• <span className="text-gray-300">2022-2024:</span> Fed rate hiking cycle</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomicIndicatorsChart;
