'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpandableChart } from '@/components/ui/expandable-chart';
import { AlertCircle, TrendingUp, TrendingDown, Activity, Building2, Package, Calendar, BarChart3, Users } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';

interface ComprehensiveData {
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
    peak_month: string | null;
    trough_month: string | null;
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

// Color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BDCComprehensiveDashboard() {
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { 
    startDate, 
    endDate, 
    selectedCompanies, 
    selectedProducts,
    selectedProductCategories,
    volumeUnit,
    topN,
    getFilterParams 
  } = useGlobalFilters();

  useEffect(() => {
    const fetchData = async () => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Debounce the request
      const timeoutId = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);

          const params = new URLSearchParams();
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          if (selectedCompanies.length > 0) {
            params.append('company_ids', selectedCompanies.join(','));
          }
          if (selectedProducts.length > 0) {
            params.append('product_ids', selectedProducts.join(','));
          }
          // Request more companies to properly calculate "Others" category
          // For market share distribution, we need all companies, not just top N
          params.append('top_n', '100');

          console.log('API Request params:', {
            startDate,
            endDate,
            selectedCompanies: selectedCompanies.length,
            selectedProducts: selectedProducts.length,
            url: `http://localhost:8003/api/v2/bdc/comprehensive?${params}`
          });

          const response = await fetch(`http://localhost:8003/api/v2/bdc/comprehensive?${params}`, {
            signal: abortController.signal
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('API Response summary:', {
            growth_trends_count: result.growth_trends?.length || 0,
            growth_trends_years: result.growth_trends ? [...new Set(result.growth_trends.map(t => t.year))].sort() : [],
            july_count: result.growth_trends ? result.growth_trends.filter(t => t.month === 7).length : 0,
            august_count: result.growth_trends ? result.growth_trends.filter(t => t.month === 8).length : 0
          });
          setData(result);
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log('Request was cancelled');
          } else {
            setError(err.message || 'Failed to load comprehensive analytics');
            console.error('Error fetching comprehensive data:', err);
          }
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms debounce

      return () => {
        clearTimeout(timeoutId);
      };
    };

    fetchData();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startDate, endDate, selectedCompanies, selectedProducts, selectedProductCategories, topN]);

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatVolume = (liters: number, mt: number): string => {
    const value = volumeUnit === 'mt' ? mt : liters;
    return formatNumber(value);
  };

  if (loading) return (
    <div className="p-6">
      <GlobalFilters restrictToCompanyType="BDC" />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading comprehensive analytics...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <GlobalFilters restrictToCompanyType="BDC" />
      <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <div className="text-red-200">{error}</div>
      </div>
    </div>
  );

  if (!data) return null;

  // Prepare chart data
  const growthChartData = data.growth_trends
    .map(trend => ({
      period: `${trend.year}-${String(trend.month).padStart(2, '0')}`,
      volume: volumeUnit === 'mt' ? trend.volume_mt : trend.volume_liters,
      mom_growth: trend.mom_growth,
      yoy_growth: trend.yoy_growth,
      companies: trend.active_companies,
      products: trend.active_products,
      transactions: trend.transactions,
      sortKey: trend.year * 100 + trend.month // For proper chronological sorting
    }))
    .sort((a, b) => a.sortKey - b.sortKey); // Sort chronologically

  const productRiskMatrix = data.product_portfolio.map(product => ({
    name: product.product_name,
    x: product.volatility_cv, // Monthly volume variability
    y: product.portfolio_share, // Product market share
    z: volumeUnit === 'mt' ? product.volume_mt : product.volume_liters, // Total volume
    category: product.category,
    companies: product.companies_handling,
    transactions: product.transactions  // Actually product-month records
  }));

  // Prepare market share data with dynamic threshold
  // First, take the actual top N companies based on the topN filter
  const displayedCompanies = data.company_rankings.slice(0, Math.min(topN, data.company_rankings.length));
  const remainingCompanies = data.company_rankings.slice(Math.min(topN, data.company_rankings.length));
  const othersShare = remainingCompanies.reduce((sum, c) => sum + c.market_share, 0);
  const othersCount = remainingCompanies.length;
  
  const marketShareData = [
    ...displayedCompanies.map(company => ({
      name: company.company_name,
      value: company.market_share,
      volume: volumeUnit === 'mt' ? company.volume_mt : company.volume_liters,
      avgVolumePerProduct: volumeUnit === 'mt' ? 
        (company.volume_mt / company.transactions) : 
        company.efficiency_ratio,
      productMonthRecords: company.transactions,
      productsHandled: company.products_handled,
      isOthers: false
    })),
    ...(othersShare > 0.01 && othersCount > 0 ? [{
      name: 'Others',
      value: othersShare,
      volume: remainingCompanies.reduce((sum, c) => sum + (volumeUnit === 'mt' ? c.volume_mt : c.volume_liters), 0),
      avgVolumePerProduct: 0,
      productMonthRecords: remainingCompanies.reduce((sum, c) => sum + c.transactions, 0),
      productsHandled: 0,
      isOthers: true,
      othersCount: othersCount
    }] : [])
  ];

  // HHI Gauge Data with statistical thresholds
  // Calculate HHI thresholds based on actual data distribution
  const numCompanies = data.market_concentration.active_companies;
  const maxPossibleHHI = 10000; // Mathematical maximum (monopoly = 100^2)
  const equalDistributionHHI = numCompanies > 0 ? maxPossibleHHI / numCompanies : maxPossibleHHI;
  
  // Use statistical tertiles based on possible range
  // Lower third: distributed market
  // Middle third: moderate concentration
  // Upper third: high concentration
  const concentrationRange = maxPossibleHHI - equalDistributionHHI;
  const moderateThreshold = equalDistributionHHI + (concentrationRange / 3);
  const highThreshold = equalDistributionHHI + (concentrationRange * 2 / 3);
  
  const hhiGaugeData = [
    {
      name: 'HHI',
      value: data.market_concentration.hhi_index,
      fill: data.market_concentration.hhi_index < moderateThreshold ? '#10B981' :
            data.market_concentration.hhi_index < highThreshold ? '#F59E0B' : '#EF4444'
    }
  ];

  // Seasonal pattern data
  const seasonalData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = data.growth_trends.filter(t => t.month === month);
    const isActive = monthData.length > 0;
    
    // Debug logging for July and August
    if (month === 7 || month === 8) {
      console.log(`Month ${month} debug:`, {
        monthData: monthData,
        totalTrends: data.growth_trends.length,
        volumeUnit: volumeUnit
      });
    }
    
    // Calculate average volume for this month across all years
    const totalVolume = monthData.reduce((sum, t) => {
      const vol = volumeUnit === 'mt' ? t.volume_mt : t.volume_liters;
      if (month === 7 || month === 8) {
        console.log(`  Adding volume for ${t.year}-${t.month}: ${vol}`);
      }
      return sum + vol;
    }, 0);
    const avgVolume = monthData.length > 0 ? totalVolume / monthData.length : 0;
    
    if (month === 7 || month === 8) {
      console.log(`Month ${month} result: totalVolume=${totalVolume}, avgVolume=${avgVolume}, dataPoints=${monthData.length}`);
    }
    
    return {
      month: monthNames[i],
      volume: avgVolume,
      isPeak: monthNames[i] === data.seasonality.peak_month,
      isTrough: monthNames[i] === data.seasonality.trough_month,
      active: isActive,
      dataPoints: monthData.length // For debugging
    };
  });

  // Efficiency comparison with statistical thresholds
  const efficiencyData = data.company_rankings
    .slice(0, 10)
    .map(company => ({
      name: company.company_name.length > 20 ? company.company_name.substring(0, 20) + '...' : company.company_name,
      fullName: company.company_name,
      efficiency: volumeUnit === 'mt' ? 
        (company.volume_mt / company.transactions) : 
        company.efficiency_ratio,
      products_handled: company.products_handled,  // Use actual products handled
      products: company.products_handled,
      market_share: company.market_share,
      volume: volumeUnit === 'mt' ? company.volume_mt : company.volume_liters,
      transactions: company.transactions,
      active_months: company.active_days  // Note: active_days is actually active months
    }))
    .sort((a, b) => a.efficiency - b.efficiency);  // Sort by efficiency (X-axis) for proper visualization

  // Calculate statistical thresholds from actual data
  const efficiencyValues = efficiencyData.map(d => d.efficiency);
  const diversityValues = efficiencyData.map(d => d.products_handled);
  
  const efficiencyMedian = efficiencyValues.sort((a, b) => a - b)[Math.floor(efficiencyValues.length / 2)];
  const diversityMedian = diversityValues.sort((a, b) => a - b)[Math.floor(diversityValues.length / 2)];
  
  const efficiencyQ3 = efficiencyValues[Math.floor(efficiencyValues.length * 0.75)] || efficiencyMedian;
  const diversityQ3 = diversityValues[Math.floor(diversityValues.length * 0.75)] || diversityMedian;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">BDC Comprehensive Analytics</h1>
          <p className="text-gray-400 mt-1">Deep financial and operational insights from actual database metrics</p>
        </div>
        <GlobalFilters restrictToCompanyType="BDC" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Market Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.market_concentration.hhi_index < moderateThreshold ? 'text-green-400' :
              data.market_concentration.hhi_index < highThreshold ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {data.market_concentration.hhi_index < moderateThreshold ? 'Competitive' :
               data.market_concentration.hhi_index < highThreshold ? 'Moderate' : 'Concentrated'}
            </div>
            <p className="text-xs text-gray-500 mt-1">HHI Index: {formatNumber(data.market_concentration.hhi_index)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Threshold: {data.market_concentration.hhi_index < moderateThreshold ? 
                `< ${Math.round(moderateThreshold)}` : 
                data.market_concentration.hhi_index < highThreshold ? 
                `${Math.round(moderateThreshold)}-${Math.round(highThreshold)}` : 
                `> ${Math.round(highThreshold)}`
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Companies with Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.market_concentration.active_companies}</div>
            <p className="text-xs text-gray-500 mt-1">{data.market_concentration.significant_players} above median share</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Leader Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(data.market_concentration.leader_market_share)}%</div>
            <p className="text-xs text-gray-500 mt-1">Top tier: {formatNumber(data.market_concentration.top_tier_combined_share)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Monthly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(data.efficiency_metrics.avg_transaction_volume)}</div>
            <p className="text-xs text-gray-500 mt-1">{volumeUnit === 'mt' ? 'MT' : 'Liters'} per product-month</p>
            <p className="text-xs text-gray-400 mt-0.5">Median: {formatNumber(data.efficiency_metrics.median_transaction_volume)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Market Concentration Gauge & Volume Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-white" />
              Market Volume Concentration (HHI)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Monthly volume concentration across {data.market_concentration.active_companies} companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={hhiGaugeData}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" maxBarSize={10} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white">
                  <tspan x="50%" dy="-10" className="text-3xl font-bold">{formatNumber(data.market_concentration.hhi_index)}</tspan>
                  <tspan x="50%" dy="30" className="text-sm fill-gray-400">{data.market_concentration.market_structure}</tspan>
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Structure:</span>
                <span className={`font-medium ${
                  data.market_concentration.hhi_index < moderateThreshold ? 'text-green-400' :
                  data.market_concentration.hhi_index < highThreshold ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {data.market_concentration.hhi_index < moderateThreshold ? 'Competitive' :
                   data.market_concentration.hhi_index < highThreshold ? 'Moderate' : 'Concentrated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Companies:</span>
                <span className="text-gray-300">{numCompanies}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Equal Share HHI:</span>
                <span className="text-gray-300">{Math.round(equalDistributionHHI)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Actual HHI:</span>
                <span className="text-gray-300">{Math.round(data.market_concentration.hhi_index)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ExpandableChart 
          title="Volume Growth & Momentum" 
          description="Month-over-month and year-over-year growth rates"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
        >
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={growthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="period" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }} 
                interval="preserveStartEnd"
              />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                labelStyle={{ color: '#374151' }}
                itemStyle={{ color: '#111827' }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(2)}%`,
                  name
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="mom_growth" stroke="#10B981" name="MoM %" strokeWidth={2} />
              <Line type="monotone" dataKey="yoy_growth" stroke="#3B82F6" name="YoY %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      {/* Product Volume Consistency Analysis */}
      <ExpandableChart 
        title="Product Volume Consistency & Market Share" 
        description="Product portfolio stability: Monthly volume variability vs Market dominance"
        icon={<Package className="h-5 w-5 text-white" />}
      >
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="x" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                label={{ value: 'Monthly Volume Variability (CV%)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 11 } }}
              />
              <YAxis 
                dataKey="y" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                label={{ value: 'Product Market Share (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                        <p className="text-sm text-gray-600 mb-2">Category: {data.category}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-700">Monthly Variability: {formatNumber(data.x)}%</p>
                          <p className="text-gray-700">Market Share: {formatNumber(data.y)}%</p>
                          <p className="text-gray-700">Total Volume: {formatNumber(data.z)} {volumeUnit === 'mt' ? 'MT' : 'L'}</p>
                          <p className="text-gray-700">Companies Handling: {data.companies}</p>
                          <p className="text-gray-700">Monthly Records: {formatNumber(data.transactions)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={productRiskMatrix} 
                fill="#3B82F6"
              >
                {productRiskMatrix.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          
          {/* Product Legend */}
          <div className="mt-4 space-y-3">
            <div className="text-sm font-medium text-gray-300">Product Legend:</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {productRiskMatrix.map((product, index) => (
                <div key={product.name} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-gray-300 truncate" title={product.name}>
                    {product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-gray-600">
            <div className="text-sm">
              <span className="text-gray-400">Optimal Zone:</span>
              <span className="text-green-400 ml-2">High Share, Low Risk</span>
            </div>
            <div className="text-sm text-right">
              <span className="text-gray-400">Review Zone:</span>
              <span className="text-yellow-400 ml-2">Low Share, High Risk</span>
            </div>
          </div>
      </ExpandableChart>

      {/* Market Share Distribution & Company Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpandableChart 
          title="Volume Market Share Distribution" 
          description={`Top ${Math.min(topN, displayedCompanies.length)} companies by market share${othersCount > 0 ? ' (plus others)' : ''}`}
          icon={<Building2 className="h-5 w-5 text-white" />}
        >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isOthers ? '#6B7280' : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0];
                      const isOthers = data.payload.isOthers;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 mb-2">
                            {isOthers ? `Others (${data.payload.othersCount} companies)` : data.name}
                          </p>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">Market Share: {formatNumber(data.value)}%</p>
                            {!isOthers && (
                              <>
                                <p className="text-gray-700">Total Volume: {formatNumber(data.payload.volume)} {volumeUnit === 'mt' ? 'MT' : 'L'}</p>
                                <p className="text-gray-700">Avg Volume/Product: {formatNumber(data.payload.avgVolumePerProduct)} {volumeUnit === 'mt' ? 'MT' : 'L'}</p>
                                <p className="text-gray-700">Products Handled: {data.payload.productsHandled}</p>
                                <p className="text-gray-700">Product-Month Records: {formatNumber(data.payload.productMonthRecords)}</p>
                              </>
                            )}
                            {isOthers && (
                              <>
                                <p className="text-gray-700">Combined Volume: {formatNumber(data.payload.volume)} {volumeUnit === 'mt' ? 'MT' : 'L'}</p>
                                <p className="text-gray-700">Total Product-Month Records: {formatNumber(data.payload.productMonthRecords)}</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Market Share Legend */}
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium text-gray-300">Market Share Distribution:</div>
              <div className="grid grid-cols-1 gap-2">
                {marketShareData.map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: company.isOthers ? '#6B7280' : COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm text-gray-300" title={company.name}>
                        {company.isOthers ? `Others (${company.othersCount} companies)` : 
                         (company.name.length > 25 ? company.name.substring(0, 25) + '...' : company.name)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white">
                      {formatNumber(company.value)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </ExpandableChart>

        <ExpandableChart 
          title="Product Portfolio & Volume Efficiency" 
          description="Company positioning by product diversification and operational scale"
          icon={<BarChart3 className="h-5 w-5 text-white" />}
        >
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="efficiency" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    if (volumeUnit === 'mt') {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toFixed(0);
                    } else {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toFixed(0);
                    }
                  }}
                  label={{ 
                    value: `Volume Efficiency: Avg Volume per Product-Month (${volumeUnit === 'mt' ? 'MT' : 'Liters'})`, 
                    position: 'insideBottom', 
                    offset: -5, 
                    style: { fill: '#9CA3AF', fontSize: 11, fontWeight: 500 } 
                  }}
                />
                <YAxis 
                  dataKey="products_handled" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 10 }}
                  domain={[0, 'dataMax + 1']}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  tickFormatter={(value) => value.toString()}
                  label={{ 
                    value: 'Product Diversification: Number of Products Handled', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: 10,
                    style: { 
                      fill: '#9CA3AF', 
                      fontSize: 11, 
                      fontWeight: 500,
                      textAnchor: 'middle'
                    } 
                  }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 mb-2" title={data.fullName}>
                            {data.fullName}
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="border-b border-gray-200 pb-1 mb-1">
                              <p className="text-gray-600 text-xs uppercase tracking-wider">Position Metrics</p>
                            </div>
                            <p className="text-gray-700">Volume Efficiency: <span className="font-medium">{formatNumber(data.efficiency)} {volumeUnit === 'mt' ? 'MT' : 'L'}</span></p>
                            <p className="text-gray-700">Products Handled: <span className="font-medium">{data.products_handled} products</span></p>
                            <div className="border-b border-gray-200 pb-1 mb-1 mt-2">
                              <p className="text-gray-600 text-xs uppercase tracking-wider">Performance Data</p>
                            </div>
                            <p className="text-gray-700">Market Share: <span className="font-medium">{formatNumber(data.market_share)}%</span></p>
                            <p className="text-gray-700">Total Volume: <span className="font-medium">{formatNumber(data.volume)} {volumeUnit === 'mt' ? 'MT' : 'L'}</span></p>
                            <p className="text-gray-700">Active Period: <span className="font-medium">{data.active_months} months</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  data={efficiencyData} 
                  fill="#3B82F6"
                >
                  {efficiencyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.efficiency >= efficiencyQ3 && entry.products_handled >= diversityQ3 ? '#10B981' :  // Top quartile both metrics
                        entry.efficiency >= efficiencyMedian || entry.products_handled >= diversityMedian ? '#F59E0B' :  // Above median
                        '#EF4444'  // Below median both metrics
                      } 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* Performance Quadrants Legend */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-sm font-semibold text-gray-200 mb-3">Market Positioning Guide</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Market Leaders</p>
                    <p className="text-xs text-gray-400">High efficiency + Diversified portfolio</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Growth Phase</p>
                    <p className="text-xs text-gray-400">Building scale or expanding products</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Niche Players</p>
                    <p className="text-xs text-gray-400">Specialized or emerging companies</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  <span className="font-medium">Interpretation:</span> Position reflects operational maturity and market strategy. 
                  Companies progress rightward (efficiency) and upward (diversification) as they mature.
                </p>
              </div>
            </div>
        </ExpandableChart>
      </div>

      {/* Seasonal Patterns & Product Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpandableChart 
          title="Seasonal Pattern Analysis" 
          description="Average monthly volumes showing seasonal trends"
          icon={<Calendar className="h-5 w-5 text-white" />}
        >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={seasonalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 mb-2">{label}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">Avg Volume: {formatNumber(data.volume)} {volumeUnit === 'mt' ? 'MT' : 'Liters'}</p>
                            <p className="text-gray-700">Data Points: {data.dataPoints} years</p>
                            <p className="text-gray-700">Active: {data.active ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Peak Month:</span>
                <span className="text-green-400 ml-2">
                  {data.seasonality.peak_month || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Trough Month:</span>
                <span className="text-red-400 ml-2">
                  {data.seasonality.trough_month || 'N/A'}
                </span>
              </div>
            </div>
        </ExpandableChart>

        <ExpandableChart 
          title="Product Portfolio Composition" 
          description="Volume distribution across product categories"
          icon={<Package className="h-5 w-5 text-white" />}
        >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.product_portfolio.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="product_name" 
                  stroke="#9CA3AF" 
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                  formatter={(value: any) => formatNumber(value)}
                />
                <Bar 
                  dataKey={volumeUnit === 'mt' ? 'volume_mt' : 'volume_liters'} 
                  fill="#10B981" 
                  name={`Volume (${volumeUnit === 'mt' ? 'MT' : 'Liters'})`}
                />
              </BarChart>
            </ResponsiveContainer>
        </ExpandableChart>
      </div>
    </div>
  );
}