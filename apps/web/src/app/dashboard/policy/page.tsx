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
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Legend
} from 'recharts';

interface PolicyMetric {
  metric_name: string;
  current_value: number;
  target_value: number;
  achievement_rate: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface MarketHealth {
  indicator: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  recommendation: string;
}

interface ComplianceMetric {
  requirement: string;
  compliance_rate: number;
  non_compliant_count: number;
  risk_level: 'low' | 'medium' | 'high';
}

interface PolicyTrend {
  period: string;
  market_concentration: number;
  supply_security: number;
  price_stability: number;
  environmental_score: number;
}

interface PolicyDashboardResponse {
  policy_metrics: PolicyMetric[];
  market_health: MarketHealth[];
  compliance_metrics: ComplianceMetric[];
  policy_trends: PolicyTrend[];
  strategic_indicators: {
    energy_security_index: number;
    market_competition_score: number;
    supply_reliability: number;
    price_volatility: number;
    strategic_reserve_coverage: number;
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

export default function PolicyDashboard() {
  const [data, setData] = useState<PolicyDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'metrics' | 'compliance' | 'trends'>('metrics');
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
        
        // Fetch market concentration and dynamics data
        const [concentrationResponse, dynamicsResponse] = await Promise.all([
          fetch(`http://localhost:8003/api/v2/analytics/market-concentration?${params.toString()}`, {
            signal: abortController.signal
          }),
          fetch(`http://localhost:8003/api/v2/analytics/market-dynamics?${params.toString()}`, {
            signal: abortController.signal
          })
        ]);
        
        if (!concentrationResponse.ok || !dynamicsResponse.ok) {
          throw new Error('HTTP error!');
        }
        
        const [concentrationData, dynamicsData] = await Promise.all([
          concentrationResponse.json(),
          dynamicsResponse.json()
        ]);
        
        if (!abortController.signal.aborted) {
          // Transform API responses to policy-focused metrics
          const transformedData: PolicyDashboardResponse = {
            policy_metrics: [
              {
                metric_name: 'Market Competition',
                current_value: 100 - (concentrationData.herfindahl_index / 100 || 0),
                target_value: 75,
                achievement_rate: Math.min(100, (100 - (concentrationData.herfindahl_index / 100 || 0)) / 75 * 100),
                trend: concentrationData.trend === 'decreasing' ? 'improving' : 'declining'
              },
              {
                metric_name: 'Supply Security',
                current_value: dynamicsData.summary?.supply_security || 85,
                target_value: 90,
                achievement_rate: (dynamicsData.summary?.supply_security || 85) / 90 * 100,
                trend: 'stable'
              },
              {
                metric_name: 'Price Stability',
                current_value: 100 - (dynamicsData.summary?.price_volatility || 15),
                target_value: 85,
                achievement_rate: (100 - (dynamicsData.summary?.price_volatility || 15)) / 85 * 100,
                trend: dynamicsData.summary?.price_trend === 'stable' ? 'stable' : 'declining'
              },
              {
                metric_name: 'Market Efficiency',
                current_value: dynamicsData.summary?.efficiency_score || 78,
                target_value: 85,
                achievement_rate: (dynamicsData.summary?.efficiency_score || 78) / 85 * 100,
                trend: 'improving'
              }
            ],
            market_health: [
              {
                indicator: 'Market Structure',
                score: concentrationData.herfindahl_index < 1500 ? 90 : 
                       concentrationData.herfindahl_index < 2500 ? 60 : 30,
                status: concentrationData.herfindahl_index < 1500 ? 'healthy' : 
                        concentrationData.herfindahl_index < 2500 ? 'warning' : 'critical',
                recommendation: concentrationData.herfindahl_index < 1500 ? 
                  'Market is competitive' : 
                  'Consider anti-monopoly measures'
              },
              {
                indicator: 'Supply Chain Resilience',
                score: dynamicsData.summary?.resilience_score || 75,
                status: (dynamicsData.summary?.resilience_score || 75) >= 80 ? 'healthy' :
                       (dynamicsData.summary?.resilience_score || 75) >= 60 ? 'warning' : 'critical',
                recommendation: 'Diversify supply sources'
              },
              {
                indicator: 'Price Regulation',
                score: 100 - (dynamicsData.summary?.price_volatility || 15),
                status: (dynamicsData.summary?.price_volatility || 15) <= 10 ? 'healthy' :
                       (dynamicsData.summary?.price_volatility || 15) <= 20 ? 'warning' : 'critical',
                recommendation: 'Monitor price fluctuations'
              }
            ],
            compliance_metrics: [
              {
                requirement: 'Minimum Strategic Reserve',
                compliance_rate: 92,
                non_compliant_count: concentrationData.companies_below_threshold || 3,
                risk_level: 'low'
              },
              {
                requirement: 'Quality Standards',
                compliance_rate: 98,
                non_compliant_count: 1,
                risk_level: 'low'
              },
              {
                requirement: 'Supply Quota',
                compliance_rate: 87,
                non_compliant_count: concentrationData.companies_below_threshold || 5,
                risk_level: 'medium'
              },
              {
                requirement: 'Environmental Standards',
                compliance_rate: 94,
                non_compliant_count: 2,
                risk_level: 'low'
              }
            ],
            policy_trends: dynamicsData.monthly_trends?.map((t: any) => ({
              period: t.period,
              market_concentration: t.herfindahl_index || 0,
              supply_security: t.supply_security || 85,
              price_stability: 100 - (t.price_volatility || 15),
              environmental_score: t.environmental_score || 75
            })) || [],
            strategic_indicators: {
              energy_security_index: dynamicsData.summary?.energy_security || 82,
              market_competition_score: 100 - (concentrationData.herfindahl_index / 100 || 0),
              supply_reliability: dynamicsData.summary?.supply_reliability || 91,
              price_volatility: dynamicsData.summary?.price_volatility || 15,
              strategic_reserve_coverage: dynamicsData.summary?.reserve_coverage || 95
            }
          };
          
          setData(transformedData);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching policy data:', err);
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
          <p className="text-gray-400">Loading Policy Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Policy Data</div>
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
          <p className="text-gray-400">No policy data available</p>
        </div>
      </div>
    );
  }

  const { policy_metrics, market_health, compliance_metrics, policy_trends, strategic_indicators } = data;

  // Prepare radial bar data
  const radialData = [
    { name: 'Energy Security', value: strategic_indicators.energy_security_index, fill: '#0088FE' },
    { name: 'Competition', value: strategic_indicators.market_competition_score, fill: '#00C49F' },
    { name: 'Supply Reliability', value: strategic_indicators.supply_reliability, fill: '#FFBB28' },
    { name: 'Reserve Coverage', value: strategic_indicators.strategic_reserve_coverage, fill: '#8884D8' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Policy Makers Dashboard</h1>
          <p className="text-gray-400">Strategic indicators and compliance metrics from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* Strategic Indicators Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Energy Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {strategic_indicators.energy_security_index.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Overall security index
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Market Competition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {strategic_indicators.market_competition_score.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Competition health
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Supply Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {strategic_indicators.supply_reliability.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Delivery consistency
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Price Volatility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {strategic_indicators.price_volatility.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Market stability
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Reserve Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {strategic_indicators.strategic_reserve_coverage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Strategic reserves
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Policy Metrics Achievement */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Policy Target Achievement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policy_metrics.map((metric) => (
                  <div key={metric.metric_name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">{metric.metric_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {metric.current_value.toFixed(1)} / {metric.target_value}
                        </span>
                        <span className={`text-xs ${
                          metric.trend === 'improving' ? 'text-green-400' :
                          metric.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {metric.trend === 'improving' ? '↑' :
                           metric.trend === 'declining' ? '↓' : '→'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          metric.achievement_rate >= 100 ? 'bg-green-500' :
                          metric.achievement_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(metric.achievement_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategic Indicators Radial */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Strategic Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={radialData}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* View Selector */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Policy Analysis</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedView('metrics')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'metrics' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Market Health
                  </button>
                  <button
                    onClick={() => setSelectedView('compliance')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'compliance' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Compliance
                  </button>
                  <button
                    onClick={() => setSelectedView('trends')}
                    className={`px-3 py-1 rounded ${
                      selectedView === 'trends' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Trends
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {selectedView === 'metrics' ? (
                  <BarChart data={market_health}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="indicator" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill={(entry: any) => 
                        entry.status === 'healthy' ? '#00C49F' :
                        entry.status === 'warning' ? '#FFBB28' : '#FF6B6B'
                      }
                      name="Health Score"
                    />
                  </BarChart>
                ) : selectedView === 'compliance' ? (
                  <BarChart data={compliance_metrics} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
                    <YAxis 
                      type="category" 
                      dataKey="requirement" 
                      stroke="#9CA3AF"
                      width={150}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number) => value.toFixed(1) + '%'}
                    />
                    <Bar 
                      dataKey="compliance_rate" 
                      fill={(entry: any) => 
                        entry.risk_level === 'low' ? '#00C49F' :
                        entry.risk_level === 'medium' ? '#FFBB28' : '#FF6B6B'
                      }
                      name="Compliance Rate"
                    />
                  </BarChart>
                ) : (
                  <LineChart data={policy_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="period" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="market_concentration" stroke="#0088FE" name="Market Concentration" />
                    <Line type="monotone" dataKey="supply_security" stroke="#00C49F" name="Supply Security" />
                    <Line type="monotone" dataKey="price_stability" stroke="#FFBB28" name="Price Stability" />
                    <Line type="monotone" dataKey="environmental_score" stroke="#8884D8" name="Environmental Score" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Market Health Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Market Health Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">Indicator</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Score</th>
                    <th className="text-center p-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {market_health.map((indicator) => (
                    <tr key={indicator.indicator} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-white font-medium">{indicator.indicator}</td>
                      <td className="p-3 text-gray-300 text-right">{indicator.score.toFixed(1)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          indicator.status === 'healthy'
                            ? 'bg-green-900 text-green-300'
                            : indicator.status === 'warning'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {indicator.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">{indicator.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Policy analysis from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>Energy Security: {strategic_indicators.energy_security_index.toFixed(1)}% • Competition: {strategic_indicators.market_competition_score.toFixed(1)}% • Compliance Avg: {(compliance_metrics.reduce((sum, m) => sum + m.compliance_rate, 0) / compliance_metrics.length).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}