'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExpandableChart } from '@/components/ui/expandable-chart';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Treemap, Sankey, Layer,
  ComposedChart, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Package, 
  Users, Calendar, Award, AlertCircle, Info, Target,
  Zap, Shield, Network, Clock, Gauge
} from 'lucide-react';

// Interfaces for API responses
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

interface OperationalMetrics {
  company_name: string;
  active_months: number;
  products_handled: number;
  total_transactions: number;
  total_volume_mt: number;
  total_volume_liters: number;
  consistency_score: number;
  monthly_avg_volume: number;
  monthly_avg_transactions: number;
  avg_quality_score: number;
  volume_rank: number;
  consistency_rank: number;
  diversity_rank: number;
}

interface ProductFlow {
  product_name: string;
  product_category: string;
  unique_suppliers: number;
  active_days: number;
  total_transactions: number;
  total_volume_mt: number;
  total_volume_liters: number;
  avg_transaction_size_mt: number;
  median_transaction_mt: number;
  coefficient_variation: number;
  daily_throughput_mt: number;
  volume_rank: number;
}

interface TemporalPattern {
  weekday: string;
  day_number: number;
  avg_volume_mt: number;
  avg_transactions: number;
  avg_companies: number;
  sample_size: number;
}

interface QualityMetrics {
  total_records: number;
  avg_quality_score: number;
  min_quality_score: number;
  max_quality_score: number;
  quality_stddev: number;
  high_quality_count: number;
  medium_quality_count: number;
  low_quality_count: number;
  outlier_count: number;
  normal_count: number;
}

interface MarketDynamics {
  year: number;
  month: number;
  active_companies: number;
  hhi_index: number;
  top_share: number;
  median_company_volume: number;
  market_structure: string;
}

interface GrowthData {
  year?: number;
  quarter?: number;
  companies: number;
  products: number;
  transactions: number;
  volume_mt: number;
  volume_liters: number;
  yoy_growth_rate?: number;
  qoq_growth_rate?: number;
}

interface CompanyGrowth {
  company_name: string;
  avg_mom_growth: number;
  avg_yoy_growth: number;
  total_volume: number;
  data_points: number;
  growth_rank: number;
}

// Color palettes
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const GRADIENT_COLORS = {
  blue: ['#60A5FA', '#3B82F6', '#2563EB'],
  green: ['#34D399', '#10B981', '#059669'],
  yellow: ['#FCD34D', '#F59E0B', '#D97706'],
  red: ['#F87171', '#EF4444', '#DC2626'],
  purple: ['#A78BFA', '#8B5CF6', '#7C3AED']
};

// Helper functions
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatVolume(value: number, unit: 'liters' | 'mt'): string {
  return `${formatNumber(value)} ${unit === 'mt' ? 'MT' : 'L'}`;
}

function getPerformanceColor(value: number, thresholds: { good: number; warning: number }): string {
  if (value >= thresholds.good) return '#10B981';
  if (value >= thresholds.warning) return '#F59E0B';
  return '#EF4444';
}

export default function EnhancedBDCDashboard() {
  // State management
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [operationalData, setOperationalData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [networkData, setNetworkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedCompanies, 
    selectedProducts, 
    topN,
    volumeUnit 
  } = useGlobalFilters();

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      // Cancel previous requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      // Debounced fetch
      const timeoutId = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);
          
          const params = getFilterParams();
          
          // Fetch all endpoints in parallel
          const [performance, operational, growth, network] = await Promise.all([
            fetch(`http://localhost:8003/api/v2/bdc/performance?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/bdc/operational?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/bdc/growth?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/bdc/network?${params}`, { signal: abortController.signal })
          ]);
          
          if (!performance.ok || !operational.ok || !growth.ok || !network.ok) {
            throw new Error('Failed to fetch BDC analytics data');
          }
          
          const [perfData, opData, growData, netData] = await Promise.all([
            performance.json(),
            operational.json(),
            growth.json(),
            network.json()
          ]);
          
          if (!abortController.signal.aborted) {
            setPerformanceData(perfData);
            setOperationalData(opData);
            setGrowthData(growData);
            setNetworkData(netData);
            setError(null);
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            setError(err.message);
            console.error('Error fetching BDC data:', err);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        }
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        if (abortController) {
          abortController.abort();
        }
      };
    };
    
    fetchAllData();
  }, [startDate, endDate, selectedCompanies, selectedProducts, topN, volumeUnit, getFilterParams]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">BDC Operations Dashboard</h1>
            <p className="text-gray-400">Loading comprehensive analytics...</p>
          </div>
          <GlobalFilters restrictToCompanyType="BDC" />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <GlobalFilters restrictToCompanyType="BDC" />
          <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="text-red-200">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!performanceData || !operationalData) {
    return null;
  }

  // Process data for visualizations
  const { top_companies, product_mix, monthly_trend } = performanceData;
  const { operational_consistency, product_flow, temporal_patterns, quality_metrics, market_dynamics } = operationalData;
  const { yoy_growth, qoq_growth, company_growth } = growthData || { yoy_growth: [], qoq_growth: [], company_growth: [] };
  const { network_relationships } = networkData || { network_relationships: [] };

  // Calculate KPIs from actual database data
  const totalVolume = top_companies.reduce((sum: number, c: Company) => sum + (volumeUnit === 'mt' ? c.total_volume_mt : c.total_volume_liters), 0);
  const totalTransactions = top_companies.reduce((sum: number, c: Company) => sum + c.transaction_count, 0);
  const avgQualityScore = quality_metrics?.avg_quality_score || 0;
  const dataIntegrity = quality_metrics ? ((quality_metrics.high_quality_count / quality_metrics.total_records) * 100) : 0;
  
  // Calculate market concentration (HHI)
  const currentHHI = market_dynamics?.[0]?.hhi_index || 0;
  const marketStructure = market_dynamics?.[0]?.market_structure || 'Unknown';
  
  // Calculate operational efficiency
  const avgConsistencyScore = operational_consistency?.reduce((sum: number, c: OperationalMetrics) => sum + c.consistency_score, 0) / (operational_consistency?.length || 1);
  const topPerformer = operational_consistency?.[0];

  // Prepare chart data
  const weeklyPatternData = temporal_patterns?.map((p: TemporalPattern) => ({
    day: p.weekday,
    volume: p.avg_volume_mt,
    transactions: p.avg_transactions,
    companies: p.avg_companies
  })) || [];

  const productRiskMatrix = product_flow?.slice(0, 10).map((p: ProductFlow) => ({
    name: p.product_name,
    x: p.coefficient_variation * 100, // Risk (volatility)
    y: p.daily_throughput_mt, // Performance
    z: p.total_volume_mt, // Size
    suppliers: p.unique_suppliers,
    category: p.product_category
  })) || [];

  const companyPerformanceRadar = operational_consistency?.slice(0, 6).map((c: OperationalMetrics) => ({
    company: c.company_name.length > 15 ? c.company_name.substring(0, 15) + '...' : c.company_name,
    volume: (c.volume_rank / operational_consistency.length) * 100,
    consistency: (c.consistency_rank / operational_consistency.length) * 100,
    diversity: (c.diversity_rank / operational_consistency.length) * 100,
    quality: c.avg_quality_score * 100,
    efficiency: c.monthly_avg_volume / 1000 // Scale for visibility
  })) || [];

  const growthLeaders = company_growth?.slice(0, 10).map((c: CompanyGrowth) => ({
    name: c.company_name,
    momGrowth: c.avg_mom_growth,
    yoyGrowth: c.avg_yoy_growth,
    volume: c.total_volume,
    trend: c.avg_yoy_growth > 0 ? 'up' : 'down'
  })) || [];

  // Quality distribution for pie chart
  const qualityDistribution = quality_metrics ? [
    { name: 'High Quality (≥95%)', value: quality_metrics.high_quality_count, color: '#10B981' },
    { name: 'Medium Quality (80-95%)', value: quality_metrics.medium_quality_count, color: '#F59E0B' },
    { name: 'Low Quality (<80%)', value: quality_metrics.low_quality_count, color: '#EF4444' }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">BDC Operations Dashboard</h1>
          <p className="text-gray-400">Real-time analytics powered by PostgreSQL database</p>
        </div>
        
        {/* Global Filters */}
        <GlobalFilters restrictToCompanyType="BDC" />

        {/* Enhanced KPI Cards with Database Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(totalVolume, volumeUnit)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {totalTransactions} transactions
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Market HHI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                currentHHI < 1500 ? 'text-green-400' :
                currentHHI < 2500 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {formatNumber(currentHHI)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {marketStructure}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                avgQualityScore >= 0.95 ? 'text-green-400' :
                avgQualityScore >= 0.8 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(avgQualityScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {dataIntegrity.toFixed(0)}% high quality
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Op. Consistency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(avgConsistencyScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Across {operational_consistency?.length || 0} BDCs
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Award className="h-3 w-3" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-white truncate">
                {topPerformer?.company_name || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatVolume(topPerformer?.total_volume_mt || 0, 'mt')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Market Share & Operational Consistency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Market Share & Concentration Analysis"
            description="Company distribution with HHI-based concentration metrics"
            icon={<BarChart3 className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={top_companies.slice(0, topN)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="company_name" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis yAxisId="left" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="total_volume_mt" fill="#3B82F6" name="Volume (MT)" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="market_share_percent" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Market Share (%)"
                  dot={{ fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">Top 3 Share:</span>
                <span className="text-white ml-2 font-medium">
                  {top_companies.slice(0, 3).reduce((sum, c) => sum + c.market_share_percent, 0).toFixed(1)}%
                </span>
              </div>
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">Active BDCs:</span>
                <span className="text-white ml-2 font-medium">{top_companies.length}</span>
              </div>
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">HHI Index:</span>
                <span className={`ml-2 font-medium ${
                  currentHHI < 1500 ? 'text-green-400' :
                  currentHHI < 2500 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatNumber(currentHHI)}
                </span>
              </div>
            </div>
          </ExpandableChart>

          <ExpandableChart
            title="Operational Consistency Matrix"
            description="Company performance across multiple operational dimensions"
            icon={<Target className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={companyPerformanceRadar}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="company" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis stroke="#9CA3AF" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Volume Rank" dataKey="volume" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Radar name="Consistency" dataKey="consistency" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Radar name="Diversity" dataKey="diversity" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ExpandableChart>
        </div>

        {/* Row 2: Product Analysis & Weekly Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Product Risk-Performance Matrix"
            description="Volatility vs throughput analysis for strategic product assessment"
            icon={<Package className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="x" 
                  stroke="#9CA3AF" 
                  name="Volatility"
                  unit="%"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Volatility (CV%)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
                />
                <YAxis 
                  dataKey="y" 
                  stroke="#9CA3AF" 
                  name="Daily Throughput"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Daily Throughput (MT)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <ZAxis dataKey="z" range={[100, 1000]} name="Total Volume" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg">
                          <p className="font-semibold text-white mb-2">{data.name}</p>
                          <p className="text-sm text-gray-300">Category: {data.category}</p>
                          <p className="text-sm text-gray-300">Volatility: {data.x.toFixed(1)}%</p>
                          <p className="text-sm text-gray-300">Daily Throughput: {formatNumber(data.y)} MT</p>
                          <p className="text-sm text-gray-300">Total Volume: {formatNumber(data.z)} MT</p>
                          <p className="text-sm text-gray-300">Suppliers: {data.suppliers}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Products" data={productRiskMatrix} fill="#8B5CF6">
                  {productRiskMatrix.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-900/20 p-2 rounded border border-green-800">
                <span className="text-green-400">Low Risk Zone:</span> Low volatility, stable supply
              </div>
              <div className="bg-red-900/20 p-2 rounded border border-red-800">
                <span className="text-red-400">High Risk Zone:</span> High volatility, unstable
              </div>
            </div>
          </ExpandableChart>

          <ExpandableChart
            title="Weekly Operational Patterns"
            description="Day-of-week analysis revealing operational rhythms"
            icon={<Calendar className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={weeklyPatternData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Volume (MT)"
                />
                <Area 
                  type="monotone" 
                  dataKey="transactions" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.6}
                  name="Transactions"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-between text-sm">
              <div>
                <span className="text-gray-400">Peak Day:</span>
                <span className="text-green-400 ml-2">
                  {weeklyPatternData.reduce((max: any, day: any) => day.volume > (max?.volume || 0) ? day : max, null)?.day || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Low Day:</span>
                <span className="text-red-400 ml-2">
                  {weeklyPatternData.reduce((min: any, day: any) => day.volume < (min?.volume || Infinity) ? day : min, null)?.day || 'N/A'}
                </span>
              </div>
            </div>
          </ExpandableChart>
        </div>

        {/* Row 3: Growth Analytics & Data Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Growth Leaders & Trends"
            description="Company growth performance based on actual transaction data"
            icon={<TrendingUp className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={growthLeaders} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={150} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="yoyGrowth" fill="#10B981" name="YoY Growth %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {yoy_growth && yoy_growth.length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-2">Year-over-Year Performance</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {yoy_growth.slice(-3).map((year: GrowthData, idx: number) => (
                    <div key={idx} className="bg-gray-700 p-2 rounded">
                      <span className="text-gray-400">{year.year}:</span>
                      <span className={`ml-1 font-medium ${
                        (year.yoy_growth_rate || 0) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {year.yoy_growth_rate ? `${year.yoy_growth_rate.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ExpandableChart>

          <ExpandableChart
            title="Data Quality Distribution"
            description="Quality scores and outlier detection from database"
            icon={<Shield className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {quality_metrics && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Avg Score:</span>
                  <span className="text-white ml-2 font-medium">
                    {(quality_metrics.avg_quality_score * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Outliers:</span>
                  <span className="text-yellow-400 ml-2 font-medium">
                    {quality_metrics.outlier_count} ({((quality_metrics.outlier_count / quality_metrics.total_records) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Std Dev:</span>
                  <span className="text-white ml-2 font-medium">
                    {(quality_metrics.quality_stddev * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Total Records:</span>
                  <span className="text-white ml-2 font-medium">
                    {formatNumber(quality_metrics.total_records)}
                  </span>
                </div>
              </div>
            )}
          </ExpandableChart>
        </div>

        {/* Row 4: Historical Trends */}
        <ExpandableChart
          title="Historical Market Dynamics"
          description="Monthly HHI trends and market structure evolution"
          icon={<Clock className="h-5 w-5 text-white" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={market_dynamics || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey={(item) => `${item.year}-${String(item.month).padStart(2, '0')}`} 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelFormatter={(value) => `Period: ${value}`}
                formatter={(value: any, name: string) => {
                  if (name === 'HHI Index') return formatNumber(value);
                  if (name === 'Top Share') return `${value.toFixed(1)}%`;
                  if (name === 'Active Companies') return value;
                  return value;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hhi_index" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="HHI Index"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="top_share" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Top Share"
                yAxisId="right"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="active_companies" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Active Companies"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-around text-sm">
            <div className="text-center">
              <p className="text-gray-400">Current Structure</p>
              <p className={`font-medium ${
                marketStructure === 'Competitive' ? 'text-green-400' :
                marketStructure === 'Moderately Concentrated' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {marketStructure}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">Trend Direction</p>
              <p className="font-medium text-white flex items-center justify-center gap-1">
                {market_dynamics && market_dynamics.length > 1 && 
                 market_dynamics[0].hhi_index > market_dynamics[1].hhi_index ? (
                  <>Concentrating <TrendingUp className="h-4 w-4 text-red-400" /></>
                ) : (
                  <>Dispersing <TrendingDown className="h-4 w-4 text-green-400" /></>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">Market Health</p>
              <p className={`font-medium ${
                currentHHI < 1500 && market_dynamics?.[0]?.active_companies > 20 ? 'text-green-400' :
                currentHHI < 2500 && market_dynamics?.[0]?.active_companies > 10 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {currentHHI < 1500 && market_dynamics?.[0]?.active_companies > 20 ? 'Healthy' :
                 currentHHI < 2500 && market_dynamics?.[0]?.active_companies > 10 ? 'Moderate' : 
                 'Concerning'}
              </p>
            </div>
          </div>
        </ExpandableChart>

        {/* Data Source Footer */}
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400">
                Data Source: PostgreSQL Database • Table: petroverse.fact_bdc_transactions
              </span>
            </div>
            <div className="text-gray-500">
              Last Updated: {new Date().toLocaleString()} • 
              Records: {quality_metrics?.total_records || 0} • 
              Period: {startDate || 'All'} to {endDate || 'Current'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}