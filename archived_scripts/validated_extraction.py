"""
Validated Data Extraction Script
This script carefully extracts data month-by-month with validation at each step
"""

import pandas as pd
import numpy as np
from pathlib import Path
import re
from datetime import datetime
import logging
import json

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'validated_extraction_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ValidatedExtractor:
    def __init__(self, raw_data_path: str):
        self.raw_data_path = Path(raw_data_path)
        self.extracted_data = {'bdc': [], 'omc': []}
        self.validation_reports = []
        self.standardization_map = {}
        
        # Track extraction statistics
        self.stats = {
            'files_processed': 0,
            'sheets_processed': 0,
            'records_extracted': 0,
            'validation_errors': 0,
            'january_corrections': 0,
            'duplicates_removed': 0
        }
        
        # Load conversion factors
        self.load_conversion_factors()
        
        # Load standardization mappings
        self.load_standardization_mappings()
    
    def load_conversion_factors(self):
        """Load conversion factors from Excel file"""
        try:
            conv_file = self.raw_data_path / "coversion factors.xlsx"
            df = pd.read_excel(conv_file)
            
            logger.info("Loading conversion factors...")
            factors_row = df.iloc[0]
            
            self.conversion_factors = {
                'GASOLINE': factors_row['Premium '] / 1000,
                'GASOIL': factors_row['Gas oil '] / 1000,
                'MARINE_GASOIL': factors_row['Marine Gasoil '] / 1000,
                'FUEL_OIL': factors_row['Fuel  oil '] / 1000,
                'KEROSENE': factors_row['Kerosene '] / 1000,
                'LPG': factors_row['LPG '] / 1000,
                'ATK': factors_row['Kerosene '] / 1000,
                'PREMIX': factors_row['Premium '] / 1000,
                'NAPHTHA': factors_row['Unified'] / 1000,
                'DEFAULT': factors_row['Unified'] / 1000
            }
            
            logger.info(f"Loaded {len(self.conversion_factors)} conversion factors")
            
        except Exception as e:
            logger.error(f"Failed to load conversion factors: {e}")
            # Use defaults
            self.conversion_factors = {
                'GASOLINE': 0.740, 'GASOIL': 0.832, 'KEROSENE': 0.810,
                'FUEL_OIL': 0.950, 'LPG': 0.540, 'ATK': 0.810,
                'PREMIX': 0.740, 'MARINE_GASOIL': 0.832,
                'NAPHTHA': 0.740, 'DEFAULT': 0.800
            }
    
    def load_standardization_mappings(self):
        """Load company standardization mappings"""
        try:
            # Load the user-approved standardization
            mapping_file = self.raw_data_path.parent / "COMPANY_STANDARDIZATION_MAPPING_20250826_231345.xlsx"
            if mapping_file.exists():
                omc_df = pd.read_excel(mapping_file, sheet_name='OMC_Mapping')
                bdc_df = pd.read_excel(mapping_file, sheet_name='BDC_Mapping')
                
                # Build standardization dictionary
                self.standardization_map['OMC'] = {}
                for _, row in omc_df.iterrows():
                    original = row['Original_Name']
                    standardized = row['Your_Corrected_Name'] if pd.notna(row['Your_Corrected_Name']) and row['Your_Corrected_Name'] else row['Proposed_Standard_Name']
                    self.standardization_map['OMC'][original] = standardized
                
                self.standardization_map['BDC'] = {}
                for _, row in bdc_df.iterrows():
                    original = row['Original_Name']
                    standardized = row['Your_Corrected_Name'] if pd.notna(row['Your_Corrected_Name']) and row['Your_Corrected_Name'] else row['Proposed_Standard_Name']
                    self.standardization_map['BDC'][original] = standardized
                
                logger.info(f"Loaded standardization mappings: {len(self.standardization_map['OMC'])} OMC, {len(self.standardization_map['BDC'])} BDC")
            else:
                logger.warning("Standardization mapping file not found - will use raw company names")
                self.standardization_map = {'OMC': {}, 'BDC': {}}
        except Exception as e:
            logger.error(f"Failed to load standardization mappings: {e}")
            self.standardization_map = {'OMC': {}, 'BDC': {}}
    
    def validate_sheet_data(self, df, sheet_name, year, month, dataset_type):
        """Validate extracted data from a sheet"""
        validation = {
            'sheet': sheet_name,
            'year': year,
            'month': month,
            'dataset': dataset_type,
            'issues': []
        }
        
        # Check for basic data quality
        if df.empty:
            validation['issues'].append("Empty dataframe")
            return validation
        
        # Check for reasonable volume ranges
        volume_cols = [col for col in df.columns if any(x in str(col).upper() for x in ['GASOLINE', 'DIESEL', 'GASOIL', 'LPG', 'KEROSENE'])]
        
        for col in volume_cols:
            if col in df.columns:
                numeric_vals = pd.to_numeric(df[col], errors='coerce').dropna()
                if len(numeric_vals) > 0:
                    max_val = numeric_vals.max()
                    mean_val = numeric_vals.mean()
                    
                    # Check for January anomaly
                    if month == 1 and mean_val > 1000000:  # 1 million liters average
                        validation['issues'].append(f"January anomaly detected in {col}: avg={mean_val:,.0f}")
                        logger.warning(f"January anomaly in {sheet_name}: {col} avg={mean_val:,.0f}")
                    
                    # Check for unrealistic values
                    if max_val > 1e9:  # 1 billion liters
                        validation['issues'].append(f"Unrealistic max value in {col}: {max_val:,.0f}")
        
        self.validation_reports.append(validation)
        return validation
    
    def extract_single_month(self, file_path, sheet_name, year, month, dataset_type):
        """Extract data for a single month with validation"""
        logger.info(f"Extracting {dataset_type} - {year}/{month:02d} from {sheet_name}")
        
        extracted_records = []
        
        try:
            # Try different header positions
            for header_pos in [1, 2, 3, 4]:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_pos)
                    
                    # Find company column
                    company_col = None
                    for col in df.columns:
                        if 'COMPANY' in str(col).upper() and 'UNNAMED' not in str(col).upper():
                            company_col = col
                            break
                    
                    if company_col:
                        logger.info(f"  Found structure with header at row {header_pos}")
                        break
                except:
                    continue
            
            if not company_col:
                logger.warning(f"  Could not find company column in {sheet_name}")
                return extracted_records
            
            # Validate the sheet data
            validation = self.validate_sheet_data(df, sheet_name, year, month, dataset_type)
            
            # Get product columns
            product_columns = []
            for col in df.columns:
                col_str = str(col).upper().strip()
                if ('NO.' not in col_str and 
                    'COMPANY' not in col_str and 
                    'UNNAMED' not in col_str and 
                    col_str != 'NAN' and 
                    col_str):
                    product_columns.append(col)
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (~df[company_col].astype(str).str.upper().str.contains('COMPANY|TOTAL|GRAND|SUM', na=False))
            ]
            
            logger.info(f"  Found {len(valid_companies)} companies, {len(product_columns)} products")
            
            # Extract data
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                # Apply standardization
                if dataset_type in self.standardization_map and company_name in self.standardization_map[dataset_type]:
                    standardized_company = self.standardization_map[dataset_type][company_name]
                else:
                    standardized_company = company_name
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            
                            # Handle January anomaly
                            if month == 1 and volume_numeric > 10000000:  # 10 million
                                logger.warning(f"  January correction: {company_name} {product_col} {volume_numeric:,.0f} -> {volume_numeric/12:,.0f}")
                                volume_numeric = volume_numeric / 12
                                self.stats['january_corrections'] += 1
                            
                            if volume_numeric >= 0:
                                unit_type = 'KG' if 'LPG' in str(product_col).upper() else 'LITERS'
                                
                                extracted_records.append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month,
                                    'company_name_raw': company_name,
                                    'company_name': standardized_company,
                                    'product_original_name': str(product_col).strip(),
                                    'volume': volume_numeric,
                                    'unit_type': unit_type,
                                    'company_type': dataset_type
                                })
                                
                        except (ValueError, TypeError):
                            continue
            
            logger.info(f"  Extracted {len(extracted_records)} records")
            
            # Validate extracted data against raw
            if len(extracted_records) > 0:
                self.validate_extraction(df, extracted_records, sheet_name)
            
            return extracted_records
            
        except Exception as e:
            logger.error(f"  Error extracting {sheet_name}: {e}")
            return extracted_records
    
    def validate_extraction(self, raw_df, extracted_records, sheet_name):
        """Validate extracted data against raw data"""
        # Quick validation - check totals
        extracted_df = pd.DataFrame(extracted_records)
        
        if 'volume' in extracted_df.columns:
            extracted_total = extracted_df['volume'].sum()
            
            # Get rough total from raw data
            numeric_cols = raw_df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                raw_total = raw_df[numeric_cols].sum().sum()
                
                # Check if totals are reasonably close (within 20%)
                if raw_total > 0:
                    ratio = extracted_total / raw_total
                    if ratio < 0.8 or ratio > 1.2:
                        logger.warning(f"  Validation warning for {sheet_name}: Extracted total ({extracted_total:,.0f}) differs from raw ({raw_total:,.0f}) by {abs(1-ratio)*100:.1f}%")
    
    def extract_bdc_year(self, year):
        """Extract all BDC data for a specific year"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Extracting BDC data for {year}")
        logger.info(f"{'='*60}")
        
        # Map year to file
        bdc_files = {
            2019: 'BDC-Performance-Jan-Dec-2019.xlsx',
            2020: 'BDC-Performance-Jan-Dec-2020.xlsx',
            2021: 'BDC-Performance-Jan-Dec-2021.xlsx',
            2022: 'BIDECs-Performance-Jan-Dec-2022.xlsx',
            2023: 'BIDECs-PERFORMANCE-STATISTICS-JANUARY-DECEMBER-2023.xlsx',
            2024: 'BIDECs-PERFORMANCE-STATISTICS_JANUARY-DECEMBER-2024.xlsx',
            2025: 'BIDEC-PERFORMANCE-STATISTICS-JANUARY_JUNE-2025.xlsx'
        }
        
        if year not in bdc_files:
            logger.warning(f"No BDC file mapped for year {year}")
            return
        
        file_path = self.raw_data_path / "initial raw data from npa website" / "bdc_bidec" / bdc_files[year]
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return
        
        # Read file
        xl = pd.ExcelFile(file_path)
        
        # Process each month
        month_mapping = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        
        for sheet in xl.sheet_names:
            sheet_lower = sheet.lower()
            
            # Skip non-monthly sheets
            if 'summary' in sheet_lower or 'total' in sheet_lower:
                continue
            
            # Find month
            month = None
            for month_name, month_num in month_mapping.items():
                if month_name in sheet_lower:
                    month = month_num
                    break
            
            if month:
                records = self.extract_single_month(file_path, sheet, year, month, 'BDC')
                self.extracted_data['bdc'].extend(records)
                self.stats['records_extracted'] += len(records)
                self.stats['sheets_processed'] += 1
        
        self.stats['files_processed'] += 1
    
    def extract_omc_year(self, year):
        """Extract all OMC data for a specific year"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Extracting OMC data for {year}")
        logger.info(f"{'='*60}")
        
        # Map year to file
        omc_files = {
            2019: 'OMC-Performance-Jan-Dec-2019-1.xlsx',
            2020: 'OMC-Performance-Jan-Dec-2020.xlsx',
            2021: 'OMC-Performance-Jan-Dec-2021.xlsx',
            2022: 'OMC-Performance-Jan-Dec-2022-1.xlsx',
            2023: 'OMC-PERFORMANCE-STATISTICS-JANUARY-DECEMBER-2023.xlsx',
            2024: 'OMC-PERFORMANCE-STATISTICS-JANUARY-DECEMBER-2024.xlsx',
            2025: 'OMC-PERFORMANCE-STATISTICS-JANUARY_JUNE-2025.xlsx'
        }
        
        if year not in omc_files:
            logger.warning(f"No OMC file mapped for year {year}")
            return
        
        file_path = self.raw_data_path / "initial raw data from npa website" / "omc" / omc_files[year]
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return
        
        # Read file
        xl = pd.ExcelFile(file_path)
        
        # Process each month
        month_mapping = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        
        for sheet in xl.sheet_names:
            sheet_lower = sheet.lower()
            
            # Skip non-monthly sheets
            if 'summary' in sheet_lower or 'total' in sheet_lower:
                continue
            
            # Find month
            month = None
            for month_name, month_num in month_mapping.items():
                if month_name in sheet_lower:
                    month = month_num
                    break
            
            if month:
                records = self.extract_single_month(file_path, sheet, year, month, 'OMC')
                self.extracted_data['omc'].extend(records)
                self.stats['records_extracted'] += len(records)
                self.stats['sheets_processed'] += 1
        
        self.stats['files_processed'] += 1
    
    def apply_conversions(self):
        """Apply conversion factors to get volume_liters, volume_kg, volume_mt"""
        logger.info("\nApplying conversion factors...")
        
        for dataset_name in ['bdc', 'omc']:
            for record in self.extracted_data[dataset_name]:
                # Standardize product name
                product = record['product_original_name'].upper()
                
                if 'GASOLINE' in product or 'PETROL' in product or 'PREMIUM' in product:
                    standard_product = 'Gasoline'
                    density = self.conversion_factors['GASOLINE']
                elif 'GASOIL' in product or 'GAS OIL' in product or 'DIESEL' in product:
                    standard_product = 'Gasoil'
                    density = self.conversion_factors['GASOIL']
                elif 'LPG' in product:
                    standard_product = 'LPG'
                    density = self.conversion_factors['LPG']
                elif 'KEROSENE' in product and 'ATK' not in product:
                    standard_product = 'Kerosene'
                    density = self.conversion_factors['KEROSENE']
                elif 'ATK' in product:
                    standard_product = 'Aviation Turbine Kerosene'
                    density = self.conversion_factors['ATK']
                elif 'PREMIX' in product:
                    standard_product = 'Premix'
                    density = self.conversion_factors['PREMIX']
                elif 'HFO' in product or 'RFO' in product or 'FUEL OIL' in product:
                    standard_product = 'Heavy Fuel Oil'
                    density = self.conversion_factors['FUEL_OIL']
                elif 'MGO' in product or 'MARINE' in product:
                    standard_product = 'Marine Gas Oil'
                    density = self.conversion_factors['MARINE_GASOIL']
                elif 'NAPHTHA' in product:
                    standard_product = 'Naphtha'
                    density = self.conversion_factors['NAPHTHA']
                else:
                    standard_product = 'Other'
                    density = self.conversion_factors['DEFAULT']
                
                record['product'] = standard_product
                
                # Apply conversions
                volume = record['volume']
                
                if volume == 0:
                    record['volume_liters'] = 0.0
                    record['volume_kg'] = 0.0
                    record['volume_mt'] = 0.0
                else:
                    if record['unit_type'] == 'KG':
                        record['volume_kg'] = volume
                        record['volume_liters'] = volume / density if density > 0 else volume
                        record['volume_mt'] = volume / 1000
                    else:  # LITERS
                        record['volume_liters'] = volume
                        record['volume_kg'] = volume * density
                        record['volume_mt'] = (volume * density) / 1000
    
    def remove_duplicates(self):
        """Remove duplicate records"""
        logger.info("\nRemoving duplicates...")
        
        for dataset_name in ['bdc', 'omc']:
            df = pd.DataFrame(self.extracted_data[dataset_name])
            
            if not df.empty:
                original_count = len(df)
                
                # Remove duplicates based on key columns
                df = df.drop_duplicates(subset=['year', 'month', 'company_name', 'product'])
                
                duplicates_removed = original_count - len(df)
                if duplicates_removed > 0:
                    logger.info(f"  {dataset_name.upper()}: Removed {duplicates_removed} duplicates")
                    self.stats['duplicates_removed'] += duplicates_removed
                
                self.extracted_data[dataset_name] = df.to_dict('records')
    
    def generate_report(self):
        """Generate extraction report"""
        logger.info("\n" + "="*80)
        logger.info("EXTRACTION REPORT")
        logger.info("="*80)
        
        for stat_name, stat_value in self.stats.items():
            logger.info(f"  {stat_name}: {stat_value}")
        
        # Validation issues summary
        if self.validation_reports:
            issues_count = sum(len(v['issues']) for v in self.validation_reports)
            if issues_count > 0:
                logger.warning(f"\n  Total validation issues: {issues_count}")
                
                # Show sample issues
                for report in self.validation_reports[:5]:
                    if report['issues']:
                        logger.warning(f"    {report['sheet']}: {report['issues'][0]}")
    
    def save_data(self):
        """Save the validated extracted data"""
        logger.info("\nSaving validated data...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save BDC data
        if self.extracted_data['bdc']:
            bdc_df = pd.DataFrame(self.extracted_data['bdc'])
            bdc_file = f"VALIDATED_bdc_data_{timestamp}.csv"
            bdc_df.to_csv(bdc_file, index=False)
            logger.info(f"  Saved BDC data: {bdc_file} ({len(bdc_df):,} records)")
        
        # Save OMC data
        if self.extracted_data['omc']:
            omc_df = pd.DataFrame(self.extracted_data['omc'])
            omc_file = f"VALIDATED_omc_data_{timestamp}.csv"
            omc_df.to_csv(omc_file, index=False)
            logger.info(f"  Saved OMC data: {omc_file} ({len(omc_df):,} records)")
        
        # Save validation report
        if self.validation_reports:
            report_file = f"validation_report_{timestamp}.json"
            with open(report_file, 'w') as f:
                json.dump(self.validation_reports, f, indent=2)
            logger.info(f"  Saved validation report: {report_file}")
    
    def run_extraction(self):
        """Run the complete validated extraction process"""
        logger.info("Starting validated extraction process...")
        logger.info(f"Time: {datetime.now()}")
        
        # Extract BDC data year by year
        for year in [2019, 2020, 2021, 2022, 2023, 2024, 2025]:
            self.extract_bdc_year(year)
        
        # Extract OMC data year by year
        for year in [2019, 2020, 2021, 2022, 2023, 2024, 2025]:
            self.extract_omc_year(year)
        
        # Apply conversions
        self.apply_conversions()
        
        # Remove duplicates
        self.remove_duplicates()
        
        # Generate report
        self.generate_report()
        
        # Save data
        self.save_data()
        
        logger.info("\nExtraction complete!")


if __name__ == "__main__":
    extractor = ValidatedExtractor(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw")
    extractor.run_extraction()