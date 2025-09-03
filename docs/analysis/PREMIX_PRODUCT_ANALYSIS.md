# Premix Product Analysis in Database
*Analysis Date: 2025-08-28*

## ✅ PREMIX EXISTS IN DATABASE

**Yes, "Premix" exists as a product name** in the database, not just as product_original_name.

## Key Findings

### Product Location
- **Found in:** OMC data only
- **NOT in:** BDC data
- **Product Category:** Classified as "Gasoline" in the products dimension table

### Data Summary

| Metric | Value |
|--------|-------|
| **Total Records** | 1,200 |
| **Total Volume** | 341,780.67 MT |
| **Companies Selling** | 60 OMCs |
| **Date Range** | January 2019 - December 2025 |
| **Average per Transaction** | 284.82 MT |

## Database Tables Containing Premix

### 1. Raw Data Tables
- **petroverse.omc_data**: ✅ 1,200 records
- **petroverse.bdc_data**: ❌ 0 records

### 2. Dimension Table
- **petroverse.products**: ✅ Listed as "Premix" (product_id varies)
  - Product Name: "Premix"
  - Product Category: "Gasoline"

### 3. Fact Tables
- **petroverse.fact_omc_transactions**: ✅ 1,200 records
- **petroverse.fact_bdc_transactions**: ❌ 0 records

## Top 10 Companies Selling Premix

| Company | Records | Total Volume (MT) | Period |
|---------|---------|------------------|--------|
| CASH OIL COMPANY LIMITED | 66 | 48,744.33 | 2019-2025 |
| AEGIS HUILE COMPANY LIMITED | 55 | 32,214.83 | 2019-2025 |
| RADIANCE PETROLEUM LIMITED | 60 | 23,157.26 | 2019-2025 |
| GOODNESS ENERGY LIMITED | 37 | 19,689.38 | 2021-2025 |
| SEAM OIL COMPANY LIMITED | 57 | 18,582.85 | 2019-2024 |
| PLUS ENERGY LIMITED | 27 | 17,693.06 | 2019-2021 |
| GB OIL LIMITED | 64 | 16,962.98 | 2019-2025 |
| INFIN GHANA LIMITED | 55 | 15,377.34 | 2019-2025 |
| ALINCO OIL COMPANY LIMITED | 60 | 14,305.03 | 2019-2024 |
| FRONTIER OIL GHANA LIMITED | 61 | 13,369.61 | 2019-2025 |

## How Premix Appears in the Database

### In the product column:
- **"Premix"** - Standardized product name (1,200 records)

### In the product_original_name column:
- **"Premix"** - 1,002 records
- **"PREMIX"** - 198 records (uppercase variation)

## Market Analysis

### Market Share
- Premix represents **1.24%** of total OMC volume (341,780.67 MT out of 27,537,435.92 MT)
- **23.3%** of OMC companies (60 out of 257) sell Premix

### Product Classification
- Classified as a **Gasoline** product in the petroleum products hierarchy
- This makes sense as premix is typically a pre-mixed gasoline/oil blend for 2-stroke engines

## SQL Query to Retrieve Premix Data

```sql
-- Get all premix transactions from OMC data
SELECT 
    company_name,
    product,
    year,
    month,
    volume_mt,
    volume_liters,
    data_quality_score
FROM petroverse.omc_data
WHERE UPPER(product) = 'PREMIX'
ORDER BY year DESC, month DESC, company_name;

-- Get premix summary by company
SELECT 
    c.company_name,
    COUNT(f.transaction_id) as transaction_count,
    SUM(f.volume_mt) as total_volume_mt,
    AVG(f.volume_mt) as avg_volume_per_transaction
FROM petroverse.fact_omc_transactions f
JOIN petroverse.companies c ON f.company_id = c.company_id
JOIN petroverse.products p ON f.product_id = p.product_id
WHERE UPPER(p.product_name) = 'PREMIX'
GROUP BY c.company_name
ORDER BY total_volume_mt DESC;
```

## Conclusion

✅ **Premix is properly captured in the database** as a distinct product with:
- Significant market presence (60 companies, 341,780 MT)
- Consistent data quality across 1,200 transactions
- Proper categorization in the product hierarchy
- Full integration in fact tables and dimension tables

The product is exclusive to OMC operations, which aligns with the retail nature of premix fuel for motorcycles and small engines.