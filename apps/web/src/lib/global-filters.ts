import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilterOptions {
  companies: Array<{id: string; name: string; type: string}>;
  products: Array<{id: string; name: string; category: string}>;
  dateRange: {min_date: string; max_date: string};
}

export interface GlobalFilters {
  // Date filters
  startDate: string;
  endDate: string;
  
  // Company filters
  selectedCompanies: string[]; // company IDs
  selectedBusinessTypes: string[]; // 'BDC', 'OMC', or both
  
  // Product filters  
  selectedProducts: string[]; // product IDs
  selectedProductCategories: string[]; // product categories
  
  // Display options
  topN: number; // for limiting results
  volumeUnit: 'liters' | 'mt'; // display unit preference
  
  // Filter options (populated from API)
  filterOptions: FilterOptions | null;
  
  // Loading state
  isLoading: boolean;
}

export interface GlobalFiltersActions {
  // Setters
  setDateRange: (startDate: string, endDate: string) => void;
  setSelectedCompanies: (companyIds: string[]) => void;
  setSelectedBusinessTypes: (types: string[]) => void;
  setSelectedProducts: (productIds: string[]) => void;
  setSelectedProductCategories: (categories: string[]) => void;
  setTopN: (n: number) => void;
  setVolumeUnit: (unit: 'liters' | 'mt') => void;
  
  // Utility functions
  clearAllFilters: () => void;
  loadFilterOptions: () => Promise<void>;
  
  // Get filtered query parameters for API calls
  getFilterParams: () => URLSearchParams;
  
  // Supply chain specific helpers
  getBDCFilter: () => string[];
  getOMCFilter: () => string[];
  isSupplyChainView: () => boolean; // true if both BDC and OMC are selected
}

type GlobalFiltersStore = GlobalFilters & GlobalFiltersActions;

export const useGlobalFilters = create<GlobalFiltersStore>()(
  persist(
    (set, get) => ({
      // Initial state - empty until loaded from API
      startDate: '',
      endDate: '',
      selectedCompanies: [],
      selectedBusinessTypes: ['BDC', 'OMC'], // Both by default for supply chain view
      selectedProducts: [],
      selectedProductCategories: [],
      topN: 10,
      volumeUnit: 'liters',
      filterOptions: null,
      isLoading: false,
      
      // Actions
      setDateRange: (startDate: string, endDate: string) => {
        set({ startDate, endDate });
      },
      
      setSelectedCompanies: (companyIds: string[]) => {
        set({ selectedCompanies: companyIds });
      },
      
      setSelectedBusinessTypes: (types: string[]) => {
        set({ selectedBusinessTypes: types });
      },
      
      setSelectedProducts: (productIds: string[]) => {
        set({ selectedProducts: productIds });
      },
      
      setSelectedProductCategories: (categories: string[]) => {
        set({ selectedProductCategories: categories });
      },
      
      setTopN: (n: number) => {
        set({ topN: n });
      },
      
      setVolumeUnit: (unit: 'liters' | 'mt') => {
        set({ volumeUnit: unit });
      },
      
      clearAllFilters: () => {
        set({
          startDate: '',
          endDate: '',
          selectedCompanies: [],
          selectedBusinessTypes: ['BDC', 'OMC'],
          selectedProducts: [],
          selectedProductCategories: [],
          topN: 10,
          volumeUnit: 'liters',
        });
      },
      
      loadFilterOptions: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:8003/api/v2/filters');
          if (response.ok) {
            const options = await response.json();
            const currentState = get();
            set({ 
              filterOptions: options,
              // Always set date range from database if not already set by user
              startDate: currentState.startDate || options.date_range.min_date,
              endDate: currentState.endDate || options.date_range.max_date,
            });
          }
        } catch (error) {
          console.error('Failed to load filter options:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      getFilterParams: () => {
        const state = get();
        const params = new URLSearchParams();
        
        if (state.startDate) params.append('start_date', state.startDate);
        if (state.endDate) params.append('end_date', state.endDate);
        
        if (state.selectedCompanies.length > 0) {
          params.append('companies', state.selectedCompanies.join(','));
        }
        
        if (state.selectedBusinessTypes.length > 0 && state.selectedBusinessTypes.length < 2) {
          params.append('business_type', state.selectedBusinessTypes[0]);
        }
        
        if (state.selectedProducts.length > 0) {
          params.append('products', state.selectedProducts.join(','));
        }
        
        if (state.selectedProductCategories.length > 0) {
          params.append('product_categories', state.selectedProductCategories.join(','));
        }
        
        params.append('top_n', state.topN.toString());
        
        return params;
      },
      
      getBDCFilter: () => {
        const state = get();
        if (!state.filterOptions) return [];
        
        return state.filterOptions.companies
          .filter(c => c.type === 'BDC')
          .filter(c => state.selectedCompanies.length === 0 || state.selectedCompanies.includes(c.id))
          .map(c => c.id);
      },
      
      getOMCFilter: () => {
        const state = get();
        if (!state.filterOptions) return [];
        
        return state.filterOptions.companies
          .filter(c => c.type === 'OMC')
          .filter(c => state.selectedCompanies.length === 0 || state.selectedCompanies.includes(c.id))
          .map(c => c.id);
      },
      
      isSupplyChainView: () => {
        const state = get();
        return state.selectedBusinessTypes.includes('BDC') && state.selectedBusinessTypes.includes('OMC');
      },
    }),
    {
      name: 'global-filters-storage',
      partialize: (state) => ({
        startDate: state.startDate,
        endDate: state.endDate,
        selectedCompanies: state.selectedCompanies,
        selectedBusinessTypes: state.selectedBusinessTypes,
        selectedProducts: state.selectedProducts,
        selectedProductCategories: state.selectedProductCategories,
        topN: state.topN,
        volumeUnit: state.volumeUnit,
      }),
    }
  )
);