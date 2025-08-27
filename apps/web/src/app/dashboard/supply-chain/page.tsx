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
  ComposedChart,
  Sankey,
  Layer,
  Rectangle,
  Legend
} from 'recharts';

interface SupplyChainFlow {
  source: string;
  target: string;
  value: number;
  product: string;
}

interface EfficiencyMetric {
  metric_name: string;
  value: number;
  benchmark: number;
  status: 'good' | 'warning' | 'critical';
}

interface VolumeFlow {
  period: string;
  bdc_inflow: number;
  omc_outflow: number;
  net_flow: number;
  efficiency_rate: number;
}

interface ProductFlow {
  product_name: string;
  bdc_volume: number;
  omc_volume: number;
  total_volume: number;
  flow_efficiency: number;
  bottleneck_score: number;
}

interface SupplyChainResponse {
  supply_flows: SupplyChainFlow[];
  efficiency_metrics: EfficiencyMetric[];
  volume_flows: VolumeFlow[];
  product_flows: ProductFlow[];
  supply_chain_kpis: {
    throughput_rate: number;
    cycle_time_days: number;
    inventory_turnover: number;
    delivery_reliability: number;
    capacity_utilization: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4'];

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

export default function SupplyChainDashboard() {
  const [data, setData] = useState<SupplyChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'efficiency'>('volume');
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
        
        // Fetch supply chain efficiency data
        const endpoint = `http://localhost:8003/api/v2/analytics/supply-chain-efficiency?${params.toString()}`;
        
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (!abortController.signal.aborted) {
          // Transform API response to match our interface
          const transformedData: SupplyChainResponse = {
            supply_flows: [],
            efficiency_metrics: result.efficiency_metrics?.map((m: any) => ({
              metric_name: m.metric,
              value: m.value,
              benchmark: m.benchmark || 0,
              status: m.value >= (m.benchmark || 0) * 0.95 ? 'good' : 
                      m.value >= (m.benchmark || 0) * 0.8 ? 'warning' : 'critical'
            })) || [],
            volume_flows: result.monthly_flows || [],
            product_flows: result.product_flows || [],
            supply_chain_kpis: {
              throughput_rate: result.kpis?.throughput_rate || 0,
              cycle_time_days: result.kpis?.cycle_time || 0,
              inventory_turnover: result.kpis?.inventory_turnover || 0,
              delivery_reliability: result.kpis?.delivery_reliability || 95,
              capacity_utilization: result.kpis?.capacity_utilization || 0
            }
          };
          
          setData(transformedData);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching supply chain data:', err);
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
          <p className="text-gray-400">Loading Supply Chain Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Supply Chain Data</div>
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
          <p className="text-gray-400">No supply chain data available</p>
        </div>
      </div>
    );
  }

  const { efficiency_metrics, volume_flows, product_flows, supply_chain_kpis } = data;

  // Calculate totals
  const totalBDCVolume = product_flows.reduce((sum, p) => sum + p.bdc_volume, 0);
  const totalOMCVolume = product_flows.reduce((sum, p) => sum + p.omc_volume, 0);
  const avgEfficiency = product_flows.reduce((sum, p) => sum + p.flow_efficiency, 0) / (product_flows.length || 1);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Supply Chain Analytics Dashboard</h1>
          <p className="text-gray-400">Supply chain efficiency and flow analysis from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Throughput Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(supply_chain_kpis.throughput_rate, 'L/day')}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Daily processing capacity
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Cycle Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {supply_chain_kpis.cycle_time_days.toFixed(1)} days
              </div>
              <div className="text-sm text-gray-400 mt-1">
                End-to-end delivery
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Inventory Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {supply_chain_kpis.inventory_turnover.toFixed(1)}x
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Annual turnover rate
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Delivery Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {supply_chain_kpis.delivery_reliability.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                On-time delivery rate
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Capacity Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {supply_chain_kpis.capacity_utilization.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Infrastructure usage
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Volume Flow Analysis */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Supply Chain Volume Flow</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMetric('volume')}
                    className={`px-3 py-1 rounded ${
                      selectedMetric === 'volume' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setSelectedMetric('efficiency')}
                    className={`px-3 py-1 rounded ${
                      selectedMetric === 'efficiency' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Efficiency
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={volume_flows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" />
                  <YAxis yAxisId="left" stroke="#9CA3AF" tickFormatter={(v) => formatNumber(v)} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'efficiency_rate') return [value.toFixed(1) + '%', 'Efficiency'];
                      return [formatVolume(value, 'L'), name];
                    }}
                  />
                  <Legend />
                  {selectedMetric === 'volume' ? (
                    <>
                      <Bar yAxisId="left" dataKey="bdc_inflow" fill="#0088FE" name="BDC Inflow" />
                      <Bar yAxisId="left" dataKey="omc_outflow" fill="#00C49F" name="OMC Outflow" />
                      <Line yAxisId="left" type="monotone" dataKey="net_flow" stroke="#FF8042" name="Net Flow" />
                    </>
                  ) : (
                    <>
                      <Area yAxisId="right" type="monotone" dataKey="efficiency_rate" stroke="#8884D8" fill="#8884D8" fillOpacity={0.3} name="Efficiency Rate" />
                      <Line yAxisId="left" type="monotone" dataKey="net_flow" stroke="#FF8042" name="Net Flow" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Flow Efficiency */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Product Flow Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={product_flows} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" domain={[0, 100]} />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    stroke="#9CA3AF"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => value.toFixed(1) + '%'}
                  />
                  <Bar dataKey="flow_efficiency" fill="#0088FE" name="Flow Efficiency" />
                  <Bar dataKey="bottleneck_score" fill="#FF8042" name="Bottleneck Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Efficiency Metrics Gauge */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Supply Chain Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {efficiency_metrics.map((metric) => (
                  <div key={metric.metric_name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">{metric.metric_name}</span>
                      <span className={`text-sm font-medium ${
                        metric.status === 'good' ? 'text-green-400' :
                        metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {metric.value.toFixed(1)}% / {metric.benchmark.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          metric.status === 'good' ? 'bg-green-500' :
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(metric.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Flow Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Product Flow Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">Product</th>
                    <th className="text-right p-3 text-gray-400 font-medium">BDC Volume</th>
                    <th className="text-right p-3 text-gray-400 font-medium">OMC Volume</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Total Volume</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Flow Efficiency</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Bottleneck Score</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product_flows.map((product, index) => (
                    <tr key={product.product_name} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-white font-medium">{product.product_name}</td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(product.bdc_volume, 'L')}</td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(product.omc_volume, 'L')}</td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(product.total_volume, 'L')}</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${
                          product.flow_efficiency >= 80 ? 'text-green-400' :
                          product.flow_efficiency >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {product.flow_efficiency.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${
                          product.bottleneck_score < 20 ? 'text-green-400' :
                          product.bottleneck_score < 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {product.bottleneck_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.flow_efficiency >= 80 && product.bottleneck_score < 20
                            ? 'bg-green-900 text-green-300'
                            : product.flow_efficiency >= 60 && product.bottleneck_score < 40
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {product.flow_efficiency >= 80 && product.bottleneck_score < 20
                            ? 'Optimal'
                            : product.flow_efficiency >= 60 && product.bottleneck_score < 40
                            ? 'Moderate'
                            : 'Critical'}
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
          <p>Supply chain analysis from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>BDC Volume: {formatVolume(totalBDCVolume, 'L')} • OMC Volume: {formatVolume(totalOMCVolume, 'L')} • Avg Efficiency: {avgEfficiency.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}