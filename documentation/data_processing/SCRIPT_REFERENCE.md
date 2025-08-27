# Data Processing Script Reference

## Overview
This document provides detailed reference information for all data processing scripts in the PetroVerse Analytics platform. Each script is documented with its purpose, parameters, inputs, outputs, and usage examples.

## Script Organization

### Directory Structure
```
data/scripts/
├── extraction/
│   ├── extract_cleaned_bdc.py
│   └── extract_cleaned_omc.py
├── standardization/
│   ├── final_bdc_extraction.py
│   ├── final_omc_extraction.py
│   ├── apply_omc_updates_robust.py
│   └── create_detailed_omc_mappings.py
├── database/
│   ├── replace_database_with_final_bdc.py
│   ├── update_omc_data_only.py
│   └── import_final_bdc_omc_data.py
└── utilities/
    ├── fix_conversion_final.py
    ├── apply_proper_conversions_bdc.py
    └── standardize_omc_data.py
```

## Extraction Scripts

### extract_cleaned_bdc.py

**Purpose**: Extract raw BDC data from cleaned Excel files

**Class**: `BDCDataExtractor`

**Key Methods**:
```python
def __init__(self, source_directory, conversion_factors_file):
    """Initialize with source directory and conversion factors"""

def extract_all_files(self):
    """Extract data from all BIDEC Excel files in directory"""
    
def extract_sheet_data(self, file_path, sheet_name, year):
    """Extract data from a single Excel sheet"""
    
def standardize_column_names(self, df):
    """Map varying column names to standard format"""
```

**Input Requirements**:
- **Source Directory**: Path to Excel files
- **File Pattern**: `BIDEC-Performance-Jan-Dec-YYYY.xlsx`
- **Conversion Factors**: Excel file with product conversion factors

**Output**:
- **CSV File**: `CLEANED_BDC_data_YYYYMMDD_HHMMSS.csv`
- **Record Count**: ~8,735 raw records
- **Columns**: company_name, product, volume, unit_type, year, month, source_file

**Usage Example**:
```python
from extract_cleaned_bdc import BDCDataExtractor

extractor = BDCDataExtractor(
    source_directory="data/raw/Raw_Organised",
    conversion_factors_file="data/conversion factors.xlsx"
)

extracted_data = extractor.extract_all_files()
print(f"Extracted {len(extracted_data)} records")
```

**Error Handling**:
- Missing sheets are logged and skipped
- Invalid data types are converted to defaults
- File access errors are caught and reported

---

### extract_cleaned_omc.py

**Purpose**: Extract raw OMC data from cleaned Excel files

**Class**: `OMCDataExtractor`

**Key Features**:
- Similar structure to BDC extractor
- Handles larger volume of companies
- All products in liters (no KG handling)
- Enhanced data cleaning for OMC-specific issues

**Input Requirements**:
- **Source Directory**: Path to OMC Excel files
- **File Pattern**: `OMC-Performance-Jan-Dec-YYYY.xlsx`

**Output**:
- **CSV File**: `CLEANED_OMC_data_YYYYMMDD_HHMMSS.csv`
- **Record Count**: ~39,915 raw records → 24,314 after cleaning

**Key Differences from BDC**:
```python
# OMC-specific data cleaning
def clean_invalid_entries(self, df):
    """Remove 'NO.' entries and invalid data specific to OMC files"""
    initial_count = len(df)
    
    # Remove rows with 'NO.' in company name
    df = df[~df['company_name'].str.contains('NO.', na=False)]
    
    # Remove rows with missing essential data
    df = df.dropna(subset=['company_name', 'product', 'volume'])
    
    cleaned_count = len(df)
    logger.info(f"Cleaned data: {initial_count} → {cleaned_count} records")
    
    return df
```

## Standardization Scripts

### final_bdc_extraction.py

**Purpose**: Apply user-reviewed mappings and generate final BDC dataset

**Class**: `FinalBDCProcessor`

**Key Methods**:
```python
def load_user_mappings(self, excel_file_path):
    """Load user-reviewed standardization mappings from Excel"""
    
def apply_product_standardization(self, df, product_mapping):
    """Apply product name standardization"""
    
def apply_company_standardization(self, df, company_mapping):
    """Apply company name standardization"""
    
def convert_volumes(self, df, conversion_factors):
    """Apply volume conversions with proper formulas"""
    
def calculate_quality_scores(self, df):
    """Calculate data quality scores for each record"""
    
def detect_outliers(self, df):
    """Statistical outlier detection using IQR and Z-scores"""
```

**Critical Volume Conversion Logic**:
```python
def convert_single_record(self, row, conversion_factors):
    """Convert volumes for a single record"""
    product = row['standardized_product']
    
    if product == 'LPG':
        # LPG is already in KG, convert to MT
        volume_mt = row['volume_kg'] / 1000
        volume_liters = row['volume_kg'] * 1.8  # Approximate L conversion
    else:
        # All other products: Liters to MT directly
        cf = conversion_factors.get(product, 1000)  # Default factor
        volume_mt = row['volume_liters'] / cf
        volume_kg = volume_mt * 1000
        volume_liters = row['volume_liters']  # Keep original
    
    return {
        'volume_mt': volume_mt,
        'volume_kg': volume_kg, 
        'volume_liters': volume_liters
    }
```

**Input Requirements**:
- **Raw BDC Data**: CSV from extraction script
- **User Mappings**: `BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx`
- **Conversion Factors**: Product-specific conversion rates

**Output**:
- **Final Dataset**: `FINAL_BDC_DATA.csv`
- **Record Count**: 8,475 validated records
- **Standardized Products**: 15 products in 7 categories
- **Validated Companies**: 62 companies

---

### apply_omc_updates_robust.py

**Purpose**: Apply user-updated OMC mappings with robust error handling

**Class**: `RobustOMCProcessor`

**Enhanced Error Handling**:
```python
def safe_mapping_application(self, df, mapping_dict, column_name):
    """Apply mappings with error recovery"""
    success_count = 0
    error_count = 0
    
    for index, row in df.iterrows():
        try:
            original_value = row[column_name]
            if original_value in mapping_dict:
                df.at[index, f'{column_name}_standardized'] = mapping_dict[original_value]
                success_count += 1
            else:
                df.at[index, f'{column_name}_standardized'] = original_value
        except Exception as e:
            logger.warning(f"Error processing row {index}: {str(e)}")
            error_count += 1
            df.at[index, f'{column_name}_standardized'] = original_value
    
    logger.info(f"Mapping applied: {success_count} success, {error_count} errors")
    return df
```

**Dynamic Column Detection**:
```python
def detect_excel_structure(self, excel_file):
    """Dynamically detect Excel file structure and columns"""
    try:
        # Try different possible structures
        structures = [
            {'sheet': 'Product_Mappings', 'cols': ['Original_Product', 'Standardized_Product']},
            {'sheet': 'Products', 'cols': ['original_name', 'standardized_name']},
            {'sheet': 'product_mapping', 'cols': ['Product', 'Standard_Product']}
        ]
        
        for structure in structures:
            try:
                df = pd.read_excel(excel_file, sheet_name=structure['sheet'])
                if all(col in df.columns for col in structure['cols']):
                    return structure
            except:
                continue
                
        # Fallback to auto-detection
        return self.auto_detect_structure(excel_file)
        
    except Exception as e:
        logger.error(f"Could not detect Excel structure: {str(e)}")
        raise
```

## Database Scripts

### replace_database_with_final_bdc.py

**Purpose**: Replace all database data with final BDC extraction

**Class**: `DatabaseReplacer`

**Key Operations**:
```python
def clear_all_tables(self):
    """Safely clear all data while preserving schema"""
    tables_to_clear = [
        'petroverse.fact_bdc_transactions',
        'petroverse.fact_omc_transactions', 
        'petroverse.companies',
        'petroverse.products',
        'petroverse.time_dimension'
    ]
    
    for table in tables_to_clear:
        self.execute_sql(f"TRUNCATE TABLE {table} CASCADE")
        logger.info(f"Cleared table: {table}")

def load_dimension_data(self):
    """Load companies, products, and time dimension data"""
    
    # Load standardized products
    products_data = self.extract_products_from_final_data()
    self.bulk_insert('petroverse.products', products_data)
    
    # Load standardized companies  
    companies_data = self.extract_companies_from_final_data()
    self.bulk_insert('petroverse.companies', companies_data)
    
    # Generate time dimension
    time_data = self.generate_time_dimension(start_date='2019-01-01', end_date='2025-12-01')
    self.bulk_insert('petroverse.time_dimension', time_data)

def load_fact_data(self):
    """Load transaction fact data with proper foreign key relationships"""
    
    # Create mapping dictionaries for lookups
    company_mapping = self.create_company_id_mapping()
    product_mapping = self.create_product_id_mapping() 
    date_mapping = self.create_date_id_mapping()
    
    # Process and load fact data
    fact_data = []
    for _, row in self.final_data.iterrows():
        fact_record = {
            'transaction_id': row['id'],
            'company_id': company_mapping[row['company_name']],
            'product_id': product_mapping[row['product']],
            'date_id': date_mapping[(row['year'], row['month'])],
            'volume_liters': row['volume_liters'],
            'volume_mt': row['volume_mt'],
            'volume_kg': row['volume_kg'],
            'data_quality_score': row['data_quality_score'],
            'is_outlier': row['is_outlier'],
            'source_file': row['source_file']
        }
        fact_data.append(fact_record)
    
    self.bulk_insert('petroverse.fact_bdc_transactions', fact_data)
```

---

### update_omc_data_only.py

**Purpose**: Update database with OMC data while preserving BDC data

**Selective Update Strategy**:
```python
def preserve_bdc_data(self):
    """Ensure BDC data remains intact during OMC update"""
    
    # Backup BDC data temporarily
    bdc_backup = self.execute_query("""
        SELECT * FROM petroverse.fact_bdc_transactions
    """)
    
    # Clear only OMC-related data
    self.execute_sql("""
        DELETE FROM petroverse.companies WHERE company_type = 'OMC'
    """)
    
    self.execute_sql("""
        DELETE FROM petroverse.fact_omc_transactions
    """)
    
    logger.info("OMC data cleared, BDC data preserved")
    
    return bdc_backup

def smart_id_management(self):
    """Use separate ID ranges for BDC and OMC data"""
    
    # BDC companies: 1001-1100 range
    # OMC companies: 2001-2500 range
    
    max_bdc_id = self.execute_query("""
        SELECT COALESCE(MAX(company_id), 1000) FROM petroverse.companies 
        WHERE company_type = 'BDC'
    """)[0][0]
    
    # Start OMC IDs after BDC range
    omc_start_id = max(2001, max_bdc_id + 100)
    
    return omc_start_id
```

## Utility Scripts

### fix_conversion_final.py

**Purpose**: Fix volume conversion errors in processed data

**Critical Fix Applied**:
```python
def fix_conversion_errors(self, df):
    """Fix incorrect volume conversion calculations"""
    
    logger.info("Applying corrected conversion formulas...")
    
    conversion_factors = self.load_conversion_factors()
    
    for index, row in df.iterrows():
        product = row['product']
        original_volume_liters = row['volume_liters']
        original_volume_kg = row['volume_kg']
        
        if product == 'LPG':
            # LPG: KG to MT conversion (correct)
            corrected_mt = original_volume_kg / 1000
            corrected_kg = original_volume_kg  # Keep original
            corrected_liters = original_volume_kg * 1.8  # Approximate
        else:
            # Other products: Liters to MT conversion (CORRECTED)
            cf = conversion_factors.get(product, 1000)
            corrected_mt = original_volume_liters / cf  # DIRECT conversion
            corrected_kg = corrected_mt * 1000
            corrected_liters = original_volume_liters  # Keep original
        
        # Update the dataframe
        df.at[index, 'volume_mt'] = corrected_mt
        df.at[index, 'volume_kg'] = corrected_kg
        df.at[index, 'volume_liters'] = corrected_liters
    
    logger.info("Volume conversions corrected successfully")
    return df

def validate_corrections(self, df):
    """Validate that corrections are applied properly"""
    
    # Check LPG volumes (should be reasonable)
    lpg_data = df[df['product'] == 'LPG']
    lpg_total_mt = lpg_data['volume_mt'].sum()
    logger.info(f"LPG total volume: {lpg_total_mt:,.0f} MT")
    
    # Check gasoline volumes (should be much larger now)
    gasoline_data = df[df['product'] == 'Gasoline']
    gasoline_total_mt = gasoline_data['volume_mt'].sum()
    logger.info(f"Gasoline total volume: {gasoline_total_mt:,.0f} MT")
    
    # Validate conversion consistency
    for product in df['product'].unique():
        product_data = df[df['product'] == product]
        if product != 'LPG':
            # Check L to MT conversion
            cf = self.conversion_factors.get(product, 1000)
            expected_mt = product_data['volume_liters'] / cf
            actual_mt = product_data['volume_mt']
            
            if not np.allclose(expected_mt, actual_mt, rtol=0.01):
                logger.warning(f"Conversion inconsistency detected for {product}")
    
    return True
```

## Common Usage Patterns

### Complete BDC Processing Pipeline
```bash
# 1. Extract raw data
cd data/scripts
python extract_cleaned_bdc.py

# 2. Generate standardization mappings
python create_bdc_standardization_mappings.py

# 3. User reviews and updates Excel file manually

# 4. Apply final standardization
python final_bdc_extraction.py

# 5. Load into database
python replace_database_with_final_bdc.py

# 6. Verify data integrity
python verify_database_integrity.py
```

### Complete OMC Processing Pipeline  
```bash
# 1. Extract raw OMC data
python extract_cleaned_omc.py

# 2. Generate detailed mappings
python create_detailed_omc_mappings.py

# 3. User reviews and updates mappings

# 4. Apply robust standardization
python apply_omc_updates_robust.py

# 5. Update database (preserve BDC)
python update_omc_data_only.py

# 6. Verify integration
python verify_dashboard_integration.py
```

### Error Recovery Procedures
```bash
# If BDC processing fails
python restore_bdc_from_backup.py --backup-date 20250827

# If OMC processing fails
python rollback_omc_changes.py --preserve-bdc

# If database corruption occurs
python restore_full_database.py --backup-file latest_backup.sql
```

## Performance Considerations

### Memory Usage Optimization
- Process files in chunks for large datasets
- Use pandas dtypes optimization
- Clear intermediate variables
- Use generators for large iterations

### Database Performance
- Use bulk inserts for large data loads
- Create indexes after data loading
- Use COPY commands for fastest imports
- Implement connection pooling

### Monitoring and Alerting
- Log processing times and memory usage
- Set up alerts for processing failures
- Monitor data quality score trends
- Track volume consistency over time

---
*Last Updated: August 27, 2025*
*Script Reference Version: 1.0*