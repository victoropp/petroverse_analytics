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

interface Company {
  company_name: string;
  total_volume_liters: number;
  total_volume_mt: number;
  total_volume_kg: number;
  transaction_count: number;
  market_share_percent: number;
}

interface Product {
  product_name: string;
  product_category: string;
  total_volume_liters: number;
  total_volume_mt: number;
  total_volume_kg: number;
  transaction_count: number;
}

interface TrendData {
  period: string;
  volume_liters: number;
  volume_mt: number;
  volume_kg: number;
  transactions: number;
}

interface OMCResponse {
  top_companies: Company[];
  product_mix: Product[];
  monthly_trend: TrendData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

function formatNumber(num: number): string {
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

function formatVolume(volume: number): string {
  return formatNumber(volume) + ' L';
}

function formatMT(volume: number): string {
  return formatNumber(volume) + ' MT';
}

export default function OMCDashboard() {
  const [data, setData] = useState<OMCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters integration
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedCompanies, 
    selectedProducts, 
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
        const endpoint = `http://localhost:8003/api/v2/omc/performance?${params.toString()}`;
        
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
          console.error('Error fetching OMC data:', err);
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
  }, [startDate, endDate, selectedCompanies, selectedProducts, topN, volumeUnit, getFilterParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading OMC Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading OMC Dashboard</div>
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
          <p className="text-gray-400">No OMC data available</p>
        </div>
      </div>
    );
  }

  const { top_companies, product_mix, monthly_trend } = data;

  // Calculate totals for KPIs
  const totalVolume = top_companies.reduce((sum, company) => sum + company.total_volume_liters, 0);
  const totalTransactions = top_companies.reduce((sum, company) => sum + company.transaction_count, 0);
  const totalMT = top_companies.reduce((sum, company) => sum + company.total_volume_mt, 0);

  // Get recent trend
  const recentTrend = monthly_trend.slice(-3);
  const avgMonthlyVolume = recentTrend.length > 0 ? 
    recentTrend.reduce((sum, month) => sum + month.volume_liters, 0) / recentTrend.length : 0;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">OMC Performance Dashboard</h1>
          <p className="text-gray-400">Oil Marketing Company analytics from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters restrictToCompanyType="OMC" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total OMC Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(totalVolume)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {formatMT(totalMT)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Active OMCs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {top_companies.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Top performers shown
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(totalTransactions)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Across all OMCs
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Avg Monthly Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(avgMonthlyVolume)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Last 3 months
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Companies Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top OMC Companies by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={top_companies.slice(0, 8)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" tickFormatter={formatNumber} />
                  <YAxis 
                    type="category" 
                    dataKey="company_name" 
                    stroke="#9CA3AF"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [formatVolume(value), 'Volume']}
                  />
                  <Bar dataKey="total_volume_liters" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Mix Pie Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">OMC Product Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={product_mix}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.product_name}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="total_volume_liters"
                  >
                    {product_mix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatVolume(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">OMC Volume Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthly_trend.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'volume_liters') return [formatVolume(value), 'Volume'];
                    if (name === 'volume_mt') return [formatMT(value), 'Volume (MT)'];
                    if (name === 'transactions') return [formatNumber(value), 'Transactions'];
                    return [value, name];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume_liters" 
                  stroke="#00C49F" 
                  strokeWidth={3}
                  name="volume_liters"
                />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="#FFBB28" 
                  strokeWidth={2}
                  name="transactions"
                  yAxisId="transactions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Share Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top OMCs by Market Share */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Market Share Leaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {top_companies.slice(0, 5).map((company, index) => (
                  <div key={company.company_name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-white text-sm font-medium">
                        {company.company_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{company.market_share_percent}%</div>
                      <div className="text-xs text-gray-400">{formatVolume(company.total_volume_liters)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Leader:</span>
                  <span className="text-white font-bold">
                    {top_companies[0]?.company_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Top Market Share:</span>
                  <span className="text-green-400 font-bold">
                    {top_companies[0]?.market_share_percent || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Product Categories:</span>
                  <span className="text-white font-bold">{product_mix.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Transactions/OMC:</span>
                  <span className="text-white font-bold">
                    {formatNumber(totalTransactions / Math.max(top_companies.length, 1))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Companies Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">OMC Company Performance Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">#</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Company</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (L)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (MT)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Transactions</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Market Share</th>
                  </tr>
                </thead>
                <tbody>
                  {top_companies.map((company, index) => (
                    <tr key={company.company_name} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-gray-300">{index + 1}</td>
                      <td className="p-3 text-white font-medium">{company.company_name}</td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(company.total_volume_liters)}</td>
                      <td className="p-3 text-gray-300 text-right">{formatMT(company.total_volume_mt)}</td>
                      <td className="p-3 text-gray-300 text-right">{formatNumber(company.transaction_count)}</td>
                      <td className="p-3 text-green-400 text-right font-medium">{company.market_share_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>OMC data from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>Showing top {top_companies.length} OMCs • {product_mix.length} product categories</p>
        </div>
      </div>
    </div>
  );
}