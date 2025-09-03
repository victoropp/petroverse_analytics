'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, ChevronDown, X, Check, Search } from 'lucide-react';

interface SupplyFiltersProps {
  startDate: string;
  endDate: string;
  selectedProducts: string[];
  selectedRegions: string[];
  volumeUnit: 'liters' | 'mt';
  topN: number;
  dateRange: { min_date: string; max_date: string } | null;
  products: string[];
  regions: Array<{ name: string; record_count: number }>;
  onDateChange: (start: string, end: string) => void;
  onProductsChange: (products: string[]) => void;
  onRegionsChange: (regions: string[]) => void;
  onVolumeUnitChange: (unit: 'liters' | 'mt') => void;
  onTopNChange: (n: number) => void;
}

const PRESET_RANGES = [
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last Quarter', value: '3m' },
  { label: 'Last Year', value: '1y' },
  { label: 'Year to Date', value: 'ytd' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

const TOP_N_OPTIONS = [5, 10, 15, 20, 25, 50];

export default function SupplyFilters({
  startDate,
  endDate,
  selectedProducts,
  selectedRegions,
  volumeUnit,
  topN,
  dateRange,
  products,
  regions,
  onDateChange,
  onProductsChange,
  onRegionsChange,
  onVolumeUnitChange,
  onTopNChange,
}: SupplyFiltersProps) {
  const [datePreset, setDatePreset] = useState('custom');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState({
    products: false,
    regions: false,
    topN: false,
  });
  const [searchTerms, setSearchTerms] = useState({
    products: '',
    regions: '',
  });
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
        onDateChange(dateRange.min_date, dateRange.max_date);
        setDatePreset('all');
        return;
      case 'custom':
        setShowDatePicker(true);
        setDatePreset('custom');
        return;
    }
    
    // Ensure start date is not before min date
    const minDate = new Date(dateRange.min_date);
    if (start < minDate) start = minDate;
    
    onDateChange(start.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    setDatePreset(preset);
  };

  const toggleMultiSelect = (value: string, field: 'products' | 'regions') => {
    if (field === 'products') {
      const newProducts = selectedProducts.includes(value) 
        ? selectedProducts.filter(v => v !== value)
        : [...selectedProducts, value];
      onProductsChange(newProducts);
    } else {
      const newRegions = selectedRegions.includes(value) 
        ? selectedRegions.filter(v => v !== value)
        : [...selectedRegions, value];
      onRegionsChange(newRegions);
    }
  };

  // Filter based on search
  const filteredProducts = products.filter(p => 
    p.toLowerCase().includes(searchTerms.products.toLowerCase())
  );
  const filteredRegions = regions.filter(r => 
    r.name.toLowerCase().includes(searchTerms.regions.toLowerCase())
  );

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
                    onChange={(e) => onDateChange(e.target.value, endDate)}
                    className="bg-gray-600 text-white rounded px-2 py-1 text-sm border border-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onDateChange(startDate, e.target.value)}
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
              onClick={() => onVolumeUnitChange('liters')}
              className={`px-3 py-2 text-sm flex-1 transition-colors ${
                volumeUnit === 'liters' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Liters
            </button>
            <button
              onClick={() => onVolumeUnitChange('mt')}
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
                    onTopNChange(n);
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
                  onClick={() => onRegionsChange([])}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                >
                  Clear All
                </button>
                {filteredRegions.map(region => (
                  <button
                    key={region.name}
                    onClick={() => toggleMultiSelect(region.name, 'regions')}
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
                  onClick={() => onProductsChange([])}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-600 text-blue-400"
                >
                  Clear All
                </button>
                {filteredProducts.map(product => {
                  // Clean up product names
                  const displayName = product.startsWith('UNIT:') 
                    ? product.split(' ').slice(-2).join(' ')
                    : product;
                  
                  return (
                    <button
                      key={product}
                      onClick={() => toggleMultiSelect(product, 'products')}
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
      </div>

      {/* Active Filters Display */}
      {(selectedProducts.length > 0 || selectedRegions.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
          {selectedProducts.map(product => (
            <span key={product} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              {product.length > 20 ? product.substring(0, 20) + '...' : product}
              <button onClick={() => toggleMultiSelect(product, 'products')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedRegions.map(region => (
            <span key={region} className="bg-green-600/20 text-green-400 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
              {region}
              <button onClick={() => toggleMultiSelect(region, 'regions')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}