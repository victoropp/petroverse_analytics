'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, ChevronDown, X, Check, Search } from 'lucide-react';
import { useGlobalFilters } from '@/lib/global-filters';

interface GlobalFiltersProps {
  restrictToCompanyType?: 'BDC' | 'OMC' | null; // null means no restriction
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

export default function GlobalFilters({ restrictToCompanyType = null }: GlobalFiltersProps) {
  // Use global filter store
  const {
    startDate,
    endDate,
    selectedCompanies,
    selectedBusinessTypes,
    selectedProducts,
    topN,
    volumeUnit,
    filterOptions,
    isLoading,
    setDateRange,
    setSelectedCompanies,
    setSelectedBusinessTypes,
    setSelectedProducts,
    setTopN,
    setVolumeUnit,
    clearAllFilters,
    loadFilterOptions
  } = useGlobalFilters();
  
  // Track date preset separately - detect if current dates match database range
  const [datePreset, setDatePreset] = useState(() => {
    if (!startDate || !endDate) return 'all';
    if (filterOptions?.date_range && 
        startDate === filterOptions.date_range.min_date && 
        endDate === filterOptions.date_range.max_date) {
      return 'all';
    }
    return 'custom';
  });
  
  // State for UI interactions
  const [loading, setLoading] = useState(isLoading);
  
  // Generate years array dynamically from database date range
  const getYearsFromDateRange = () => {
    if (!filterOptions?.date_range) return [];
    const startYear = new Date(filterOptions.date_range.min_date).getFullYear();
    const endYear = new Date(filterOptions.date_range.max_date).getFullYear();
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
    categories: false,
    years: false,
    months: false,
    topN: false,
    advancedCompanies: false,
    advancedProducts: false
  });

  // Refs for click outside detection
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);
  
  // Apply company type restriction if specified
  useEffect(() => {
    if (restrictToCompanyType) {
      setSelectedBusinessTypes([restrictToCompanyType]);
    }
  }, [restrictToCompanyType, setSelectedBusinessTypes]);
  
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Removed onFiltersChange callback - dashboard reacts to store changes directly

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
        // Calculate last year dynamically from database max date
        if (filterOptions?.dateRange?.max_date) {
          const maxDate = new Date(filterOptions.dateRange.max_date);
          const lastYear = maxDate.getFullYear() - 1;
          start = new Date(lastYear, 0, 1); // Jan 1 of last year
          today = new Date(lastYear, 11, 31); // Dec 31 of last year
        } else {
          // Fallback if no filter options loaded yet
          start = new Date(today.getFullYear() - 1, 0, 1);
          today = new Date(today.getFullYear() - 1, 11, 31);
        }
        break;
      case 'ytd':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'all':
        // Use actual dates from database
        if (filterOptions?.date_range) {
          start = new Date(filterOptions.date_range.min_date);
          today = new Date(filterOptions.date_range.max_date);
        } else {
          // If filterOptions not loaded yet, don't set dates - wait for them to load
          console.warn('Filter options not loaded yet, cannot set All Time range');
          return;
        }
        break;
    }

    setDateRange(
      start.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );
    setDatePreset(preset);
    setShowDatePicker(false);
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setDateRange(value, endDate);
    } else {
      setDateRange(startDate, value);
    }
  };

  const toggleCompanyType = (type: string) => {
    let newTypes = [...selectedBusinessTypes];
    
    if (type === 'All') {
      newTypes = ['BDC', 'OMC'];
    } else {
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter(t => t !== type);
      } else {
        newTypes.push(type);
      }
      
      if (newTypes.length === 0) {
        newTypes = ['BDC', 'OMC'];
      }
    }
    
    setSelectedBusinessTypes(newTypes);
  };

  const toggleMultiSelect = (value: string | number, field: 'products' | 'companies' | 'years' | 'months') => {
    switch (field) {
      case 'products':
        const newProducts = selectedProducts.includes(value as string) 
          ? selectedProducts.filter(v => v !== value)
          : [...selectedProducts, value as string];
        setSelectedProducts(newProducts);
        break;
      case 'companies':
        const newCompanies = selectedCompanies.includes(value as string) 
          ? selectedCompanies.filter(v => v !== value)
          : [...selectedCompanies, value as string];
        setSelectedCompanies(newCompanies);
        break;
      // years and months not used in new store
    }
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  // Filter products and companies based on search
  const filteredProducts = filterOptions?.products?.filter(p => 
    p.name.toLowerCase().includes(searchTerms.products.toLowerCase())
  ) || [];
  const filteredCompanies = filterOptions?.companies?.filter(c => {
    // First filter by search term
    const matchesSearch = c.name.toLowerCase().includes(searchTerms.companies.toLowerCase());
    // If there's a restriction, only show companies of that type
    if (restrictToCompanyType) {
      return matchesSearch && c.type === restrictToCompanyType;
    }
    // Otherwise filter by selected business types
    const matchesType = selectedBusinessTypes.length === 0 || 
                       selectedBusinessTypes.length === 2 || 
                       selectedBusinessTypes.includes(c.type);
    return matchesSearch && matchesType;
  }) || [];

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
              value={datePreset}
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
                    value={startDate}
                    onChange={(e) => handleCustomDateChange('start', e.target.value)}
                    className="bg-gray-600 text-white rounded px-2 py-1 text-sm border border-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
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
                  {topN === n && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Company Type Filter - Hide when restricted */}
        {!restrictToCompanyType ? (
          <div className="relative min-w-[180px]" ref={el => dropdownRefs.current.companyType = el}>
            <label className="text-xs text-gray-400 mb-1 block">Company Type</label>
            <button
              onClick={() => setDropdownOpen(prev => ({ ...prev, companyType: !prev.companyType }))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
              <span className="truncate">{selectedBusinessTypes.length === 2 ? 'All' : selectedBusinessTypes.join(', ')}</span>
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
                    {((type === 'All' && selectedBusinessTypes.length === 2) || selectedBusinessTypes.includes(type)) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative min-w-[180px]">
            <label className="text-xs text-gray-400 mb-1 block">Company Type</label>
            <div className="w-full bg-gray-700/50 text-gray-400 rounded-lg px-3 py-2 text-sm border border-gray-600/50 cursor-not-allowed">
              <span>{restrictToCompanyType} Only</span>
            </div>
          </div>
        )}

        {/* Companies Filter */}
        <div className="relative min-w-[200px]" ref={el => dropdownRefs.current.companies = el}>
          <label className="text-xs text-gray-400 mb-1 block">Companies</label>
          <button
            onClick={() => setDropdownOpen(prev => ({ ...prev, companies: !prev.companies }))}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none flex items-center justify-between hover:bg-gray-600 transition-colors"
          >
            <span className="truncate">
              {selectedCompanies.length > 0 
                ? `${selectedCompanies.length} selected` 
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
                  onClick={() => setSelectedCompanies([])}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                >
                  Clear All
                </button>
                {filteredCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => toggleMultiSelect(company.id, 'companies')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="text-white truncate">{company.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({company.type})</span>
                    </div>
                    {selectedCompanies.includes(company.id) && <Check className="w-4 h-4 text-blue-400" />}
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
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => toggleMultiSelect(product.id, 'products')}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="text-white truncate">{product.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({product.category})</span>
                    </div>
                    {selectedProducts.includes(product.id) && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Quality Toggle - Simplified for now */}
        <div className="min-w-[150px]">
          <label className="text-xs text-gray-400 mb-1 block">Data Quality</label>
          <button
            className="px-3 py-2 rounded-lg text-sm border transition-colors bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
          >
            High Quality
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
            onClick={handleClearAllFilters}
            className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/50 hover:bg-red-600/30 flex items-center gap-2 transition-colors mt-5"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) - Functional */}
      {showAdvanced && (
        <div className="pt-3 border-t border-gray-700 space-y-4">
          
          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Companies (Optional)
            </label>
            <div className="relative">
              <button
                ref={el => dropdownRefs.current.advancedCompanies = el}
                onClick={() => setDropdownOpen(prev => ({ ...prev, advancedCompanies: !prev.advancedCompanies }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-left text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span className="text-sm">
                  {selectedCompanies.length === 0 
                    ? 'All Companies' 
                    : `${selectedCompanies.length} companies selected`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.advancedCompanies ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen.advancedCompanies && filterOptions && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => setSelectedCompanies([])}
                      className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-600 rounded"
                    >
                      All Companies ({filterOptions.companies.length})
                    </button>
                  </div>
                  <div className="border-t border-gray-600">
                    {filterOptions.companies.map(company => (
                      <div key={company.id} className="p-2">
                        <label className="flex items-center space-x-2 text-sm text-gray-300 hover:bg-gray-600 px-2 py-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCompanies.includes(company.id)}
                            onChange={() => toggleMultiSelect(company.id, 'companies')}
                            className="rounded border-gray-500 bg-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1">
                            {company.name}
                            <span className="text-xs text-gray-400 ml-1">({company.type})</span>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Products (Optional)
            </label>
            <div className="relative">
              <button
                ref={el => dropdownRefs.current.advancedProducts = el}
                onClick={() => setDropdownOpen(prev => ({ ...prev, advancedProducts: !prev.advancedProducts }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-left text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span className="text-sm">
                  {selectedProducts.length === 0 
                    ? 'All Products' 
                    : `${selectedProducts.length} products selected`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.advancedProducts ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen.advancedProducts && filterOptions && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => setSelectedProducts([])}
                      className="w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-600 rounded"
                    >
                      All Products ({filterOptions.products.length})
                    </button>
                  </div>
                  <div className="border-t border-gray-600">
                    {filterOptions.products.map(product => (
                      <div key={product.id} className="p-2">
                        <label className="flex items-center space-x-2 text-sm text-gray-300 hover:bg-gray-600 px-2 py-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => toggleMultiSelect(product.id, 'products')}
                            className="rounded border-gray-500 bg-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1">
                            {product.name}
                            <span className="text-xs text-gray-400 ml-1">({product.category})</span>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Results Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Results Limit
            </label>
            <select
              value={topN}
              onChange={(e) => setTopN(parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={20}>Top 20</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
          </div>

        </div>
      )}

      {/* Active Filters Display */}
      {(selectedProducts.length > 0 || selectedCompanies.length > 0 || 
        selectedBusinessTypes.length < 2) && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-700">
          {selectedBusinessTypes.length < 2 && selectedBusinessTypes.map(type => (
            <span key={type} className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              Type: {type}
              <button onClick={() => toggleCompanyType(type)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedCompanies.slice(0, 5).map(companyId => {
            const company = filterOptions?.companies?.find(c => c.id === companyId);
            return company ? (
              <span key={companyId} className="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                {company.name}
                <button onClick={() => toggleMultiSelect(companyId, 'companies')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          {selectedCompanies.length > 5 && (
            <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg text-xs">
              +{selectedCompanies.length - 5} more
            </span>
          )}
          {selectedProducts.slice(0, 5).map(productId => {
            const product = filterOptions?.products?.find(p => p.id === productId);
            return product ? (
              <span key={productId} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                {product.name}
                <button onClick={() => toggleMultiSelect(productId, 'products')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          {selectedProducts.length > 5 && (
            <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs">
              +{selectedProducts.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}