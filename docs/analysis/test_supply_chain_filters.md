# Supply Chain Resilience Chart - Filter Response Test

## Test Procedure

1. **Open BDC Dashboard**
   - Navigate to: http://localhost:3000/dashboard/bdc
   - Open browser console (F12)
   
2. **Initial Load Test**
   - Verify console shows: "Supply Chain Resilience - Filter params"
   - Verify console shows: "Supply Chain Data Received - Dynamic Thresholds"
   - Note the threshold values

3. **Date Filter Test**
   - Change date range to 2024 only
   - Verify console shows new API call with updated dates
   - Verify thresholds change based on 2024 data
   - Expected: Volume threshold should decrease (less data)

4. **Company Filter Test**
   - Select specific companies
   - Verify console shows new API call with company_ids
   - Verify thresholds adapt to selected companies
   - Chart should show only products supplied by selected companies

5. **Product Filter Test**
   - Select specific products
   - Verify console shows new API call with product_ids
   - Chart should update to show only selected products

6. **Volume Unit Test**
   - Switch between MT and Liters
   - Verify chart values update accordingly

## Expected Console Output

```javascript
// On initial load
Supply Chain Resilience - Filter params: {
  startDate: undefined,
  endDate: undefined,
  selectedCompanies: 0,
  selectedProducts: 0,
  topN: 10,
  volumeUnit: "mt",
  paramsString: "top_n=10&volume_unit=mt"
}

Supply Chain Data Received - Dynamic Thresholds: {
  volumeThreshold: 11633.45,  // Dynamic 10th percentile
  supplierQ1: 8.5,
  supplierMedian: 16,
  supplierQ3: 40.5,
  volatilityQ1: 96.8,
  volatilityMedian: 144.2,
  volatilityQ3: 159.2,
  productCount: 8
}

// After filtering to 2024
Supply Chain Resilience - Filter params: {
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  selectedCompanies: 0,
  selectedProducts: 0,
  topN: 10,
  volumeUnit: "mt",
  paramsString: "start_date=2024-01-01&end_date=2024-12-31&top_n=10&volume_unit=mt"
}

Supply Chain Data Received - Dynamic Thresholds: {
  volumeThreshold: 2846.23,  // Lower threshold for 2024 subset
  supplierQ1: 6,              // May differ based on 2024 data
  supplierMedian: 12,
  supplierQ3: 28,
  // ... etc
}
```

## Success Criteria

✅ Chart re-renders when filters change
✅ API calls include filter parameters
✅ Thresholds dynamically update based on filtered data
✅ Product list in chart reflects applied filters
✅ No hardcoded thresholds remain (all computed from data)