# Data Processing Workflows

## Overview

The PetroVerse Analytics platform processes petroleum industry data through a comprehensive pipeline that extracts, standardizes, validates, and loads data from Excel files into a PostgreSQL database. This document outlines the complete data processing workflows for both BDC (Bulk Distribution Companies) and OMC (Oil Marketing Companies) datasets.

## Workflow Architecture

```
Raw Excel Files → Extraction → Standardization → Conversion → Validation → Database Loading → Analytics
```

### Data Flow Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Excel Files   │ →  │    Extraction    │ →  │ Standardization │
│   2019-2025     │    │   & Cleaning     │    │   & Mapping     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        ↓
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostgreSQL    │ ←  │   Validation     │ ←  │    Unit         │
│   Database      │    │   & Quality      │    │  Conversion     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## BDC Data Processing Workflow

### Phase 1: Data Extraction

#### Source Files
- **Location**: `data/raw/Raw_Organised/`
- **Pattern**: `BIDEC-Performance-Jan-Dec-YYYY.xlsx`
- **Years**: 2019, 2020, 2021, 2022, 2023, 2024, 2025
- **Structure**: Monthly sheets with varying column names

#### Script: `extract_cleaned_bdc.py`
**Purpose**: Extract raw data from cleaned BDC Excel files

**Key Features**:
- Handles varying column names across years
- Extracts monthly data from multiple sheets
- Processes 7 Excel files (2019-2025)
- Handles missing sheets gracefully

**Process Flow**:
1. **File Discovery**: Scans directory for BIDEC files
2. **Sheet Processing**: Iterates through monthly sheets
3. **Column Mapping**: Maps varying column names to standard format
4. **Data Extraction**: Extracts company and product volume data
5. **Raw Data Export**: Saves to `CLEANED_BDC_data_YYYYMMDD_HHMMSS.csv`

**Output**: ~8,735 raw records before standardization

### Phase 2: Standardization Mapping

#### Script: `create_bdc_standardization_mappings.py`
**Purpose**: Generate standardization mappings for user review

**Process**:
1. **Product Analysis**: Identify all unique products (34 found)
2. **Company Analysis**: Identify all unique companies (67 found)
3. **Mapping Creation**: Generate standardization mappings
4. **User Review File**: Create Excel file with 5 sheets:
   - Product mappings with conversion factors
   - Company mappings with standardized names
   - Products to remove (invalid entries)
   - Companies to remove (invalid entries)
   - Summary statistics

**Output**: `BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx`

#### User Review Process
1. **Manual Review**: User reviews and updates mappings
2. **Category Addition**: User adds "Standardized_Category" column
3. **Validation**: User confirms all mappings are correct
4. **Feedback Integration**: Updated file used for final extraction

### Phase 3: Final Extraction with Standardization

#### Script: `final_bdc_extraction.py`
**Purpose**: Apply user-reviewed mappings and generate final dataset

**Key Processing Steps**:
1. **Mapping Import**: Load user-reviewed Excel mappings
2. **Product Standardization**: Map 34 products → 15 standardized products
3. **Company Standardization**: Map 67 companies → 62 valid companies
4. **Invalid Record Removal**: Remove 260 invalid records
5. **Volume Conversion**: Apply conversion factors
6. **Quality Scoring**: Calculate data quality scores
7. **Outlier Detection**: Statistical analysis for outliers

**Critical Conversion Logic**:
```python
# CORRECTED conversion logic
def convert_volumes(row, conversion_factors):
    product = row['standardized_product']
    volume_liters = row['volume_liters']
    volume_kg = row['volume_kg']
    
    if product == 'LPG':
        # LPG is already in KG
        volume_mt = volume_kg / 1000
        volume_liters = volume_kg * 1.8  # Approximate conversion
    else:
        # All other products in liters
        conversion_factor = conversion_factors[product]
        volume_mt = volume_liters / conversion_factor  # Direct L to MT
        volume_kg = volume_mt * 1000  # MT to KG
    
    return volume_mt, volume_kg, volume_liters
```

**Output**: `FINAL_BDC_DATA.csv` with 8,475 validated records

### Phase 4: Database Loading

#### Script: `replace_database_with_final_bdc.py`
**Purpose**: Load BDC data into PostgreSQL database

**Process**:
1. **Database Connection**: Connect to PostgreSQL
2. **Schema Preparation**: Create/clear tables
3. **Dimension Loading**: Load companies, products, time periods
4. **Fact Table Loading**: Load transaction data
5. **Integrity Validation**: Verify foreign key relationships
6. **Performance Optimization**: Create indexes

**Database Operations**:
- Clear existing data (TRUNCATE all tables)
- Load 62 standardized companies
- Load 9 standardized product categories
- Load 84 time periods (2019-2025 monthly)
- Load 8,475 fact transactions

## OMC Data Processing Workflow

### Phase 1: Data Extraction

#### Script: `extract_cleaned_omc.py`
**Purpose**: Extract raw data from cleaned OMC Excel files

**Source Files**:
- **Location**: `data/raw/Raw_Organised/`
- **Pattern**: `OMC-Performance-Jan-Dec-YYYY.xlsx`
- **Years**: 2019, 2020, 2021, 2022, 2023, 2024, 2025

**Key Differences from BDC**:
- More companies (257 vs 62)
- Different product mix emphasis
- Higher transaction volume
- More complex standardization requirements

**Process**:
1. **File Processing**: Similar to BDC extraction
2. **Volume Handling**: All products in liters (no LPG special case)
3. **Data Cleaning**: Remove "NO." entries and invalid records
4. **Raw Export**: Save to timestamped CSV file

**Output**: ~39,915 raw records → 24,314 after cleaning

### Phase 2: Standardization and Mapping

#### Script: `create_detailed_omc_mappings.py`
**Purpose**: Generate comprehensive OMC standardization mappings

**Enhanced Features**:
- **Detailed Product Analysis**: More granular product categorization
- **Company Consolidation**: Merge similar company variations
- **Geographic Grouping**: Group companies by region where applicable
- **Volume-based Priority**: Prioritize high-volume entities

**Output**: `OMC_STANDARDIZATION_MAPPINGS_DETAILED_YYYYMMDD_HHMMSS.xlsx`

### Phase 3: User Review and Updates

#### Process: Manual Review and Updates
1. **User Feedback Integration**: User updates standardization mappings
2. **Advanced Categorization**: More sophisticated product groupings
3. **Company Validation**: Verify company names and types

#### Script: `apply_omc_updates_robust.py`
**Purpose**: Apply user-updated OMC mappings with robust error handling

**Robust Features**:
- **Dynamic Column Detection**: Adapts to different Excel structures
- **Error Recovery**: Continues processing despite individual errors
- **Validation Checks**: Comprehensive data validation
- **Progress Reporting**: Detailed processing feedback

### Phase 4: Database Integration

#### Script: `update_omc_data_only.py`
**Purpose**: Update database with OMC data while preserving BDC data

**Selective Update Process**:
1. **Preserve BDC Data**: Keep all BDC transactions intact
2. **Clear OMC Data**: Remove only OMC-related records
3. **Smart ID Management**: Use separate ID ranges (BDC: 1001+, OMC: 2001+)
4. **Incremental Loading**: Add OMC data without affecting BDC
5. **Integrity Maintenance**: Ensure foreign key consistency

## Volume Conversion Specifications

### Conversion Factors (Liters per Metric Ton)

| Product Category | Conversion Factor | Source Unit | Target Unit |
|------------------|-------------------|-------------|-------------|
| **Gasoline** | 1324.5 | Liters | MT |
| **Gasoil** | 1190.0 | Liters | MT |
| **LPG** | 1000.0* | Kilograms | MT |
| **ATK** | 1235.0 | Liters | MT |
| **Heavy Fuel Oil** | 1050.0 | Liters | MT |
| **Kerosene** | 1235.0 | Liters | MT |
| **Naphtha** | 1450.0 | Liters | MT |
| **Lubricants** | 1100.0 | Liters | MT |
| **Premix** | 1190.0 | Liters | MT |

*LPG conversion: Direct KG to MT (÷1000)

### Critical Conversion Formula
```python
# For all products except LPG
volume_mt = volume_liters / conversion_factor

# For LPG (already in KG)
volume_mt = volume_kg / 1000

# Derived calculations
volume_kg = volume_mt * 1000
```

## Data Quality Framework

### Quality Metrics

#### Completeness Score
```python
def calculate_completeness_score(row):
    required_fields = ['company_name', 'product', 'volume', 'year', 'month']
    filled_fields = sum(1 for field in required_fields if pd.notna(row[field]))
    return filled_fields / len(required_fields)
```

#### Consistency Score
```python
def calculate_consistency_score(row, valid_companies, valid_products):
    consistency_score = 0.0
    
    if row['company_name'] in valid_companies:
        consistency_score += 0.5
    if row['product'] in valid_products:
        consistency_score += 0.5
        
    return consistency_score
```

#### Overall Quality Score
```python
quality_score = (completeness_score * 0.4 + 
                consistency_score * 0.3 + 
                validity_score * 0.3)
```

### Outlier Detection

#### Statistical Method
```python
def detect_outliers(df, column='volume_mt'):
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    df['is_outlier'] = (df[column] < lower_bound) | (df[column] > upper_bound)
    return df
```

#### Z-Score Method
```python
def z_score_outliers(df, column='volume_mt', threshold=3):
    z_scores = np.abs(stats.zscore(df[column]))
    df['is_outlier_zscore'] = z_scores > threshold
    return df
```

## Error Handling and Validation

### Common Issues and Solutions

#### 1. Missing Sheets
```python
try:
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=1)
except Exception as e:
    logger.warning(f"Could not read sheet {sheet_name}: {str(e)}")
    continue  # Skip to next sheet
```

#### 2. Column Name Variations
```python
def standardize_column_names(df):
    column_mapping = {
        'Company Name': 'company_name',
        'COMPANY NAME': 'company_name',
        'Company': 'company_name',
        'COMPANY': 'company_name',
        # ... more mappings
    }
    
    for old_name, new_name in column_mapping.items():
        if old_name in df.columns:
            df.rename(columns={old_name: new_name}, inplace=True)
    
    return df
```

#### 3. Data Type Conversion
```python
def safe_numeric_conversion(value, default=0.0):
    try:
        return float(value) if pd.notna(value) else default
    except (ValueError, TypeError):
        return default
```

#### 4. Date Validation
```python
def validate_date_range(year, month):
    if not (2019 <= year <= 2025):
        return False
    if not (1 <= month <= 12):
        return False
    return True
```

## Performance Optimizations

### Memory Management
```python
def process_large_excel_file(file_path, chunk_size=1000):
    all_data = []
    
    for sheet_name in sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # Process in chunks to manage memory
        for chunk in pd.read_csv(StringIO(df.to_csv()), chunksize=chunk_size):
            processed_chunk = process_chunk(chunk)
            all_data.append(processed_chunk)
            
    return pd.concat(all_data, ignore_index=True)
```

### Database Loading Optimization
```python
def bulk_insert_with_progress(df, table_name, connection, batch_size=1000):
    total_rows = len(df)
    
    for i in range(0, total_rows, batch_size):
        batch = df.iloc[i:i+batch_size]
        batch.to_sql(table_name, connection, if_exists='append', index=False)
        
        progress = (i + len(batch)) / total_rows * 100
        logger.info(f"Inserted {i + len(batch)}/{total_rows} rows ({progress:.1f}%)")
```

## Monitoring and Logging

### Processing Logs
All scripts generate detailed logs including:
- **Processing Start/End Times**
- **Record Counts** (before/after each step)
- **Error Messages** with context
- **Performance Metrics** (processing time, memory usage)
- **Data Quality Reports**

### Log File Structure
```
logs/
├── bdc_extraction_YYYYMMDD.log
├── omc_extraction_YYYYMMDD.log
├── database_loading_YYYYMMDD.log
└── data_validation_YYYYMMDD.log
```

### Sample Log Entry
```
2025-08-27 10:30:15 INFO: Starting BDC data extraction
2025-08-27 10:30:16 INFO: Found 7 Excel files to process
2025-08-27 10:30:17 INFO: Processing BIDEC-Performance-Jan-Dec-2024.xlsx
2025-08-27 10:30:18 INFO: ✓ Extracted 1,245 records from 2024 file
2025-08-27 10:30:19 INFO: Applied standardization mappings: 1,245 → 1,201 records
2025-08-27 10:30:20 INFO: Volume conversion completed: 1,201 records processed
2025-08-27 10:30:21 INFO: Quality scoring: Average score 0.94
2025-08-27 10:30:22 INFO: Outlier detection: 12 outliers flagged
2025-08-27 10:30:23 INFO: ✅ BDC extraction completed successfully
```

---
*Last Updated: August 27, 2025*
*Workflow Version: 1.0*