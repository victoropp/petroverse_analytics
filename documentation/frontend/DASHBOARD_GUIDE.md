# Dashboard User Guide

## Overview
The PetroVerse Analytics Dashboard is a comprehensive web application built with Next.js and TypeScript that provides real-time insights into Ghana's petroleum industry. The dashboard offers multiple views tailored for different stakeholder needs, from executive summaries to detailed operational analytics.

## Dashboard Architecture

### Technology Stack
- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with React-Chartjs-2
- **Icons**: Lucide React
- **State Management**: React hooks and context
- **API Integration**: Fetch API with real-time updates

### Dashboard URLs
- **Frontend**: http://localhost:3001
- **Executive Dashboard**: http://localhost:3001/dashboard/executive
- **BDC Comprehensive**: http://localhost:3001/dashboard/bdc/comprehensive
- **OMC Comprehensive**: http://localhost:3001/dashboard/omc/comprehensive

## Dashboard Navigation

### Sidebar Navigation
The left sidebar provides access to all dashboard views:

1. **Executive** - High-level industry overview and KPIs
2. **BDC Performance** - Bulk Distribution Company analytics
3. **BDC Comprehensive** - Detailed BDC operational insights
4. **OMC Performance** - Oil Marketing Company analytics
5. **OMC Comprehensive** - Detailed OMC operational insights
6. **Products Analytics** - Product-focused performance metrics

### Top Navigation Bar
- **Live Data Indicator**: Shows real-time connection status
- **Current Timestamp**: Displays last update time
- **Summary Statistics**: Total companies, transactions, and volume
- **User Profile**: Account information and settings

## Executive Dashboard

### Purpose
Provides C-level executives with high-level industry insights and strategic KPIs for decision-making.

### Key Features

#### Executive Summary Cards
```typescript
interface ExecutiveSummary {
  total_companies: number;      // 319 companies
  total_transactions: number;   // 32,789 transactions
  total_volume_mt: number;      // 57M MT total volume
  bdc_companies: number;        // 62 BDC companies
  omc_companies: number;        // 257 OMC companies
  bdc_volume_mt: number;        // 18.5M MT BDC volume
  omc_volume_mt: number;        // 38.5M MT OMC volume
}
```

#### Industry Trends Chart
- **Type**: Line chart with dual y-axes
- **Data**: Monthly BDC vs OMC volume trends
- **Period**: Rolling 12 months
- **Metrics**: Volume in MT and market share percentages

#### Market Share Visualization
- **Type**: Donut chart
- **Data**: BDC vs OMC market distribution
- **Calculations**: 
  - BDC Share: ~32% (18.5M MT)
  - OMC Share: ~68% (38.5M MT)

#### Top Performers Tables
- **BDC Leaders**: Top 5 BDC companies by volume
- **OMC Leaders**: Top 5 OMC companies by volume
- **Metrics**: Company name, volume (MT), market share %

### Data Refresh
- **Interval**: Every 30 seconds
- **API Endpoint**: `/api/v2/executive/summary`
- **Caching**: 5-minute cache for performance

## BDC Comprehensive Dashboard

### Purpose
Detailed analytics for Bulk Distribution Companies focusing on import volumes, product mix, and operational efficiency.

### Key Metrics

#### BDC KPIs
```typescript
interface BDCMetrics {
  total_companies: number;          // 62 BDC companies
  total_volume_mt: number;          // 18.5M MT total volume
  total_transactions: number;       // 8,475 transactions
  avg_volume_per_company: number;   // 298,387 MT average
  market_concentration_hhi: number; // 1,250.5 HHI score
  seasonal_volatility: number;      // 15.2% volatility
}
```

#### Company Performance Analysis
- **Ranking Table**: Companies sorted by volume with market share
- **Growth Metrics**: Year-over-year and month-over-month growth
- **Consistency Scores**: Performance reliability metrics
- **Transaction Patterns**: Volume per transaction analysis

#### Product Mix Analysis
- **Distribution Chart**: Pie chart of product categories
- **Volume Trends**: Product performance over time
- **Market Dynamics**: Product-specific growth rates
- **Key Products**:
  - Gasoline: 34.7% of BDC volume
  - Gasoil: 28.5% of BDC volume
  - LPG: 18.2% of BDC volume

#### Seasonal Analysis
```typescript
interface SeasonalMetrics {
  peak_month: number;           // July (month 7)
  trough_month: number;         // February (month 2)
  seasonal_amplitude: number;   // 22.5% variation
  monthly_volatility: number;   // 12.8% average volatility
}
```

#### Market Insights
- **Herfindahl Index**: Market concentration measurement
- **Top 5 Market Share**: Combined share of leading companies
- **Market Leader**: Current dominant company
- **Emerging Companies**: Fast-growing new entrants

### Interactive Features
- **Time Range Filters**: Custom date range selection
- **Company Filters**: Multi-select company filtering
- **Product Filters**: Category-based filtering
- **Export Options**: CSV and PDF report generation

## OMC Comprehensive Dashboard

### Purpose
Detailed analytics for Oil Marketing Companies focusing on retail distribution, station performance, and regional analysis.

### Key Metrics

#### OMC KPIs
```typescript
interface OMCMetrics {
  total_companies: number;          // 257 OMC companies
  total_volume_mt: number;          // 38.5M MT total volume
  total_transactions: number;       // 24,314 transactions
  avg_volume_per_company: number;   // 149,805 MT average
  market_concentration_hhi: number; // 850.2 HHI score
  regional_diversity: number;       // 12 regions
}
```

#### Company Performance Rankings
- **Market Share Analysis**: Top performers by volume and percentage
- **Station Networks**: Number of stations per company
- **Regional Presence**: Geographic coverage metrics
- **Growth Trajectory**: Company expansion rates

#### Regional Analysis
```typescript
interface RegionalMetrics {
  region: string;           // "Greater Accra"
  volume_mt: number;        // 12.5M MT regional volume
  companies_count: number;  // 89 companies in region
  market_share: number;     // 32.5% of national volume
}
```

#### Station Performance Metrics
- **Total Stations**: 3,580 retail stations nationwide
- **Average Volume per Station**: 10,754 MT annually
- **High Performers**: 356 top-performing stations
- **Growth Rate**: 3.2% annual station network growth

#### Product Distribution Analysis
- **Retail Product Mix**: Gasoline, diesel, LPG distribution
- **Regional Preferences**: Product preferences by region
- **Seasonal Patterns**: Retail demand seasonality
- **Price Correlations**: Volume vs. price relationships

### Advanced Features
- **Geographic Mapping**: Regional volume heat maps
- **Station Network Visualization**: Interactive station maps
- **Competitive Analysis**: Market share dynamics
- **Forecast Models**: Demand prediction analytics

## Chart Types and Visualizations

### Line Charts
```typescript
interface LineChartConfig {
  type: 'line';
  data: {
    labels: string[];          // Time periods
    datasets: ChartDataset[];  // Multiple data series
  };
  options: {
    responsive: true;
    scales: {
      y: { beginAtZero: true; }
      x: { display: true; }
    };
    plugins: {
      legend: { position: 'top' };
      tooltip: { mode: 'index' };
    };
  };
}
```

**Use Cases**:
- Volume trends over time
- Growth rate analysis
- Seasonal pattern visualization
- Comparative performance tracking

### Bar Charts
```typescript
interface BarChartConfig {
  type: 'bar';
  data: {
    labels: string[];          // Company/product names
    datasets: [{
      data: number[];          // Values
      backgroundColor: string[];
      borderColor: string[];
    }];
  };
  options: {
    responsive: true;
    scales: {
      y: { beginAtZero: true; }
    };
    plugins: {
      legend: { display: false };
    };
  };
}
```

**Use Cases**:
- Company performance rankings
- Product volume comparisons
- Regional market share
- Transaction count analysis

### Pie/Donut Charts
```typescript
interface DonutChartConfig {
  type: 'doughnut';
  data: {
    labels: string[];          // Categories
    datasets: [{
      data: number[];          // Percentages
      backgroundColor: string[];
      hoverBackgroundColor: string[];
    }];
  };
  options: {
    responsive: true;
    plugins: {
      legend: { position: 'right' };
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed}%`
        }
      };
    };
  };
}
```

**Use Cases**:
- Market share distribution
- Product mix analysis
- Regional volume distribution
- Business type breakdown (BDC vs OMC)

## Real-Time Data Integration

### API Integration Pattern
```typescript
// Custom hook for real-time data
const useRealTimeData = (endpoint: string, refreshInterval = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8003${endpoint}`);
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [endpoint, refreshInterval]);

  return { data, loading, error };
};
```

### Data Transformation
```typescript
// Transform API data for chart consumption
const transformTrendData = (apiData: any[]) => {
  return {
    labels: apiData.map(item => item.period),
    datasets: [
      {
        label: 'BDC Volume (MT)',
        data: apiData.map(item => item.bdc_volume_mt),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'OMC Volume (MT)',
        data: apiData.map(item => item.omc_volume_mt),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  };
};
```

## Filtering and Customization

### Filter Options
```typescript
interface FilterState {
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  companies: number[];      // Array of company IDs
  products: number[];       // Array of product IDs
  businessTypes: string[];  // ['BDC', 'OMC']
  regions: string[];        // Regional filters for OMC
}
```

### Filter Implementation
```typescript
const FilterPanel = ({ onFiltersChange }: FilterPanelProps) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  
  const applyFilters = () => {
    const queryParams = new URLSearchParams({
      start_date: filters.startDate,
      end_date: filters.endDate,
      company_ids: filters.companies.join(','),
      product_ids: filters.products.join(','),
      business_types: filters.businessTypes.join(',')
    }).toString();
    
    onFiltersChange(`/api/v2/executive/summary/filtered?${queryParams}`);
  };

  return (
    <div className="filter-panel">
      <DateRangePicker 
        startDate={filters.startDate}
        endDate={filters.endDate}
        onChange={(start, end) => 
          setFilters(prev => ({ ...prev, startDate: start, endDate: end }))
        }
      />
      <CompanyMultiSelect 
        selected={filters.companies}
        onChange={(companies) => 
          setFilters(prev => ({ ...prev, companies }))
        }
      />
      <ProductMultiSelect 
        selected={filters.products}
        onChange={(products) => 
          setFilters(prev => ({ ...prev, products }))
        }
      />
      <button onClick={applyFilters}>Apply Filters</button>
    </div>
  );
};
```

## Performance Optimization

### Component Optimization
```typescript
// Memoized chart component
const OptimizedChart = React.memo(({ data, options }: ChartProps) => {
  const chartRef = useRef<Chart<any>>(null);
  
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.data = data;
      chart.update('none'); // No animation for better performance
    }
  }, [data]);

  return (
    <div className="chart-container">
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
});
```

### Data Loading States
```typescript
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="text-red-600">{message}</div>
  </div>
);

const DataContainer = ({ children, loading, error }: DataContainerProps) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  return <>{children}</>;
};
```

## Mobile Responsiveness

### Responsive Design Classes
```css
/* Tailwind CSS responsive utilities */
.dashboard-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.chart-container {
  @apply w-full h-64 md:h-80 lg:h-96;
}

.sidebar {
  @apply fixed inset-y-0 left-0 z-50 w-64 bg-gray-800;
  @apply transform -translate-x-full lg:translate-x-0 transition-transform;
}

.mobile-menu {
  @apply lg:hidden fixed top-4 left-4 z-50;
}
```

### Mobile Navigation
```typescript
const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      <div className={`sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Navigation items */}
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
```

## Keyboard Shortcuts

### Navigation Shortcuts
- `Ctrl + 1`: Executive Dashboard
- `Ctrl + 2`: BDC Comprehensive
- `Ctrl + 3`: OMC Comprehensive
- `Ctrl + R`: Refresh current dashboard
- `Ctrl + F`: Open filter panel
- `Ctrl + E`: Export current view

### Implementation
```typescript
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case '1':
          router.push('/dashboard/executive');
          break;
        case '2':
          router.push('/dashboard/bdc/comprehensive');
          break;
        case '3':
          router.push('/dashboard/omc/comprehensive');
          break;
        case 'r':
          event.preventDefault();
          window.location.reload();
          break;
      }
    }
  };

  document.addEventListener('keydown', handleKeyPress);
  return () => document.removeEventListener('keydown', handleKeyPress);
}, [router]);
```

## Accessibility Features

### ARIA Labels and Roles
```typescript
const AccessibleChart = ({ title, data }: ChartProps) => (
  <div 
    role="img" 
    aria-label={`${title} chart showing data from ${data.startDate} to ${data.endDate}`}
    className="chart-container"
  >
    <h3 id={`chart-title-${title}`} className="sr-only">{title}</h3>
    <Line 
      data={data} 
      aria-labelledby={`chart-title-${title}`}
      options={{
        plugins: {
          title: { display: true, text: title }
        }
      }}
    />
  </div>
);
```

### Screen Reader Support
```typescript
const ScreenReaderAnnouncement = ({ message }: { message: string }) => (
  <div 
    aria-live="polite" 
    aria-atomic="true" 
    className="sr-only"
  >
    {message}
  </div>
);
```

## Troubleshooting Guide

### Common Issues

#### 1. Dashboard Not Loading
**Symptoms**: White screen or loading spinner indefinitely
**Solutions**:
- Check API server status at http://localhost:8003/health
- Verify database connection
- Check browser console for JavaScript errors
- Clear browser cache and cookies

#### 2. Charts Not Rendering
**Symptoms**: Empty chart containers or error messages
**Solutions**:
- Verify data format matches chart requirements
- Check for null/undefined data values
- Ensure Chart.js dependencies are loaded
- Validate responsive container sizing

#### 3. Real-Time Updates Not Working
**Symptoms**: Data not refreshing automatically
**Solutions**:
- Check network connectivity
- Verify API endpoint responses
- Test WebSocket connections
- Check browser network throttling settings

#### 4. Filter Not Working
**Symptoms**: No results or unchanged data after filtering
**Solutions**:
- Validate filter parameter format
- Check API endpoint query string construction
- Verify date range validity
- Test individual filter parameters

### Performance Issues

#### Slow Loading Times
- Enable browser caching for static assets
- Implement lazy loading for chart components  
- Optimize API query performance
- Use pagination for large datasets

#### Memory Usage
- Implement component unmounting cleanup
- Use React.memo for expensive components
- Limit chart animation and transitions
- Clear unused data from state

---
*Last Updated: August 27, 2025*
*Dashboard Guide Version: 1.0*