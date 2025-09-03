'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Activity } from 'lucide-react';

interface GrowthTrajectoryProps {
  startDate?: string;
  endDate?: string;
  regions?: string[];
  products?: string[];
  volumeUnit?: 'liters' | 'mt';
  loading?: boolean;
}

interface GrowthData {
  yoy_growth: Array<{
    year: number;
    regions: number;
    products: number;
    transactions: number;
    total_quantity: number;
    prev_year_quantity: number | null;
    yoy_growth_rate: number | null;
  }>;
  qoq_growth: Array<{
    year: number;
    quarter: number;
    regions: number;
    products: number;
    transactions: number;
    total_quantity: number;
    prev_quarter_quantity: number | null;
    qoq_growth_rate: number | null;
  }>;
  regional_growth: Array<{
    region: string;
    avg_mom_growth: number;
    avg_yoy_growth: number | null;
    total_quantity: number;
    data_points: number;
    growth_rank: number;
  }>;
}

export function GrowthTrajectoryChart({ 
  startDate, 
  endDate, 
  regions = [], 
  products = [], 
  volumeUnit = 'liters',
  loading = false 
}: GrowthTrajectoryProps) {
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [viewMode, setViewMode] = useState<'yearly' | 'quarterly'>('yearly');
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowthData = async () => {
    if (!startDate || !endDate) return;
    
    setChartLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        volume_unit: volumeUnit,
        top_n: '20'
      });
      
      if (regions.length > 0) {
        params.append('regions', regions.join(','));
      }
      
      if (products.length > 0) {
        params.append('products', products.join(','));
      }

      const response = await fetch(
        `http://localhost:8003/api/v2/supply/growth?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGrowthData(data);
    } catch (err) {
      console.error('Failed to fetch growth data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load growth data');
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [startDate, endDate, regions, products, volumeUnit]);

  const formatVolume = (value: number) => {
    if (volumeUnit === 'mt') {
      const mtValue = value / 1200; // Convert to MT
      if (mtValue >= 1e6) return `${(mtValue / 1e6).toFixed(1)}M MT`;
      if (mtValue >= 1e3) return `${(mtValue / 1e3).toFixed(1)}K MT`;
      return `${mtValue.toFixed(0)} MT`;
    } else {
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B L`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M L`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K L`;
      return `${value.toFixed(0)} L`;
    }
  };

  const formatGrowthRate = (rate: number | null) => {
    if (rate === null) return 'N/A';
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  const getGrowthColor = (rate: number | null) => {
    if (rate === null) return '#9CA3AF';
    if (rate > 0) return '#10B981';
    if (rate < 0) return '#EF4444';
    return '#9CA3AF';
  };

  const getGrowthIcon = (rate: number | null) => {
    if (rate === null) return Activity;
    if (rate > 0) return TrendingUp;
    if (rate < 0) return TrendingDown;
    return Activity;
  };

  // Prepare chart data
  const chartData = viewMode === 'yearly' ? 
    growthData?.yoy_growth?.map(item => ({
      period: item.year.toString(),
      volume: item.total_quantity,
      growthRate: item.yoy_growth_rate,
      regions: item.regions,
      transactions: item.transactions
    })) || [] :
    growthData?.qoq_growth?.map(item => ({
      period: `Q${item.quarter} ${item.year}`,
      volume: item.total_quantity,
      growthRate: item.qoq_growth_rate,
      regions: item.regions,
      transactions: item.transactions
    })) || [];

  // Calculate statistics
  const currentPeriod = chartData[chartData.length - 1];
  const previousPeriod = chartData[chartData.length - 2];
  const avgGrowthRate = chartData.length > 1 ? 
    chartData.filter(d => d.growthRate !== null)
             .reduce((sum, d) => sum + (d.growthRate || 0), 0) / 
    chartData.filter(d => d.growthRate !== null).length : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <p className="text-sm font-semibold text-white mb-2">{label}</p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-400">Volume:</span>
              <span className="text-xs font-medium text-white">
                {formatVolume(data.volume)}
              </span>
            </div>
            {data.growthRate !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-400">Growth:</span>
                <span 
                  className={`text-xs font-medium ${
                    data.growthRate > 0 ? 'text-green-400' : 
                    data.growthRate < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {formatGrowthRate(data.growthRate)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-400">Regions:</span>
              <span className="text-xs text-gray-300">{data.regions}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-400">Transactions:</span>
              <span className="text-xs text-gray-300">{data.transactions.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading || chartLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Growth Trajectory</CardTitle>
          <CardDescription>Historical growth patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading growth data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Growth Trajectory</CardTitle>
          <CardDescription>Historical growth patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-center">
            <div className="text-red-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>Error loading growth data</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Growth Trajectory</CardTitle>
            <CardDescription>Historical volume growth patterns and trends</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewMode('quarterly')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'quarterly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Current</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {currentPeriod ? formatVolume(currentPeriod.volume) : 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {(() => {
                const Icon = getGrowthIcon(currentPeriod?.growthRate || null);
                return <Icon className={`w-4 h-4 ${
                  currentPeriod?.growthRate === null ? 'text-gray-400' :
                  currentPeriod?.growthRate > 0 ? 'text-green-400' : 'text-red-400'
                }`} />;
              })()}
              <span className="text-xs text-gray-400">Latest Growth</span>
            </div>
            <p className={`text-sm font-semibold ${
              currentPeriod?.growthRate === null ? 'text-gray-400' :
              currentPeriod?.growthRate > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatGrowthRate(currentPeriod?.growthRate || null)}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Avg Growth</span>
            </div>
            <p className="text-sm font-semibold text-yellow-400">
              {formatGrowthRate(avgGrowthRate)}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Periods</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {chartData.length}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="period" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="volume"
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatVolume}
                />
                <YAxis 
                  yAxisId="growth" 
                  orientation="right" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                
                {/* Volume bars */}
                <Bar 
                  yAxisId="volume"
                  dataKey="volume" 
                  fill="url(#volumeGradient)" 
                  stroke="#3B82F6"
                  strokeWidth={1}
                  name="Volume"
                />
                
                {/* Growth rate line */}
                <Line 
                  yAxisId="growth"
                  type="monotone" 
                  dataKey="growthRate" 
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  name="Growth Rate (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Growth Data Available</p>
                <p className="text-sm">Try adjusting your date range or filters</p>
              </div>
            </div>
          )}
        </div>

        {/* Regional Growth Rankings */}
        {growthData?.regional_growth && growthData.regional_growth.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-3">Regional Growth Leaders</h4>
            <div className="grid grid-cols-2 gap-4">
              {growthData.regional_growth.slice(0, 6).map((region, idx) => (
                <div 
                  key={region.region} 
                  className="flex items-center justify-between bg-gray-800/30 rounded p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-white truncate">
                      {region.region}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${
                      region.avg_yoy_growth === null ? 'text-gray-400' :
                      region.avg_yoy_growth > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatGrowthRate(region.avg_yoy_growth)}
                    </span>
                    <p className="text-xs text-gray-400">
                      {formatVolume(region.total_quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}