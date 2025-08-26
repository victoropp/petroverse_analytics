'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, ChevronDown, X, Check, Search } from 'lucide-react';
import { useFilterStore } from '@/lib/filter-store';

interface GlobalFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  availableCompanies?: string[];
  availableProducts?: string[];
}

export interface FilterState {
  dateRange: {
    start: string;
    end: string;
    preset?: string;
  };
  companyType: string[];
  products: string[];
  companies: string[];
  years: number[];
  months: number[];
  volumeRange: {
    min: number;
    max: number;
  };
  dataQuality: {
    includeOutliers: boolean;
    minQualityScore: number;
  };
  volumeUnit: 'liters' | 'mt';
  topN: number;
}

const PRESET_RANGES = [
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last Quarter', value: '3m' },
  { label: 'Last Year', value: '1y' },
  { label: 'Year to Date', value: 'ytd' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

const TOP_N_OPTIONS = [3, 5, 10, 15, 20, 25, 50];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface FilterOptions {
  companies: Array<{id: string; name: string; type: string}>;
  products: Array<{id: string; name: string; category: string}>;
  minDate: string;
  maxDate: string;
}

// YEARS will be generated dynamically from database date range

export default function GlobalFilters({ 
  onFiltersChange, 
  availableCompanies = [], 
  availableProducts = [] 
}: GlobalFiltersProps) {
  // Use global filter store
  const {
    dateRange,
    companyType,
    products,
    companies,
    years,
    months,
    volumeRange,
    dataQuality,
    volumeUnit,
    topN,
    setDateRange,
    setCompanyType,
    setProducts,
    setCompanies,
    setYears,
    setMonths,
    setVolumeRange,
    setDataQuality,
    setVolumeUnit,
    setTopN,
    setFilters,
    resetFilters
  } = useFilterStore();
  
  // Create filters object for compatibility with existing code
  const filters = {
    dateRange,
    companyType,
    products,
    companies,
    years,
    months,
    volumeRange,
    dataQuality,
    volumeUnit,
    topN
  };
  
  // State for filter options from database
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    companies: [],
    products: [],
    minDate: '',
    maxDate: ''
  });
  
  const [loading, setLoading] = useState(true);
  
  // Generate years array dynamically from database date range
  const getYearsFromDateRange = () => {
    if (!filterOptions.minDate || !filterOptions.maxDate) return [];
    const startYear = new Date(filterOptions.minDate).getFullYear();
    const endYear = new Date(filterOptions.maxDate).getFullYear();
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerms, setSearchTerms] = useState({
    products: '',
    companies: ''
  });
  const [dropdownOpen, setDropdownOpen] = useState({
    companyType: false,
    products: false,
    companies: false,
    years: false,
    months: false,
    topN: false
  });

  // Refs for click outside detection
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Fetch filter options from database on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        // If no token, try to auto-login for development
        if (!token) {
          console.log('No auth token found. Please login first.');
          // For development, auto-login
          const loginResponse = await fetch('http://localhost:8003/api/v2/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'admin@demo.com',
              password: 'demo123'
            })
          });
          
          if (loginResponse.ok) {
            const data = await loginResponse.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('✅ Auto-login successful');
          } else {
            console.error('Auto-login failed. Please login manually.');
            setLoading(false);
            return;
          }
        }
        
        const authToken = localStorage.getItem('access_token');
        
        // Fetch filter options
        const response = await fetch('http://localhost:8003/api/v2/filters/options', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setFilterOptions({
            companies: data.companies || [],
            products: data.products || [],
            minDate: data.min_date || '',
            maxDate: data.max_date || ''
          });
          
          // Set initial filters with actual data range from database
          if (data.min_date && data.max_date) {
            setDateRange({
              start: data.min_date,
              end: data.max_date,
              preset: 'all'
            });
          }
        }
        
        // Set default volume range for now (will be fetched from API later)
        // Commenting out the API call that's causing 500 error due to database schema issue
        setVolumeRange({
          min: 0,
          max: 1000000000 // Will be replaced with real data
        });
        
        // TODO: Fix the backend to support volume_range metric
        // const volumeResponse = await fetch('http://localhost:8003/api/v2/analytics/query', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${authToken}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     metrics: ['volume_range'],
        //     date_range: {},
        //     filters: {}
        //   })
        // });
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!loading) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange, loading]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownOpen).forEach(key => {
        if (dropdownOpen[key as keyof typeof dropdownOpen] && 
            dropdownRefs.current[key] && 
            !dropdownRefs.current[key]?.contains(event.target as Node)) {
          setDropdownOpen(prev => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleDatePreset = (preset: string) => {
    let today = new Date();
    let start = new Date();
    
    if (preset === 'custom') {
      setShowDatePicker(true);
      setDateRange({ ...dateRange, preset });
      return;
    }
    
    switch(preset) {
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
        // Use actual dates from database
        if (filterOptions.minDate && filterOptions.maxDate) {
          start = new Date(filterOptions.minDate);
          today = new Date(filterOptions.maxDate);
        }
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      preset
    });
    setShowDatePicker(false);
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange({
      ...dateRange,
      [field]: value,
      preset: 'custom'
    });
  };

  const toggleCompanyType = (type: string) => {
    let newTypes = [...companyType];
    
    if (type === 'All') {
      newTypes = ['All'];
    } else {
      newTypes = newTypes.filter(t => t !== 'All');
      
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter(t => t !== type);
      } else {
        newTypes.push(type);
      }
      
      if (newTypes.length === 0) {
        newTypes = ['All'];
      }
    }
    
    setCompanyType(newTypes);
  };

  const toggleMultiSelect = (value: string | number, field: 'products' | 'companies' | 'years' | 'months') => {
    const currentValues = filters[field] as any[];
    const newValues = currentValues.includes(value as never) 
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value as never];
    
    switch (field) {
      case 'products':
        setProducts(newValues);
        break;
      case 'companies':
        setCompanies(newValues);
        break;
      case 'years':
        setYears(newValues);
        break;
      case 'months':
        setMonths(newValues);
        break;
    }
  };

  const clearAllFilters = () => {
    resetFilters();
  };

  // Filter products and companies based on search
  const filteredProducts = filterOptions.products.filter(p => 
    p.name.toLowerCase().includes(searchTerms.products.toLowerCase())
  );
  const filteredCompanies = filterOptions.companies.filter(c => 
    c.name.toLowerCase().includes(searchTerms.companies.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-700 rounded w-full mb-3"></div>
          <div className="flex gap-3">
            <div className="h-8 bg-gray-700 rounded w-32"></div>
            <div className="h-8 bg-gray-700 rounded w-32"></div>
            <div className="h-8 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Primary Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Date Range Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
          <div className="flex gap-2">
            <select 
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm flex-1 border border-gray-600 focus:border-blue-500 focus:outline-none cursor-pointer"
              value={filters.dateRange.preset}
              onChange={(e) => handleDatePreset(e.target.value)}
            >
              {PRESET_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
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
                    value={filters.dateRange.start}
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="bg-gray-600 text-white rounded px-2 py-1 text-sm border border-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleCustomDateChange('end', e.target.value)}
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
                filters.volumeUnit === 'liters' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Liters
            </button>
            <button
              onClick={() => setVolumeUnit('mt')}
              className={`px-3 py-2 text-sm flex-1 transition-colors ${
                filters.volumeUnit === 'mt' 
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
            <span>Top {filters.topN}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.topN ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen.topN && (
            <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg">
              {TOP_N_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setTopN(n);
                    setDropdownOpen(prev => ({ ...prev, topN: false }));
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                >
                  <span className="text-white">Top {n}</span>
                  {filters.topN === n && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Company Type Filter */}
        <div className="relative min-w-[180px]" ref={el => dropdownRefs.current.companyType = el}>
          <label className="text-xs text-gray-400 mb-1 block">Company Type</label>
          <button
            onClick={() => setDropdownOpen(prev => ({ ...prev, companyType: !prev.companyType }))}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
          >
            <span className="truncate">{filters.companyType.join(', ')}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.companyType ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen.companyType && (
            <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg">
              {['All', 'BDC', 'OMC'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleCompanyType(type)}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                >
                  <span className="text-white">{type}</span>
                  {filters.companyType.includes(type) && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Companies Filter */}
        <div className="relative min-w-[200px]" ref={el => dropdownRefs.current.companies = el}>
          <label className="text-xs text-gray-400 mb-1 block">Companies</label>
          <button
            onClick={() => setDropdownOpen(prev => ({ ...prev, companies: !prev.companies }))}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
          >
            <span className="truncate">
              {filters.companies.length > 0 
                ? `${filters.companies.length} selected` 
                : 'All Companies'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.companies ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen.companies && (
            <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
              <div className="sticky top-0 bg-gray-700 p-2 border-b border-gray-600">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchTerms.companies}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, companies: e.target.value }))}
                    className="w-full bg-gray-600 text-white rounded pl-8 pr-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => setCompanies([])}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                >
                  Clear All
                </button>
                {filteredCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => toggleMultiSelect(company.name, 'companies')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="text-white truncate">{company.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({company.type})</span>
                    </div>
                    {filters.companies.includes(company.name) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Filter */}
        <div className="relative min-w-[200px]" ref={el => dropdownRefs.current.products = el}>
          <label className="text-xs text-gray-400 mb-1 block">Products</label>
          <button
            onClick={() => setDropdownOpen(prev => ({ ...prev, products: !prev.products }))}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
          >
            <span className="truncate">
              {filters.products.length > 0 
                ? `${filters.products.length} selected` 
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
                  onClick={() => setProducts([])}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                >
                  Clear All
                </button>
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => toggleMultiSelect(product.name, 'products')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="text-white truncate">{product.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({product.category})</span>
                    </div>
                    {filters.products.includes(product.name) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Quality Toggle */}
        <div className="min-w-[150px]">
          <label className="text-xs text-gray-400 mb-1 block">Data Quality</label>
          <button
            onClick={() => setDataQuality({
              ...dataQuality,
              includeOutliers: !dataQuality.includeOutliers
            })}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              filters.dataQuality.includeOutliers 
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
            }`}
          >
            {filters.dataQuality.includeOutliers ? 'Include Outliers' : 'Exclude Outliers'}
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-600 hover:border-blue-500 hover:bg-gray-600 flex items-center gap-2 transition-colors mt-5"
          >
            <Filter className="w-4 h-4" />
            Advanced
          </button>
          
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/50 hover:bg-red-600/30 flex items-center gap-2 transition-colors mt-5"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Year Filter */}
          <div className="relative" ref={el => dropdownRefs.current.years = el}>
            <label className="text-xs text-gray-400 mb-1 block">Years</label>
            <button
              onClick={() => setDropdownOpen(prev => ({ ...prev, years: !prev.years }))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
              <span>{filters.years.length > 0 ? `${filters.years.length} selected` : 'All Years'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.years ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen.years && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                {getYearsFromDateRange().map(year => (
                  <button
                    key={year}
                    onClick={() => toggleMultiSelect(year, 'years')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <span className="text-white">{year}</span>
                    {filters.years.includes(year) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Month Filter */}
          <div className="relative" ref={el => dropdownRefs.current.months = el}>
            <label className="text-xs text-gray-400 mb-1 block">Months</label>
            <button
              onClick={() => setDropdownOpen(prev => ({ ...prev, months: !prev.months }))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
              <span>{filters.months.length > 0 ? `${filters.months.length} selected` : 'All Months'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.months ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen.months && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => toggleMultiSelect(index + 1, 'months')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <span className="text-white">{month}</span>
                    {filters.months.includes(index + 1) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Score Slider */}
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">
              Min Quality Score: {filters.dataQuality.minQualityScore.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={filters.dataQuality.minQualityScore}
              onChange={(e) => setDataQuality({
                ...dataQuality,
                minQualityScore: parseFloat(e.target.value)
              })}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.products.length > 0 || filters.companies.length > 0 || 
        filters.years.length > 0 || filters.months.length > 0 ||
        filters.companyType.filter(t => t !== 'All').length > 0) && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-700">
          {filters.companyType.filter(t => t !== 'All').map(type => (
            <span key={type} className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              Type: {type}
              <button onClick={() => toggleCompanyType(type)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.companies.map(company => (
            <span key={company} className="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              {company}
              <button onClick={() => toggleMultiSelect(company, 'companies')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.products.map(product => (
            <span key={product} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              {product}
              <button onClick={() => toggleMultiSelect(product, 'products')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.years.map(year => (
            <span key={year} className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              {year}
              <button onClick={() => toggleMultiSelect(year, 'years')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}