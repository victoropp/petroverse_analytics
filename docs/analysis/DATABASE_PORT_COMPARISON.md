# Database Port Comparison Report
*Generated: 2025-08-28*

## ⚠️ IMPORTANT FINDING: Duplicate Petroverse Database on Port 5434

There are TWO instances of `petroverse_analytics` database running on different ports with DIFFERENT data.

## Database Comparison

### Port 5432 (Primary - Should be used)
- **Location:** C:\PostgreSQL_Data\petroverse_data
- **Database:** petroverse_analytics
- **Status:** More complete data with proper fact tables

### Port 5434 (Secondary - Other apps)
- **Location:** C:\Program Files\PostgreSQL\17\data
- **Database:** petroverse_analytics (duplicate name!)
- **Also contains:** bidec_erp, bidec_erp_db, omc_erp

## Data Comparison

| Table | Port 5432 Records | Port 5434 Records | Difference |
|-------|-------------------|-------------------|------------|
| **petroverse.bdc_data** | 8,475 | 6,021 | +2,454 more on 5432 |
| **petroverse.omc_data** | 24,314 | 15,497 | +8,817 more on 5432 |
| **petroverse.supply_data** | 3,307 | 3,307 | Same |
| **petroverse.companies** | 319 | 0 | Missing on 5434 |
| **petroverse.products** | 16 | 0 | Missing on 5434 |
| **petroverse.time_dimension** | 78 | 0 | Missing on 5434 |
| **petroverse.fact_bdc_transactions** | 8,475 | N/A | Only on 5432 |
| **petroverse.fact_omc_transactions** | 24,314 | N/A | Only on 5432 |

## Key Differences

### Port 5432 (RECOMMENDED)
✅ **Complete Data:**
- 8,475 BDC records (40% more data)
- 24,314 OMC records (57% more data)
- All dimension tables populated
- Fact tables properly created
- Data integrity maintained

### Port 5434 (INCOMPLETE)
❌ **Issues:**
- Only 6,021 BDC records (incomplete)
- Only 15,497 OMC records (incomplete)
- Missing dimension data (companies, products, time)
- No fact tables
- Not properly structured for analytics

## Other Databases on Port 5434
- `bidec_erp` - Your BIDEC ERP system
- `bidec_erp_db` - Another BIDEC database
- `omc_erp` - OMC ERP system

## RECOMMENDATION

### ⚠️ ACTION REQUIRED:

1. **USE PORT 5432** for all PetroVerse Analytics operations
   - This has the complete, properly structured data
   - All fact tables and dimensions are properly set up

2. **Port 5434 petroverse_analytics should be:**
   - Either renamed to avoid confusion
   - Or deleted if it's not needed
   - This port should be reserved for your ERP systems

3. **Update all configurations to use port 5432:**
   ```
   DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/petroverse_analytics
   ```

## Summary

You have TWO petroverse_analytics databases:
- **Port 5432:** ✅ Complete with 36,096 records (USE THIS)
- **Port 5434:** ❌ Incomplete with 24,825 records (older/partial data)

The port 5432 instance has:
- 40% more BDC data
- 57% more OMC data
- Properly populated dimension tables
- Fact tables for analytics
- Better data structure

**Always use PORT 5432 for PetroVerse Analytics!**