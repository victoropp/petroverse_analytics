# Database Setup Procedures

## Prerequisites

### System Requirements
- **PostgreSQL**: Version 17 or higher
- **Python**: Version 3.9 or higher
- **Memory**: Minimum 4GB RAM, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **OS**: Windows 10/11, macOS, or Linux

### Required Python Packages
```bash
pip install psycopg2-binary pandas sqlalchemy python-dotenv openpyxl xlrd
```

## Initial Database Setup

### 1. PostgreSQL Installation
```bash
# Download PostgreSQL 17 from official website
# Install with default settings
# Port: 5432
# User: postgres
# Password: [your_password]
```

### 2. Database Creation
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE petroverse_analytics;
CREATE SCHEMA petroverse;
```

### 3. User and Permissions
```sql
-- Create application user (optional)
CREATE USER petroverse_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE petroverse_analytics TO petroverse_user;
GRANT ALL PRIVILEGES ON SCHEMA petroverse TO petroverse_user;
```

## Schema Creation

### 1. Run Schema Script
Execute the following in psql or your preferred PostgreSQL client:

```sql
-- Connect to petroverse_analytics database
\c petroverse_analytics;

-- Create schema
CREATE SCHEMA IF NOT EXISTS petroverse;

-- Create dimension tables
CREATE TABLE IF NOT EXISTS petroverse.companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    company_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petroverse.products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) UNIQUE NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petroverse.time_dimension (
    date_id SERIAL PRIMARY KEY,
    full_date DATE UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fact tables
CREATE TABLE IF NOT EXISTS petroverse.fact_bdc_transactions (
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

CREATE TABLE IF NOT EXISTS petroverse.fact_omc_transactions (
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

-- Create raw data tables
CREATE TABLE IF NOT EXISTS petroverse.bdc_data (
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

CREATE TABLE IF NOT EXISTS petroverse.omc_data (
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

### 2. Create Performance Indexes
```sql
-- Analytics performance indexes
CREATE INDEX idx_bdc_company_date ON petroverse.fact_bdc_transactions(company_id, date_id);
CREATE INDEX idx_bdc_product_date ON petroverse.fact_bdc_transactions(product_id, date_id);
CREATE INDEX idx_bdc_date_volume ON petroverse.fact_bdc_transactions(date_id, volume_mt);

CREATE INDEX idx_omc_company_date ON petroverse.fact_omc_transactions(company_id, date_id);
CREATE INDEX idx_omc_product_date ON petroverse.fact_omc_transactions(product_id, date_id);
CREATE INDEX idx_omc_date_volume ON petroverse.fact_omc_transactions(date_id, volume_mt);

-- Time dimension indexes
CREATE INDEX idx_time_year_month ON petroverse.time_dimension(year, month);
CREATE INDEX idx_time_year_quarter ON petroverse.time_dimension(year, quarter);

-- Company and product lookup indexes
CREATE INDEX idx_companies_type ON petroverse.companies(company_type);
CREATE INDEX idx_products_category ON petroverse.products(product_category);
```

## Data Loading Procedures

### 1. Load Dimension Data

#### Products Dimension
```sql
INSERT INTO petroverse.products (product_name, product_category) VALUES
('Aviation Turbine Kerosene', 'Aviation & Kerosene'),
('Gasoil', 'Gasoil'),
('Gasoline', 'Gasoline'),
('Heavy Fuel Oil', 'Heavy Fuel Oil'),
('Kerosene', 'Aviation & Kerosene'),
('LPG', 'LPG'),
('Lubricants', 'Lubricants'),
('Naphtha', 'Naphtha'),
('Premix', 'Other Petroleum Products');
```

#### Time Dimension (2019-2025)
```sql
INSERT INTO petroverse.time_dimension (full_date, year, month, quarter)
SELECT 
    date_val,
    EXTRACT(YEAR FROM date_val)::INTEGER,
    EXTRACT(MONTH FROM date_val)::INTEGER,
    CEIL(EXTRACT(MONTH FROM date_val) / 3.0)::INTEGER
FROM generate_series('2019-01-01'::date, '2025-12-01'::date, '1 month'::interval) AS date_val;
```

### 2. Load Transaction Data

#### Using Python Scripts
```bash
# Navigate to data/scripts directory
cd data/scripts

# Load BDC data
python replace_database_with_final_bdc.py

# Load OMC data
python update_omc_data_only.py
```

#### Using COPY Commands
```sql
-- Load BDC data
\COPY petroverse.bdc_data(source_file, company_name, company_type, product, product_code, year, month, volume_liters, volume_kg, volume_mt, data_quality_score, is_outlier) 
FROM 'C:\path\to\data\final\FINAL_BDC_DATA.csv' WITH CSV HEADER;

-- Load OMC data
\COPY petroverse.omc_data(source_file, company_name, company_type, product, product_code, year, month, volume_liters, volume_kg, volume_mt, data_quality_score, is_outlier) 
FROM 'C:\path\to\data\final\FINAL_OMC_DATA.csv' WITH CSV HEADER;
```

## Configuration

### 1. Environment Variables
Create `.env` file in the project root:
```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/petroverse_analytics
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petroverse_analytics
DB_USER=postgres
DB_PASSWORD=your_password

# Application Configuration
API_PORT=8003
WEB_PORT=3001
DEBUG=true
LOG_LEVEL=INFO
```

### 2. Database Connection String
```python
# Python connection example
import sqlalchemy as sa

DATABASE_URL = "postgresql://postgres:password@localhost:5432/petroverse_analytics"
engine = sa.create_engine(DATABASE_URL)
```

## Verification Procedures

### 1. Data Integrity Checks
```sql
-- Verify record counts
SELECT 'BDC Transactions' as table_name, COUNT(*) as records FROM petroverse.fact_bdc_transactions
UNION ALL
SELECT 'OMC Transactions', COUNT(*) FROM petroverse.fact_omc_transactions
UNION ALL
SELECT 'Companies', COUNT(*) FROM petroverse.companies
UNION ALL
SELECT 'Products', COUNT(*) FROM petroverse.products
UNION ALL
SELECT 'Time Periods', COUNT(*) FROM petroverse.time_dimension;

-- Expected Results:
-- BDC Transactions: 8,475
-- OMC Transactions: 24,314  
-- Companies: 319
-- Products: 9
-- Time Periods: 84
```

### 2. Volume Validation
```sql
-- Check volume totals
SELECT 
    'Total Volume (MT)' as metric,
    ROUND(SUM(volume_mt)::NUMERIC, 2) as value
FROM (
    SELECT volume_mt FROM petroverse.fact_bdc_transactions
    UNION ALL
    SELECT volume_mt FROM petroverse.fact_omc_transactions
) combined;

-- Expected Result: ~57,000,000 MT
```

### 3. Foreign Key Integrity
```sql
-- Check for orphaned records
SELECT 'Orphaned BDC Companies' as check_type, COUNT(*) as count
FROM petroverse.fact_bdc_transactions f
LEFT JOIN petroverse.companies c ON f.company_id = c.company_id
WHERE c.company_id IS NULL

UNION ALL

SELECT 'Orphaned OMC Companies', COUNT(*)
FROM petroverse.fact_omc_transactions f
LEFT JOIN petroverse.companies c ON f.company_id = c.company_id
WHERE c.company_id IS NULL

UNION ALL

SELECT 'Orphaned Products', COUNT(*)
FROM (
    SELECT product_id FROM petroverse.fact_bdc_transactions
    UNION
    SELECT product_id FROM petroverse.fact_omc_transactions
) f
LEFT JOIN petroverse.products p ON f.product_id = p.product_id
WHERE p.product_id IS NULL;

-- Expected Results: All counts should be 0
```

## Backup Configuration

### 1. Automated Daily Backup
```bash
#!/bin/bash
# Create backup script: backup_database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="C:/Users/victo/Documents/Data_Science_Projects/petroverse_analytics/backups"
DB_NAME="petroverse_analytics"

# Full database backup
pg_dump -U postgres -d $DB_NAME -f "$BACKUP_DIR/petroverse_backup_$DATE.sql"

# Schema-only backup
pg_dump -U postgres -d $DB_NAME --schema-only -f "$BACKUP_DIR/petroverse_schema_$DATE.sql"

# Data-only backup
pg_dump -U postgres -d $DB_NAME --data-only -f "$BACKUP_DIR/petroverse_data_$DATE.sql"

echo "Backup completed: petroverse_backup_$DATE.sql"
```

### 2. Restoration Procedures
```bash
# Full database restore
dropdb -U postgres petroverse_analytics
createdb -U postgres petroverse_analytics
psql -U postgres -d petroverse_analytics -f backup_file.sql

# Schema-only restore
psql -U postgres -d petroverse_analytics -f schema_backup.sql

# Data-only restore (after schema exists)
psql -U postgres -d petroverse_analytics -f data_backup.sql
```

## Performance Tuning

### 1. PostgreSQL Configuration
Add to `postgresql.conf`:
```ini
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

# Analytics-specific settings
random_page_cost = 1.1
seq_page_cost = 1.0
cpu_tuple_cost = 0.01

# Logging
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### 2. Query Optimization
```sql
-- Analyze tables for query planner
ANALYZE petroverse.fact_bdc_transactions;
ANALYZE petroverse.fact_omc_transactions;
ANALYZE petroverse.companies;
ANALYZE petroverse.products;
ANALYZE petroverse.time_dimension;

-- Vacuum for performance
VACUUM ANALYZE;
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check PostgreSQL service status
# Windows: services.msc -> PostgreSQL
# Linux: systemctl status postgresql
# macOS: brew services list | grep postgresql
```

#### 2. Permission Denied
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA petroverse TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA petroverse TO postgres;
```

#### 3. Memory Issues
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'petroverse'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 4. Slow Queries
```sql
-- Enable query logging in postgresql.conf
log_min_duration_statement = 1000

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

---
*Last Updated: August 27, 2025*
*Setup Version: 1.0*