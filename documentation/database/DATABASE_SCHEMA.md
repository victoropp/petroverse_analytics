# Database Schema Documentation

## Database Information
- **Database Name**: `petroverse_analytics`
- **PostgreSQL Version**: 17
- **Port**: 5432
- **Schema**: `petroverse`
- **Character Set**: UTF-8

## Schema Overview

The database follows a star schema design optimized for analytics with fact tables containing transaction data and dimension tables for lookups.

```
petroverse_analytics
└── petroverse (schema)
    ├── companies (dimension)
    ├── products (dimension)  
    ├── time_dimension (dimension)
    ├── fact_bdc_transactions (fact)
    ├── fact_omc_transactions (fact)
    ├── bdc_data (raw data)
    └── omc_data (raw data)
```

## Dimension Tables

### 1. companies
Standardized company information for both BDC and OMC companies.

```sql
CREATE TABLE petroverse.companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    company_type VARCHAR(50) NOT NULL, -- 'BDC' or 'OMC'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data:**
| company_id | company_name | company_type | created_at |
|------------|--------------|--------------|------------|
| 1001 | BLUE OCEAN GROUP | BDC | 2025-08-27 |
| 2001 | SHELL GHANA | OMC | 2025-08-27 |

**Key Statistics:**
- **Total Companies**: 319
- **BDC Companies**: 62 (IDs: 1001-1062)
- **OMC Companies**: 257 (IDs: 2001-2257)

### 2. products
Standardized petroleum product categories.

```sql
CREATE TABLE petroverse.products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) UNIQUE NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Product Categories:**
| product_id | product_name | product_category |
|------------|--------------|------------------|
| 1 | Aviation Turbine Kerosene | Aviation & Kerosene |
| 2 | Gasoil | Gasoil |
| 3 | Gasoline | Gasoline |
| 4 | Heavy Fuel Oil | Heavy Fuel Oil |
| 5 | Kerosene | Aviation & Kerosene |
| 6 | LPG | LPG |
| 7 | Lubricants | Lubricants |
| 8 | Naphtha | Naphtha |
| 9 | Premix | Other Petroleum Products |

### 3. time_dimension
Date-based dimension for time series analysis.

```sql
CREATE TABLE petroverse.time_dimension (
    date_id SERIAL PRIMARY KEY,
    full_date DATE UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Date Range**: 2019-01-01 to 2025-12-01 (monthly periods)
**Total Periods**: 84 months

## Fact Tables

### 1. fact_bdc_transactions
BDC company transaction data with standardized volumes.

```sql
CREATE TABLE petroverse.fact_bdc_transactions (
    transaction_id INTEGER PRIMARY KEY,
    company_id INTEGER REFERENCES petroverse.companies(company_id),
    product_id INTEGER REFERENCES petroverse.products(product_id),
    date_id INTEGER REFERENCES petroverse.time_dimension(date_id),
    volume_liters DECIMAL(15,2),
    volume_mt DECIMAL(15,6),
    volume_kg DECIMAL(15,2),
    data_quality_score DECIMAL(3,2),
    is_outlier BOOLEAN,
    source_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Statistics:**
- **Total Records**: 8,475
- **Date Range**: 2019-2025
- **Volume Range**: 0.001 MT to 180,000 MT per transaction
- **Total Volume**: ~18.5 million MT

### 2. fact_omc_transactions
OMC company transaction data with standardized volumes.

```sql
CREATE TABLE petroverse.fact_omc_transactions (
    transaction_id INTEGER PRIMARY KEY,
    company_id INTEGER REFERENCES petroverse.companies(company_id),
    product_id INTEGER REFERENCES petroverse.products(product_id),
    date_id INTEGER REFERENCES petroverse.time_dimension(date_id),
    volume_liters DECIMAL(15,2),
    volume_mt DECIMAL(15,6),
    volume_kg DECIMAL(15,2),
    data_quality_score DECIMAL(3,2),
    is_outlier BOOLEAN,
    source_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Statistics:**
- **Total Records**: 24,314
- **Date Range**: 2019-2025
- **Volume Range**: 0.001 MT to 500,000 MT per transaction
- **Total Volume**: ~38.5 million MT

## Raw Data Tables

### 1. bdc_data
Raw extracted BDC data before fact table transformation.

```sql
CREATE TABLE petroverse.bdc_data (
    id SERIAL PRIMARY KEY,
    source_file VARCHAR(255),
    sheet_name VARCHAR(100),
    extraction_date DATE,
    year INTEGER,
    month INTEGER,
    period_date DATE,
    period_type VARCHAR(50),
    company_name VARCHAR(255),
    product_code VARCHAR(100),
    product_original_name VARCHAR(255),
    unit_type VARCHAR(50),
    volume DECIMAL(15,2),
    volume_liters DECIMAL(15,2),
    volume_kg DECIMAL(15,2),
    volume_mt DECIMAL(15,6),
    company_type VARCHAR(50),
    product VARCHAR(100),
    data_quality_score DECIMAL(3,2),
    is_outlier BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. omc_data
Raw extracted OMC data before fact table transformation.

```sql
CREATE TABLE petroverse.omc_data (
    id SERIAL PRIMARY KEY,
    source_file VARCHAR(255),
    sheet_name VARCHAR(100),
    extraction_date DATE,
    year INTEGER,
    month INTEGER,
    period_date DATE,
    period_type VARCHAR(50),
    company_name VARCHAR(255),
    product_code VARCHAR(100),
    product_original_name VARCHAR(255),
    unit_type VARCHAR(50),
    volume DECIMAL(15,2),
    volume_liters DECIMAL(15,2),
    volume_kg DECIMAL(15,2),
    volume_mt DECIMAL(15,6),
    company_type VARCHAR(50),
    product VARCHAR(100),
    data_quality_score DECIMAL(3,2),
    is_outlier BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Volume Conversion Logic

### Units and Conversions
- **Source Units**: Liters (all products except LPG), Kilograms (LPG only)
- **Target Units**: Metric Tons (MT) for all products
- **Conversion Factors**: Product-specific factors from `conversion factors.xlsx`

### Key Conversion Factors
| Product | Liters per MT | Notes |
|---------|---------------|-------|
| Gasoline | 1324.5 | Premium and regular gasoline |
| Gasoil | 1190.0 | Diesel and automotive gas oil |
| LPG | 1000.0 | Already in KG, convert KG to MT |
| ATK | 1235.0 | Aviation Turbine Kerosene |
| HFO | 1050.0 | Heavy Fuel Oil variants |
| Kerosene | 1235.0 | Household kerosene |
| Naphtha | 1450.0 | Chemical feedstock |
| Lubricants | 1100.0 | Engine and industrial oils |

### Conversion Formula
```sql
-- For products in Liters
volume_mt = volume_liters / conversion_factor
volume_kg = volume_mt * 1000

-- For LPG (already in KG)
volume_mt = volume_kg / 1000
volume_liters = volume_kg * 1.8  -- Approximate conversion
```

## Indexes and Performance

### Primary Indexes
- All tables have primary key indexes on ID columns
- Unique indexes on company names and product names
- Unique index on time_dimension.full_date

### Analytics Indexes
```sql
-- Fact table performance indexes
CREATE INDEX idx_bdc_company_date ON petroverse.fact_bdc_transactions(company_id, date_id);
CREATE INDEX idx_bdc_product_date ON petroverse.fact_bdc_transactions(product_id, date_id);
CREATE INDEX idx_omc_company_date ON petroverse.fact_omc_transactions(company_id, date_id);
CREATE INDEX idx_omc_product_date ON petroverse.fact_omc_transactions(product_id, date_id);

-- Time series indexes
CREATE INDEX idx_time_year_month ON petroverse.time_dimension(year, month);
CREATE INDEX idx_time_year_quarter ON petroverse.time_dimension(year, quarter);
```

## Data Quality Measures

### Quality Scores
- **Scale**: 0.0 - 1.0
- **Calculation**: Based on completeness, consistency, and validation checks
- **Thresholds**: >0.8 considered high quality, <0.5 flagged for review

### Outlier Detection
- **Method**: Statistical analysis using IQR and Z-scores
- **Flagging**: Boolean `is_outlier` field
- **Threshold**: Values >3 standard deviations from mean

### Data Validation Rules
1. **Volume Positivity**: All volumes must be positive
2. **Date Validity**: Dates must be within expected range (2019-2025)
3. **Company Existence**: Companies must exist in dimension table
4. **Product Validity**: Products must be in standardized list
5. **Unit Consistency**: Units must match expected format per product

## Backup and Recovery

### Backup Schedule
- **Daily**: Full database backup at 2 AM
- **Weekly**: Complete schema and data export
- **Monthly**: Archive to external storage

### Recovery Procedures
1. **Point-in-time Recovery**: Using PostgreSQL WAL files
2. **Full Restore**: From daily backup files
3. **Partial Recovery**: Table-level restoration
4. **Data Validation**: Post-recovery integrity checks

### Backup Locations
- **Local**: `/backups` directory
- **Database**: PostgreSQL backup directory
- **External**: Configured external backup location

---
*Last Updated: August 27, 2025*
*Schema Version: 1.0*