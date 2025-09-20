import React from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ children, height = '400px' }) => {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-gray-900/50 p-4">
      <div className="w-full" style={{ height, minHeight: height }}>
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ChartWrapper;
