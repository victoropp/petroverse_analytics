'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpandableChart } from '@/components/ui/expandable-chart';
import { AlertCircle, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Shield } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import GlobalFilters from '@/components/filters/GlobalFilters';
import { useGlobalFilters } from '@/lib/global-filters';

interface InvestorData {
  market_concentration: {
    timeline_data: Array<{
      period: string;
      company_type: string;
      hhi: number;
      active_companies: number;
      top_company_share: number;
      competition_intensity: number;
      share_volatility: number;
      concentration_level: string;
    }>;
    kpis: {
      market_concentration_index: {
        bdc_current: number;
        omc_current: number;
        bdc_trend: string;
        omc_trend: string;
      };
      market_share_stability: {
        bdc_volatility: number;
        omc_volatility: number;
      };
      competition_intensity: {
        bdc_avg_competitors: number;
        omc_avg_competitors: number;
      };
    };
    summary: {
      total_periods: number;
      avg_bdc_hhi: number;
      avg_omc_hhi: number;
    };
  };
  volume_forecast: {
    historical_data: Array<{
      period: string;
      actual_volume: number;
      transactions: number;
      companies: number;
    }>;
    forecast_data: Array<{
      period: string;
      predicted_volume: number;
      confidence_lower: number;
      confidence_upper: number;
    }>;
    metrics: {
      mape: number;
      trend_direction: string;
      seasonality_strength: number;
    };
  };
  supply_chain_metrics: {
    efficiency_scores: Array<{
      period: string;
      overall_efficiency: number;
      velocity_score: number;
      reliability_score: number;
      throughput: number;
    }>;
    kpis: {
      economic_efficiency_ratio: number;
      supply_chain_velocity: number;
      average_throughput: number;
    };
  };
  company_performance: {
    top_companies: Array<{
      company_id: number;
      company_name: string;
      company_type: string;
      volume_mt: number;
      market_share: number;
      growth_rate: number;
      efficiency_score: number;
      products_handled: number;
      risk_score: number;
    }>;
    market_leaders: {
      bdc_leader: string;
      omc_leader: string;
      bdc_leader_share: number;
      omc_leader_share: number;
    };
  };
  product_risk_analysis: {
    risk_analysis: Array<{
      product_name: string;
      product_category: string;
      supplier_count: number;
      total_volume: number;
      dependency_risk: string;
      diversification_index: number;
      risk_score: number;
    }>;
    kpis: {
      product_diversification_index: {
        overall: number;
        best_product: string;
        worst_product: string;
      };
      risk_concentration_score: {
        critical_products: number;
        high_risk_products: number;
        overall_risk: number;
      };
    };
  };
}

// Color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function InvestorDashboard() {
  const [data, setData] = useState<InvestorData | null>(null);
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

      const timeoutId = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);

          const params = new URLSearchParams();
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          
          // Fetch multiple endpoints in parallel
          const [
            concentrationRes,
            forecastRes,
            supplyChainRes,
            executiveSummaryRes,
            productRiskRes
          ] = await Promise.all([
            fetch(`http://localhost:8003/api/v2/analytics/market-concentration?${params}`, {
              signal: abortController.signal
            }),
            fetch(`http://localhost:8003/api/v2/analytics/volume-forecast?periods=12&${params}`, {
              signal: abortController.signal
            }),
            fetch(`http://localhost:8003/api/v2/analytics/supply-chain-efficiency?${params}`, {
              signal: abortController.signal
            }),
            fetch(`http://localhost:8003/api/v2/executive/summary/filtered?top_n=10&${params}`, {
              signal: abortController.signal
            }),
            fetch(`http://localhost:8003/api/v2/analytics/product-dependency-risk?${params}`, {
              signal: abortController.signal
            })
          ]);

          const [
            concentrationData,
            forecastData,
            supplyChainData,
            executiveSummaryData,
            productRiskData
          ] = await Promise.all([
            concentrationRes.json(),
            forecastRes.json(),
            supplyChainRes.json(),
            executiveSummaryRes.json(),
            productRiskRes.json()
          ]);

          // Process and combine the data
          setData({
            market_concentration: concentrationData,
            volume_forecast: forecastData,
            supply_chain_metrics: supplyChainData,
            company_performance: {
              top_companies: executiveSummaryData.top_companies || [],
              market_leaders: executiveSummaryData.market_leaders || {
                bdc_leader: 'N/A',
                omc_leader: 'N/A',
                bdc_leader_share: 0,
                omc_leader_share: 0
              }
            },
            product_risk_analysis: productRiskData
          });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log('Request was cancelled');
          } else {
            setError(err.message || 'Failed to load investor analytics');
            console.error('Error fetching investor data:', err);
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
    if (num === null || num === undefined || isNaN(Number(num))) return '0';
    const numValue = Number(num);
    if (numValue >= 1e9) return `${(numValue / 1e9).toFixed(2)}B`;
    if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(2)}M`;
    if (numValue >= 1e3) return `${(numValue / 1e3).toFixed(2)}K`;
    return numValue.toFixed(2);
  };

  if (loading) return (
    <div className="p-6">
      <GlobalFilters />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading investor analytics...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <GlobalFilters />
      <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <div className="text-red-200">{error}</div>
      </div>
    </div>
  );

  if (!data) return null;

  // Prepare chart data from actual database results
  const concentrationTrends = data.market_concentration?.timeline_data || [];
  const bdcTrends = concentrationTrends.filter(d => d.company_type === 'BDC');
  const omcTrends = concentrationTrends.filter(d => d.company_type === 'OMC');
  
  const concentrationChartData = [...new Set(concentrationTrends.map(d => d.period))].sort().map(period => ({
    period,
    bdc_hhi: bdcTrends.find(d => d.period === period)?.hhi || 0,
    omc_hhi: omcTrends.find(d => d.period === period)?.hhi || 0,
    bdc_companies: bdcTrends.find(d => d.period === period)?.active_companies || 0,
    omc_companies: omcTrends.find(d => d.period === period)?.active_companies || 0
  }));

  const companyPerformanceData = data.company_performance?.top_companies || [];
  
  const productRiskData = data.product_risk_analysis?.risk_analysis || [];

  const supplyChainData = data.supply_chain_metrics?.efficiency_scores || [];

  // KPIs from actual data
  const kpis = {
    market_concentration: data.market_concentration?.kpis?.market_concentration_index || {},
    share_stability: data.market_concentration?.kpis?.market_share_stability || {},
    competition: data.market_concentration?.kpis?.competition_intensity || {},
    efficiency_ratio: data.supply_chain_metrics?.kpis?.economic_efficiency_ratio || 0,
    supply_velocity: data.supply_chain_metrics?.kpis?.supply_chain_velocity || 0,
    diversification: data.product_risk_analysis?.kpis?.product_diversification_index?.overall || 0,
    risk_score: data.product_risk_analysis?.kpis?.risk_concentration_score?.overall_risk || 0
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Investor & Financial Analytics</h1>
          <p className="text-gray-400 mt-1">Market concentration, risk analysis, and financial metrics from database</p>
        </div>
        <GlobalFilters />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Market Concentration (HHI)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              BDC: {formatNumber(kpis.market_concentration.bdc_current)}
            </div>
            <p className="text-xs text-gray-500 mt-1">OMC: {formatNumber(kpis.market_concentration.omc_current)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Market Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white truncate">
              {data.company_performance?.market_leaders?.bdc_leader || 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share: {formatNumber(data.company_performance?.market_leaders?.bdc_leader_share)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Supply Chain Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(kpis.efficiency_ratio)}</div>
            <p className="text-xs text-gray-500 mt-1">Economic Efficiency Ratio</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Risk Concentration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(kpis.risk_score)}%</div>
            <p className="text-xs text-gray-500 mt-1">Overall Risk Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Market Concentration Trends */}
      <ExpandableChart 
        title="Market Concentration Trends (HHI)" 
        description="Historical Herfindahl-Hirschman Index trends for BDC and OMC markets"
        icon={<BarChart3 className="h-5 w-5 text-white" />}
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={concentrationChartData.slice(-24)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="period" 
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              label={{ value: 'HHI Index', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bdc_hhi" 
              stroke="#3B82F6" 
              name="BDC HHI" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="omc_hhi" 
              stroke="#10B981" 
              name="OMC HHI" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ExpandableChart>

      {/* Company Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpandableChart 
          title="Company Performance Metrics" 
          description="Top companies by market share and growth"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
        >
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="market_share" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                label={{ value: 'Market Share (%)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 11 } }}
              />
              <YAxis 
                dataKey="efficiency_score" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                label={{ value: 'Efficiency Score', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg">
                        <p className="font-semibold text-white mb-2">{data.company_name}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-400">Type: {data.company_type}</p>
                          <p className="text-gray-400">Market Share: {formatNumber(data.market_share)}%</p>
                          <p className="text-gray-400">Volume: {formatNumber(data.volume_mt)} MT</p>
                          <p className="text-gray-400">Products: {data.products_handled}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={companyPerformanceData.slice(0, 20)} 
                fill="#3B82F6"
              >
                {companyPerformanceData.slice(0, 20).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.company_type === 'BDC' ? '#3B82F6' : '#10B981'} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ExpandableChart>

        {/* Product Risk Matrix */}
        <ExpandableChart 
          title="Product Risk Analysis" 
          description="Product dependency and diversification risk assessment"
          icon={<Shield className="h-5 w-5 text-white" />}
        >
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={productRiskData.slice(0, 9)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="product_name" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#9CA3AF" 
                tick={{ fontSize: 10 }}
                label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
              />
              <Bar 
                dataKey="risk_score" 
                fill="#EF4444"
              >
                {productRiskData.slice(0, 9).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.dependency_risk === 'Critical' ? '#EF4444' :
                      entry.dependency_risk === 'High' ? '#F59E0B' :
                      entry.dependency_risk === 'Medium' ? '#F59E0B' :
                      '#10B981'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </div>

      {/* Supply Chain Efficiency Trends */}
      <ExpandableChart 
        title="Supply Chain Efficiency Metrics" 
        description="Supply chain velocity and efficiency trends over time"
        icon={<Activity className="h-5 w-5 text-white" />}
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={supplyChainData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="period" 
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF" 
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overall_efficiency" 
              stroke="#3B82F6" 
              name="Overall Efficiency" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="velocity_score" 
              stroke="#10B981" 
              name="Velocity Score" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="reliability_score" 
              stroke="#F59E0B" 
              name="Reliability Score" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ExpandableChart>

      {/* Top Companies Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Top Companies by Volume</CardTitle>
          <CardDescription className="text-gray-400">
            Leading companies ranked by total volume and market metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Volume (MT)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Market Share</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Growth Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {companyPerformanceData.slice(0, 10).map((company, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-white">{company.company_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{company.company_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatNumber(company.volume_mt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatNumber(company.market_share)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{company.products_handled}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`inline-flex items-center ${company.growth_rate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {company.growth_rate > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {formatNumber(Math.abs(company.growth_rate))}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}