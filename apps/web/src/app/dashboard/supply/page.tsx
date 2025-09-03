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
  Zap, Shield, Network, Clock, Gauge, MapPin, Globe,
  Truck, AlertTriangle, CheckCircle
} from 'lucide-react';

// Interfaces for API responses
interface Region {
  region: string;
  product_count: number;
  active_months: number;
  total_quantity: number;
  avg_quantity: number;
  max_quantity: number;
  min_quantity: number;
  supply_count: number;
  market_share_percent: number;
}

interface ProductDistribution {
  product: string;
  product_category: string;
  region_count: number;
  total_quantity: number;
  avg_quantity: number;
  quantity_stddev: number;
  supply_count: number;
  active_months: number;
}

interface MonthlyTrend {
  period: string;
  year: number;
  month: number;
  regions: number;
  products: number;
  total_quantity: number;
  avg_quantity: number;
  transactions: number;
}

interface RegionalConsistency {
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

interface ProductFlow {
  region: string;
  product: string;
  product_category: string;
  supply_count: number;
  total_quantity: number;
  avg_quantity: number;
  min_quantity: number;
  max_quantity: number;
  quantity_stddev: number;
  active_months: number;
}

interface TemporalPattern {
  month_num: number;
  month_name: string;
  avg_regions: number;
  avg_quantity: number;
  total_quantity: number;
  transaction_count: number;
  product_diversity: number;
}

interface GrowthData {
  year?: number;
  quarter?: number;
  regions: number;
  products: number;
  transactions: number;
  total_quantity: number;
  prev_year_quantity?: number;
  prev_quarter_quantity?: number;
  yoy_growth_rate?: number;
  qoq_growth_rate?: number;
}

interface RegionalGrowth {
  region: string;
  avg_mom_growth: number;
  avg_yoy_growth: number;
  total_quantity: number;
  data_points: number;
  growth_rank: number;
}

interface SupplyResilience {
  product_name: string;
  product_category: string;
  region_coverage: number;
  total_transactions: number;
  total_quantity: number;
  avg_transaction_size: number;
  volatility_coefficient: number;
  avg_quality_score: number;
  market_presence_months: number;
  supply_coverage_level: string;
  volatility_level: string;
  volume_inclusion_threshold?: number;
  region_threshold_q1?: number;
  region_threshold_median?: number;
  region_threshold_q3?: number;
  volatility_threshold_q1?: number;
  volatility_threshold_median?: number;
  volatility_threshold_q3?: number;
}

interface RegionalBalance {
  region: string;
  product_category: string;
  category_quantity: number;
  total_quantity: number;
  category_percentage: number;
}

interface RegionalExpansion {
  year: number;
  unique_regions: number;
  regions_list: string[];
  new_regions_count: number;
  new_regions_list: string[] | null;
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

// Color palettes
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const GRADIENT_COLORS = {
  blue: ['#60A5FA', '#3B82F6', '#2563EB'],
  green: ['#34D399', '#10B981', '#059669'],
  yellow: ['#FCD34D', '#F59E0B', '#D97706'],
  red: ['#F87171', '#EF4444', '#DC2626'],
  purple: ['#A78BFA', '#8B5CF6', '#7C3AED'],
  cyan: ['#67E8F9', '#06B6D4', '#0891B2']
};

// Helper functions
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatQuantity(value: number, unit: string = 'L'): string {
  return `${formatNumber(value)} ${unit}`;
}

function getPerformanceColor(value: number, thresholds: { good: number; warning: number }): string {
  if (value >= thresholds.good) return '#10B981';
  if (value >= thresholds.warning) return '#F59E0B';
  return '#EF4444';
}

export default function EnhancedSupplyDashboard() {
  // State management
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [regionalData, setRegionalData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [resilienceData, setResilienceData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters - Note: Supply doesn't have companies, so we'll adapt filters
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedProducts, 
    topN
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
          
          // Prepare params for supply endpoints (no company_ids)
          const params = new URLSearchParams();
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          if (selectedProducts.length > 0) params.append('product_ids', selectedProducts.join(','));
          params.append('top_n', topN.toString());
          
          // Fetch all endpoints in parallel
          const [performance, regional, growth, resilience, quality] = await Promise.all([
            fetch(`http://localhost:8003/api/v2/supply/performance?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/supply/regional?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/supply/growth?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/supply/resilience?${params}`, { signal: abortController.signal }),
            fetch(`http://localhost:8003/api/v2/supply/quality?${params}`, { signal: abortController.signal })
          ]);
          
          if (!performance.ok || !regional.ok || !growth.ok || !resilience.ok || !quality.ok) {
            throw new Error('Failed to fetch supply analytics data');
          }
          
          const [perfData, regData, growData, resData, qualData] = await Promise.all([
            performance.json(),
            regional.json(),
            growth.json(),
            resilience.json(),
            quality.json()
          ]);
          
          if (!abortController.signal.aborted) {
            setPerformanceData(perfData);
            setRegionalData(regData);
            setGrowthData(growData);
            setResilienceData(resData);
            setQualityData(qualData);
            setError(null);
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            setError(err.message);
            console.error('Error fetching supply data:', err);
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
  }, [startDate, endDate, selectedProducts, topN]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Supply Chain Dashboard</h1>
            <p className="text-gray-400">Loading comprehensive supply analytics...</p>
          </div>
          <GlobalFilters hideCompanyFilter={true} />
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
          <GlobalFilters hideCompanyFilter={true} />
          <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="text-red-200">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!performanceData || !regionalData) {
    return null;
  }

  // Process data for visualizations
  const { top_regions, product_distribution, monthly_trends } = performanceData;
  const { regional_consistency, product_flow, temporal_patterns } = regionalData;
  const { yoy_growth, qoq_growth, regional_growth } = growthData || { yoy_growth: [], qoq_growth: [], regional_growth: [] };
  const { supply_resilience, regional_balance, regional_expansion } = resilienceData || { supply_resilience: [], regional_balance: [], regional_expansion: [] };
  const { quality_overview, quality_by_region } = qualityData || { quality_overview: {}, quality_by_region: [] };

  // Calculate KPIs
  const totalQuantity = top_regions?.reduce((sum: number, r: Region) => sum + r.total_quantity, 0) || 0;
  const totalTransactions = top_regions?.reduce((sum: number, r: Region) => sum + r.supply_count, 0) || 0;
  const avgQualityScore = quality_overview?.avg_quality_score || 0;
  const dataIntegrity = quality_overview && quality_overview.total_records ? 
    ((quality_overview.high_quality_count / quality_overview.total_records) * 100) : 0;
  
  // Get latest regional expansion info
  const latestExpansion = regional_expansion?.[regional_expansion.length - 1];
  const currentRegions = latestExpansion?.unique_regions || 0;
  const newRegionsIn2025 = latestExpansion?.new_regions_count || 0;
  
  // Calculate supply consistency
  const avgConsistencyScore = regional_consistency?.length > 0 ?
    regional_consistency.reduce((sum: number, r: RegionalConsistency) => 
      sum + (100 - r.volatility_coefficient), 0) / regional_consistency.length / 100 : 0;
  
  const topRegion = top_regions?.[0];

  // Prepare chart data
  const monthlyPatternData = temporal_patterns?.map((p: TemporalPattern) => ({
    month: p.month_name?.trim() || `Month ${p.month_num}`,
    quantity: p.total_quantity,
    transactions: p.transaction_count,
    regions: p.avg_regions,
    products: p.product_diversity
  })) || [];

  const productRiskMatrix = supply_resilience?.slice(0, 10).map((p: SupplyResilience) => ({
    name: p.product_name,
    x: p.volatility_coefficient, // Risk (volatility)
    y: p.avg_transaction_size, // Performance
    z: p.total_quantity, // Size
    coverage: p.region_coverage,
    category: p.product_category
  })) || [];

  const regionalPerformanceRadar = regional_consistency?.slice(0, 6).map((r: RegionalConsistency) => {
    const totalRegions = regional_consistency.length || 1;
    return {
      region: r.region.length > 15 ? r.region.substring(0, 15) + '...' : r.region,
      volume: Math.min(100, Math.max(0, ((totalRegions - r.volume_rank + 1) / totalRegions) * 100)),
      stability: Math.min(100, Math.max(0, ((totalRegions - r.stability_rank + 1) / totalRegions) * 100)),
      diversity: Math.min(100, Math.max(0, ((totalRegions - r.diversity_rank + 1) / totalRegions) * 100)),
      quality: Math.min(100, Math.max(0, (r.overall_quality_score || 0) * 100))
    };
  }) || [];

  const growthLeaders = regional_growth?.slice(0, 10).map((r: RegionalGrowth) => ({
    name: r.region,
    momGrowth: r.avg_mom_growth,
    yoyGrowth: r.avg_yoy_growth,
    quantity: r.total_quantity,
    trend: r.avg_yoy_growth > 0 ? 'up' : 'down'
  })) || [];

  // Quality distribution for pie chart
  const qualityDistribution = quality_overview ? [
    { name: 'High Quality (≥95%)', value: quality_overview.high_quality_count, color: '#10B981' },
    { name: 'Medium Quality (80-95%)', value: quality_overview.medium_quality_count, color: '#F59E0B' },
    { name: 'Low Quality (<80%)', value: quality_overview.low_quality_count, color: '#EF4444' }
  ] : [];

  // Regional expansion visualization data
  const expansionTrendData = regional_expansion?.map((e: RegionalExpansion) => ({
    year: e.year,
    regions: e.unique_regions,
    newRegions: e.new_regions_count
  })) || [];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Supply Chain Dashboard</h1>
          <p className="text-gray-400">Regional petroleum supply analytics powered by PostgreSQL</p>
        </div>
        
        {/* Global Filters - Hide company filter for supply */}
        <GlobalFilters hideCompanyFilter={true} />

        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Total Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatQuantity(totalQuantity)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {totalTransactions} transactions
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Active Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {currentRegions}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {newRegionsIn2025 > 0 && `+${newRegionsIn2025} new in 2025`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Package className="h-3 w-3" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {product_distribution?.length || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Product types
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
                Supply Stability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(avgConsistencyScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Consistency score
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Top Region
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-white truncate">
                {topRegion?.region || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatQuantity(topRegion?.total_quantity || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Regional Expansion & Supply Resilience */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Regional Expansion Analysis"
            description="Evolution from 10 to 16 regions in 2025"
            icon={<Globe className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={expansionTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="regions" fill="#3B82F6" name="Total Regions" />
                <Bar dataKey="newRegions" fill="#10B981" name="New Regions" />
              </ComposedChart>
            </ResponsiveContainer>
            {latestExpansion?.new_regions_list && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-2">New Regions in 2025:</p>
                <div className="flex flex-wrap gap-2">
                  {latestExpansion.new_regions_list.map((region: string) => (
                    <span key={region} className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ExpandableChart>

          <ExpandableChart
            title="Product Supply Resilience"
            description="Coverage analysis and volatility assessment by product"
            icon={<Network className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart data={supply_resilience || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="region_coverage" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Regional Coverage', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 11 } }}
                />
                <YAxis 
                  dataKey="volatility_coefficient" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Volatility %', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  content={({ payload }) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 border border-gray-700 p-3 rounded shadow-lg">
                          <p className="text-white font-medium mb-2">{data.product_name}</p>
                          <p className="text-gray-300 text-sm">Category: <span className="text-blue-400">{data.product_category}</span></p>
                          <p className="text-gray-300 text-sm">Coverage: <span className="text-green-400">{data.region_coverage} regions</span></p>
                          <p className="text-gray-300 text-sm">Volatility: <span className="text-yellow-400">{data.volatility_coefficient.toFixed(1)}%</span></p>
                          <p className="text-gray-300 text-sm">Quantity: <span className="text-blue-300">{formatQuantity(data.total_quantity)}</span></p>
                          <p className="text-gray-300 text-sm">Coverage Level: <span className={`${
                            data.supply_coverage_level === 'Excellent Coverage' ? 'text-green-400' :
                            data.supply_coverage_level === 'Good Coverage' ? 'text-blue-400' :
                            data.supply_coverage_level === 'Moderate Coverage' ? 'text-yellow-400' : 
                            'text-red-400'
                          }`}>{data.supply_coverage_level}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="total_quantity" fill="#3B82F6">
                  {(supply_resilience || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.supply_coverage_level === 'Excellent Coverage' ? '#10B981' :
                      entry.supply_coverage_level === 'Good Coverage' ? '#3B82F6' :
                      entry.supply_coverage_level === 'Moderate Coverage' ? '#F59E0B' : 
                      '#EF4444'
                    } />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">Products Tracked:</span>
                <span className="text-white ml-2 font-medium">{supply_resilience?.length || 0}</span>
              </div>
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">Avg Coverage:</span>
                <span className="text-white ml-2 font-medium">
                  {supply_resilience && supply_resilience.length > 0 ? 
                    (supply_resilience.reduce((sum, p) => sum + (p.region_coverage || 0), 0) / supply_resilience.length).toFixed(1)
                    : '0'} regions
                </span>
              </div>
              <div className="bg-gray-700 p-2 rounded">
                <span className="text-gray-400">Volatile Products:</span>
                <span className="text-yellow-400 ml-2 font-medium">
                  {supply_resilience?.filter(p => p.volatility_level === 'Volatile').length || 0}
                </span>
              </div>
            </div>
          </ExpandableChart>
        </div>

        {/* Row 2: Regional Performance & Monthly Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Regional Performance Matrix"
            description="Multi-dimensional regional performance analysis"
            icon={<Target className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={regionalPerformanceRadar}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="region" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis stroke="#9CA3AF" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Volume" dataKey="volume" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Radar name="Stability" dataKey="stability" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Radar name="Diversity" dataKey="diversity" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                <Radar name="Quality" dataKey="quality" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ExpandableChart>

          <ExpandableChart
            title="Monthly Supply Patterns"
            description="Seasonal trends and supply rhythms"
            icon={<Calendar className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyPatternData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Area 
                  type="monotone" 
                  dataKey="quantity" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Quantity"
                />
                <Area 
                  type="monotone" 
                  dataKey="products" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.6}
                  name="Product Diversity"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-between text-sm">
              <div>
                <span className="text-gray-400">Peak Month:</span>
                <span className="text-green-400 ml-2">
                  {monthlyPatternData.reduce((max: any, month: any) => 
                    month.quantity > (max?.quantity || 0) ? month : max, null)?.month || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Low Month:</span>
                <span className="text-red-400 ml-2">
                  {monthlyPatternData.reduce((min: any, month: any) => 
                    month.quantity < (min?.quantity || Infinity) ? month : min, null)?.month || 'N/A'}
                </span>
              </div>
            </div>
          </ExpandableChart>
        </div>

        {/* Row 3: Growth Analytics & Data Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpandableChart
            title="Regional Growth Leaders"
            description="Year-over-year regional growth performance"
            icon={<TrendingUp className="h-5 w-5 text-white" />}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={growthLeaders} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="yoyGrowth" fill="#10B981" name="YoY Growth %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {yoy_growth && yoy_growth.length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-2">Year-over-Year Supply Growth</p>
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
            description="Quality scores and outlier detection"
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
            {quality_overview && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Avg Score:</span>
                  <span className="text-white ml-2 font-medium">
                    {(quality_overview.avg_quality_score * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Outliers:</span>
                  <span className="text-yellow-400 ml-2 font-medium">
                    {quality_overview.outlier_count} ({quality_overview.total_records > 0 ? 
                      ((quality_overview.outlier_count / quality_overview.total_records) * 100).toFixed(1) : '0'}%)
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Std Dev:</span>
                  <span className="text-white ml-2 font-medium">
                    {(quality_overview.quality_stddev * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded">
                  <span className="text-gray-400">Total Records:</span>
                  <span className="text-white ml-2 font-medium">
                    {formatNumber(quality_overview.total_records)}
                  </span>
                </div>
              </div>
            )}
          </ExpandableChart>
        </div>

        {/* Row 4: Historical Trends */}
        <ExpandableChart
          title="Historical Supply Trends"
          description="Supply volume evolution across years"
          icon={<Clock className="h-5 w-5 text-white" />}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly_trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="period" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelFormatter={(value) => `Period: ${value}`}
                formatter={(value: any, name: string) => {
                  if (name === 'Total Quantity') return formatQuantity(value);
                  if (name === 'Regions') return value;
                  if (name === 'Products') return value;
                  return value;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total_quantity" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Total Quantity"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="regions" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Regions"
                yAxisId="right"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="products" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Products"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-around text-sm">
            <div className="text-center">
              <p className="text-gray-400">Current Regions</p>
              <p className="font-medium text-white">{currentRegions}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">Supply Growth</p>
              <p className="font-medium text-white flex items-center justify-center gap-1">
                {yoy_growth && yoy_growth.length > 1 && 
                 yoy_growth[yoy_growth.length - 1].yoy_growth_rate > 0 ? (
                  <>Growing <TrendingUp className="h-4 w-4 text-green-400" /></>
                ) : (
                  <>Declining <TrendingDown className="h-4 w-4 text-red-400" /></>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">Coverage Status</p>
              <p className={`font-medium ${
                currentRegions >= 16 ? 'text-green-400' :
                currentRegions >= 10 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {currentRegions >= 16 ? 'Full Coverage' :
                 currentRegions >= 10 ? 'Partial Coverage' : 
                 'Limited Coverage'}
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
                Data Source: PostgreSQL Database • Table: petroverse.supply_data
              </span>
            </div>
            <div className="text-gray-500">
              Last Updated: {new Date().toLocaleString()} • 
              Records: {quality_overview?.total_records || 0} • 
              Period: {startDate || 'All'} to {endDate || 'Current'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}