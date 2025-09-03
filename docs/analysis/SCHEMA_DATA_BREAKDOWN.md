# Database Schema Data Breakdown
*Database: petroverse_analytics on Port 5432*  
*Generated: 2025-08-28*

## Schema Overview

The database contains **3 schemas** with **19 total tables**:
- **petroverse**: 11 tables (main analytics data)
- **petroverse_core**: 8 tables (system/infrastructure)
- **public**: 0 tables (empty)

---

## 1. PETROVERSE SCHEMA (Main Analytics)

### Raw Data Tables

| Table | Records | Description | Key Metrics |
|-------|---------|-------------|-------------|
| **bdc_data** | 8,475 | Raw BDC transaction data | 29.5M MT / 38B Liters |
| **omc_data** | 24,314 | Raw OMC transaction data | 27.5M MT / 35.5B Liters |
| **supply_data** | 3,307 | Supply chain data | 88B Units across 17 regions |

### Dimension Tables

| Table | Records | Description | Details |
|-------|---------|-------------|---------|
| **companies** | 319 | Company master list | 62 BDC + 257 OMC |
| **products** | 16 | Product master list | 9 product categories |
| **time_dimension** | 78 | Time periods | Jan 2019 - Jun 2025 |

### Fact Tables

| Table | Records | Description | Purpose |
|-------|---------|-------------|---------|
| **fact_bdc_transactions** | 8,475 | BDC structured facts | Star schema fact table |
| **fact_omc_transactions** | 24,314 | OMC structured facts | Star schema fact table |
| **performance_metrics** | 0 | Performance metrics | Currently empty |

### Standardization Tables

| Table | Records | Description |
|-------|---------|-------------|
| **companies_bdc_standardized** | 53 | Cleaned BDC company names |
| **companies_omc_standardized** | 175 | Cleaned OMC company names |

### Views (Not Physical Tables)

| View | Records | Based On |
|------|---------|----------|
| **bdc_performance_metrics** | 8,475 | fact_bdc_transactions |
| **omc_performance_metrics** | 24,314 | fact_omc_transactions |

---

## 2. PETROVERSE_CORE SCHEMA (System Infrastructure)

| Table | Records | Description | Status |
|-------|---------|-------------|--------|
| **users** | 0 | User accounts | Not configured |
| **tenants** | 3 | Multi-tenant data | 3 tenants configured |
| **api_keys** | 0 | API authentication | Not configured |
| **audit_logs** | 0 | System audit trail | Not active |
| **dashboards** | 0 | Dashboard configs | Not configured |
| **notifications** | 0 | System alerts | Not active |
| **reports** | 0 | Generated reports | Not active |
| **usage_metrics** | 0 | Usage tracking | Not active |

---

## 3. PUBLIC SCHEMA
- **Status:** Empty (0 tables)
- Standard PostgreSQL schema, not used by this application

---

## Data Distribution Analysis

### Company Distribution
- **BDC Companies:** 62 (19.4%)
- **OMC Companies:** 257 (80.6%)
- **Total:** 319 companies

### Product Categories (16 products in 9 categories)
| Category | Product Count |
|----------|---------------|
| Gasoil | 8 |
| Gasoline | 2 |
| LPG | 2 |
| Aviation Turbine Kerosene | 1 |
| Heavy Fuel Oil | 1 |
| Kerosene | 1 |
| Naphtha | 1 |

### Temporal Coverage
| Year | Months | Data Points |
|------|--------|-------------|
| 2019 | 12 | Complete year |
| 2020 | 12 | Complete year |
| 2021 | 12 | Complete year |
| 2022 | 12 | Complete year |
| 2023 | 12 | Complete year |
| 2024 | 12 | Complete year |
| 2025 | 6 | Jan-Jun (partial) |

---

## Volume Summary

### BDC Operations
- **Total Volume:** 29.5 million MT
- **Liters:** 38 billion liters
- **Transactions:** 8,475
- **Avg per transaction:** 3,481 MT

### OMC Operations
- **Total Volume:** 27.5 million MT
- **Liters:** 35.5 billion liters
- **Transactions:** 24,314
- **Avg per transaction:** 1,132 MT

### Supply Chain
- **Total Quantity:** 88 billion units
- **Coverage:** 17 regions
- **Time Span:** 2010-2025 (15 years)
- **Records:** 3,307

---

## Key Insights

### Data Architecture
1. **Star Schema Design**: Fact tables connected to dimension tables
2. **Data Pipeline**: Raw → Standardized → Facts → Views
3. **Multi-tenant Ready**: Infrastructure exists but not fully utilized

### Data Quality
- **Complete Coverage**: 6.5 years of consistent monthly data
- **Standardization**: Company names cleaned and standardized
- **Relationships**: All foreign keys properly maintained
- **Views**: Performance metrics accessible via views

### Unused Infrastructure
The `petroverse_core` schema has infrastructure for:
- User management
- API authentication
- Audit logging
- Dashboard configurations
- Reporting system
- Usage analytics

These are created but not yet populated/activated.

---

## Storage Estimate

### Active Data
- **Raw Tables:** ~33,000 records
- **Fact Tables:** ~33,000 records  
- **Dimensions:** ~400 records
- **Total Active Records:** ~66,400

### System Tables
- **petroverse_core:** 3 records (only tenants table populated)

### Total Database
- **Total Records:** ~66,403
- **Estimated Size:** ~50-100 MB (based on record counts and data types)