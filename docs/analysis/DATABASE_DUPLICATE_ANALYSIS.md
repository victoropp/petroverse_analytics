# Database Duplicate Analysis Report - Port 5432
*Generated: 2025-08-28*

## Database Structure on Port 5432

### Single Database
✅ Only one `petroverse_analytics` database exists on port 5432

### Schema Organization
The database contains 3 schemas:
1. **petroverse** - Main analytics data (11 tables)
2. **petroverse_core** - System tables (8 tables)
3. **public** - Default schema (empty)

## Data Structure Analysis

### Tables and Views Relationship

| Type | Object Name | Record Count | Purpose |
|------|------------|--------------|---------|
| **Raw Table** | petroverse.bdc_data | 8,475 | Original BDC data |
| **Fact Table** | petroverse.fact_bdc_transactions | 8,475 | Structured BDC facts |
| **View** | petroverse.bdc_performance_metrics | 8,475 | Performance view |
| **Raw Table** | petroverse.omc_data | 24,314 | Original OMC data |
| **Fact Table** | petroverse.fact_omc_transactions | 24,314 | Structured OMC facts |
| **View** | petroverse.omc_performance_metrics | 24,314 | Performance view |

### ✅ No Table Duplication
- Views are based on fact tables (not duplicates)
- Fact tables are transformations of raw data (not duplicates)
- Each serves a different purpose in the data architecture

## Data Quality Issue Found

### Duplicate Records Within Tables

| Dataset | Duplicate Groups | Total Duplicate Records |
|---------|-----------------|------------------------|
| BDC Data | 280 groups | 564 records |
| OMC Data | 85 groups | 170 records |

### Nature of Duplicates

The duplicates appear to be **unit conversion issues**:

**Example from ALFAPETRO GHANA LIMITED (July 2020):**
- Gasoil Entry 1: 733.88 liters (0.62 MT)
- Gasoil Entry 2: 868,500 liters (733.88 MT)

The second entry's MT value (733.88) matches the first entry's liter value, suggesting:
1. Some entries were incorrectly converted
2. Both the original and converted values were kept
3. This creates false duplicates with different volumes

### Specific Examples

| Company | Product | Year-Month | Volume 1 | Volume 2 | Issue |
|---------|---------|------------|----------|----------|-------|
| ALFAPETRO | Gasoil | 2020-07 | 734 L | 868,500 L | Unit confusion |
| ASTRA OIL | Gasoline | 2020-07 | 3,124 L | 4,138,000 L | Unit confusion |
| AKWAABA LINK | Heavy Fuel Oil | 2025-04 | 54,000 L | 360,000 L | Multiple deliveries? |

## Summary

### ✅ Good News
- No duplicate databases on port 5432
- No duplicate table structures
- Views and fact tables are properly designed

### ⚠️ Data Quality Issues
- **734 duplicate records** across BDC and OMC data
- Appears to be unit conversion errors during data import
- Small values might be in MT mistakenly recorded as liters
- Large values are the correct liter measurements

### Recommendations

1. **Clean duplicate records** by:
   - Keeping only the larger volume values (likely correct liter measurements)
   - Removing the smaller values (likely MT values mistakenly in liter column)

2. **Validate volume data**:
   - Check if volumes < 10,000 are actually MT values
   - Ensure consistent unit usage across all records

3. **Add data validation** for future imports:
   - Set minimum realistic values for petroleum volumes
   - Flag suspicious unit conversions

## Impact Assessment

- **734 duplicate records** out of 32,789 total (2.2%)
- Duplicates could be inflating volume calculations
- Fact tables inherit these duplicates from raw data
- Dashboard metrics may be slightly overstated