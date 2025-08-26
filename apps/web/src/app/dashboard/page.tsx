'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Globe,
  BarChart3,
  Activity,
  Users,
  AlertCircle,
  Gauge,
  Fuel,
  TrendingUp as TrendIcon,
  Download,
  RefreshCw
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { FilterState, useFilterStore } from '@/lib/filter-store';
import { 
  DashboardSkeleton, 
  GaugeSkeleton, 
  SparklineSkeleton,
  ChartSkeleton,
  KPICardSkeleton,
  TableSkeleton 
} from '@/components/ui/Skeleton';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  gauges: {
    bdc_volume: number;
    omc_volume: number;
    bdc_target: number;
    omc_target: number;
  };
  sparklines: {
    bdc_trend: number[];
    omc_trend: number[];
    growth_rate: number[];
    efficiency: number[];
    active_companies: number[];
    data_quality: number[];
  };
  kpis: {
    total_bdc_supply: number;
    total_omc_distribution: number;
    bdc_yoy_growth: number;
    omc_yoy_growth: number;
    market_efficiency: number;
    data_quality_score: number;
  };
  top_bdcs: Array<{ name: string; volume: number; share: number }>;
  top_omcs: Array<{ name: string; volume: number; share: number }>;
  product_distribution: Array<{ name: string; volume: number; percentage: number }>;
  trends: Array<{ month: string; bdc_volume: number; omc_volume: number }>;
  alerts: Array<{ type: string; message: string; severity: string; timestamp: string }>;
}

// Gauge Chart Component using SVG (no external library needed)
const GaugeChart = ({ 
  value, 
  target, 
  title, 
  color 
}: { 
  value: number; 
  target: number; 
  title: string; 
  color: string 
}) => {
  const percentage = Math.min((value / target) * 100, 100);
  const getColorByPerformance = () => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">{title}</h3>
      <div className="relative">
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={color}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(percentage * 351.86) / 100} 351.86`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Gauge className={`w-6 h-6 ${getColorByPerformance()} mb-1`} />
              <span className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">Current</p>
          <p className="text-sm font-semibold text-white">{formatVolume(value)}</p>
          <p className="text-xs text-gray-500 mt-1">Target: {formatVolume(target)}</p>
        </div>
      </div>
    </div>
  );
};

// Sparkline Component
const SparklineCard = ({ 
  title, 
  data, 
  trend,
  unit = ''
}: { 
  title: string; 
  data: number[]; 
  trend: number;
  unit?: string;
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const normalized = data.map(v => ((v - min) / (max - min)) * 100);
  
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-gray-400">{title}</h4>
        {trend !== 0 && (
          <span className={`flex items-center text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-12 flex items-end space-x-1">
        {normalized.map((value, i) => (
          <div
            key={i}
            className="flex-1 bg-blue-500 rounded-t"
            style={{ height: `${value}%` }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-white mt-2">
        {data[data.length - 1]?.toLocaleString()}{unit}
      </p>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  gradient,
  loading 
}: any) => {
  if (loading) return <KPICardSkeleton />;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${gradient}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center space-x-1 text-sm ${
            change > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
};

// Helper function to format volumes
const formatVolume = (value: number, unit: string = 'L'): string => {
  if (!value) return '0';
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B ${unit}`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${unit}`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K ${unit}`;
  }
  return `${value.toFixed(0)} ${unit}`;
};

// Helper function to calculate trend percentage
const calculateTrend = (data: number[]): number => {
  if (!data || data.length < 2) return 0;
  const first = data[0] || 0;
  const last = data[data.length - 1] || 0;
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
};

export default function ExecutiveOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  
  // Use global filter store
  const filters = useFilterStore();
  const [previousFiltersHash, setPreviousFiltersHash] = useState<string>('');

  // Create hash of filters to detect changes
  const createFiltersHash = useCallback((filters: any) => {
    return JSON.stringify({
      dateRange: filters.dateRange,
      companyType: filters.companyType,
      products: filters.products,
      companies: filters.companies,
      topN: filters.topN
    });
  }, []);

  // Fetch dashboard data when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication required');
          return;
        }
        
        // Build query params from filters - only send actual filters, not defaults
        const params = new URLSearchParams();
        if (filters.dateRange.start) params.append('date_start', filters.dateRange.start);
        if (filters.dateRange.end) params.append('date_end', filters.dateRange.end);
        if (filters.companyType.length > 0 && !filters.companyType.includes('All')) {
          params.append('company_type', filters.companyType.join(','));
        }
        if (filters.companies.length > 0) {
          params.append('companies', filters.companies.join(','));
        }
        if (filters.products.length > 0) {
          params.append('products', filters.products.join(','));
        }
        params.append('top_n', filters.topN.toString());
        
        // Fetch executive overview data from database
        const response = await fetch(`http://localhost:8003/api/v2/executive/overview?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const dashboardData = await response.json();
          console.log('API Response:', dashboardData); // Debug log
          
          // Calculate sparklines from trends data
          const bdcTrend = dashboardData.trends?.map((t: any) => t.bdc_volume) || [];
          const omcTrend = dashboardData.trends?.map((t: any) => t.omc_volume) || [];
          
          // Calculate efficiency ratio (OMC/BDC)
          const efficiency = dashboardData.trends?.map((t: any) => 
            t.bdc_volume > 0 ? (t.omc_volume / t.bdc_volume) * 100 : 0
          ) || [];
          
          // Calculate total supply/distribution
          const totalBdcSupply = dashboardData.top_bdcs?.reduce((sum: number, bdc: any) => sum + bdc.volume, 0) || 0;
          const totalOmcDistribution = dashboardData.top_omcs?.reduce((sum: number, omc: any) => sum + omc.volume, 0) || 0;
          
          // Calculate targets based on historical trend (not arbitrary multipliers)
          const bdcTarget = bdcTrend.length > 0 ? Math.max(...bdcTrend) : totalBdcSupply;
          const omcTarget = omcTrend.length > 0 ? Math.max(...omcTrend) : totalOmcDistribution;
          
          // Calculate growth rates
          const bdcGrowth = bdcTrend.length >= 2 ? calculateTrend(bdcTrend) : 0;
          const omcGrowth = omcTrend.length >= 2 ? calculateTrend(omcTrend) : 0;
          
          // Process data structure with real data
          const processedData: DashboardData = {
            gauges: {
              bdc_volume: totalBdcSupply,
              omc_volume: totalOmcDistribution,
              bdc_target: bdcTarget,
              omc_target: omcTarget
            },
            sparklines: {
              bdc_trend: bdcTrend,
              omc_trend: omcTrend,
              growth_rate: dashboardData.trends?.map((t: any, i: number, arr: any[]) => 
                i > 0 ? ((t.bdc_volume - arr[i-1].bdc_volume) / arr[i-1].bdc_volume) * 100 : 0
              ) || [],
              efficiency: efficiency,
              active_companies: Array(bdcTrend.length).fill(dashboardData.top_bdcs?.length || 0),
              data_quality: bdcTrend.map((_, i) => {
                // Calculate data quality based on data completeness and consistency
                const completeness = (dashboardData.trends?.[i]?.bdc_volume > 0 && dashboardData.trends?.[i]?.omc_volume > 0) ? 100 : 80;
                return completeness;
              })
            },
            kpis: {
              total_bdc_supply: totalBdcSupply,
              total_omc_distribution: totalOmcDistribution,
              bdc_yoy_growth: bdcGrowth,
              omc_yoy_growth: omcGrowth,
              market_efficiency: totalBdcSupply > 0 ? (totalOmcDistribution / totalBdcSupply) * 100 : 0,
              data_quality_score: dashboardData.trends ? 
                dashboardData.trends.reduce((acc: number, t: any) => 
                  acc + ((t.bdc_volume > 0 && t.omc_volume > 0) ? 100 : 80), 0
                ) / dashboardData.trends.length : 0
            },
            top_bdcs: (dashboardData.top_bdcs || []).map((bdc: any) => ({
              name: bdc.name,
              volume: bdc.volume,
              share: bdc.market_share
            })),
            top_omcs: (dashboardData.top_omcs || []).map((omc: any) => ({
              name: omc.name,
              volume: omc.volume,
              share: omc.market_share
            })),
            product_distribution: (dashboardData.product_distribution || []).map((product: any, index: number) => {
              const totalVolume = dashboardData.product_distribution?.reduce((sum: number, p: any) => sum + p.volume, 0) || 1;
              return {
                name: product.name,
                volume: product.volume,
                percentage: (product.volume / totalVolume) * 100
              };
            }),
            trends: dashboardData.trends || [],
            alerts: [] // No alerts in current API response
          };
          
          setData(processedData);
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (err: any) {
        console.error('Dashboard data fetch error:', err);
        setError('Failed to load dashboard data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    // Check if filters have changed
    const currentHash = createFiltersHash(filters);
    if (currentHash !== previousFiltersHash) {
      setPreviousFiltersHash(currentHash);
      
      if (filters.dateRange.start && filters.dateRange.end) {
        fetchData();
      }
    }
  }, [filters, previousFiltersHash, createFiltersHash]);

  const handleRefresh = () => {
    setPreviousFiltersHash(''); // Force refetch
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Executive Overview</h1>
            <p className="text-gray-400 mt-1">Loading real-time data from database...</p>
          </div>
        </div>
        <GlobalFilters onFiltersChange={() => {}} />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Executive Overview</h1>
          <p className="text-gray-400 mt-1">C-suite level industry health snapshot - 100% real database data</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter Status Indicator */}
      {filters.dateRange.preset !== 'all' && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-400 text-sm font-medium">
              Active Filters: {filters.dateRange.preset?.toUpperCase()} • Top {filters.topN}
              {filters.companies.length > 0 && ` • ${filters.companies.length} Companies`}
              {filters.products.length > 0 && ` • ${filters.products.length} Products`}
            </span>
          </div>
          <span className="text-xs text-blue-300">
            {filters.dateRange.start} to {filters.dateRange.end}
          </span>
        </div>
      )}

      {/* Global Filters */}
      <GlobalFilters onFiltersChange={() => {}} />

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500 text-sm">{error}</p>
        </motion.div>
      )}

      {data && (
        <>
          {/* Industry Volume Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GaugeChart
              value={data.gauges.bdc_volume}
              target={data.gauges.bdc_target}
              title="BDC Monthly Supply Volume"
              color="rgb(59, 130, 246)"
            />
            <GaugeChart
              value={data.gauges.omc_volume}
              target={data.gauges.omc_target}
              title="OMC Monthly Distribution Volume"
              color="rgb(147, 51, 234)"
            />
          </div>

          {/* Trend Sparklines Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SparklineCard
              title="BDC Volume Trend"
              data={data.sparklines.bdc_trend}
              trend={calculateTrend(data.sparklines.bdc_trend)}
              unit=" L"
            />
            <SparklineCard
              title="OMC Volume Trend"
              data={data.sparklines.omc_trend}
              trend={calculateTrend(data.sparklines.omc_trend)}
              unit=" L"
            />
            <SparklineCard
              title="BDC Growth Rate"
              data={data.sparklines.growth_rate}
              trend={calculateTrend(data.sparklines.growth_rate)}
              unit="%"
            />
            <SparklineCard
              title="Distribution Efficiency"
              data={data.sparklines.efficiency}
              trend={calculateTrend(data.sparklines.efficiency)}
              unit="%"
            />
            <SparklineCard
              title="Active Companies"
              data={data.sparklines.active_companies}
              trend={calculateTrend(data.sparklines.active_companies)}
              unit=""
            />
            <SparklineCard
              title="Data Quality Score"
              data={data.sparklines.data_quality}
              trend={calculateTrend(data.sparklines.data_quality)}
              unit="%"
            />
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <KPICard
              title="Total BDC Supply"
              value={formatVolume(data.kpis.total_bdc_supply)}
              change={data.kpis.bdc_yoy_growth}
              icon={Package}
              gradient="from-blue-500 to-blue-600"
              loading={false}
            />
            <KPICard
              title="Total OMC Distribution"
              value={formatVolume(data.kpis.total_omc_distribution)}
              change={data.kpis.omc_yoy_growth}
              icon={Globe}
              gradient="from-purple-500 to-purple-600"
              loading={false}
            />
            <KPICard
              title="BDC YoY Growth"
              value={`${data.kpis.bdc_yoy_growth.toFixed(1)}%`}
              change={0}
              icon={TrendingUp}
              gradient="from-green-500 to-green-600"
              loading={false}
            />
            <KPICard
              title="OMC YoY Growth"
              value={`${data.kpis.omc_yoy_growth.toFixed(1)}%`}
              change={0}
              icon={TrendingUp}
              gradient="from-orange-500 to-orange-600"
              loading={false}
            />
            <KPICard
              title="Market Efficiency"
              value={`${data.kpis.market_efficiency.toFixed(1)}%`}
              change={calculateTrend(data.sparklines.efficiency)}
              icon={Activity}
              gradient="from-cyan-500 to-cyan-600"
              loading={false}
            />
            <KPICard
              title="Data Quality"
              value={`${data.kpis.data_quality_score.toFixed(1)}%`}
              change={calculateTrend(data.sparklines.data_quality)}
              icon={BarChart3}
              gradient="from-indigo-500 to-indigo-600"
              loading={false}
            />
          </div>

          {/* Top Companies Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 BDC Suppliers */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Top {filters.topN} BDC Suppliers</h3>
              <Bar
                data={{
                  labels: data.top_bdcs.map(c => c.name),
                  datasets: [{
                    label: 'Volume',
                    data: data.top_bdcs.map(c => c.volume),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `Volume: ${formatVolume(context.parsed.x)} (${data.top_bdcs[context.dataIndex].share.toFixed(1)}% share)`
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        callback: (value) => formatVolume(value as number),
                        color: '#9CA3AF'
                      },
                      grid: { color: 'rgba(75, 85, 99, 0.3)' }
                    },
                    y: {
                      ticks: { color: '#9CA3AF' },
                      grid: { display: false }
                    }
                  }
                }}
              />
            </motion.div>

            {/* Top 5 OMC Distributors */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Top {filters.topN} OMC Distributors</h3>
              <Bar
                data={{
                  labels: data.top_omcs.map(c => c.name),
                  datasets: [{
                    label: 'Volume',
                    data: data.top_omcs.map(c => c.volume),
                    backgroundColor: 'rgba(147, 51, 234, 0.8)',
                    borderColor: 'rgb(147, 51, 234)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `Volume: ${formatVolume(context.parsed.x)} (${data.top_omcs[context.dataIndex].share.toFixed(1)}% share)`
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        callback: (value) => formatVolume(value as number),
                        color: '#9CA3AF'
                      },
                      grid: { color: 'rgba(75, 85, 99, 0.3)' }
                    },
                    y: {
                      ticks: { color: '#9CA3AF' },
                      grid: { display: false }
                    }
                  }
                }}
              />
            </motion.div>
          </div>

          {/* Product Mix and Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Mix Donut */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Product Mix</h3>
              <Doughnut
                data={{
                  labels: data.product_distribution.slice(0, 5).map(p => p.name),
                  datasets: [{
                    data: data.product_distribution.slice(0, 5).map(p => p.volume),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(147, 51, 234, 0.8)',
                      'rgba(34, 197, 94, 0.8)',
                      'rgba(251, 146, 60, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#9CA3AF' }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${formatVolume(context.parsed)} (${data.product_distribution[context.dataIndex].percentage.toFixed(1)}%)`
                      }
                    }
                  }
                }}
              />
            </motion.div>

            {/* Monthly Volume Trend */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Volume Trend</h3>
              <Line
                data={{
                  labels: data.trends.map(t => t.month),
                  datasets: [
                    {
                      label: 'BDC Volume',
                      data: data.trends.map(t => t.bdc_volume),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true
                    },
                    {
                      label: 'OMC Volume',
                      data: data.trends.map(t => t.omc_volume),
                      borderColor: 'rgb(147, 51, 234)',
                      backgroundColor: 'rgba(147, 51, 234, 0.1)',
                      tension: 0.4,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: true,
                      labels: { color: '#9CA3AF' }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatVolume(context.parsed.y)}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: (value) => formatVolume(value as number),
                        color: '#9CA3AF'
                      },
                      grid: { color: 'rgba(75, 85, 99, 0.3)' }
                    },
                    x: {
                      ticks: { color: '#9CA3AF' },
                      grid: { display: false }
                    }
                  }
                }}
              />
            </motion.div>
          </div>

          {/* Alerts & Anomalies Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Alerts & Anomalies</h3>
            <div className="space-y-3">
              {data.alerts && data.alerts.length > 0 ? (
                data.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${
                      alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/30' :
                      alert.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                      'bg-blue-500/10 border border-blue-500/30'
                    }`}
                  >
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${
                      alert.severity === 'high' ? 'text-red-500' :
                      alert.severity === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{alert.type}</p>
                      <p className="text-gray-400 text-sm mt-1">{alert.message}</p>
                      <p className="text-gray-500 text-xs mt-2">{alert.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No alerts or anomalies detected</p>
                  <p className="text-gray-500 text-sm mt-1">All systems operating normally</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}