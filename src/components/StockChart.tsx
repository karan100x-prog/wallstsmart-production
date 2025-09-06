import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  data: any[];
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  // ✅ FIXED: Now uses adjustedClose for split-adjusted prices
  const chartData = data.slice(0, 30).reverse().map((item) => ({
    date: item.date.split('-').slice(1).join('/'),
    price: parseFloat(item.adjustedClose || item.close) // ✅ CHANGED: Uses adjusted price
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
        />
        <YAxis 
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          domain={['dataMin - 5', 'dataMax + 5']}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '0.5rem'
          }}
          labelStyle={{ color: '#9CA3AF' }}
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#10B981" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StockChart;
