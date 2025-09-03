'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QualityScoreBadge, QualityFilter } from '@/components/quality-score-badge';
import { QualityTrendsChart } from '@/components/quality-trends-chart';
import { GrowthTrajectoryChart } from '@/components/growth-trajectory-chart';
import { RegionalComparisonChart } from '@/components/regional-comparison-chart';
import { PerformanceMetricsChart } from '@/components/performance-metrics-chart';
import { RiskAnalysisTooltip } from '@/components/risk-analysis-tooltip';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, TrendingUp, Package, BarChart3, Activity, 
  AlertCircle, ArrowUp, ArrowDown, Minus, Droplets,
  Fuel, Factory, Truck, Info, Globe, Zap, Filter,
  Download, Share2, Maximize2, RefreshCw, Eye, 
  Calendar, Target, Shield, ChevronRight, Layers,
  Navigation, Settings, Database, AlertTriangle,
  Check, ChevronDown, Search, X
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area,
  ScatterChart, Scatter, Treemap, Sankey, ComposedChart
} from 'recharts';

// Dynamically import Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });
const LayersControl = dynamic(() => import('react-leaflet').then(mod => mod.LayersControl), { ssr: false });
const LayersControlBaseLayer = dynamic(() => import('react-leaflet').then(mod => mod.LayersControl.BaseLayer), { ssr: false });
const LayersControlOverlay = dynamic(() => import('react-leaflet').then(mod => mod.LayersControl.Overlay), { ssr: false });
const LayerGroup = dynamic(() => import('react-leaflet').then(mod => mod.LayerGroup), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

// Ghana country boundary (simplified)
const ghanaBoundary = {
  type: "Feature",
  properties: { name: "Ghana" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-3.26, 4.73], [-3.11, 5.13], [-2.93, 5.10], [-2.73, 5.00],
      [-2.69, 5.29], [-2.86, 5.27], [-2.96, 5.64], [-2.95, 6.40],
      [-2.73, 7.01], [-2.56, 7.38], [-2.49, 8.20], [-2.69, 8.66],
      [-2.96, 9.40], [-2.76, 9.40], [-2.75, 9.91], [-2.94, 10.64],
      [-2.91, 10.97], [-2.83, 11.00], [-1.20, 11.01], [-0.92, 10.98],
      [-0.77, 10.94], [-0.44, 11.10], [-0.04, 11.12], [0.02, 11.02],
      [-0.05, 10.71], [0.37, 10.29], [0.37, 9.47], [0.26, 9.43],
      [0.46, 8.68], [0.71, 8.31], [0.53, 7.41], [0.51, 6.94],
      [0.84, 6.28], [0.99, 5.85], [1.19, 6.09], [1.20, 5.79],
      [0.70, 5.75], [0.32, 5.57], [0.00, 5.54], [-0.15, 5.57],
      [-0.51, 5.34], [-1.06, 5.00], [-1.96, 4.71], [-2.10, 4.73],
      [-2.93, 5.10], [-3.26, 4.73]
    ]]
  }
};

// Enhanced Ghana regions with real coordinates and polygons
const ghanaRegions = {
  'Greater Accra': { 
    lat: 5.6037, lng: -0.1870, 
    color: '#3B82F6', 
    population: 5455692,
    area: 3245,
    capital: 'Accra',
    bounds: [[5.45, -0.35], [5.75, 0.1]]
  },
  'Ashanti': { 
    lat: 6.7515, lng: -1.5249, 
    color: '#10B981',
    population: 5792187,
    area: 24389,
    capital: 'Kumasi',
    bounds: [[6.0, -2.5], [8.0, -0.5]]
  },
  'Western': { 
    lat: 5.5353, lng: -2.1969, 
    color: '#F59E0B',
    population: 2454079,
    area: 23921,
    capital: 'Sekondi-Takoradi',
    bounds: [[4.5, -3.2], [7.0, -1.5]]
  },
  'Eastern': { 
    lat: 6.2514, lng: -0.4583, 
    color: '#EF4444',
    population: 2917039,
    area: 19323,
    capital: 'Koforidua',
    bounds: [[5.5, -1.2], [7.0, 0.5]]
  },
  'Central': { 
    lat: 5.5151, lng: -1.0832, 
    color: '#8B5CF6',
    population: 2563228,
    area: 9826,
    capital: 'Cape Coast',
    bounds: [[5.0, -2.0], [6.5, -0.5]]
  },
  'Volta': { 
    lat: 7.0131, lng: 0.4685, 
    color: '#EC4899',
    population: 1649523,
    area: 20570,
    capital: 'Ho',
    bounds: [[5.75, 0.0], [8.75, 0.75]]
  },
  'Northern': { 
    lat: 9.5439, lng: -0.9057, 
    color: '#06B6D4',
    population: 2310983,
    area: 25448,
    capital: 'Tamale',
    bounds: [[8.5, -2.5], [10.9, 0.5]]
  },
  'Upper East': { 
    lat: 10.7082, lng: -0.9821, 
    color: '#84CC16',
    population: 1301221,
    area: 8842,
    capital: 'Bolgatanga',
    bounds: [[10.3, -1.5], [11.1, 0.1]]
  },
  'Upper West': { 
    lat: 10.2530, lng: -2.1450, 
    color: '#F97316',
    population: 901502,
    area: 18476,
    capital: 'Wa',
    bounds: [[9.3, -3.0], [11.0, -1.5]]
  },
  'Brong Ahafo': { 
    lat: 7.9559, lng: -1.6761, 
    color: '#6366F1',
    population: 2310983,
    area: 39557,
    capital: 'Sunyani',
    bounds: [[7.0, -3.0], [9.0, -0.5]]
  },
  'Western North': { 
    lat: 6.2197, lng: -2.5006, 
    color: '#14B8A6',
    population: 887672,
    area: 10074,
    capital: 'Sefwi Wiawso',
    bounds: [[5.5, -3.2], [7.0, -2.3]]
  },
  'Bono': { 
    lat: 7.3399, lng: -2.3268, 
    color: '#F43F5E',
    population: 1208649,
    area: 10983,
    capital: 'Sunyani',
    bounds: [[7.0, -3.0], [8.3, -2.0]]
  },
  'Bono East': { 
    lat: 7.5909, lng: -1.9344, 
    color: '#A855F7',
    population: 1203302,
    area: 23159,
    capital: 'Techiman',
    bounds: [[7.0, -2.0], [8.5, -0.3]]
  },
  'Ahafo': { 
    lat: 6.8018, lng: -2.5148, 
    color: '#22C55E',
    population: 602221,
    area: 5192,
    capital: 'Goaso',
    bounds: [[6.8, -2.8], [7.6, -2.0]]
  },
  'Oti': { 
    lat: 8.0667, lng: 0.2333, 
    color: '#FB923C',
    population: 742421,
    area: 11066,
    capital: 'Dambai',
    bounds: [[7.0, -0.2], [8.8, 0.6]]
  },
  'North East': { 
    lat: 10.5238, lng: -0.3701, 
    color: '#0EA5E9',
    population: 702321,
    area: 9072,
    capital: 'Nalerigu',
    bounds: [[10.0, -0.8], [11.0, 0.2]]
  },
  'Savannah': { 
    lat: 9.0830, lng: -1.8190, 
    color: '#D946EF',
    population: 653266,
    area: 35862,
    capital: 'Damongo',
    bounds: [[8.0, -3.0], [10.2, -0.5]]
  }
};

// Enhanced interfaces
interface RegionalData {
  region: string;
  total_quantity: number;
  total_quantity_mt?: number;
  product_count: number;
  active_months: number;
  avg_quantity: number;
  market_share_percent: number;
  growth_rate?: number;
  quality_score?: number;
  efficiency_score?: number;
  risk_level?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface TimeSeriesData {
  period: string;
  [key: string]: any;
}

interface HeatmapData {
  region: string;
  product: string;
  value: number;
}

// Custom map marker component
const AnimatedMarker = ({ region, value, color, isSelected, onClick }: any) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: isSelected ? 1.2 : 1 }}
    whileHover={{ scale: 1.1 }}
    transition={{ type: "spring", stiffness: 300 }}
    onClick={onClick}
    className="cursor-pointer"
  >
    <div 
      className={`relative ${isSelected ? 'z-50' : 'z-10'}`}
      style={{ 
        width: `${Math.sqrt(value / 1000000) * 10}px`,
        height: `${Math.sqrt(value / 1000000) * 10}px`,
        backgroundColor: color,
        borderRadius: '50%',
        opacity: 0.7,
        border: isSelected ? '3px solid white' : 'none'
      }}
    >
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
        >
          {region}
        </motion.div>
      )}
    </div>
  </motion.div>
);

export default function GhanaMapDashboard() {
  // Supply-specific filter state with unified management (BDC-style)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{min_date: string, max_date: string} | null>(null);
  const [volumeUnit, setVolumeUnit] = useState<'liters' | 'mt'>('liters');
  const [topN, setTopN] = useState<number>(20);
  const [minQuality, setMinQuality] = useState<number>(0.75);
  const [datePreset, setDatePreset] = useState<string>('custom');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  // Dropdown states (BDC-style)
  const [dropdownOpen, setDropdownOpen] = useState({
    products: false,
    regions: false,
    topN: false,
    dateRange: false
  });
  
  // Search states for dropdowns
  const [searchTerms, setSearchTerms] = useState({
    products: '',
    regions: ''
  });
  
  // Available regions from API
  const [availableRegions, setAvailableRegions] = useState<Array<{name: string, record_count: number}>>([]);
  
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // State management
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'supply' | 'growth' | 'quality' | 'heatmap' | '3d'>('supply');
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMapRegions, setSelectedMapRegions] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState<any>(null);
  const mapRef = useRef<any>(null);

  // Initialize filters with dynamic date range from database
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        // Fetch date range and regions from database
        const [dateRangeResponse, regionsResponse] = await Promise.all([
          fetch('http://localhost:8003/api/v2/supply/date-range'),
          fetch('http://localhost:8003/api/v2/supply/regions')
        ]);
        
        if (dateRangeResponse.ok) {
          const range = await dateRangeResponse.json();
          setDateRange(range);
          
          // Use the full available date range from the dataset
          if (range.min_date && range.max_date) {
            setStartDate(range.min_date);
            setEndDate(range.max_date);
          }
        } else {
          console.warn('Failed to fetch date range, using fallback');
          // Fallback to previous behavior
          const now = new Date();
          const lastYear = new Date();
          lastYear.setFullYear(now.getFullYear() - 1);
          
          setStartDate(lastYear.toISOString().split('T')[0]);
          setEndDate(now.toISOString().split('T')[0]);
        }
        
        // Process regions response
        if (regionsResponse.ok) {
          const regionsData = await regionsResponse.json();
          if (regionsData.regions && Array.isArray(regionsData.regions)) {
            setAvailableRegions(regionsData.regions.map((r: any) => ({
              name: r.name,
              record_count: r.record_count || 0
            })));
          }
        } else {
          console.warn('Failed to fetch regions');
        }
      } catch (error) {
        console.error('Error fetching date range and regions:', error);
        // Fallback to previous behavior
        const now = new Date();
        const lastYear = new Date();
        lastYear.setFullYear(now.getFullYear() - 1);
        
        setStartDate(lastYear.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
      }
    };
    
    initializeFilters();
    fetchProducts();
  }, []);

  // Fetch data when filters change with debouncing
  useEffect(() => {
    // Cancel any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Only fetch when dates are set
    if (startDate && endDate) {
      // Debounce the fetch to avoid too many requests
      fetchTimeoutRef.current = setTimeout(() => {
        fetchMapData();
        fetchKPIData(); // Fetch KPI data alongside map data
      }, 500); // 500ms debounce delay
    }

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startDate, endDate, selectedProducts, selectedRegions, volumeUnit, topN]);

  // Auto-refresh data every 2 minutes (independent of filters)
  useEffect(() => {
    const interval = setInterval(() => {
      if (startDate && endDate && !loading) {
        fetchMapData();
        fetchKPIData();
      }
    }, 120000); // Increased to 2 minutes to reduce conflicts
    return () => clearInterval(interval);
  }, []); // No dependencies to avoid multiple intervals

  // Fetch available products from database
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:8003/api/v2/supply/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Enhanced data fetching with abort control and unified parameter building
  const fetchMapData = async (retries = 3) => {
    // Cancel previous request if exists, but wait a bit to avoid race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    try {
      // Build parameters based on current filter state (inspired by comprehensive dashboards)
      const params = new URLSearchParams();
      
      // Date filters
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      // Region filters  
      if (selectedRegions.length > 0) {
        params.append('regions', selectedRegions.join(','));
      }
      
      // Product filters
      if (selectedProducts.length > 0) {
        params.append('products', selectedProducts.join(','));
      }
      
      // Volume unit preference
      params.append('volume_unit', volumeUnit);
      
      // Top N parameter
      params.append('top_n', topN.toString());
      
      // Quality filter
      if (minQuality > 0) {
        params.append('min_quality', minQuality.toString());
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const [regionalRes, growthRes, qualityRes, resilienceRes] = await Promise.race([
        Promise.all([
          fetch(`http://localhost:8003/api/v2/supply/regional?${params}`, { 
            signal: abortController.signal,
            headers: { 'Content-Type': 'application/json' }
          }),
          fetch(`http://localhost:8003/api/v2/supply/growth?${params}`, { 
            signal: abortController.signal,
            headers: { 'Content-Type': 'application/json' }
          }),
          fetch(`http://localhost:8003/api/v2/supply/quality?${params}`, { 
            signal: abortController.signal,
            headers: { 'Content-Type': 'application/json' }
          }),
          fetch(`http://localhost:8003/api/v2/supply/resilience?${params}`, { 
            signal: abortController.signal,
            headers: { 'Content-Type': 'application/json' }
          })
        ]),
        timeoutPromise
      ]);

      if (!regionalRes.ok || !growthRes.ok || !qualityRes.ok || !resilienceRes.ok) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchMapData(retries - 1);
        }
        throw new Error('Failed to fetch map data');
      }

      const [regionalData, growthData, qualityData, resilienceData] = await Promise.all([
        regionalRes.json(),
        growthRes.json(),
        qualityRes.json(),
        resilienceRes.json()
      ]);

      processData(regionalData, growthData, qualityData, resilienceData);
      detectAnomalies(regionalData);
      
    } catch (error: any) {
      // Handle different types of errors
      if (error.name === 'AbortError') {
        console.log('Fetch aborted - request was cancelled');
        return;
      }
      
      if (error.message === 'Request timeout') {
        console.error('Request timed out after 30 seconds');
        setAlerts(prev => [...prev, {
          type: 'warning',
          message: 'Request timed out. Retrying...',
          timestamp: new Date()
        }]);
        if (retries > 0) {
          return fetchMapData(retries - 1);
        }
      }
      
      console.error('Error fetching map data:', error.message || error);
      
      // Only show error alert if it's not a timeout or abort
      if (error.name !== 'AbortError' && error.message !== 'Request timeout') {
        setAlerts(prev => [...prev, {
          type: 'error',
          message: `Failed to fetch data: ${error.message || 'Network error'}`,
          timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch KPI data from the new endpoint
  const fetchKPIData = async () => {
    try {
      // Build parameters
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (selectedRegions.length > 0) {
        params.append('regions', selectedRegions.join(','));
      }
      
      if (selectedProducts.length > 0) {
        params.append('products', selectedProducts.join(','));
      }
      
      params.append('volume_unit', volumeUnit);

      const response = await fetch(`http://localhost:8003/api/v2/supply/kpi?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setKpiData(data);
      } else {
        console.error('Failed to fetch KPI data');
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
  };

  // Process and enrich data
  const processData = (regionalData: any, growthData: any, qualityData: any, resilienceData: any) => {
    const regionsMap = new Map();
    
    // First pass: collect all regional data for percentile calculations
    const allRegionalData = regionalData.regional_consistency || [];
    
    // Combine all data sources using the correct API response structure
    allRegionalData.forEach((r: any) => {
      regionsMap.set(r.region, {
        region: r.region,
        total_quantity: r.total_quantity || 0,
        product_count: Math.round(r.avg_products || 0), // Round avg_products to whole number
        active_months: r.active_months || 0,
        avg_quantity: r.avg_monthly_quantity || 0,
        market_share_percent: 0, // Will be calculated later
        efficiency_score: (r.overall_quality_score || 1) * 100,
        volatility_coefficient: r.volatility_coefficient || 0,
        volume_rank: r.volume_rank || 0,
        stability_rank: r.stability_rank || 0,
        risk_level: calculateRiskLevel(r, allRegionalData), // Pass all data for percentiles
        trend: calculateTrend(r)
      });
    });

    // Add growth data
    growthData.regional_growth?.forEach((r: any) => {
      const existing = regionsMap.get(r.region) || {};
      regionsMap.set(r.region, {
        ...existing,
        growth_rate: r.avg_yoy_growth || 0
      });
    });

    // Add quality data
    qualityData.quality_by_region?.forEach((r: any) => {
      const existing = regionsMap.get(r.region) || {};
      regionsMap.set(r.region, {
        ...existing,
        quality_score: r.avg_quality_score || 0
      });
    });

    // Add resilience data
    resilienceData.supply_resilience?.forEach((r: any) => {
      const existing = regionsMap.get(r.product_name) || {};
      // Process resilience data
    });

    // Calculate market share for each region
    const allRegions = Array.from(regionsMap.values());
    const totalQuantity = allRegions.reduce((sum, region) => sum + (region.total_quantity || 0), 0);
    
    // Update market share percentages
    allRegions.forEach(region => {
      if (totalQuantity > 0) {
        region.market_share_percent = (region.total_quantity / totalQuantity) * 100;
      } else {
        region.market_share_percent = 0;
      }
    });

    setRegionalData(allRegions);
    
    // Set time series data
    if (regionalData.monthly_comparison) {
      setTimeSeriesData(regionalData.monthly_comparison);
    }

    // Extract unique products
    if (regionalData.product_breakdown) {
      const uniqueProducts = [...new Set(regionalData.product_breakdown.map((p: any) => p.product))];
      setProducts(uniqueProducts);
    }

    // Generate heatmap data
    generateHeatmapData(regionalData);
  };

  // Enhanced risk level calculation with proper statistical normalization
  const calculateRiskLevel = (data: any, allRegionalData?: any[]): string => {
    // 1. Normalized Volatility (40% weight) - properly scaled to 0-1 range
    const volatilityCoeff = data.volatility_coefficient || 0;
    const normalizedVolatility = Math.min(volatilityCoeff / 50, 1); // Cap at 50% volatility = max risk
    
    // 2. Enhanced Quality Risk (30% weight) - better discrimination
    const qualityScore = data.overall_quality_score || data.quality_score || 1;
    const qualityRisk = Math.max(0, (0.90 - qualityScore) / 0.10); // Scale from 0.90 baseline
    
    // 3. Volume Risk based on percentiles (20% weight) - graduated approach
    let volumeRisk = 0;
    if (allRegionalData && allRegionalData.length > 0) {
      const volumes = allRegionalData.map(r => r.total_quantity || 0).sort((a, b) => b - a);
      const currentVolume = data.total_quantity || 0;
      const percentile = volumes.findIndex(v => v <= currentVolume) / volumes.length;
      volumeRisk = 1 - percentile; // Higher percentile = lower risk
    } else {
      // Fallback: graduated thresholds instead of binary
      const volume = data.total_quantity || 0;
      if (volume < 100000) volumeRisk = 1.0;        // Very small supply
      else if (volume < 500000) volumeRisk = 0.7;   // Small supply
      else if (volume < 1000000) volumeRisk = 0.4;  // Medium supply
      else volumeRisk = 0.1;                        // Large supply
    }
    
    // 4. Temporal Stability Risk (10% weight) - trend volatility
    const growthRate = Math.abs(data.avg_yoy_growth || data.growth_rate || 0);
    const trendRisk = growthRate > 30 ? 0.8 : growthRate > 15 ? 0.4 : 0.1;
    
    // Calculate composite risk score (0-1 scale)
    const riskScore = (normalizedVolatility * 0.4) + 
                     (qualityRisk * 0.3) + 
                     (volumeRisk * 0.2) + 
                     (trendRisk * 0.1);
    
    // Enhanced thresholds with four levels
    if (riskScore < 0.20) return 'low';
    if (riskScore < 0.45) return 'medium';  
    if (riskScore < 0.70) return 'high';
    return 'critical';
  };

  // Calculate trend
  const calculateTrend = (data: any): 'up' | 'down' | 'stable' => {
    const growth = data.growth_rate || 0;
    if (growth > 5) return 'up';
    if (growth < -5) return 'down';
    return 'stable';
  };

  // Generate heatmap data
  const generateHeatmapData = (regionalData: any) => {
    const heatmap: HeatmapData[] = [];
    regionalData.product_breakdown?.forEach((item: any) => {
      heatmap.push({
        region: item.region,
        product: item.product,
        value: item.quantity
      });
    });
    setHeatmapData(heatmap);
  };

  // Detect anomalies in data
  const detectAnomalies = (data: any) => {
    const anomalies: any[] = [];
    
    // Check for sudden changes (API returns it as regional_consistency)
    const regionalData = data.regional_comparison || data.regional_consistency || [];
    regionalData.forEach((r: any) => {
      if (r.growth_rate && Math.abs(r.growth_rate) > 50) {
        anomalies.push({
          type: 'warning',
          region: r.region,
          message: `Unusual ${r.growth_rate > 0 ? 'increase' : 'decrease'} detected: ${r.growth_rate.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
    });
    
    if (anomalies.length > 0) {
      setAlerts(prev => [...prev, ...anomalies]);
    }
  };

  // Helper functions - Use dropdown values to determine date range

  const getRegionValue = useCallback((region: string) => {
    const data = regionalData.find(r => r.region === region);
    if (!data) return 0;
    
    switch (mapView) {
      case 'supply': return data.total_quantity || 0;
      case 'growth': return data.growth_rate || 0;
      case 'quality': return data.quality_score || 0;
      case 'heatmap': return data.efficiency_score || 0;
      default: return 0;
    }
  }, [regionalData, mapView]);

  const getRegionColor = useCallback((region: string) => {
    const value = getRegionValue(region);
    const maxValue = Math.max(...regionalData.map(r => getRegionValue(r.region)));
    
    if (maxValue === 0) return '#94A3B8';
    
    const intensity = value / maxValue;
    
    switch (mapView) {
      case 'growth':
        if (value < 0) return `rgba(239, 68, 68, ${Math.abs(intensity)})`;
        return `rgba(34, 197, 94, ${intensity})`;
      case 'quality':
        return `rgba(34, 197, 94, ${intensity})`;
      case 'heatmap':
        const hue = (1 - intensity) * 240;
        return `hsl(${hue}, 100%, 50%)`;
      default:
        return `rgba(59, 130, 246, ${intensity})`;
    }
  }, [regionalData, mapView, getRegionValue]);

  const getCircleRadius = useCallback((region: string) => {
    const value = getRegionValue(region);
    const maxValue = Math.max(...regionalData.map(r => getRegionValue(r.region)));
    
    if (maxValue === 0) return 20000;
    
    const normalizedValue = value / maxValue;
    return 20000 + (normalizedValue * 100000);
  }, [regionalData, getRegionValue]);

  // Format volume with unit conversion (liters to MT or display as is)
  const formatVolume = (valueLiters: number | undefined, valueMT?: number | undefined, forceUnit?: 'liters' | 'mt'): string => {
    const unit = forceUnit || volumeUnit;
    
    // Select the appropriate value based on unit
    let value: number | undefined;
    if (unit === 'mt') {
      value = valueMT !== undefined ? valueMT : (valueLiters !== undefined ? valueLiters / 1200 : undefined);
    } else {
      value = valueLiters;
    }
    
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    
    // Format the number
    let formatted = '';
    if (value >= 1e9) formatted = `${(value / 1e9).toFixed(2)}B`;
    else if (value >= 1e6) formatted = `${(value / 1e6).toFixed(2)}M`;
    else if (value >= 1e3) formatted = `${(value / 1e3).toFixed(2)}K`;
    else formatted = value.toFixed(0);
    
    // Add unit suffix
    return `${formatted} ${unit === 'mt' ? 'MT' : 'L'}`;
  };

  const formatValue = (value: number | undefined, type?: string) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    
    // Explicitly check for percentage types
    if (type === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    
    // For volume/quantity types, use formatVolume
    if (type === 'volume' || type === 'quantity') {
      return formatVolume(value, undefined);
    }
    
    // Map view specific formatting
    if (mapView === 'growth') {
      return `${value.toFixed(1)}%`;
    } else if (mapView === 'quality') {
      return value.toFixed(2);
    } else {
      // Default number formatting without units
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
      return value.toFixed(0);
    }
  };

  // Export data functionality
  const exportData = () => {
    const dataStr = JSON.stringify(regionalData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ghana-supply-data-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Share functionality
  const shareData = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ghana Regional Supply Data',
          text: `Supply data for ${startDate} to ${endDate}`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Ghana Regional Supply Intelligence
              </h1>
              <p className="text-gray-400">Real-time petroleum supply distribution & analytics across all regions</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={shareData} variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={() => { fetchMapData(); fetchKPIData(); }} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Alerts Section */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4"
            >
              {alerts.slice(-3).map((alert, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`mb-2 p-3 rounded-lg flex items-center gap-2 ${
                    alert.type === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                    alert.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/50' :
                    'bg-blue-500/20 border border-blue-500/50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{alert.message}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters - BDC Style with Dark Theme */}
        <motion.div variants={itemVariants}>
          <Card className="mb-6 bg-gray-800 rounded-xl border border-gray-700">
            <CardContent className="p-4 space-y-4">
              {/* Primary Filters Row */}
              <div className="flex flex-wrap gap-3">
                {/* Date Range Selector - BDC Style */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
                  <div className="flex gap-2">
                    <select 
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm flex-1 border border-gray-600 focus:border-blue-500 focus:outline-none cursor-pointer"
                      value={datePreset}
                      onChange={(e) => {
                        const preset = e.target.value;
                        if (!dateRange) return;
                        
                        const today = new Date(dateRange.max_date);
                        let start = new Date(today);
                        
                        switch (preset) {
                          case '30d':
                            start.setDate(today.getDate() - 30);
                            break;
                          case '3m':
                            start.setMonth(today.getMonth() - 3);
                            break;
                          case '1y':
                            start.setFullYear(today.getFullYear() - 1);
                            break;
                          case 'ytd':
                            start = new Date(today.getFullYear(), 0, 1);
                            break;
                          case 'all':
                            setStartDate(dateRange.min_date);
                            setEndDate(dateRange.max_date);
                            setDatePreset('all');
                            return;
                          case 'custom':
                            setShowDatePicker(true);
                            setDatePreset('custom');
                            return;
                        }
                        
                        const minDate = new Date(dateRange.min_date);
                        if (start < minDate) start = minDate;
                        
                        setStartDate(start.toISOString().split('T')[0]);
                        setEndDate(today.toISOString().split('T')[0]);
                        setDatePreset(preset);
                      }}
                    >
                      <option value="30d">Last 30 Days</option>
                      <option value="3m">Last Quarter</option>
                      <option value="1y">Last Year</option>
                      <option value="ytd">Year to Date</option>
                      <option value="all">All Time</option>
                      <option value="custom">Custom</option>
                    </select>
                    <button 
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 border border-gray-600 hover:border-blue-500 hover:text-white transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Custom Date Picker */}
                  {showDatePicker && (
                    <div className="absolute z-20 mt-2 p-3 bg-gray-700 rounded-lg border border-gray-600 shadow-xl">
                      <div className="flex gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-gray-600 text-white rounded px-2 py-1 text-sm border border-gray-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">End Date</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-gray-600 text-white rounded px-2 py-1 text-sm border border-gray-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="mt-2 w-full bg-blue-600 text-white rounded py-1 text-sm hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
                {/* Volume Unit Toggle */}
                <div className="min-w-[140px]">
                  <label className="text-xs text-gray-400 mb-1 block">Volume Unit</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-600">
                    <button
                      onClick={() => setVolumeUnit('liters')}
                      className={`px-3 py-2 text-sm flex-1 transition-colors ${
                        volumeUnit === 'liters' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Liters
                    </button>
                    <button
                      onClick={() => setVolumeUnit('mt')}
                      className={`px-3 py-2 text-sm flex-1 transition-colors ${
                        volumeUnit === 'mt' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      MT
                    </button>
                  </div>
                </div>

                {/* Top N Selector */}
                <div className="relative min-w-[120px]" ref={el => dropdownRefs.current.topN = el}>
                  <label className="text-xs text-gray-400 mb-1 block">Top N</label>
                  <button
                    onClick={() => setDropdownOpen(prev => ({ ...prev, topN: !prev.topN }))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
                  >
                    <span>Top {topN}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.topN ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdownOpen.topN && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg">
                      {[5, 10, 15, 20, 25, 50].map(n => (
                        <button
                          key={n}
                          onClick={() => {
                            setTopN(n);
                            setDropdownOpen(prev => ({ ...prev, topN: false }));
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                        >
                          <span className="text-white">Top {n}</span>
                          {topN === n && <Check className="w-4 h-4 text-blue-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Regions Filter */}
                <div className="relative min-w-[200px]" ref={el => dropdownRefs.current.regions = el}>
                  <label className="text-xs text-gray-400 mb-1 block">Regions</label>
                  <button
                    onClick={() => setDropdownOpen(prev => ({ ...prev, regions: !prev.regions }))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
                  >
                    <span className="truncate">
                      {selectedRegions.length > 0 
                        ? `${selectedRegions.length} selected` 
                        : 'All Regions'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.regions ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdownOpen.regions && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                      <div className="sticky top-0 bg-gray-700 p-2 border-b border-gray-600">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search regions..."
                            value={searchTerms.regions}
                            onChange={(e) => setSearchTerms(prev => ({ ...prev, regions: e.target.value }))}
                            className="w-full bg-gray-600 text-white rounded pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => setSelectedRegions([])}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                        >
                          Clear All
                        </button>
                        {availableRegions
                          .filter(r => r.name.toLowerCase().includes(searchTerms.regions.toLowerCase()))
                          .map(region => (
                            <button
                              key={region.name}
                              onClick={() => {
                                setSelectedRegions(prev => 
                                  prev.includes(region.name) 
                                    ? prev.filter(r => r !== region.name)
                                    : [...prev, region.name]
                                );
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <span className="text-white truncate">{region.name}</span>
                                <span className="text-xs text-gray-400 ml-2">({region.record_count} records)</span>
                              </div>
                              {selectedRegions.includes(region.name) && <Check className="w-4 h-4 text-blue-400" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Products Filter */}
                <div className="relative min-w-[200px]" ref={el => dropdownRefs.current.products = el}>
                  <label className="text-xs text-gray-400 mb-1 block">Products</label>
                  <button
                    onClick={() => setDropdownOpen(prev => ({ ...prev, products: !prev.products }))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
                  >
                    <span className="truncate">
                      {selectedProducts.length > 0 
                        ? `${selectedProducts.length} selected` 
                        : 'All Products'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.products ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdownOpen.products && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                      <div className="sticky top-0 bg-gray-700 p-2 border-b border-gray-600">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerms.products}
                            onChange={(e) => setSearchTerms(prev => ({ ...prev, products: e.target.value }))}
                            className="w-full bg-gray-600 text-white rounded pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => setSelectedProducts([])}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                        >
                          Clear All
                        </button>
                        {products
                          .filter(p => p.toLowerCase().includes(searchTerms.products.toLowerCase()))
                          .map(product => {
                            const displayName = product.startsWith('UNIT:') 
                              ? product.split(' ').slice(-2).join(' ')
                              : product;
                            
                            return (
                              <button
                                key={product}
                                onClick={() => {
                                  setSelectedProducts(prev => 
                                    prev.includes(product) 
                                      ? prev.filter(p => p !== product)
                                      : [...prev, product]
                                  );
                                }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                              >
                                <span className="text-white truncate">{displayName}</span>
                                {selectedProducts.includes(product) && <Check className="w-4 h-4 text-blue-400" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Quality Filter */}
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <QualityFilter 
                    minQuality={minQuality} 
                    onQualityChange={setMinQuality} 
                  />
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedProducts.length > 0 || selectedRegions.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                  {selectedProducts.map(product => (
                    <span key={product} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                      {product.length > 20 ? product.substring(0, 20) + '...' : product}
                      <button onClick={() => {
                        setSelectedProducts(prev => prev.filter(p => p !== product));
                      }}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedRegions.map(region => (
                    <span key={region} className="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                      {region}
                      <button onClick={() => {
                        setSelectedRegions(prev => prev.filter(r => r !== region));
                      }}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* View Mode Tabs */}
              <div className="mt-4">
                <Tabs value={mapView} onValueChange={(v) => setMapView(v as any)} className="col-span-full lg:col-span-1">
                  <TabsList className="bg-gray-700/50 grid grid-cols-5 w-full">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="supply" className="data-[state=active]:bg-blue-600">
                          <Droplets className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Supply Volume</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="growth" className="data-[state=active]:bg-green-600">
                          <TrendingUp className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Growth Rate</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="quality" className="data-[state=active]:bg-purple-600">
                          <Shield className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Quality Score</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="heatmap" className="data-[state=active]:bg-orange-600">
                          <Zap className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Efficiency Heatmap</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="3d" className="data-[state=active]:bg-pink-600">
                          <Layers className="w-4 h-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>3D View</TooltipContent>
                    </Tooltip>
                  </TabsList>
                </Tabs>
              </div>

              {/* Additional Controls Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <Button
                    variant={compareMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompareMode(!compareMode)}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Compare Regions
                  </Button>
                  <Button
                    variant={animationEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnimationEnabled(!animationEnabled)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Animations
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {startDate && endDate ? `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}` : 'Select dates'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Database className="w-4 h-4" />
                    {formatVolume(regionalData.reduce((acc, r) => acc + (r.total_quantity || 0), 0), regionalData.reduce((acc, r) => acc + (r.total_quantity_mt || 0), 0))}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {regionalData.length} Regions
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {selectedProducts.length > 0 ? selectedProducts[0] : `${products.length} Products`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Map Section - Takes 3 columns */}
          <motion.div variants={itemVariants} className="xl:col-span-3">
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700 h-[700px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Interactive Regional Map
                    </CardTitle>
                    <CardDescription>
                      {mapView === 'supply' && 'Total supply volume distribution'}
                      {mapView === 'growth' && 'Year-over-year growth performance'}
                      {mapView === 'quality' && 'Data quality and reliability scores'}
                      {mapView === 'heatmap' && 'Supply chain efficiency heatmap'}
                      {mapView === '3d' && '3D elevation view of supply metrics'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.setView([8.0, -1.2], 6.8);
                        mapRef.current.setMaxBounds([[4.6, -3.3], [11.2, 1.2]]);
                      }
                    }}
                    title="Reset to Ghana view"
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[600px] relative">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="w-8 h-8 text-blue-500" />
                    </motion.div>
                  </div>
                ) : (
                  <MapContainer
                    center={[8.0, -1.2]}
                    zoom={6.8}
                    style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                    className="z-10"
                    ref={mapRef}
                    minZoom={6.5}
                    maxZoom={10}
                    maxBounds={[[4.6, -3.3], [11.2, 1.2]]}
                    maxBoundsViscosity={1.0}
                    zoomControl={true}
                    scrollWheelZoom={true}
                    doubleClickZoom={true}
                    dragging={true}
                    bounds={[[4.73, -3.26], [11.17, 1.20]]}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    
                    <LayersControl position="topright">
                      <LayersControlBaseLayer checked name="Light">
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />
                      </LayersControlBaseLayer>
                      <LayersControlBaseLayer name="Satellite">
                        <TileLayer
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                      </LayersControlBaseLayer>
                      
                      <LayersControlOverlay checked name="Supply Regions">
                        <LayerGroup>
                          {Object.entries(ghanaRegions).map(([region, coords]) => {
                            const regionData = regionalData.find(r => r.region === region);
                            const value = getRegionValue(region);
                            const radius = getCircleRadius(region);
                            const isSelected = selectedRegion === region || selectedMapRegions.includes(region);
                            
                            return (
                              <Circle
                                key={region}
                                center={[coords.lat, coords.lng]}
                                radius={radius}
                                fillColor={getRegionColor(region)}
                                fillOpacity={animationEnabled ? 0.6 : 0.4}
                                color={isSelected ? '#FFFFFF' : coords.color}
                                weight={isSelected ? 3 : 1}
                                eventHandlers={{
                                  click: () => {
                                    if (compareMode) {
                                      setSelectedMapRegions(prev => 
                                        prev.includes(region) 
                                          ? prev.filter(r => r !== region)
                                          : [...prev, region]
                                      );
                                    } else {
                                      setSelectedRegion(region);
                                      setShowDetails(true);
                                    }
                                  },
                                }}
                              >
                                <Popup>
                                  <div className="p-3 min-w-[250px]">
                                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      {region}
                                    </h3>
                                    {regionData && (
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Supply Volume:</span>
                                          <span className="font-semibold">{formatVolume(regionData.total_quantity, regionData.total_quantity_mt)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Products:</span>
                                          <span className="font-semibold">{regionData.product_count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Market Share:</span>
                                          <span className="font-semibold">{regionData.market_share_percent?.toFixed(2)}%</span>
                                        </div>
                                        {regionData.growth_rate !== undefined && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Growth Rate:</span>
                                            <span className={`font-semibold ${regionData.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {regionData.growth_rate >= 0 ? '+' : ''}{regionData.growth_rate.toFixed(1)}%
                                            </span>
                                          </div>
                                        )}
                                        {regionData.quality_score !== undefined && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Quality:</span>
                                            <QualityScoreBadge score={regionData.quality_score} size="sm" showTooltip={false} />
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Risk Level:</span>
                                          <RiskAnalysisTooltip riskLevel={regionData.risk_level || 'N/A'} data={regionData}>
                                            <Badge variant={
                                              regionData.risk_level === 'low' ? 'default' :
                                              regionData.risk_level === 'medium' ? 'secondary' :
                                              regionData.risk_level === 'high' ? 'destructive' :
                                              regionData.risk_level === 'critical' ? 'destructive' : 'outline'
                                            } className={
                                              regionData.risk_level === 'critical' ? 'bg-red-800 text-red-100 border-red-600 animate-pulse cursor-help' : 'cursor-help'
                                            }>
                                              {regionData.risk_level || 'N/A'}
                                            </Badge>
                                          </RiskAnalysisTooltip>
                                        </div>
                                        <div className="pt-2 border-t">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Capital:</span>
                                            <span className="font-semibold">{coords.capital}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Population:</span>
                                            <span className="font-semibold">{coords.population?.toLocaleString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </Popup>
                              </Circle>
                            );
                          })}
                        </LayerGroup>
                      </LayersControlOverlay>
                      
                      <LayersControlOverlay checked name="Ghana Border">
                        <GeoJSON
                          data={ghanaBoundary}
                          style={{
                            color: '#374151',
                            weight: 2,
                            opacity: 0.9,
                            fillColor: 'transparent',
                            fillOpacity: 0,
                            dashArray: '5, 3'
                          }}
                        />
                      </LayersControlOverlay>
                    </LayersControl>
                  </MapContainer>
                )}
                
                {/* Map Legend Overlay */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur p-3 rounded-lg z-20"
                >
                  <h4 className="text-xs font-semibold mb-2 text-gray-400">Map Legend</h4>
                  <div className="space-y-1">
                    {mapView === 'supply' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}></div>
                          <span className="text-xs">Low Supply</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }}></div>
                          <span className="text-xs">Medium Supply</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 1)' }}></div>
                          <span className="text-xs">High Supply</span>
                        </div>
                      </>
                    )}
                    {mapView === 'growth' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-xs">Negative</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                          <span className="text-xs">Stable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs">Positive</span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Side Panel - Analytics & Details */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Enhanced KPI Cards with Real Data */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Supply Card */}
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/50 hover:border-blue-500/70 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    {kpiData?.kpi_metrics?.total_supply?.trend === 'up' ? (
                      <div className="flex items-center gap-1">
                        <ArrowUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                          {kpiData?.kpi_metrics?.total_supply?.change_percent > 0 ? '+' : ''}
                          {kpiData?.kpi_metrics?.total_supply?.change_percent?.toFixed(1)}%
                        </span>
                      </div>
                    ) : kpiData?.kpi_metrics?.total_supply?.trend === 'down' ? (
                      <div className="flex items-center gap-1">
                        <ArrowDown className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400">
                          {kpiData?.kpi_metrics?.total_supply?.change_percent?.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <Minus className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-2xl font-bold">
                    {kpiData?.kpi_metrics?.total_supply?.formatted || 
                     formatVolume(regionalData.reduce((acc, r) => acc + r.total_quantity, 0), 
                                 regionalData.reduce((acc, r) => acc + (r.total_quantity_mt || 0), 0))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Total Supply</p>
                  {kpiData?.summary_stats?.active_regions && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {kpiData.summary_stats.active_regions} regions active
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Average Growth Card */}
              <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/50 hover:border-green-500/70 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    {kpiData?.kpi_metrics?.average_growth?.growing_regions && (
                      <Badge variant="outline" className="text-xs">
                        {kpiData.kpi_metrics.average_growth.growing_regions} ↑
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">
                    {kpiData?.kpi_metrics?.average_growth?.formatted || 
                     `${(regionalData.reduce((acc, r) => acc + (r.growth_rate || 0), 0) / regionalData.length || 0).toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Avg Growth</p>
                  {kpiData?.summary_stats?.recent_trend !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Trend: {kpiData.summary_stats.recent_trend > 0 ? '↑' : kpiData.summary_stats.recent_trend < 0 ? '↓' : '→'} 
                      {Math.abs(kpiData.summary_stats.recent_trend).toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Data Reliability Card */}
              <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/50 hover:border-purple-500/70 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <div className="flex items-center gap-1">
                      {kpiData?.kpi_metrics?.average_quality?.status === 'good' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : kpiData?.kpi_metrics?.average_quality?.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Activity className="w-4 h-4 text-purple-400" />
                      )}
                      <span className={`text-xs ${
                        kpiData?.kpi_metrics?.average_quality?.value > 0.85 ? 'text-green-400' : 
                        kpiData?.kpi_metrics?.average_quality?.value > 0.75 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {kpiData?.kpi_metrics?.average_quality?.value > 0.85 ? 'Good' : 
                         kpiData?.kpi_metrics?.average_quality?.value > 0.75 ? 'Fair' : 'Low'}
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {kpiData?.kpi_metrics?.average_quality?.formatted || 
                     (regionalData.reduce((acc, r) => acc + (r.quality_score || 0), 0) / regionalData.length || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Data Reliability</p>
                  {kpiData?.summary_stats?.active_products && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {kpiData.summary_stats.active_products} products tracked
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Risk Analysis Card */}
              <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-600/50 hover:border-orange-500/70 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <div className="flex items-center gap-1">
                      {kpiData?.kpi_metrics?.risk_summary?.critical_risk_count > 0 && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {kpiData.kpi_metrics.risk_summary.critical_risk_count} Critical
                        </Badge>
                      )}
                      {kpiData?.kpi_metrics?.risk_summary?.high_risk_count > 0 && (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-400">
                          {kpiData.kpi_metrics.risk_summary.high_risk_count} High
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {kpiData?.kpi_metrics?.risk_summary?.total_at_risk || 
                     regionalData.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">At Risk</p>
                  {kpiData?.kpi_metrics?.risk_summary?.max_volatility !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Max volatility: {kpiData.kpi_metrics.risk_summary.max_volatility.toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Additional Summary Stats Card */}
            {kpiData?.summary_stats && (
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Active Months:</span>
                      <span className="text-gray-300 font-medium">{kpiData.summary_stats.active_months}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transactions:</span>
                      <span className="text-gray-300 font-medium">{kpiData.summary_stats.total_transactions?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Daily Avg:</span>
                      <span className="text-gray-300 font-medium">
                        {formatVolume(kpiData.summary_stats.avg_daily_volume, undefined)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Products:</span>
                      <span className="text-gray-300 font-medium">{kpiData.summary_stats.active_products}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Regions Ranking */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Regional Rankings
                  </span>
                  <Select value={mapView} onValueChange={(v) => setMapView(v as any)}>
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supply">Supply</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                <div className="space-y-2">
                  {regionalData
                    .sort((a, b) => {
                      const aVal = mapView === 'supply' ? a.total_quantity : 
                                  mapView === 'growth' ? (a.growth_rate || 0) : 
                                  (a.quality_score || 0);
                      const bVal = mapView === 'supply' ? b.total_quantity : 
                                  mapView === 'growth' ? (b.growth_rate || 0) : 
                                  (b.quality_score || 0);
                      return bVal - aVal;
                    })
                    .slice(0, 10)
                    .map((region, idx) => {
                      const value = mapView === 'supply' ? region.total_quantity : 
                                   mapView === 'growth' ? (region.growth_rate || 0) : 
                                   (region.quality_score || 0);
                      const isSelected = selectedRegion === region.region || 
                                        selectedMapRegions.includes(region.region);
                      
                      return (
                        <motion.div
                          key={`region-${region.region}-${idx}`}
                          whileHover={{ scale: 1.02 }}
                          className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'bg-gray-700/70 ring-2 ring-blue-500' : 'hover:bg-gray-700/30'
                          }`}
                          onClick={() => {
                            if (compareMode) {
                              setSelectedMapRegions(prev => 
                                prev.includes(region.region) 
                                  ? prev.filter(r => r !== region.region)
                                  : [...prev, region.region]
                              );
                            } else {
                              setSelectedRegion(region.region);
                              setShowDetails(true);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                              idx === 0 ? 'bg-yellow-500' :
                              idx === 1 ? 'bg-gray-400' :
                              idx === 2 ? 'bg-orange-600' : 'bg-gray-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-sm font-medium">{region.region}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {region.trend && (
                                  region.trend === 'up' ? <ArrowUp className="w-3 h-3 text-green-400" /> :
                                  region.trend === 'down' ? <ArrowDown className="w-3 h-3 text-red-400" /> :
                                  <Minus className="w-3 h-3 text-gray-400" />
                                )}
                                <span className="text-xs text-gray-400">
                                  {region.product_count} products
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={mapView === 'growth' && value < 0 ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {mapView === 'supply' ? formatVolume(region.total_quantity, region.total_quantity_mt) : formatValue(value)}
                            </Badge>
                            {region.risk_level && (
                              <div className="mt-1">
                                <RiskAnalysisTooltip riskLevel={region.risk_level} data={region}>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs cursor-help ${
                                      region.risk_level === 'critical' ? 'border-red-800 text-red-300 bg-red-900/20 animate-pulse' :
                                      region.risk_level === 'high' ? 'border-red-500 text-red-400' :
                                      region.risk_level === 'medium' ? 'border-yellow-500 text-yellow-400' :
                                      'border-green-500 text-green-400'
                                    }`}
                                  >
                                    {region.risk_level} risk
                                  </Badge>
                                </RiskAnalysisTooltip>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Trend Analysis Mini Chart */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Supply Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData.slice(-12)}>
                      <defs>
                        <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#9CA3AF"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => {
                          const val = v / (volumeUnit === 'mt' ? 1200 : 1);
                          if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
                          if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
                          if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
                          return val.toFixed(0);
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value: any) => formatVolume(value, undefined)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total_quantity" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorSupply)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Analytics Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Regional Comparison Chart */}
          <RegionalComparisonChart
            startDate={startDate}
            endDate={endDate}
            regions={selectedRegions}
            products={selectedProducts}
            volumeUnit={volumeUnit}
            loading={loading}
            minQuality={minQuality}
          />

          {/* Quality Trends Chart */}
          <QualityTrendsChart 
            startDate={startDate}
            endDate={endDate}
            loading={loading}
          />

          {/* Performance Metrics */}
          <PerformanceMetricsChart
            startDate={startDate}
            endDate={endDate}
            regions={selectedRegions}
            products={selectedProducts}
            volumeUnit={volumeUnit}
            loading={loading}
          />

          {/* Growth Trajectory */}
          <GrowthTrajectoryChart
            startDate={startDate}
            endDate={endDate}
            regions={selectedRegions}
            products={selectedProducts}
            volumeUnit={volumeUnit}
            loading={loading}
          />
        </motion.div>

        {/* Region Details Modal */}
        <Dialog open={showDetails && !compareMode} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl bg-gray-900 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {selectedRegion} - Detailed Analytics
              </DialogTitle>
              <DialogDescription>
                Comprehensive supply chain metrics and performance indicators
              </DialogDescription>
            </DialogHeader>
            
            {selectedRegion && (() => {
              const region = regionalData.find(r => r.region === selectedRegion);
              const regionInfo = ghanaRegions[selectedRegion as keyof typeof ghanaRegions];
              
              if (!region) return <div>No data available</div>;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-gray-400">Supply Metrics</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Total Supply</p>
                        <p className="text-lg font-bold">{formatVolume(region.total_quantity, region.total_quantity_mt)}</p>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Market Share</p>
                        <p className="text-lg font-bold">{region.market_share_percent?.toFixed(2)}%</p>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Products</p>
                        <p className="text-lg font-bold">{region.product_count}</p>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Active Months</p>
                        <p className="text-lg font-bold">{region.active_months}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-gray-400">Performance Indicators</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Growth Rate</p>
                        <p className={`text-lg font-bold ${(region.growth_rate || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {region.growth_rate?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Quality Score</p>
                        <QualityScoreBadge score={region.quality_score || 0} size="sm" />
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">Efficiency</p>
                        <p className="text-lg font-bold">{region.efficiency_score?.toFixed(0)}%</p>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                        <RiskAnalysisTooltip riskLevel={region.risk_level || 'N/A'} data={region}>
                          <Badge variant={
                            region.risk_level === 'low' ? 'default' :
                            region.risk_level === 'medium' ? 'secondary' :
                            region.risk_level === 'high' ? 'destructive' :
                            region.risk_level === 'critical' ? 'destructive' : 'outline'
                          } className={
                            region.risk_level === 'critical' ? 'bg-red-800 text-red-100 border-red-600 animate-pulse cursor-help' : 'cursor-help'
                          }>
                            {region.risk_level || 'N/A'}
                          </Badge>
                        </RiskAnalysisTooltip>
                      </div>
                    </div>
                  </div>
                  
                  {regionInfo && (
                    <div className="col-span-full space-y-4">
                      <h3 className="font-semibold text-sm text-gray-400">Regional Information</h3>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-400">Capital</p>
                          <p className="text-sm font-medium">{regionInfo.capital}</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-400">Population</p>
                          <p className="text-sm font-medium">{regionInfo.population?.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-400">Area</p>
                          <p className="text-sm font-medium">{regionInfo.area?.toLocaleString()} km²</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-400">Coordinates</p>
                          <p className="text-sm font-medium">{regionInfo.lat.toFixed(2)}, {regionInfo.lng.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
}