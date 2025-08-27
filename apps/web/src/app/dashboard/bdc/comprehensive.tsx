'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ComposedChart, Legend
} from 'recharts';

// Professional color palette for financial dashboards
const COLORS = {
  primary: '#0088FE',
  secondary: '#00C49F',
  tertiary: '#FFBB28',
  danger: '#FF8042',
  success: '#82CA9D',
  warning: '#FFC658',
  info: '#8884D8',
  neutral: '#94A3B8'
};

const CHART_COLORS = [
  COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.danger,
  COLORS.success, COLORS.warning, COLORS.info, COLORS.neutral
];

interface ComprehensiveAnalytics {
  market_concentration: {
    hhi_index: number;
    market_structure: string;
    active_companies: number;
    leader_market_share: number;
    top_tier_combined_share: number;
    significant_players: number;
    avg_product_diversity: number;
    market_share_dispersion: number;
  };
  product_portfolio: Array<{
    product_name: string;
    category: string;
    volume_liters: number;
    volume_mt: number;
    avg_transaction_size: number;
    volatility_cv: number;
    companies_handling: number;
    transactions: number;
    portfolio_share: number;
  }>;
  growth_trends: Array<{
    year: number;
    quarter: number;
    month: number;
    volume_liters: number;
    volume_mt: number;
    active_companies: number;
    active_products: number;
    transactions: number;
    avg_size: number;
    mom_growth: number;
    qoq_growth: number;
    yoy_growth: number;
  }>;
  company_rankings: Array<{
    rank: number;
    company_name: string;
    volume_liters: number;
    volume_mt: number;
    market_share: number;
    transactions: number;
    products_handled: number;
    efficiency_ratio: number;
    daily_transaction_rate: number;
    active_days: number;
  }>;
  seasonality: {
    peak_month: number;
    trough_month: number;
    seasonal_amplitude: number;
    avg_monthly_volatility: number;
  };
  market_dynamics: {
    avg_hhi: number;
    hhi_volatility: number;
    min_hhi: number;
    max_hhi: number;
    market_structure: string;
  };
  efficiency_metrics: {
    avg_transaction_volume: number;
    median_transaction_volume: number;
    transaction_cv: number;
    daily_transaction_rate: number;
    operating_days: number;
  };
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

function formatPercent(num: number): string {
  return num.toFixed(1) + '%';
}

function formatVolume(volume: number, unit: string): string {
  if (unit === 'mt') {
    return formatNumber(volume) + ' MT';
  }
  return formatNumber(volume) + ' L';
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ComprehensiveBDCDashboard() {
  const [data, setData] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { 
    getFilterParams, 
    startDate, endDate, 
    selectedCompanies, selectedProducts, 
    topN, volumeUnit 
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
        const endpoint = `http://localhost:8003/api/v2/bdc/comprehensive?${params.toString()}`;
        
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (!abortController.signal.aborted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching comprehensive BDC data:', err);
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
  }, [startDate, endDate, selectedCompanies, selectedProducts, topN, volumeUnit, getFilterParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Comprehensive BDC Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Analytics</div>
          <p className="text-gray-400">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  // Prepare data for visualizations
  const marketStructureGauge = {
    value: data.market_concentration.hhi_index,
    max: 10000,
    zones: [
      { value: 1000, color: COLORS.success, label: 'Competitive' },
      { value: 1800, color: COLORS.warning, label: 'Moderate' },
      { value: 10000, color: COLORS.danger, label: 'Concentrated' }
    ]
  };

  const growthTrendData = data.growth_trends.map(item => ({
    period: `${item.year}-${String(item.month).padStart(2, '0')}`,
    volume: volumeUnit === 'mt' ? item.volume_mt : item.volume_liters,
    yoy_growth: item.yoy_growth,
    qoq_growth: item.qoq_growth,
    companies: item.active_companies
  }));

  const productRiskMatrix = data.product_portfolio.map(product => ({
    name: product.product_name,
    x: product.volatility_cv, // Risk (CV)
    y: product.portfolio_share, // Return (Market Share)
    z: product.volume_liters, // Size (Volume)
  }));

  const companyEfficiencyData = data.company_rankings.map(company => ({
    name: company.company_name,
    efficiency: company.efficiency_ratio,
    market_share: company.market_share,
    daily_rate: company.daily_transaction_rate
  }));

  const seasonalPattern = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = data.growth_trends.filter(t => t.month === month);
    const avgVolume = monthData.reduce((sum, t) => sum + t.volume_liters, 0) / Math.max(monthData.length, 1);
    return {
      month: monthNames[i],
      volume: avgVolume,
      isPeak: month === data.seasonality.peak_month,
      isTrough: month === data.seasonality.trough_month
    };
  });

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">BDC Comprehensive Analytics</h1>
          <p className="text-gray-400">Deep financial and operational insights from database analytics</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* Executive Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-400">Market Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{data.market_concentration.market_structure}</div>
              <div className="text-xs text-gray-500">HHI: {formatNumber(data.market_concentration.hhi_index)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-400">Active Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{data.market_concentration.active_companies}</div>
              <div className="text-xs text-gray-500">{data.market_concentration.significant_players} significant</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-400">Market Leader Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{formatPercent(data.market_concentration.leader_market_share)}</div>
              <div className="text-xs text-gray-500">Top tier: {formatPercent(data.market_concentration.top_tier_combined_share)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-400">Avg Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">
                {volumeUnit === 'mt' 
                  ? formatNumber(data.efficiency_metrics.avg_transaction_volume / 1000) + ' MT'
                  : formatNumber(data.efficiency_metrics.avg_transaction_volume) + ' L'}
              </div>
              <div className="text-xs text-gray-500">CV: {formatPercent(data.efficiency_metrics.transaction_cv)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-400">Daily Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{formatNumber(data.efficiency_metrics.daily_transaction_rate)}</div>
              <div className="text-xs text-gray-500">{data.efficiency_metrics.operating_days} days</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Market Concentration Trend */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Volume Growth & Momentum</CardTitle>
              <p className="text-xs text-gray-400">YoY and QoQ growth with volume trends</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={growthTrendData.slice(-12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" stroke="#9CA3AF" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="volume" fill={COLORS.primary} name="Volume" />
                  <Line yAxisId="right" type="monotone" dataKey="yoy_growth" stroke={COLORS.success} name="YoY %" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="qoq_growth" stroke={COLORS.warning} name="QoQ %" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Risk-Return Matrix */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Product Risk-Return Matrix</CardTitle>
              <p className="text-xs text-gray-400">Volatility (CV%) vs Portfolio Share</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="x" 
                    stroke="#9CA3AF" 
                    label={{ value: 'Risk (CV%)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="y" 
                    stroke="#9CA3AF" 
                    label={{ value: 'Portfolio Share %', angle: -90, position: 'insideLeft' }}
                  />
                  <ZAxis dataKey="z" range={[50, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 p-2 border border-gray-600 rounded">
                            <p className="text-white font-semibold">{data.name}</p>
                            <p className="text-gray-400 text-xs">Risk (CV): {data.x.toFixed(1)}%</p>
                            <p className="text-gray-400 text-xs">Share: {data.y.toFixed(1)}%</p>
                            <p className="text-gray-400 text-xs">Volume: {formatNumber(data.z)} L</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Products" data={productRiskMatrix} fill={COLORS.info}>
                    {productRiskMatrix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Company Market Share Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Market Share Distribution</CardTitle>
              <p className="text-xs text-gray-400">Top {data.company_rankings.length} companies by volume</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.company_rankings.slice(0, 8)}
                    dataKey="market_share"
                    nameKey="company_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.company_name}: ${entry.market_share.toFixed(1)}%`}
                  >
                    {data.company_rankings.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Efficiency Rankings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Company Efficiency Analysis</CardTitle>
              <p className="text-xs text-gray-400">Volume per transaction (efficiency ratio)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyEfficiencyData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Bar dataKey="efficiency" fill={COLORS.secondary} name="Efficiency Ratio" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Pattern Analysis */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Seasonal Pattern Analysis</CardTitle>
              <p className="text-xs text-gray-400">
                Peak: {monthNames[(data.seasonality.peak_month || 1) - 1]} | 
                Trough: {monthNames[(data.seasonality.trough_month || 1) - 1]} | 
                Amplitude: {formatPercent(data.seasonality.seasonal_amplitude)}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={seasonalPattern}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary} 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Portfolio Composition */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Product Portfolio Analysis</CardTitle>
              <p className="text-xs text-gray-400">Volume distribution by product category</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.product_portfolio}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="product_name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    formatter={(value: number, name) => [
                      volumeUnit === 'mt' ? formatNumber(value / 1000) + ' MT' : formatNumber(value) + ' L',
                      name
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey={volumeUnit === 'mt' ? 'volume_mt' : 'volume_liters'} 
                    fill={COLORS.tertiary} 
                    name="Volume"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Market Dynamics Summary */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Market Dynamics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Market Structure</p>
                <p className="text-white font-semibold">{data.market_dynamics.market_structure}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg HHI</p>
                <p className="text-white font-semibold">{formatNumber(data.market_dynamics.avg_hhi)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">HHI Volatility</p>
                <p className="text-white font-semibold">{formatNumber(data.market_dynamics.hhi_volatility)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">HHI Range</p>
                <p className="text-white font-semibold">
                  {formatNumber(data.market_dynamics.min_hhi)} - {formatNumber(data.market_dynamics.max_hhi)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p suppressHydrationWarning>
            Data sourced from PostgreSQL fact tables • 100% objective database metrics • 
            Last updated: {typeof window !== 'undefined' ? new Date().toLocaleString() : 'Loading...'}
          </p>
          <p>
            Analysis period: {data.growth_trends.length} months • 
            {data.market_concentration.active_companies} companies • 
            {data.product_portfolio.length} products
          </p>
        </div>
      </div>
    </div>
  );
}