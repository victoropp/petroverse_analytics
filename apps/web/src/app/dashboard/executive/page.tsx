'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Filler,
  ChartOptions
} from 'chart.js';
import GlobalFilters, { FilterState } from '@/components/filters/GlobalFilters';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Package, 
  AlertCircle,
  Fuel,
  Gauge
} from 'lucide-react';

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
  kpis: {
    total_bdc_supply: number;
    total_omc_distribution: number;
    bdc_growth: number;
    omc_growth: number;
    active_bdc_count: number;
    active_omc_count: number;
  };
  trends: Array<{
    month: string;
    bdc_volume: number;
    omc_volume: number;
  }>;
  top_bdcs: Array<{
    name: string;
    volume: number;
    market_share: number;
  }>;
  top_omcs: Array<{
    name: string;
    volume: number;
    market_share: number;
  }>;
  product_distribution: Array<{
    name: string;
    volume: number;
  }>;
}

export default function ExecutiveDashboard() {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '', preset: 'all' },
    companyType: ['All'],
    products: [],
    companies: [],
    years: [],
    months: [],
    volumeRange: { min: 0, max: 1000000000 },
    dataQuality: { includeOutliers: true, minQualityScore: 0 },
    volumeUnit: 'liters',
    topN: 5
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        // Build query params from filters
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
        
        // Fetch executive overview data
        const response = await fetch(`http://localhost:8003/api/v2/executive/overview?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const dashboardData = await response.json();
          
          // Convert to MT if needed
          if (filters.volumeUnit === 'mt') {
            // Approximate conversion: 1 MT of petroleum ≈ 1,200 liters
            const conversionFactor = 1200;
            
            dashboardData.gauges.bdc_volume /= conversionFactor;
            dashboardData.gauges.omc_volume /= conversionFactor;
            dashboardData.gauges.bdc_target /= conversionFactor;
            dashboardData.gauges.omc_target /= conversionFactor;
            
            dashboardData.kpis.total_bdc_supply /= conversionFactor;
            dashboardData.kpis.total_omc_distribution /= conversionFactor;
            
            dashboardData.trends.forEach((t: any) => {
              t.bdc_volume /= conversionFactor;
              t.omc_volume /= conversionFactor;
            });
            
            dashboardData.top_bdcs.forEach((c: any) => {
              c.volume /= conversionFactor;
            });
            
            dashboardData.top_omcs.forEach((c: any) => {
              c.volume /= conversionFactor;
            });
            
            dashboardData.product_distribution.forEach((p: any) => {
              p.volume /= conversionFactor;
            });
          }
          
          // Limit to topN
          dashboardData.top_bdcs = dashboardData.top_bdcs.slice(0, filters.topN);
          dashboardData.top_omcs = dashboardData.top_omcs.slice(0, filters.topN);
          dashboardData.product_distribution = dashboardData.product_distribution.slice(0, filters.topN);
          
          setData(dashboardData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (filters.dateRange.start && filters.dateRange.end) {
      fetchData();
    }
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const formatVolume = (value: number) => {
    const unit = filters.volumeUnit === 'mt' ? 'MT' : 'L';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${unit}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K ${unit}`;
    }
    return `${value.toFixed(0)} ${unit}`;
  };

  // Gauge Chart Component
  const GaugeChart = ({ value, target, title, color }: { value: number; target: number; title: string; color: string }) => {
    const percentage = Math.min((value / target) * 100, 100);
    
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
                <Gauge className="w-6 h-6 text-gray-500 mb-1" />
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

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Executive Overview</h1>
        </div>
        <GlobalFilters onFiltersChange={handleFiltersChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Executive Overview</h1>
        </div>
        <GlobalFilters onFiltersChange={handleFiltersChange} />
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Loading data from database...</p>
        </div>
      </div>
    );
  }

  // Chart configurations
  const monthlyTrendData = {
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
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const topBDCData = {
    labels: data.top_bdcs.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name),
    datasets: [{
      data: data.top_bdcs.map(c => c.volume),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(59, 130, 246, 0.6)',
        'rgba(59, 130, 246, 0.4)',
        'rgba(59, 130, 246, 0.3)',
        'rgba(59, 130, 246, 0.2)',
      ],
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  const topOMCData = {
    labels: data.top_omcs.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name),
    datasets: [{
      data: data.top_omcs.map(c => c.volume),
      backgroundColor: [
        'rgba(168, 85, 247, 0.8)',
        'rgba(168, 85, 247, 0.6)',
        'rgba(168, 85, 247, 0.4)',
        'rgba(168, 85, 247, 0.3)',
        'rgba(168, 85, 247, 0.2)',
      ],
      borderColor: 'rgb(168, 85, 247)',
      borderWidth: 1
    }]
  };

  const productMixData = {
    labels: data.product_distribution.map(p => p.name),
    datasets: [{
      data: data.product_distribution.map(p => p.volume),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(244, 63, 94, 0.8)',
      ],
      borderWidth: 0
    }]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: 'rgb(156, 163, 175)' }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${formatVolume(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        ticks: { color: 'rgb(156, 163, 175)' }
      },
      y: {
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        ticks: { 
          color: 'rgb(156, 163, 175)',
          callback: function(value) {
            return formatVolume(Number(value));
          }
        }
      }
    }
  };

  const barOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const idx = context.dataIndex;
            const volume = formatVolume(context.parsed.x);
            const share = context.chart.data.labels?.[idx] || '';
            const marketShare = share.includes('BDC') 
              ? data.top_bdcs[idx]?.market_share 
              : data.top_omcs[idx]?.market_share;
            return [`Volume: ${volume}`, marketShare ? `Market Share: ${marketShare.toFixed(1)}%` : ''];
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        ticks: { 
          color: 'rgb(156, 163, 175)',
          callback: function(value) {
            return formatVolume(Number(value));
          }
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'rgb(156, 163, 175)' }
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { 
          color: 'rgb(156, 163, 175)',
          padding: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatVolume(context.parsed)} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Executive Overview</h1>
        <div className="text-sm text-gray-400">
          Real-time data from database
        </div>
      </div>

      {/* Global Filters */}
      <GlobalFilters onFiltersChange={handleFiltersChange} />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">BDC Supply</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatVolume(data.kpis.total_bdc_supply)}</p>
          <div className="flex items-center mt-1">
            {data.kpis.bdc_growth >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
            )}
            <span className={`text-xs ${data.kpis.bdc_growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(data.kpis.bdc_growth).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">OMC Distribution</span>
            <Fuel className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatVolume(data.kpis.total_omc_distribution)}</p>
          <div className="flex items-center mt-1">
            {data.kpis.omc_growth >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
            )}
            <span className={`text-xs ${data.kpis.omc_growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(data.kpis.omc_growth).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">BDC Growth</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {data.kpis.bdc_growth >= 0 ? '+' : ''}{data.kpis.bdc_growth.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">YoY</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">OMC Growth</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {data.kpis.omc_growth >= 0 ? '+' : ''}{data.kpis.omc_growth.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">YoY</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Active BDCs</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">{data.kpis.active_bdc_count}</p>
          <p className="text-xs text-gray-500 mt-1">Companies</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Active OMCs</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-white">{data.kpis.active_omc_count}</p>
          <p className="text-xs text-gray-500 mt-1">Companies</p>
        </div>
      </div>

      {/* Gauge Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          color="rgb(168, 85, 247)"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top BDC Suppliers */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Top {filters.topN} BDC Suppliers</h3>
          <div className="h-64">
            <Bar data={topBDCData} options={barOptions} />
          </div>
        </div>

        {/* Top OMC Distributors */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Top {filters.topN} OMC Distributors</h3>
          <div className="h-64">
            <Bar data={topOMCData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Mix */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Product Mix</h3>
          <div className="h-64">
            <Doughnut data={productMixData} options={doughnutOptions} />
          </div>
        </div>

        {/* Monthly Volume Trend */}
        <div className="bg-gray-800 rounded-lg p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Monthly Volume Trend</h3>
          <div className="h-64">
            <Line data={monthlyTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Alerts & Anomalies Panel */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Data Insights</h3>
        <div className="space-y-2">
          {data.kpis.bdc_growth < -5 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-300">BDC volume shows decline ({data.kpis.bdc_growth.toFixed(1)}%)</span>
            </div>
          )}
          {data.kpis.omc_growth > 10 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-300">OMC distribution showing strong growth ({data.kpis.omc_growth.toFixed(1)}%)</span>
            </div>
          )}
          {data.top_bdcs[0]?.market_share > 30 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className="text-gray-300">Market concentration: {data.top_bdcs[0].name} holds {data.top_bdcs[0].market_share.toFixed(1)}% market share</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-gray-300">Date range: {filters.dateRange.start} to {filters.dateRange.end}</span>
          </div>
        </div>
      </div>
    </div>
  );
}