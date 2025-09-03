'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpandableChart } from '@/components/ui/expandable-chart';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Treemap, Sankey, Layer,
  ComposedChart, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Package, 
  Users, Calendar, Award, AlertCircle, Info, Target,
  Zap, Shield, Network, Clock, Gauge, MapPin, Globe,
  Truck, AlertTriangle, CheckCircle, ArrowUp, ArrowDown,
  Minus, RefreshCw, Share2, Download, Filter, Settings,
  ChevronUp, ChevronDown, Droplets, Building2, DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';

// Enhanced interfaces
interface KPIMetrics {
  total_supply: {
    value_liters: number;
    value_mt: number;
    formatted: string;
    trend: 'up' | 'down' | 'stable';
    change_percent: number;
  };
  average_growth: {
    value: number;
    formatted: string;
    direction: 'up' | 'down' | 'stable';
    growing_regions: number;
  };
  active_regions: number;
  active_products: number;
  quality_score: {
    value: number;
    status: 'good' | 'warning' | 'critical';
  };
  risk_summary: {
    high_risk_count: number;
    critical_risk_count: number;
    total_at_risk: number;
  };
}

// Component interfaces from original
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

interface SupplyResilience {
  product_name: string;
  product_category: string;
  region_coverage: number;
  total_quantity: number;
  avg_transaction_size: number;
  supply_stability_score: number;
  volatility_coefficient: number;
  supply_risk_level: string;
}

interface RegionalGrowth {
  region: string;
  avg_mom_growth: number;
  avg_yoy_growth: number;
  total_quantity: number;
}

interface RegionalExpansion {
  year: number;
  unique_regions: number;
  new_regions_count: number;
}

// Utility functions
const formatQuantity = (value: number) => {
  if (!value) return '0';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(0);
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function EnhancedSupplyDashboard() {
  // State management
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [regionalData, setRegionalData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [resilienceData, setResilienceData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any>(null);
  const [kpiData, setKpiData] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'regional' | 'products' | 'trends'>('overview');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters
  const { 
    getFilterParams, 
    startDate, 
    endDate, 
    selectedProducts, 
    topN,
    volumeUnit
  } = useGlobalFilters();

  // Fetch all data including KPIs
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
          
          // Prepare params for supply endpoints
          const params = new URLSearchParams();
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          if (selectedProducts.length > 0) params.append('products', selectedProducts.join(','));
          params.append('top_n', topN.toString());
          params.append('volume_unit', volumeUnit || 'liters');
          
          // Fetch all endpoints in parallel
          const [performance, regional, growth, resilience, quality, kpi] = await Promise.all([
            fetch(`http://localhost:8003/api/v2/supply/performance?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`http://localhost:8003/api/v2/supply/regional?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`http://localhost:8003/api/v2/supply/growth?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`http://localhost:8003/api/v2/supply/resilience?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`http://localhost:8003/api/v2/supply/quality?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`http://localhost:8003/api/v2/supply/kpi?${params}`, { 
              signal: abortController.signal,
              headers: { 'Content-Type': 'application/json' }
            })
          ]);
          
          // Check for errors
          const failedEndpoints = [];
          if (!performance.ok) failedEndpoints.push('performance');
          if (!regional.ok) failedEndpoints.push('regional');
          if (!growth.ok) failedEndpoints.push('growth');
          if (!resilience.ok) failedEndpoints.push('resilience');
          if (!quality.ok) failedEndpoints.push('quality');
          if (!kpi.ok) failedEndpoints.push('kpi');
          
          if (failedEndpoints.length > 0) {
            console.warn(`Failed to fetch: ${failedEndpoints.join(', ')}`);
          }
          
          // Parse successful responses
          const [perfData, regData, growData, resData, qualData, kpiMetrics] = await Promise.all([
            performance.ok ? performance.json() : null,
            regional.ok ? regional.json() : null,
            growth.ok ? growth.json() : null,
            resilience.ok ? resilience.json() : null,
            quality.ok ? quality.json() : null,
            kpi.ok ? kpi.json() : null
          ]);
          
          if (!abortController.signal.aborted) {
            setPerformanceData(perfData);
            setRegionalData(regData);
            setGrowthData(growData);
            setResilienceData(resData);
            setQualityData(qualData);
            setKpiData(kpiMetrics?.kpi_metrics || null);
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
  }, [startDate, endDate, selectedProducts, topN, volumeUnit]);

  // Refresh data
  const refreshData = () => {
    const event = new Event('triggerRefresh');
    window.dispatchEvent(event);
  };

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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="h-12 w-12 text-blue-500" />
            </motion.div>
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
            <Button onClick={refreshData} variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Process data for visualizations
  const { top_regions, product_distribution, monthly_trends } = performanceData || {};
  const { regional_consistency, product_flow, temporal_patterns } = regionalData || {};
  const { yoy_growth, qoq_growth, regional_growth } = growthData || {};
  const { supply_resilience, regional_balance, regional_expansion } = resilienceData || {};
  const { quality_overview, quality_by_region } = qualityData || {};

  // Prepare chart data
  const monthlyPatternData = temporal_patterns?.map((p: any) => ({
    month: p.month_name?.trim() || `Month ${p.month_num}`,
    quantity: p.total_quantity,
    transactions: p.transaction_count,
    regions: p.avg_regions,
    products: p.product_diversity
  })) || [];

  const productRiskMatrix = supply_resilience?.slice(0, 10).map((p: SupplyResilience) => ({
    name: p.product_name,
    x: p.volatility_coefficient,
    y: p.avg_transaction_size,
    z: p.total_quantity,
    coverage: p.region_coverage,
    category: p.product_category,
    risk: p.supply_risk_level
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

  return (
    <motion.div 
      className="min-h-screen bg-gray-900 p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Controls */}
        <motion.div variants={itemVariants} className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Supply Chain Analytics</h1>
            <p className="text-gray-400">Comprehensive regional petroleum supply insights</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>
        
        {/* Global Filters */}
        <motion.div variants={itemVariants}>
          <GlobalFilters hideCompanyFilter={true} />
        </motion.div>

        {/* Enhanced KPI Cards with real data */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Total Supply Card */}
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/50 hover:border-blue-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                {kpiData?.total_supply?.trend === 'up' ? (
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">
                      {kpiData?.total_supply?.change_percent > 0 ? '+' : ''}
                      {kpiData?.total_supply?.change_percent?.toFixed(1)}%
                    </span>
                  </div>
                ) : kpiData?.total_supply?.trend === 'down' ? (
                  <div className="flex items-center gap-1">
                    <ArrowDown className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">
                      {kpiData?.total_supply?.change_percent?.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {kpiData?.total_supply?.formatted || formatQuantity(top_regions?.reduce((sum: number, r: Region) => sum + r.total_quantity, 0) || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total Supply</p>
            </CardContent>
          </Card>

          {/* Active Regions Card */}
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/50 hover:border-green-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-green-400" />
                {kpiData?.average_growth?.growing_regions && (
                  <Badge variant="outline" className="text-xs">
                    {kpiData.average_growth.growing_regions} ↑
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {kpiData?.active_regions || regional_consistency?.length || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Active Regions</p>
            </CardContent>
          </Card>

          {/* Products Card */}
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/50 hover:border-purple-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-purple-400" />
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {kpiData?.active_products || product_distribution?.length || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Products</p>
            </CardContent>
          </Card>

          {/* Data Quality Card */}
          <Card className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border-cyan-600/50 hover:border-cyan-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <div className="flex items-center gap-1">
                  {kpiData?.quality_score?.status === 'good' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : kpiData?.quality_score?.status === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              <p className={`text-2xl font-bold ${
                kpiData?.quality_score?.value > 0.85 ? 'text-green-400' :
                kpiData?.quality_score?.value > 0.75 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {((kpiData?.quality_score?.value || quality_overview?.avg_quality_score || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Data Reliability</p>
            </CardContent>
          </Card>

          {/* Growth Rate Card */}
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-600/50 hover:border-orange-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                {kpiData?.average_growth?.direction === 'up' ? (
                  <ArrowUp className="w-4 h-4 text-green-400" />
                ) : kpiData?.average_growth?.direction === 'down' ? (
                  <ArrowDown className="w-4 h-4 text-red-400" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {kpiData?.average_growth?.formatted || 
                  `${(yoy_growth?.[0]?.yoy_growth_rate || 0).toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg Growth</p>
            </CardContent>
          </Card>

          {/* Risk Analysis Card */}
          <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-600/50 hover:border-red-500/70 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                {kpiData?.risk_summary?.critical_risk_count > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    {kpiData.risk_summary.critical_risk_count}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {kpiData?.risk_summary?.total_at_risk || 
                  supply_resilience?.filter((p: SupplyResilience) => p.supply_risk_level === 'High' || p.supply_risk_level === 'Critical').length || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">At Risk</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* View Mode Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
              <TabsTrigger value="products">Product Insights</TabsTrigger>
              <TabsTrigger value="trends">Trends & Forecast</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regional Performance Radar */}
                <ExpandableChart
                  title="Regional Performance Matrix"
                  description="Multi-dimensional regional performance analysis"
                  icon={<Gauge className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={regionalPerformanceRadar}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="region" className="text-xs" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Volume" dataKey="volume" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                      <Radar name="Stability" dataKey="stability" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      <Radar name="Diversity" dataKey="diversity" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                      <Radar name="Quality" dataKey="quality" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </ExpandableChart>

                {/* Monthly Patterns */}
                <ExpandableChart
                  title="Seasonal Supply Patterns"
                  description="Monthly supply variations and trends"
                  icon={<Calendar className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={monthlyPatternData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" fill="#3B82F6" name="Supply Volume" />
                      <Line yAxisId="right" type="monotone" dataKey="regions" stroke="#10B981" name="Active Regions" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="products" stroke="#F59E0B" name="Product Diversity" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ExpandableChart>
              </div>

              {/* Product Risk Matrix */}
              <ExpandableChart
                title="Product Risk & Performance Matrix"
                description="Volatility vs performance analysis by product"
                icon={<AlertTriangle className="h-4 w-4" />}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" dataKey="x" name="Volatility" unit="%" />
                    <YAxis type="number" dataKey="y" name="Avg Transaction" />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter
                      name="Products"
                      data={productRiskMatrix}
                      fill={(entry: any) => {
                        if (entry.risk === 'Critical') return '#EF4444';
                        if (entry.risk === 'High') return '#F59E0B';
                        if (entry.risk === 'Medium') return '#3B82F6';
                        return '#10B981';
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </ExpandableChart>
            </TabsContent>

            {/* Regional Analysis Tab */}
            <TabsContent value="regional" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regional Rankings */}
                <ExpandableChart
                  title="Regional Supply Rankings"
                  description="Top performing regions by volume"
                  icon={<MapPin className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={top_regions?.slice(0, 10)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" />
                      <YAxis dataKey="region" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="total_quantity" fill="#3B82F6" name="Total Supply">
                        <LabelList dataKey="market_share_percent" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ExpandableChart>

                {/* Regional Growth Comparison */}
                <ExpandableChart
                  title="Regional Growth Dynamics"
                  description="Year-over-year growth by region"
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={regional_growth?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="region" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avg_yoy_growth" fill="#10B981" name="YoY Growth %" />
                      <Bar dataKey="avg_mom_growth" fill="#F59E0B" name="MoM Growth %" />
                      <Line type="monotone" dataKey="total_quantity" stroke="#8B5CF6" strokeWidth={2} name="Total Volume" yAxisId="right" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ExpandableChart>
              </div>

              {/* Regional Consistency Analysis */}
              <ExpandableChart
                title="Supply Chain Stability by Region"
                description="Volatility and consistency metrics"
                icon={<Shield className="h-4 w-4" />}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={regional_consistency?.slice(0, 15)}>
                    <defs>
                      <linearGradient id="colorVolatility" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="region" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="volatility_coefficient" stroke="#EF4444" fillOpacity={1} fill="url(#colorVolatility)" name="Volatility %" />
                    <Area type="monotone" dataKey="overall_quality_score" stroke="#10B981" fillOpacity={1} fill="url(#colorQuality)" name="Quality Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </ExpandableChart>
            </TabsContent>

            {/* Product Insights Tab */}
            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Distribution */}
                <ExpandableChart
                  title="Product Portfolio Distribution"
                  description="Supply volume by product category"
                  icon={<Package className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <Treemap
                      data={product_distribution?.slice(0, 15).map((p: ProductDistribution) => ({
                        name: p.product,
                        size: p.total_quantity,
                        category: p.product_category,
                        regions: p.region_count
                      }))}
                      dataKey="size"
                      aspectRatio={4/3}
                      stroke="#fff"
                      fill="#3B82F6"
                    >
                      <Tooltip />
                    </Treemap>
                  </ResponsiveContainer>
                </ExpandableChart>

                {/* Product Coverage */}
                <ExpandableChart
                  title="Product Regional Coverage"
                  description="Number of regions per product"
                  icon={<Network className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={product_distribution?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="product" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="region_count" fill="#10B981" name="Region Coverage">
                        {product_distribution?.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ExpandableChart>
              </div>

              {/* Product Risk Analysis */}
              <ExpandableChart
                title="Product Supply Risk Assessment"
                description="Risk levels by product category"
                icon={<AlertCircle className="h-4 w-4" />}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={supply_resilience?.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="supply_stability_score" fill="#10B981" name="Stability Score" />
                    <Bar dataKey="volatility_coefficient" fill="#EF4444" name="Volatility %" />
                    <Line type="monotone" dataKey="region_coverage" stroke="#3B82F6" strokeWidth={2} name="Region Coverage" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ExpandableChart>
            </TabsContent>

            {/* Trends & Forecast Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* YoY Growth Trends */}
                <ExpandableChart
                  title="Year-over-Year Growth Trends"
                  description="Historical growth patterns"
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={yoy_growth}>
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="yoy_growth_rate" stroke="#10B981" fillOpacity={1} fill="url(#colorGrowth)" name="Growth Rate %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ExpandableChart>

                {/* Quarter-over-Quarter Trends */}
                <ExpandableChart
                  title="Quarterly Performance Trends"
                  description="Quarter-over-quarter analysis"
                  icon={<Activity className="h-4 w-4" />}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={qoq_growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="quarter" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="qoq_growth_rate" stroke="#3B82F6" strokeWidth={2} name="QoQ Growth %" />
                      <Line type="monotone" dataKey="total_quantity" stroke="#F59E0B" strokeWidth={2} name="Total Volume" yAxisId="right" />
                    </LineChart>
                  </ResponsiveContainer>
                </ExpandableChart>
              </div>

              {/* Regional Expansion Timeline */}
              <ExpandableChart
                title="Regional Market Expansion"
                description="Growth in regional coverage over time"
                icon={<Globe className="h-4 w-4" />}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={regional_expansion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="unique_regions" fill="#3B82F6" name="Active Regions" />
                    <Line type="monotone" dataKey="new_regions_count" stroke="#10B981" strokeWidth={2} name="New Regions Added" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ExpandableChart>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}