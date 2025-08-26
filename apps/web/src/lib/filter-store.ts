import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface FilterStore extends FilterState {
  // Actions
  setDateRange: (dateRange: FilterState['dateRange']) => void;
  setCompanyType: (companyType: string[]) => void;
  setProducts: (products: string[]) => void;
  setCompanies: (companies: string[]) => void;
  setYears: (years: number[]) => void;
  setMonths: (months: number[]) => void;
  setVolumeRange: (volumeRange: FilterState['volumeRange']) => void;
  setDataQuality: (dataQuality: FilterState['dataQuality']) => void;
  setVolumeUnit: (unit: 'liters' | 'mt') => void;
  setTopN: (n: number) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  
  // Date preset handlers
  applyDatePreset: (preset: string) => void;
}

const getDefaultFilters = (): FilterState => ({
  dateRange: {
    start: '',
    end: '',
    preset: 'all'
  },
  companyType: ['All'],
  products: [],
  companies: [],
  years: [],
  months: [],
  volumeRange: {
    min: 0,
    max: 1000000000
  },
  dataQuality: {
    includeOutliers: true,
    minQualityScore: 0
  },
  volumeUnit: 'liters',
  topN: 5
});

const calculateDateRange = (preset: string): { start: string; end: string } => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  switch (preset) {
    case '30d':
      // Last 30 days
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { start: formatDate(thirtyDaysAgo), end: formatDate(today) };
      
    case '3m':
      // Last quarter (3 months)
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      return { start: formatDate(threeMonthsAgo), end: formatDate(today) };
      
    case '1y':
      // Last year
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return { start: formatDate(oneYearAgo), end: formatDate(today) };
      
    case 'ytd':
      // Year to date
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: formatDate(yearStart), end: formatDate(today) };
      
    case 'all':
      // All time - will be populated from database
      return { start: '2019-01-01', end: formatDate(today) };
      
    default:
      // Custom or unknown preset
      return { start: '', end: '' };
  }
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      ...getDefaultFilters(),
      
      setDateRange: (dateRange) => set({ dateRange }),
      setCompanyType: (companyType) => set({ companyType }),
      setProducts: (products) => set({ products }),
      setCompanies: (companies) => set({ companies }),
      setYears: (years) => set({ years }),
      setMonths: (months) => set({ months }),
      setVolumeRange: (volumeRange) => set({ volumeRange }),
      setDataQuality: (dataQuality) => set({ dataQuality }),
      setVolumeUnit: (volumeUnit) => set({ volumeUnit }),
      setTopN: (topN) => set({ topN }),
      
      setFilters: (filters) => set((state) => ({ ...state, ...filters })),
      
      resetFilters: () => set(getDefaultFilters()),
      
      applyDatePreset: (preset) => {
        const dateRange = calculateDateRange(preset);
        set({
          dateRange: {
            ...dateRange,
            preset
          }
        });
      }
    }),
    {
      name: 'petroverse-filters',
      partialize: (state) => ({
        // Persist only user preferences, not transient selections
        volumeUnit: state.volumeUnit,
        dataQuality: state.dataQuality,
        topN: state.topN
      })
    }
  )
);