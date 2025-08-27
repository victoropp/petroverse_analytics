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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface ProductPerformance {
  product_name: string;
  product_category: string;
  total_volume_liters: number;
  total_volume_mt: number;
  total_volume_kg: number;
  total_transactions: number;
  bdc_volume_liters: number;
  omc_volume_liters: number;
  bdc_volume_mt: number;
  omc_volume_mt: number;
  bdc_volume_kg: number;
  omc_volume_kg: number;
  market_share_percent: number;
}

interface ProductTrend {
  product_name: string;
  period: string;
  volume_liters: number;
  volume_mt: number;
  volume_kg: number;
}

interface ProductsResponse {
  product_performance: ProductPerformance[];
  product_trends: ProductTrend[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4'];

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatVolume(volume: number): string {
  return formatNumber(volume) + ' L';
}

function formatMT(volume: number): string {
  return formatNumber(volume) + ' MT';
}

export default function ProductsDashboard() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Global filters integration
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
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = getFilterParams();
        const endpoint = `http://localhost:8003/api/v2/products/analysis?${params.toString()}`;
        
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Only update if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setData(result);
          // Set first product as selected by default
          if (result.product_performance.length > 0 && !selectedProduct) {
            setSelectedProduct(result.product_performance[0].product_name);
          }
          setError(null);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching products data:', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    // Add small debounce to prevent rapid filter changes
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    
    // Cleanup
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
          <p className="text-gray-400">Loading Products Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Products Dashboard</div>
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
          <p className="text-gray-400">No products data available</p>
        </div>
      </div>
    );
  }

  const { product_performance, product_trends } = data;

  // Calculate totals
  const totalVolume = product_performance.reduce((sum, product) => sum + product.total_volume_liters, 0);
  const totalTransactions = product_performance.reduce((sum, product) => sum + product.total_transactions, 0);
  const totalMT = product_performance.reduce((sum, product) => sum + product.total_volume_mt, 0);

  // Get trends for selected product
  const selectedProductTrends = product_trends.filter(trend => trend.product_name === selectedProduct);

  // Group products by category for pie chart
  const categoryData = product_performance.reduce((acc, product) => {
    const existing = acc.find(item => item.category === product.product_category);
    if (existing) {
      existing.volume += product.total_volume_liters;
      existing.transactions += product.total_transactions;
    } else {
      acc.push({
        category: product.product_category,
        volume: product.total_volume_liters,
        transactions: product.total_transactions
      });
    }
    return acc;
  }, [] as Array<{category: string, volume: number, transactions: number}>);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Products Analytics Dashboard</h1>
          <p className="text-gray-400">Petroleum product performance analysis from standardized database</p>
        </div>
        
        {/* Global Filters */}
        <div className="mb-6">
          <GlobalFilters />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatVolume(totalVolume)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {formatMT(totalMT)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Product Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {categoryData.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Standardized categories
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(totalTransactions)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Across all products
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400 text-sm font-medium">Top Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {product_performance[0]?.product_name || 'N/A'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {product_performance[0]?.market_share_percent || 0}% market share
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Selector and Charts */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Product Trend Analysis</CardTitle>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  {product_performance.map((product) => (
                    <option key={product.product_name} value={product.product_name}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={selectedProductTrends.slice(-12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'volume_liters') return [formatVolume(value), 'Volume'];
                      if (name === 'volume_mt') return [formatMT(value), 'Volume (MT)'];
                      return [value, name];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume_liters" 
                    stroke="#0088FE" 
                    fill="#0088FE"
                    fillOpacity={0.3}
                    name="volume_liters"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Performance Bar Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Product Volume Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={product_performance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" tickFormatter={formatNumber} />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    stroke="#9CA3AF"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [formatVolume(value), 'Volume']}
                  />
                  <Bar dataKey="total_volume_liters" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution Pie Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Volume by Product Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="volume"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatVolume(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* BDC vs OMC Comparison */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">BDC vs OMC Volume Distribution by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={product_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="product_name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number) => formatVolume(value)}
                />
                <Bar dataKey="bdc_volume_liters" fill="#0088FE" name="BDC Volume" />
                <Bar dataKey="omc_volume_liters" fill="#00C49F" name="OMC Volume" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Performance Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Product Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-gray-400 font-medium">Product</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Category</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (L)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Volume (MT)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Transactions</th>
                    <th className="text-right p-3 text-gray-400 font-medium">BDC/OMC Split</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Market Share</th>
                  </tr>
                </thead>
                <tbody>
                  {product_performance.map((product, index) => (
                    <tr key={product.product_name} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-3 text-white font-medium">{product.product_name}</td>
                      <td className="p-3 text-gray-300">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${COLORS[index % COLORS.length]}20`, 
                            color: COLORS[index % COLORS.length] 
                          }}
                        >
                          {product.product_category}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300 text-right">{formatVolume(product.total_volume_liters)}</td>
                      <td className="p-3 text-gray-300 text-right">{formatMT(product.total_volume_mt)}</td>
                      <td className="p-3 text-gray-300 text-right">{formatNumber(product.total_transactions)}</td>
                      <td className="p-3 text-gray-300 text-right">
                        <div className="text-xs">
                          <div className="text-blue-400">BDC: {formatVolume(product.bdc_volume_liters)}</div>
                          <div className="text-green-400">OMC: {formatVolume(product.omc_volume_liters)}</div>
                        </div>
                      </td>
                      <td className="p-3 text-green-400 text-right font-medium">{product.market_share_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Data Source Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Product data from standardized fact tables • Last updated: {new Date().toLocaleString()}</p>
          <p>{product_performance.length} products • {categoryData.length} categories • {formatNumber(totalTransactions)} total transactions</p>
        </div>
      </div>
    </div>
  );
}