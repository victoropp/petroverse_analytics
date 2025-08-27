'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface KPIData {
  total_companies: number;
  total_products: number;
  total_volume_liters: number;
  total_volume_mt?: number;
  total_volume_kg?: number;
  total_transactions: number;
  bdc_volume_liters?: number;
  omc_volume_liters?: number;
  bdc_volume_mt?: number;
  omc_volume_mt?: number;
  bdc_volume_kg?: number;
  omc_volume_kg?: number;
  bdc_companies?: number;
  omc_companies?: number;
  // Industry analytics metrics
  bdc_market_share?: number;
  bdc_to_omc_ratio?: number;
  avg_bdc_company_volume?: number;
  avg_omc_company_volume?: number;
}

interface TrendData {
  period: string;
  bdc_volume_liters: number;
  omc_volume_liters: number;
  bdc_volume_mt: number;
  omc_volume_mt: number;
  bdc_volume_kg: number;
  omc_volume_kg: number;
  total_volume_liters: number;
  total_volume_mt: number;
  total_volume_kg: number;
}

interface APIResponse {
  kpis: KPIData;
  trend_data: TrendData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatVolume(volume: number | undefined | null): string {
  return formatNumber(volume) + ' L';
}

function formatMT(volume: number | undefined | null): string {
  return formatNumber(volume) + ' MT';
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters integration
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedCompanies, 
    selectedBusinessTypes, 
    selectedProducts, 
    selectedProductCategories, 
    topN,
    volumeUnit 
  } = useGlobalFilters();

  useEffect(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = getFilterParams();
        const hasFilters = params.toString().length > 0;
        
        const endpoint = hasFilters 
          ? `http://localhost:8003/api/v2/executive/summary/filtered?${params.toString()}`
          : 'http://localhost:8003/api/v2/executive/summary';
        
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Only update if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching executive data:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    // Add small debounce to prevent rapid filter changes
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [startDate, endDate, selectedCompanies, selectedBusinessTypes, selectedProducts, selectedProductCategories, topN, volumeUnit, getFilterParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Dashboard</div>
          <p className="text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const { kpis, trend_data = [], industry_trends = [] } = data;
  
  // Use industry_trends if trend_data is not available (filtered endpoints return industry_trends)
  const trendData = trend_data.length > 0 ? trend_data : 
    industry_trends.map(item => ({
      period: item.period,
      bdc_volume_liters: item.bdc_volume_liters || 0,
      omc_volume_liters: item.omc_volume_liters || 0,
      bdc_volume_mt: item.bdc_volume_mt || 0,
      omc_volume_mt: item.omc_volume_mt || 0,
      bdc_volume_kg: 0,
      omc_volume_kg: 0,
      total_volume_liters: item.total_volume || ((item.bdc_volume_liters || 0) + (item.omc_volume_liters || 0)),
      total_volume_mt: (item.bdc_volume_mt || 0) + (item.omc_volume_mt || 0),
      total_volume_kg: 0
    }));

  // Calculate growth rates (simple last vs first in trend data)
  const bdcGrowth = trendData.length > 1 ? 
    ((trendData[trendData.length - 1].bdc_volume_liters - trendData[0].bdc_volume_liters) / trendData[0].bdc_volume_liters * 100) : 0;
  
  const omcGrowth = trendData.length > 1 ? 
    ((trendData[trendData.length - 1].omc_volume_liters - trendData[0].omc_volume_liters) / trendData[0].omc_volume_liters * 100) : 0;

  // Prepare chart data - handle both filtered and unfiltered responses
  const volumeComparisonData = [
    { name: 'BDC Volume', 
      value: volumeUnit === 'liters' ? (kpis.bdc_volume_liters || 0) : (kpis.bdc_volume_mt || 0), 
      color: '#0088FE' },
    { name: 'OMC Volume', 
      value: volumeUnit === 'liters' ? (kpis.omc_volume_liters || 0) : (kpis.omc_volume_mt || 0), 
      color: '#00C49F' }
  ];

  const companyCountData = [
    { name: 'BDC Companies', value: kpis.bdc_companies || 0, color: '#0088FE' },
    { name: 'OMC Companies', value: kpis.omc_companies || 0, color: '#00C49F' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Executive Dashboard</h1>
          <p className="text-gray-400">Real-time petroleum industry analytics</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {volumeUnit === 'liters' 
                  ? formatVolume(kpis.total_volume_liters)
                  : formatMT(kpis.total_volume_mt || 0)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {volumeUnit === 'liters' 
                  ? formatMT(kpis.total_volume_mt || 0)
                  : formatVolume(kpis.total_volume_liters)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpis.total_companies}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {kpis.bdc_companies || 0} BDC + {kpis.omc_companies || 0} OMC
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(kpis.total_transactions)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Across {kpis.total_products} products
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">BDC vs OMC Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(((kpis.bdc_volume_liters || 0) / kpis.total_volume_liters) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                BDC Market Share
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Industry Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpis.bdc_market_share ? kpis.bdc_market_share.toFixed(1) : 'N/A'}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                BDC Market Share
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Volume Trend Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Industry Volume Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [volumeUnit === 'liters' ? formatVolume(value) : formatMT(value), 'Volume']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={volumeUnit === 'liters' ? "bdc_volume_liters" : "bdc_volume_mt"} 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    name="BDC Volume"
                  />
                  <Line 
                    type="monotone" 
                    dataKey={volumeUnit === 'liters' ? "omc_volume_liters" : "omc_volume_mt"} 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="OMC Volume"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Volume Comparison Pie Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">BDC vs OMC Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={volumeComparisonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatVolume(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {volumeComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => volumeUnit === 'liters' ? formatVolume(value) : formatMT(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Industry Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">BDC Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">BDC Volume:</span>
                  <span className="text-white font-bold">
                    {volumeUnit === 'liters' 
                      ? formatVolume(kpis.bdc_volume_liters || 0)
                      : formatMT(kpis.bdc_volume_mt || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BDC Companies:</span>
                  <span className="text-white font-bold">{kpis.bdc_companies || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Growth Trend:</span>
                  <span className={`font-bold ${bdcGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bdcGrowth >= 0 ? '+' : ''}{bdcGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alt. Unit:</span>
                  <span className="text-white font-bold">
                    {volumeUnit === 'mt' 
                      ? formatVolume(kpis.bdc_volume_liters || 0)
                      : formatMT(kpis.bdc_volume_mt || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">OMC Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">OMC Volume:</span>
                  <span className="text-white font-bold">
                    {volumeUnit === 'liters' 
                      ? formatVolume(kpis.omc_volume_liters || 0)
                      : formatMT(kpis.omc_volume_mt || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">OMC Companies:</span>
                  <span className="text-white font-bold">{kpis.omc_companies || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Growth Trend:</span>
                  <span className={`font-bold ${omcGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {omcGrowth >= 0 ? '+' : ''}{omcGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alt. Unit:</span>
                  <span className="text-white font-bold">
                    {volumeUnit === 'mt' 
                      ? formatVolume(kpis.omc_volume_liters || 0)
                      : formatMT(kpis.omc_volume_mt || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Count Bar Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Industry Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companyCountData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p suppressHydrationWarning>Data sourced from standardized fact tables • Last updated: {typeof window !== 'undefined' ? new Date().toLocaleString() : 'Loading...'}</p>
          <p>Industry Analytics: {formatNumber(kpis.total_transactions)} transactions • BDC & OMC Operations • {kpis.total_products} product categories</p>
          {kpis.bdc_market_share && (
            <p>BDC market share: {kpis.bdc_market_share.toFixed(1)}% • Industry distribution tracking</p>
          )}
        </div>
      </div>
    </div>
  );
}