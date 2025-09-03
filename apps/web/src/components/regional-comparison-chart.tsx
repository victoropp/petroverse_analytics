'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie, Treemap, RadialBarChart, RadialBar,
  ComposedChart, Line, Area
} from 'recharts';
import { MapPin, TrendingUp, Package, Activity, Award, AlertCircle, Layers, BarChart3 } from 'lucide-react';
import { QualityScoreBadge } from './quality-score-badge';

interface RegionalComparisonProps {
  startDate?: string;
  endDate?: string;
  regions?: string[];
  products?: string[];
  volumeUnit?: 'liters' | 'mt';
  loading?: boolean;
  minQuality?: number;
}

interface RegionalData {
  region: string;
  active_months: number;
  avg_products: number;
  total_quantity: number;
  avg_monthly_quantity: number;
  quantity_stddev: number;
  min_monthly_quantity: number;
  max_monthly_quantity: number;
  overall_quality_score: number;
  volatility_coefficient: number;
  volume_rank: number;
  stability_rank: number;
  diversity_rank: number;
}

const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#6366F1', // indigo
];

export function RegionalComparisonChart({ 
  startDate, 
  endDate, 
  regions = [], 
  products = [], 
  volumeUnit = 'liters',
  loading = false,
  minQuality
}: RegionalComparisonProps) {
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [viewMode, setViewMode] = useState<'bar' | 'pie' | 'treemap' | 'radial'>('bar');
  const [metricMode, setMetricMode] = useState<'volume' | 'stability' | 'diversity'>('volume');
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegionalData = async () => {
    if (!startDate || !endDate) return;
    
    setChartLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        volume_unit: volumeUnit,
        top_n: '10'
      });
      
      if (regions.length > 0) {
        params.append('regions', regions.join(','));
      }
      
      if (products.length > 0) {
        params.append('products', products.join(','));
      }
      
      if (minQuality !== undefined) {
        params.append('min_quality', minQuality.toString());
      }

      const response = await fetch(
        `http://localhost:8003/api/v2/supply/regional?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process regional consistency data
      if (data.regional_consistency) {
        setRegionalData(data.regional_consistency);
      }
    } catch (err) {
      console.error('Failed to fetch regional data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load regional data');
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionalData();
  }, [startDate, endDate, regions, products, volumeUnit, minQuality]);

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

  // Prepare data based on selected metric
  const getChartData = () => {
    return regionalData.map((region, index) => {
      let value, label, color;
      
      switch (metricMode) {
        case 'stability':
          value = 100 - region.volatility_coefficient; // Lower volatility = higher stability
          label = `Stability: ${value.toFixed(1)}%`;
          color = value > 90 ? '#10B981' : value > 80 ? '#F59E0B' : '#EF4444';
          break;
        case 'diversity':
          value = region.avg_products;
          label = `Products: ${value.toFixed(1)}`;
          color = value > 10 ? '#8B5CF6' : value > 7 ? '#3B82F6' : '#06B6D4';
          break;
        default: // volume
          value = region.total_quantity;
          label = formatVolume(value);
          color = CHART_COLORS[index % CHART_COLORS.length];
      }
      
      return {
        ...region,
        value,
        label,
        color,
        marketShare: (region.total_quantity / regionalData.reduce((sum, r) => sum + r.total_quantity, 0)) * 100
      };
    });
  };

  const chartData = getChartData();

  // Custom tooltip for all chart types
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-bold text-white">{data.region}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between gap-6">
              <span className="text-xs text-gray-400">Total Volume:</span>
              <span className="text-xs font-medium text-white">
                {formatVolume(data.total_quantity)}
              </span>
            </div>
            
            <div className="flex justify-between gap-6">
              <span className="text-xs text-gray-400">Market Share:</span>
              <span className="text-xs font-medium text-blue-400">
                {data.marketShare.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between gap-6">
              <span className="text-xs text-gray-400">Avg Products:</span>
              <span className="text-xs font-medium text-purple-400">
                {data.avg_products.toFixed(1)}
              </span>
            </div>
            
            <div className="flex justify-between gap-6">
              <span className="text-xs text-gray-400">Quality Score:</span>
              <QualityScoreBadge 
                score={data.overall_quality_score} 
                size="sm" 
                showTooltip={false} 
              />
            </div>
            
            <div className="flex justify-between gap-6">
              <span className="text-xs text-gray-400">Volatility:</span>
              <span className={`text-xs font-medium ${
                data.volatility_coefficient < 10 ? 'text-green-400' : 
                data.volatility_coefficient < 15 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.volatility_coefficient.toFixed(1)}%
              </span>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="text-gray-400">Volume</p>
                  <p className="font-bold text-white">#{data.volume_rank}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">Stability</p>
                  <p className="font-bold text-white">#{data.stability_rank}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">Diversity</p>
                  <p className="font-bold text-white">#{data.diversity_rank}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    switch (viewMode) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ region, marketShare }) => `${region}: ${marketShare.toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );
        
      case 'treemap':
        return (
          <Treemap
            data={chartData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#1F2937"
            fill="#3B82F6"
            content={({ x, y, width, height, value, name, payload }: any) => (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  style={{
                    fill: payload.color,
                    stroke: '#1F2937',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                  }}
                />
                {width > 50 && height > 30 && (
                  <>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 - 8}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {payload.region}
                    </text>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + 8}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={10}
                    >
                      {payload.label}
                    </text>
                  </>
                )}
              </g>
            )}
          />
        );
        
      case 'radial':
        return (
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="10%" 
            outerRadius="90%" 
            data={chartData.map((d, i) => ({ ...d, fill: d.color }))}
          >
            <RadialBar
              dataKey="marketShare"
              cornerRadius={10}
              fill="#3B82F6"
              label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
            />
            <Legend 
              iconSize={10}
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value: any, entry: any) => `${entry.payload.region}: ${entry.payload.marketShare.toFixed(1)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        );
        
      default: // bar chart
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="region" 
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="volume"
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              tickFormatter={formatVolume}
            />
            <YAxis 
              yAxisId="quality"
              orientation="right"
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              domain={[0.9, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            
            <Bar 
              yAxisId="volume"
              dataKey="value" 
              name={metricMode === 'volume' ? 'Volume' : metricMode === 'stability' ? 'Stability' : 'Product Diversity'}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            
            <Line
              yAxisId="quality"
              type="monotone"
              dataKey="overall_quality_score"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 4 }}
              name="Quality Score"
            />
          </ComposedChart>
        );
    }
  };

  if (loading || chartLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Regional Comparison</CardTitle>
          <CardDescription>Comprehensive regional performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading regional data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Regional Comparison</CardTitle>
          <CardDescription>Comprehensive regional performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-center">
            <div className="text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Error loading regional data</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate key statistics
  const totalVolume = regionalData.reduce((sum, r) => sum + r.total_quantity, 0);
  const avgQuality = regionalData.reduce((sum, r) => sum + r.overall_quality_score, 0) / regionalData.length;
  const topRegion = regionalData[0];
  const mostStable = regionalData.sort((a, b) => a.volatility_coefficient - b.volatility_coefficient)[0];

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Regional Comparison</CardTitle>
            <CardDescription>Comprehensive regional performance analysis</CardDescription>
          </div>
          
          {/* View mode selector */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-800 rounded p-1">
              {(['bar', 'pie', 'treemap', 'radial'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                >
                  {mode === 'bar' && <BarChart3 className="w-4 h-4" />}
                  {mode === 'pie' && <Activity className="w-4 h-4" />}
                  {mode === 'treemap' && <Layers className="w-4 h-4" />}
                  {mode === 'radial' && <Award className="w-4 h-4" />}
                </button>
              ))}
            </div>
            
            {/* Metric selector for bar chart */}
            {viewMode === 'bar' && (
              <select
                value={metricMode}
                onChange={(e) => setMetricMode(e.target.value as any)}
                className="px-2 py-1 text-xs bg-gray-800 text-white rounded border border-gray-700"
              >
                <option value="volume">Volume</option>
                <option value="stability">Stability</option>
                <option value="diversity">Product Diversity</option>
              </select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Regions</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {regionalData.length}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Top Region</span>
            </div>
            <p className="text-sm font-semibold text-white truncate" title={topRegion?.region}>
              {topRegion?.region || 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Total Volume</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {formatVolume(totalVolume)}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Avg Quality</span>
            </div>
            <QualityScoreBadge 
              score={avgQuality} 
              size="sm" 
              showTooltip={false} 
            />
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Regional Data Available</p>
                <p className="text-sm">Try adjusting your date range or filters</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Performers Summary */}
        {regionalData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-3">Performance Leaders</h4>
            <div className="grid grid-cols-3 gap-4">
              {/* Volume Leader */}
              <div className="bg-gray-800/30 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-400">Volume Leader</span>
                </div>
                <p className="text-sm font-bold text-white">{topRegion?.region}</p>
                <p className="text-xs text-gray-400">{formatVolume(topRegion?.total_quantity || 0)}</p>
              </div>
              
              {/* Stability Leader */}
              <div className="bg-gray-800/30 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-xs text-gray-400">Most Stable</span>
                </div>
                <p className="text-sm font-bold text-white">{mostStable?.region}</p>
                <p className="text-xs text-gray-400">Volatility: {mostStable?.volatility_coefficient.toFixed(1)}%</p>
              </div>
              
              {/* Diversity Leader */}
              <div className="bg-gray-800/30 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-xs text-gray-400">Most Diverse</span>
                </div>
                {(() => {
                  const mostDiverse = regionalData.sort((a, b) => b.avg_products - a.avg_products)[0];
                  return (
                    <>
                      <p className="text-sm font-bold text-white">{mostDiverse?.region}</p>
                      <p className="text-xs text-gray-400">{mostDiverse?.avg_products.toFixed(1)} products</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}