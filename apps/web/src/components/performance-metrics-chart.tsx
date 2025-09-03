'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line
} from 'recharts';
import { Activity, TrendingUp, Package, Truck, Users, Target, Zap, BarChart3 } from 'lucide-react';

interface PerformanceMetricsProps {
  startDate?: string;
  endDate?: string;
  regions?: string[];
  products?: string[];
  volumeUnit?: 'liters' | 'mt';
  loading?: boolean;
}

interface RegionalMetrics {
  region: string;
  volume: number;
  efficiency: number;
  stability: number;
  diversity: number;
  growth: number;
  marketShare: number;
}

const METRIC_COLORS = {
  volume: '#3B82F6',      // blue
  efficiency: '#10B981',  // green
  stability: '#F59E0B',   // amber
  diversity: '#8B5CF6',   // violet
  growth: '#EC4899',      // pink
  marketShare: '#14B8A6'  // teal
};

export function PerformanceMetricsChart({ 
  startDate, 
  endDate, 
  regions = [], 
  products = [], 
  volumeUnit = 'liters',
  loading = false 
}: PerformanceMetricsProps) {
  const [metricsData, setMetricsData] = useState<RegionalMetrics[]>([]);
  const [viewMode, setViewMode] = useState<'radar' | 'scatter' | 'bar'>('radar');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['volume', 'efficiency', 'stability', 'diversity']);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    if (!startDate || !endDate) return;
    
    setChartLoading(true);
    setError(null);
    
    try {
      // Fetch regional data for performance metrics
      const regionalParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        volume_unit: volumeUnit,
        top_n: '10'
      });
      
      if (regions.length > 0) {
        regionalParams.append('regions', regions.join(','));
      }
      
      if (products.length > 0) {
        regionalParams.append('products', products.join(','));
      }

      const [regionalResponse, growthResponse] = await Promise.all([
        fetch(`http://localhost:8003/api/v2/supply/regional?${regionalParams.toString()}`),
        fetch(`http://localhost:8003/api/v2/supply/growth?${regionalParams.toString()}`)
      ]);

      if (!regionalResponse.ok || !growthResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const regionalData = await regionalResponse.json();
      const growthData = await growthResponse.json();
      
      // Process and combine data
      if (regionalData.regional_consistency) {
        const totalVolume = regionalData.regional_consistency.reduce(
          (sum: number, r: any) => sum + r.total_quantity, 0
        );
        
        // Create growth lookup map
        const growthMap = new Map();
        if (growthData.regional_growth) {
          growthData.regional_growth.forEach((g: any) => {
            growthMap.set(g.region, g.avg_yoy_growth || 0);
          });
        }
        
        const processedData = regionalData.regional_consistency.slice(0, 8).map((region: any) => {
          // Calculate normalized metrics (0-100 scale)
          const maxVolume = Math.max(...regionalData.regional_consistency.map((r: any) => r.total_quantity));
          const normalizedVolume = (region.total_quantity / maxVolume) * 100;
          
          // Efficiency: inverse of volatility (lower volatility = higher efficiency)
          const efficiency = Math.max(0, 100 - region.volatility_coefficient);
          
          // Stability: based on consistent monthly activity and low volatility
          const stability = Math.max(0, 100 - (region.volatility_coefficient * 0.7));
          
          // Diversity: product variety normalized
          const maxProducts = Math.max(...regionalData.regional_consistency.map((r: any) => r.avg_products));
          const diversity = (region.avg_products / maxProducts) * 100;
          
          // Growth from growth data
          const growth = Math.min(100, Math.max(0, (growthMap.get(region.region) || 0) + 50));
          
          // Market share
          const marketShare = (region.total_quantity / totalVolume) * 100;
          
          return {
            region: region.region,
            volume: normalizedVolume,
            efficiency: efficiency,
            stability: stability,
            diversity: diversity,
            growth: growth,
            marketShare: marketShare,
            rawVolume: region.total_quantity,
            volatility: region.volatility_coefficient,
            productCount: region.avg_products
          };
        });
        
        setMetricsData(processedData);
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [startDate, endDate, regions, products, volumeUnit]);

  const formatVolume = (value: number) => {
    if (volumeUnit === 'mt') {
      const mtValue = value / 1200;
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

  // Prepare radar chart data
  const radarData = metricsData.map(region => {
    const dataPoint: any = { region: region.region };
    selectedMetrics.forEach(metric => {
      dataPoint[metric] = region[metric as keyof RegionalMetrics];
    });
    return dataPoint;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = metricsData.find(m => m.region === label);
      if (!data) return null;
      
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
          <p className="text-sm font-bold text-white mb-3">{label}</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="text-xs text-gray-400">Volume:</span>
                <p className="text-xs font-medium text-blue-400">
                  {formatVolume(data.rawVolume)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Market Share:</span>
                <p className="text-xs font-medium text-teal-400">
                  {data.marketShare.toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Efficiency:</span>
                <p className="text-xs font-medium text-green-400">
                  {data.efficiency.toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Stability:</span>
                <p className="text-xs font-medium text-amber-400">
                  {data.stability.toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Product Mix:</span>
                <p className="text-xs font-medium text-violet-400">
                  {data.productCount.toFixed(1)} types
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Growth Score:</span>
                <p className="text-xs font-medium text-pink-400">
                  {data.growth.toFixed(1)}%
                </p>
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
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="efficiency" 
              name="Efficiency" 
              stroke="#9CA3AF"
              domain={[0, 100]}
              label={{ value: 'Efficiency (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="stability" 
              name="Stability" 
              stroke="#9CA3AF"
              domain={[0, 100]}
              label={{ value: 'Stability (%)', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis dataKey="volume" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Scatter 
              name="Regions" 
              data={metricsData} 
              fill="#3B82F6"
            >
              {metricsData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={METRIC_COLORS[selectedMetrics[0] as keyof typeof METRIC_COLORS] || '#3B82F6'} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        );
        
      case 'bar':
        return (
          <ComposedChart data={metricsData}>
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
              yAxisId="percentage"
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              domain={[0, 100]}
              label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="share"
              orientation="right"
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              domain={[0, 'dataMax']}
              label={{ value: 'Market Share (%)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            
            {selectedMetrics.includes('efficiency') && (
              <Bar yAxisId="percentage" dataKey="efficiency" fill={METRIC_COLORS.efficiency} name="Efficiency" />
            )}
            {selectedMetrics.includes('stability') && (
              <Bar yAxisId="percentage" dataKey="stability" fill={METRIC_COLORS.stability} name="Stability" />
            )}
            {selectedMetrics.includes('diversity') && (
              <Bar yAxisId="percentage" dataKey="diversity" fill={METRIC_COLORS.diversity} name="Diversity" />
            )}
            <Line 
              yAxisId="share" 
              type="monotone" 
              dataKey="marketShare" 
              stroke={METRIC_COLORS.marketShare}
              strokeWidth={2}
              dot={{ fill: METRIC_COLORS.marketShare, r: 4 }}
              name="Market Share"
            />
          </ComposedChart>
        );
        
      default: // radar
        return (
          <RadarChart data={radarData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="region" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis stroke="#9CA3AF" domain={[0, 100]} tick={{ fontSize: 9 }} />
            
            {selectedMetrics.includes('volume') && (
              <Radar 
                name="Volume" 
                dataKey="volume" 
                stroke={METRIC_COLORS.volume} 
                fill={METRIC_COLORS.volume} 
                fillOpacity={0.3} 
              />
            )}
            {selectedMetrics.includes('efficiency') && (
              <Radar 
                name="Efficiency" 
                dataKey="efficiency" 
                stroke={METRIC_COLORS.efficiency} 
                fill={METRIC_COLORS.efficiency} 
                fillOpacity={0.3} 
              />
            )}
            {selectedMetrics.includes('stability') && (
              <Radar 
                name="Stability" 
                dataKey="stability" 
                stroke={METRIC_COLORS.stability} 
                fill={METRIC_COLORS.stability} 
                fillOpacity={0.3} 
              />
            )}
            {selectedMetrics.includes('diversity') && (
              <Radar 
                name="Product Mix" 
                dataKey="diversity" 
                stroke={METRIC_COLORS.diversity} 
                fill={METRIC_COLORS.diversity} 
                fillOpacity={0.3} 
              />
            )}
            {selectedMetrics.includes('growth') && (
              <Radar 
                name="Growth" 
                dataKey="growth" 
                stroke={METRIC_COLORS.growth} 
                fill={METRIC_COLORS.growth} 
                fillOpacity={0.3} 
              />
            )}
            
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        );
    }
  };

  // Calculate top performer for each metric
  const getTopPerformer = (metric: keyof RegionalMetrics) => {
    if (metricsData.length === 0) return null;
    return metricsData.reduce((max, region) => 
      region[metric] > max[metric] ? region : max
    );
  };

  if (loading || chartLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
          <CardDescription>Multi-dimensional supply chain analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading performance metrics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
          <CardDescription>Multi-dimensional supply chain analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-center">
            <div className="text-red-400">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p>Error loading performance metrics</p>
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
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
            <CardDescription>Multi-dimensional supply chain analysis</CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View mode selector */}
            <div className="flex gap-1 bg-gray-800 rounded p-1">
              {(['radar', 'scatter', 'bar'] as const).map((mode) => (
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
                  {mode === 'radar' && <Target className="w-4 h-4" />}
                  {mode === 'scatter' && <Activity className="w-4 h-4" />}
                  {mode === 'bar' && <BarChart3 className="w-4 h-4" />}
                </button>
              ))}
            </div>
            
            {/* Metric selector */}
            <div className="flex gap-1">
              {(['volume', 'efficiency', 'stability', 'diversity', 'growth'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => {
                    if (selectedMetrics.includes(metric)) {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                    } else {
                      setSelectedMetrics([...selectedMetrics, metric]);
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedMetrics.includes(metric)
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                  style={{
                    borderLeft: selectedMetrics.includes(metric) 
                      ? `3px solid ${METRIC_COLORS[metric]}` 
                      : '3px solid transparent'
                  }}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Package className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-gray-400">Volume Leader</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {getTopPerformer('volume')?.region || 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-green-400" />
              <span className="text-xs text-gray-400">Most Efficient</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {getTopPerformer('efficiency')?.region || 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-gray-400">Most Stable</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {getTopPerformer('stability')?.region || 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Users className="w-3 h-3 text-violet-400" />
              <span className="text-xs text-gray-400">Most Diverse</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {getTopPerformer('diversity')?.region || 'N/A'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-pink-400" />
              <span className="text-xs text-gray-400">Growth Leader</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {getTopPerformer('growth')?.region || 'N/A'}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-80">
          {metricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Performance Data Available</p>
                <p className="text-sm">Try adjusting your date range or filters</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        {metricsData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs font-semibold text-white mb-2">Performance Insights</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-800/30 rounded p-2">
                <p className="text-gray-400 mb-1">Average Efficiency</p>
                <p className="text-sm font-bold text-green-400">
                  {(metricsData.reduce((sum, r) => sum + r.efficiency, 0) / metricsData.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-800/30 rounded p-2">
                <p className="text-gray-400 mb-1">Average Stability</p>
                <p className="text-sm font-bold text-amber-400">
                  {(metricsData.reduce((sum, r) => sum + r.stability, 0) / metricsData.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-800/30 rounded p-2">
                <p className="text-gray-400 mb-1">Regions Analyzed</p>
                <p className="text-sm font-bold text-blue-400">
                  {metricsData.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}