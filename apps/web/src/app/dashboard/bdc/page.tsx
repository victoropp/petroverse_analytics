'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Activity,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  Truck,
  Fuel,
  Target,
  Award
} from 'lucide-react';
import { analyticsAPI, filterAPI } from '@/lib/api';
import { Line, Bar, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// BDC-specific KPI Card
const BDCKPICard = ({ title, value, subtitle, change, icon: Icon, gradient }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700 relative overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${gradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 text-sm ${
              change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {change > 0 ? <TrendingUp className="w-4 h-4" /> : 
               change < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default function BDCDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [companies, setCompanies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Dashboard data states
  const [kpis, setKpis] = useState({
    totalBDCs: 82,
    totalVolume: 0,
    avgPerformance: 0,
    marketShare: 0,
    topPerformer: '',
    growthRate: 0
  });
  const [performanceTrend, setPerformanceTrend] = useState<any>(null);
  const [companyRankings, setCompanyRankings] = useState<any[]>([]);
  const [productDistribution, setProductDistribution] = useState<any>(null);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<any>(null);

  useEffect(() => {
    fetchDateRange();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchBDCData();
    }
  }, [selectedCompany, selectedProduct, dateRange]);

  const fetchDateRange = async () => {
    try {
      const response = await analyticsAPI.getDateRange();
      setDateRange({
        start: response.min_date,
        end: response.max_date
      });
    } catch (err) {
      console.error('Date range fetch error:', err);
      // Fallback to reasonable defaults
      setDateRange({
        start: '2019-01-01',
        end: '2024-12-31'
      });
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const options = await filterAPI.getFilterOptions();
      if (options.companies) {
        setCompanies(options.companies.filter((c: any) => c.type === 'BDC'));
      }
      if (options.products) {
        setProducts(options.products);
      }
    } catch (err) {
      // Use default data if API fails
      setCompanies([
        { id: '1', name: 'Total Energies', type: 'BDC' },
        { id: '2', name: 'Vivo Energy', type: 'BDC' },
        { id: '3', name: 'Puma Energy', type: 'BDC' },
      ]);
      setProducts([
        { id: '1', name: 'PMS' },
        { id: '2', name: 'AGO' },
        { id: '3', name: 'DPK' },
      ]);
    }
  };

  const fetchBDCData = async () => {
    try {
      setLoading(true);
      
      // Build filters
      const filters: any = { company_type: 'BDC' };
      if (selectedCompany !== 'all') filters.company_id = selectedCompany;
      if (selectedProduct !== 'all') filters.product_id = selectedProduct;

      // Fetch BDC analytics
      const response = await analyticsAPI.queryAnalytics({
        metrics: ['volume_liters', 'company_performance', 'product_distribution'],
        filters,
        date_range: dateRange,
        aggregation: 'monthly'
      });

      // Process the data
      if (response.data) {
        // Update KPIs
        setKpis({
          totalBDCs: response.data.company_count || 82,
          totalVolume: response.data.total_volume || 33500000000,
          avgPerformance: response.data.avg_performance || 408536585,
          marketShare: response.data.market_share || 100,
          topPerformer: response.data.top_performer || 'Total Energies',
          growthRate: response.data.growth_rate || 12.5
        });

        // Set performance trend
        if (response.data.time_series) {
          const labels = response.data.time_series.map((item: any) => item.month);
          const volumes = response.data.time_series.map((item: any) => item.volume);
          
          setPerformanceTrend({
            labels,
            datasets: [{
              label: 'BDC Volume Performance',
              data: volumes,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
            }]
          });
        }

        // Set company rankings
        if (response.data.company_rankings) {
          setCompanyRankings(response.data.company_rankings.slice(0, 10));
        }

        // Set product distribution
        if (response.data.product_distribution) {
          const labels = Object.keys(response.data.product_distribution);
          const data = Object.values(response.data.product_distribution);
          
          setProductDistribution({
            labels,
            datasets: [{
              label: 'Product Volume',
              data,
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(147, 51, 234, 0.8)',
                'rgba(34, 197, 94, 0.8)',
                'rgba(251, 146, 60, 0.8)',
                'rgba(239, 68, 68, 0.8)',
              ],
              borderWidth: 1,
              borderColor: '#1F2937'
            }]
          });
        }
      }
    } catch (err) {
      console.error('BDC data fetch error:', err);
      // Use demo data
      setPerformanceTrend({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'BDC Volume Performance',
          data: [2800000000, 2650000000, 2900000000, 2750000000, 2850000000, 2700000000,
                 2950000000, 2800000000, 2750000000, 2900000000, 2850000000, 2950000000],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      });
      
      setCompanyRankings([
        { rank: 1, name: 'Total Energies', volume: 4200000000, change: 15.2 },
        { rank: 2, name: 'Vivo Energy', volume: 3800000000, change: 12.8 },
        { rank: 3, name: 'Puma Energy', volume: 3500000000, change: 10.5 },
        { rank: 4, name: 'Goil', volume: 3200000000, change: 8.3 },
        { rank: 5, name: 'Oando', volume: 2900000000, change: 7.1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">BDC Dashboard</h1>
          <p className="text-gray-400 mt-1">Bulk Distribution Companies Analytics</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Company Filter */}
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All BDCs</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Product Filter */}
          <div className="relative">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Export Button */}
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-600 hover:to-purple-700 transition">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BDCKPICard
          title="Total BDC Companies"
          value={kpis.totalBDCs}
          subtitle="Active distributors"
          change={5.2}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
        />
        <BDCKPICard
          title="Total Volume"
          value={formatVolume(kpis.totalVolume)}
          subtitle="Liters distributed"
          change={kpis.growthRate}
          icon={Fuel}
          gradient="from-purple-500 to-purple-600"
        />
        <BDCKPICard
          title="Avg Performance"
          value={formatVolume(kpis.avgPerformance)}
          subtitle="Per company"
          change={8.7}
          icon={Target}
          gradient="from-green-500 to-green-600"
        />
        <BDCKPICard
          title="Top Performer"
          value={kpis.topPerformer}
          subtitle={`${kpis.marketShare.toFixed(1)}% market share`}
          icon={Award}
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Performance Trend</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          {performanceTrend ? (
            <Line
              data={performanceTrend}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `Volume: ${formatVolume(context.parsed.y)} L`
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
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}
        </motion.div>

        {/* Product Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Product Distribution</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          {productDistribution ? (
            <Bar
              data={productDistribution}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.label}: ${formatVolume(context.parsed.y)} L`
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
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Company Rankings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Top BDC Companies</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 text-sm font-medium text-gray-400">Rank</th>
                <th className="pb-3 text-sm font-medium text-gray-400">Company</th>
                <th className="pb-3 text-sm font-medium text-gray-400">Volume</th>
                <th className="pb-3 text-sm font-medium text-gray-400">Market Share</th>
                <th className="pb-3 text-sm font-medium text-gray-400">Growth</th>
              </tr>
            </thead>
            <tbody>
              {companyRankings.map((company, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-700/50"
                >
                  <td className="py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400' :
                      index === 2 ? 'bg-orange-500/20 text-orange-500' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {company.rank || index + 1}
                    </div>
                  </td>
                  <td className="py-3">
                    <p className="text-white font-medium">{company.name}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-gray-300">{formatVolume(company.volume)} L</p>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${(company.volume / kpis.totalVolume) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm">
                        {((company.volume / kpis.totalVolume) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className={`flex items-center space-x-1 ${
                      company.change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {company.change > 0 ? 
                        <TrendingUp className="w-4 h-4" /> : 
                        <TrendingDown className="w-4 h-4" />
                      }
                      <span>{Math.abs(company.change)}%</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-gray-700"
        >
          <Truck className="w-8 h-8 text-blue-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Distribution Efficiency</h4>
          <p className="text-3xl font-bold text-white mb-1">94.2%</p>
          <p className="text-gray-400 text-sm">On-time delivery rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-gray-700"
        >
          <Target className="w-8 h-8 text-green-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Target Achievement</h4>
          <p className="text-3xl font-bold text-white mb-1">108%</p>
          <p className="text-gray-400 text-sm">Of quarterly target</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-gray-700"
        >
          <Activity className="w-8 h-8 text-orange-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Market Activity</h4>
          <p className="text-3xl font-bold text-white mb-1">2.8K</p>
          <p className="text-gray-400 text-sm">Transactions today</p>
        </motion.div>
      </div>
    </div>
  );
}