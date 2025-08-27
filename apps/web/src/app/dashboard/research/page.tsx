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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart
} from 'recharts';

interface MarketTrend {
  period: string;
  total_volume: number;
  bdc_volume: number;
  omc_volume: number;
  growth_rate: number;
  yoy_change: number;
}

interface ProductDistribution {
  product_name: string;
  product_category: string;
  volume: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface SeasonalPattern {
  month: number;
  month_name: string;
  avg_volume: number;
  seasonal_index: number;
  volatility: number;
}

interface MarketSummary {
  total_companies: number;
  total_products: number;
  total_volume: number;
  total_transactions: number;
  avg_transaction_size: number;
  market_concentration: number;
  growth_trend: string;
}

interface ResearchDashboardResponse {
  market_trends: MarketTrend[];
  product_distribution: ProductDistribution[];
  seasonal_patterns: SeasonalPattern[];
  market_summary: MarketSummary;
  correlations: {
    variable1: string;
    variable2: string;
    correlation: number;
    significance: string;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

function formatVolume(volume: number, unit: string = 'L'): string {
  return formatNumber(volume) + ' ' + unit;
}

export default function ResearchDashboard() {
  const [data, setData] = useState<ResearchDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'trends' | 'seasonal' | 'correlation'>('trends');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedCompanies, 
    selectedBusinessTypes, 
    selectedProducts, 
    topN,
    volumeUnit 
  } = useGlobalFilters();

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = getFilterParams();
        
        // Fetch multiple endpoints for research dashboard
        const [trendsResponse, correlationResponse, seasonalResponse] = await Promise.all([
          fetch(`http://localhost:8003/api/v2/analytics/market-dynamics?${params.toString()}`, {
            signal: abortController.signal
          }),
          fetch(`http://localhost:8003/api/v2/analytics/correlation-analysis?${params.toString()}`, {
            signal: abortController.signal
          }),
          fetch(`http://localhost:8003/api/v2/analytics/seasonal-patterns?${params.toString()}`, {
            signal: abortController.signal
          })
        ]);
        
        if (!trendsResponse.ok || !correlationResponse.ok || !seasonalResponse.ok) {
          throw new Error('HTTP error!');
        }
        
        const [trendsData, correlationData, seasonalData] = await Promise.all([
          trendsResponse.json(),
          correlationResponse.json(),
          seasonalResponse.json()
        ]);
        
        if (!abortController.signal.aborted) {
          // Transform API responses to match our interface
          const transformedData: ResearchDashboardResponse = {
            market_trends: trendsData.monthly_trends?.map((t: any) => ({
              period: t.period,
              total_volume: t.total_volume || 0,
              bdc_volume: t.bdc_volume || 0,
              omc_volume: t.omc_volume || 0,
              growth_rate: t.growth_rate || 0,
              yoy_change: t.yoy_change || 0
            })) || [],
            product_distribution: trendsData.product_trends?.map((p: any) => ({
              product_name: p.product,
              product_category: p.category || 'Other',
              volume: p.current_volume || 0,
              percentage: p.market_share || 0,
              trend: p.growth_rate > 5 ? 'up' : p.growth_rate < -5 ? 'down' : 'stable'
            })) || [],
            seasonal_patterns: seasonalData.seasonal_indices?.map((s: any, idx: number) => ({
              month: idx + 1,
              month_name: MONTH_NAMES[idx],
              avg_volume: s.avg_volume || 0,
              seasonal_index: s.seasonal_index || 100,
              volatility: s.volatility || 0
            })) || [],
            market_summary: {
              total_companies: trendsData.summary?.total_companies || 0,
              total_products: trendsData.summary?.total_products || 0,
              total_volume: trendsData.summary?.total_volume || 0,
              total_transactions: trendsData.summary?.total_transactions || 0,
              avg_transaction_size: trendsData.summary?.avg_transaction_size || 0,
              market_concentration: trendsData.summary?.herfindahl_index || 0,
              growth_trend: trendsData.summary?.growth_trend || 'stable'
            },
            correlations: correlationData.correlations || []
          };
          
          setData(transformedData);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching research data:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [startDate, endDate, selectedCompanies, selectedBusinessTypes, selectedProducts, topN, volumeUnit, getFilterParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Research Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Research Data</div>
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
          <p className="text-gray-400">No research data available</p>
        </div>
      </div>
    );
  }

  const { market_trends, product_distribution, seasonal_patterns, market_summary, correlations } = data;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Public Research Dashboard</h1>
          <p className="text-gray-400">Market research and statistical analysis from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* Market Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(market_summary.total_volume, 'L')}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {market_summary.total_companies}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {market_summary.total_products}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(market_summary.total_transactions)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">HHI Index</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {market_summary.market_concentration.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Growth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                market_summary.growth_trend === 'growing' ? 'text-green-400' :
                market_summary.growth_trend === 'declining' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {market_summary.growth_trend === 'growing' ? '↑' :
                 market_summary.growth_trend === 'declining' ? '↓' : '→'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis View Selector */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Market Analysis</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedView('trends')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'trends' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Trends
                  </button>
                  <button
                    onClick={() => setSelectedView('seasonal')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'seasonal' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Seasonal
                  </button>
                  <button
                    onClick={() => setSelectedView('correlation')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'correlation' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Correlation
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {selectedView === 'trends' ? (
                  <ComposedChart data={market_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="period" stroke="#9CA3AF" />
                    <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'growth_rate' || name === 'yoy_change') return [value.toFixed(1) + '%', name];
                        return [formatVolume(value, 'L'), name];
                      }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="total_volume" stroke="#8884D8" fill="#8884D8" fillOpacity={0.3} name="Total Volume" />
                    <Line yAxisId="right" type="monotone" dataKey="growth_rate" stroke="#FF8042" name="Growth Rate %" />
                  </ComposedChart>
                ) : selectedView === 'seasonal' ? (
                  <ComposedChart data={seasonal_patterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month_name" stroke="#9CA3AF" />
                    <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'seasonal_index') return [value.toFixed(1), 'Index'];
                        if (name === 'volatility') return [value.toFixed(1) + '%', 'Volatility'];
                        return [formatVolume(value, 'L'), name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avg_volume" fill="#0088FE" name="Avg Volume" />
                    <Line yAxisId="right" type="monotone" dataKey="seasonal_index" stroke="#00C49F" name="Seasonal Index" />
                    <Line yAxisId="right" type="monotone" dataKey="volatility" stroke="#FF8042" name="Volatility %" strokeDasharray="5 5" />
                  </ComposedChart>
                ) : (
                  <BarChart data={correlations.slice(0, 10)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" domain={[-1, 1]} stroke="#9CA3AF" />
                    <YAxis 
                      type="category" 
                      dataKey="variable1" 
                      stroke="#9CA3AF"
                      width={150}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number) => value.toFixed(3)}
                    />
                    <Bar 
                      dataKey="correlation" 
                      fill={(entry: any) => entry.correlation > 0 ? '#0088FE' : '#FF8042'}
                      name="Correlation Coefficient"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Distribution Pie Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Product Mix Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={product_distribution.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.product_name}: ${entry.percentage.toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="volume"
                  >
                    {product_distribution.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatVolume(value, 'L')} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* BDC vs OMC Volume Trends */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">BDC vs OMC Volume Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={market_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => formatVolume(value, 'L')}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="bdc_volume" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="BDC Volume" />
                  <Area type="monotone" dataKey="omc_volume" stackId="1" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} name="OMC Volume" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Statistical Analysis Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Statistical Correlations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">Variable 1</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Variable 2</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Correlation</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Significance</th>
                    <th className="text-center p-3 text-gray-400 font-medium">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {correlations.slice(0, 15).map((corr, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-white">{corr.variable1}</td>
                      <td className="p-3 text-white">{corr.variable2}</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${
                          Math.abs(corr.correlation) > 0.7 ? 'text-green-400' :
                          Math.abs(corr.correlation) > 0.4 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {corr.correlation.toFixed(3)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-300">{corr.significance}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          Math.abs(corr.correlation) > 0.7
                            ? 'bg-green-900 text-green-300'
                            : Math.abs(corr.correlation) > 0.4
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {Math.abs(corr.correlation) > 0.7 ? 'Strong' :
                           Math.abs(corr.correlation) > 0.4 ? 'Moderate' : 'Weak'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Research data from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>{market_summary.total_companies} companies • {market_summary.total_products} products • {formatNumber(market_summary.total_transactions)} transactions analyzed</p>
        </div>
      </div>
    </div>
  );
}