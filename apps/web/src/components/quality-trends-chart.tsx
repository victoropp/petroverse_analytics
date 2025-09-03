'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { QualityScoreBadge } from './quality-score-badge';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface QualityTrendsProps {
  data?: any[];
  loading?: boolean;
  startDate?: string;
  endDate?: string;
}

export function QualityTrendsChart({ 
  data = [], 
  loading = false,
  startDate,
  endDate 
}: QualityTrendsProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    current: 0,
    previous: 0,
    average: 0,
    min: 0,
    max: 0,
    trend: 'stable' as 'up' | 'down' | 'stable'
  });

  useEffect(() => {
    // Fetch quality trends data
    const fetchQualityTrends = async () => {
      if (!startDate || !endDate) return;
      
      try {
        const response = await fetch(
          `http://localhost:8003/api/v2/supply/quality-trends?start_date=${startDate}&end_date=${endDate}`
        );
        
        if (response.ok) {
          const trendsData = await response.json();
          processQualityData(trendsData);
        }
      } catch (error) {
        console.error('Failed to fetch quality trends:', error);
        // Use provided data as fallback
        if (data.length > 0) {
          processQualityData(data);
        }
      }
    };

    fetchQualityTrends();
  }, [startDate, endDate, data]);

  const processQualityData = (rawData: any) => {
    // Process monthly quality scores
    let processedData = [];
    
    if (rawData.monthly_quality) {
      processedData = rawData.monthly_quality.map((item: any) => ({
        period: item.period || `${item.year}-${String(item.month).padStart(2, '0')}`,
        avgQuality: item.avg_quality_score || 0,
        minQuality: item.min_quality_score || 0,
        maxQuality: item.max_quality_score || 0,
        recordCount: item.record_count || 0,
        excellentCount: item.high_quality_count || 0,
        goodCount: item.medium_quality_count || 0,
        fairCount: item.low_quality_count || 0
      }));
    } else if (Array.isArray(rawData)) {
      // Fallback for simple array data
      processedData = rawData.map((item: any) => ({
        period: item.period || item.month || 'Unknown',
        avgQuality: item.avg_quality || item.quality_score || 0.95,
        minQuality: item.min_quality || 0.75,
        maxQuality: item.max_quality || 1.0,
        recordCount: item.count || 100
      }));
    }

    setChartData(processedData);

    // Calculate statistics
    if (processedData.length > 0) {
      const current = processedData[processedData.length - 1].avgQuality;
      const previous = processedData.length > 1 ? processedData[processedData.length - 2].avgQuality : current;
      const allValues = processedData.map((d: any) => d.avgQuality);
      const average = allValues.reduce((a: number, b: number) => a + b, 0) / allValues.length;
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      
      setStatistics({
        current,
        previous,
        average,
        min,
        max,
        trend: current > previous ? 'up' : current < previous ? 'down' : 'stable'
      });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">Average:</span>
              <QualityScoreBadge score={data.avgQuality} size="sm" showTooltip={false} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-400">Range:</span>
              <span className="text-xs text-gray-300">
                {(data.minQuality * 100).toFixed(1)}% - {(data.maxQuality * 100).toFixed(1)}%
              </span>
            </div>
            {data.recordCount && (
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-400">Records:</span>
                <span className="text-xs text-gray-300">{data.recordCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Quality Score Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading quality trends...</div>
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
            <CardTitle className="text-lg">Data Reliability Trends</CardTitle>
            <CardDescription>How complete and accurate our supply data is over time</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Current</p>
              <QualityScoreBadge 
                score={statistics.current} 
                showTrend={true} 
                previousScore={statistics.previous}
                size="md"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {statistics.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : statistics.trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-xs text-gray-400">Trend</span>
            </div>
            <p className={`text-sm font-semibold ${
              statistics.trend === 'up' ? 'text-green-400' : 
              statistics.trend === 'down' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {statistics.trend === 'up' ? 'Improving' : 
               statistics.trend === 'down' ? 'Declining' : 'Stable'}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Average</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {(statistics.average * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Min Score</p>
            <p className="text-sm font-semibold text-orange-400">
              {(statistics.min * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Max Score</p>
            <p className="text-sm font-semibold text-green-400">
              {(statistics.max * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="period" 
                  stroke="#9CA3AF"
                  style={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  domain={[0.7, 1]}
                  ticks={[0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  style={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference lines for quality thresholds */}
                <ReferenceLine y={0.95} stroke="#10B981" strokeDasharray="5 5" label="Highly Reliable" />
                <ReferenceLine y={0.85} stroke="#EAB308" strokeDasharray="5 5" label="Reliable" />
                <ReferenceLine y={0.75} stroke="#F97316" strokeDasharray="5 5" label="Some Gaps" />
                
                {/* Quality range area */}
                <Area
                  type="monotone"
                  dataKey="maxQuality"
                  stackId="1"
                  stroke="transparent"
                  fill="url(#rangeGradient)"
                  name="Max"
                />
                
                {/* Average quality line */}
                <Line
                  type="monotone"
                  dataKey="avgQuality"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Average Reliability"
                />
                
                {/* Min quality line */}
                <Line
                  type="monotone"
                  dataKey="minQuality"
                  stroke="#F97316"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Min Reliability"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No data reliability trends available</p>
              </div>
            </div>
          )}
        </div>

        {/* Quality Distribution Bar */}
        {chartData.length > 0 && chartData[chartData.length - 1].excellentCount !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Current Period Reliability Distribution</p>
            <div className="flex gap-1 h-6">
              {chartData[chartData.length - 1].excellentCount > 0 && (
                <div 
                  className="bg-green-500 rounded-l"
                  style={{ 
                    width: `${(chartData[chartData.length - 1].excellentCount / chartData[chartData.length - 1].recordCount) * 100}%` 
                  }}
                  title={`Highly Reliable: ${chartData[chartData.length - 1].excellentCount}`}
                />
              )}
              {chartData[chartData.length - 1].goodCount > 0 && (
                <div 
                  className="bg-yellow-500"
                  style={{ 
                    width: `${(chartData[chartData.length - 1].goodCount / chartData[chartData.length - 1].recordCount) * 100}%` 
                  }}
                  title={`Reliable: ${chartData[chartData.length - 1].goodCount}`}
                />
              )}
              {chartData[chartData.length - 1].fairCount > 0 && (
                <div 
                  className="bg-orange-500 rounded-r"
                  style={{ 
                    width: `${(chartData[chartData.length - 1].fairCount / chartData[chartData.length - 1].recordCount) * 100}%` 
                  }}
                  title={`Some Gaps: ${chartData[chartData.length - 1].fairCount}`}
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}