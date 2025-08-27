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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface CompanyPerformance {
  company_id: number;
  company_name: string;
  company_type: string;
  total_volume_liters: number;
  total_volume_mt: number;
  total_volume_kg: number;
  total_transactions: number;
  unique_products: number;
  avg_transaction_size: number;
  market_share: number;
  volume_rank: number;
  transaction_rank: number;
  efficiency_score: number;
}

interface CompanyTrend {
  company_id: number;
  company_name: string;
  period: string;
  volume_liters: number;
  volume_mt: number;
  volume_kg: number;
  transactions: number;
  growth_rate: number;
}

interface CompanyBenchmark {
  metric: string;
  company_value: number;
  industry_avg: number;
  top_performer: number;
  percentile: number;
}

interface CompanyAnalysisResponse {
  company_performance: CompanyPerformance[];
  company_trends: CompanyTrend[];
  company_benchmarks: CompanyBenchmark[];
  market_concentration: {
    herfindahl_index: number;
    top5_share: number;
    top10_share: number;
    market_leader: string;
    leader_share: number;
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

export default function CompanyAnalysisDashboard() {
  const [data, setData] = useState<CompanyAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [comparisonCompany, setComparisonCompany] = useState<string>('');
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
        
        // Fetch company benchmarking data
        const endpoint = `http://localhost:8003/api/v2/analytics/company-benchmarking?${params.toString()}`;
        
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (!abortController.signal.aborted) {
          // Transform API response to match our interface
          const transformedData: CompanyAnalysisResponse = {
            company_performance: result.companies || [],
            company_trends: [],
            company_benchmarks: result.benchmarks || [],
            market_concentration: {
              herfindahl_index: result.market_metrics?.herfindahl_index || 0,
              top5_share: result.market_metrics?.top_5_share || 0,
              top10_share: result.market_metrics?.top_10_share || 0,
              market_leader: result.companies?.[0]?.company_name || 'N/A',
              leader_share: result.companies?.[0]?.market_share || 0
            }
          };
          
          setData(transformedData);
          
          // Set first company as selected by default
          if (transformedData.company_performance.length > 0 && !selectedCompany) {
            setSelectedCompany(transformedData.company_performance[0].company_name);
            if (transformedData.company_performance.length > 1) {
              setComparisonCompany(transformedData.company_performance[1].company_name);
            }
          }
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching company analysis data:', err);
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
          <p className="text-gray-400">Loading Company Analysis Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Company Analysis</div>
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

  if (!data || !data.company_performance.length) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No company data available</p>
        </div>
      </div>
    );
  }

  const { company_performance, market_concentration } = data;

  // Get selected company data
  const selectedCompanyData = company_performance.find(c => c.company_name === selectedCompany);
  const comparisonCompanyData = company_performance.find(c => c.company_name === comparisonCompany);

  // Prepare data for radar chart comparison
  const radarData = selectedCompanyData && comparisonCompanyData ? [
    {
      metric: 'Market Share',
      [selectedCompany]: selectedCompanyData.market_share,
      [comparisonCompany]: comparisonCompanyData.market_share
    },
    {
      metric: 'Products',
      [selectedCompany]: selectedCompanyData.unique_products,
      [comparisonCompany]: comparisonCompanyData.unique_products
    },
    {
      metric: 'Efficiency',
      [selectedCompany]: selectedCompanyData.efficiency_score,
      [comparisonCompany]: comparisonCompanyData.efficiency_score
    },
    {
      metric: 'Transactions',
      [selectedCompany]: Math.min(selectedCompanyData.total_transactions / 100, 100),
      [comparisonCompany]: Math.min(comparisonCompanyData.total_transactions / 100, 100)
    },
    {
      metric: 'Volume Rank',
      [selectedCompany]: Math.max(100 - selectedCompanyData.volume_rank * 5, 0),
      [comparisonCompany]: Math.max(100 - comparisonCompanyData.volume_rank * 5, 0)
    }
  ] : [];

  // Prepare scatter plot data for market position
  const scatterData = company_performance.map(company => ({
    x: company.total_volume_liters / 1e6, // Convert to millions
    y: company.efficiency_score,
    z: company.market_share,
    name: company.company_name,
    type: company.company_type
  }));

  // Calculate summary statistics
  const totalVolume = company_performance.reduce((sum, c) => sum + c.total_volume_liters, 0);
  const totalTransactions = company_performance.reduce((sum, c) => sum + c.total_transactions, 0);
  const avgEfficiency = company_performance.reduce((sum, c) => sum + c.efficiency_score, 0) / company_performance.length;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Company Analysis Dashboard</h1>
          <p className="text-gray-400">Company-level performance analytics from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* Market Concentration KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Market Leader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white truncate">
                {market_concentration.market_leader}
              </div>
              <div className="text-sm text-green-400 mt-1">
                {market_concentration.leader_share.toFixed(2)}% share
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">HHI Index</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {market_concentration.herfindahl_index.toFixed(0)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {market_concentration.herfindahl_index < 1500 ? 'Competitive' : 
                 market_concentration.herfindahl_index < 2500 ? 'Moderate' : 'Concentrated'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Top 5 Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {market_concentration.top5_share.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Market concentration
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {company_performance.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Active in period
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Avg Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {avgEfficiency.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Industry average
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Comparison Section */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Company Comparison</CardTitle>
                <div className="flex gap-4">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {company_performance.map((company, index) => (
                      <option key={`select1-${company.company_id}-${index}`} value={company.company_name}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 self-center">vs</span>
                  <select
                    value={comparisonCompany}
                    onChange={(e) => setComparisonCompany(e.target.value)}
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {company_performance.map((company, index) => (
                      <option key={`select2-${company.company_id}-${index}`} value={company.company_name}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" />
                  <Radar 
                    name={selectedCompany} 
                    dataKey={selectedCompany} 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.3} 
                  />
                  <Radar 
                    name={comparisonCompany} 
                    dataKey={comparisonCompany} 
                    stroke="#00C49F" 
                    fill="#00C49F" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Companies Bar Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Companies by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={company_performance.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" tickFormatter={(v) => formatVolume(v, 'L')} />
                  <YAxis 
                    type="category" 
                    dataKey="company_name" 
                    stroke="#9CA3AF"
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => formatVolume(value, 'L')}
                  />
                  <Bar dataKey="total_volume_liters" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Position Scatter Plot */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Market Position Analysis</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Volume vs Efficiency (bubble size = market share)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    stroke="#9CA3AF"
                    label={{ value: 'Volume (Million L)', position: 'insideBottom', offset: -10, style: { fill: '#9CA3AF' } }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    stroke="#9CA3AF"
                    label={{ value: 'Efficiency Score', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'x') return [formatNumber(value) + 'M L', 'Volume'];
                      if (name === 'y') return [value.toFixed(1) + '%', 'Efficiency'];
                      if (name === 'z') return [value.toFixed(2) + '%', 'Market Share'];
                      return [value, name];
                    }}
                  />
                  <Scatter 
                    name="Companies" 
                    data={scatterData} 
                    fill="#0088FE"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Company Performance Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Company Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">Rank</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Company</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Type</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (L)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (MT)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Transactions</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Products</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Market Share</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {company_performance.slice(0, 20).map((company, index) => (
                    <tr key={`table-${company.company_id}-${index}`} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-gray-300">{index + 1}</td>
                      <td className="p-3 text-white font-medium">{company.company_name}</td>
                      <td className="p-3 text-gray-300">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          company.company_type === 'BDC' 
                            ? 'bg-blue-900 text-blue-300' 
                            : 'bg-green-900 text-green-300'
                        }`}>
                          {company.company_type}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(company.total_volume_liters, 'L')}</td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(company.total_volume_mt, 'MT')}</td>
                      <td className="p-3 text-gray-300 text-right">{formatNumber(company.total_transactions)}</td>
                      <td className="p-3 text-gray-300 text-right">{company.unique_products}</td>
                      <td className="p-3 text-green-400 text-right font-medium">{company.market_share.toFixed(2)}%</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${
                          company.efficiency_score >= 80 ? 'text-green-400' :
                          company.efficiency_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {company.efficiency_score.toFixed(1)}%
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
          <p>Company analysis from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>{company_performance.length} companies • {formatNumber(totalTransactions)} transactions • {formatVolume(totalVolume, 'L')} total volume</p>
        </div>
      </div>
    </div>
  );
}