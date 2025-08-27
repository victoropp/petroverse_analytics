"""
Comprehensive Raw Excel Data Extractor for PetroVerse Analytics
Extracts data directly from raw Excel files month by month for BDC and OMC data
Ensures all monthly sheets and company/product data is captured correctly
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
from datetime import datetime
import re
import warnings
warnings.filterwarnings('ignore')

class RawExcelExtractor:
    """Extract data directly from raw Excel files to ensure complete data capture"""
    
    def __init__(self, raw_data_path: str):
        self.raw_data_path = Path(raw_data_path)
        self.extracted_data = {'bdc': [], 'omc': []}
        
    def extract_bdc_files(self):
        """Extract data from all BDC Excel files"""
        print("Extracting BDC data from raw Excel files...")
        
        bdc_folder = self.raw_data_path / "initial raw data from npa website" / "bdc_bidec"
        bdc_files = list(bdc_folder.glob("*.xlsx"))
        
        print(f"Found {len(bdc_files)} BDC files:")
        for file in bdc_files:
            print(f"  - {file.name}")
        
        for bdc_file in bdc_files:
            print(f"\nProcessing: {bdc_file.name}")
            try:
                # Extract year from filename
                year_match = re.search(r'(\d{4})', bdc_file.name)
                if not year_match:
                    print(f"  Warning: Could not extract year from {bdc_file.name}")
                    continue
                
                file_year = int(year_match.group(1))
                print(f"  File year: {file_year}")
                
                # Get sheet names
                xl = pd.ExcelFile(bdc_file)
                print(f"  Sheets: {xl.sheet_names}")
                
                # Process monthly sheets only
                monthly_sheets = []
                for sheet in xl.sheet_names:
                    # Look for monthly patterns (Jan, Feb, etc.)
                    month_patterns = [
                        r'jan|january', r'feb|february', r'mar|march', r'apr|april', 
                        r'may', r'jun|june', r'jul|july', r'aug|august',
                        r'sep|september', r'oct|october', r'nov|november', r'dec|december'
                    ]
                    
                    for i, pattern in enumerate(month_patterns):
                        if re.search(pattern, sheet.lower()) and str(file_year) in sheet:
                            monthly_sheets.append((sheet, i + 1))  # month number
                            break
                
                print(f"  Found {len(monthly_sheets)} monthly sheets")
                
                # Extract data from each monthly sheet
                for sheet_name, month_num in monthly_sheets:
                    self.extract_bdc_sheet(bdc_file, sheet_name, file_year, month_num)
                    
            except Exception as e:
                print(f"  Error processing {bdc_file.name}: {e}")
                continue
    
    def extract_bdc_sheet(self, file_path, sheet_name, year, month):
        """Extract data from a single BDC sheet"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Read the sheet without header first to find the structure
            df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
            
            # Find the header row (look for "COMPANY" column)
            header_row = None
            for i in range(min(10, len(df_raw))):
                row_values = df_raw.iloc[i].astype(str).str.upper()
                if any('COMPANY' in str(val) for val in row_values):
                    header_row = i
                    break
            
            if header_row is None:
                print(f"      Warning: Could not find header row in {sheet_name}")
                return
            
            print(f"      Header found at row {header_row}")
            
            # Read with proper header
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)
            
            # Find company column
            company_col = None
            for col in df.columns:
                if 'COMPANY' in str(col).upper():
                    company_col = col
                    break
            
            if company_col is None:
                print(f"      Warning: Could not find company column in {sheet_name}")
                return
            
            # Get product columns (everything except NO., COMPANY, and unnamed columns)
            product_columns = []
            for col in df.columns:
                col_str = str(col).upper()
                if (col_str not in ['NO.', company_col.upper()] and 
                    not col_str.startswith('UNNAMED') and 
                    col_str != 'NAN'):
                    product_columns.append(col)
            
            print(f"      Found product columns: {product_columns}")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (df[company_col].astype(str).str.strip() != '') &
                (df[company_col].astype(str).str.upper() != 'COMPANY')
            ]
            
            print(f"      Valid companies: {len(valid_companies)}")
            
            # Extract data for each company-product combination
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                # Skip total rows and summary rows
                if any(skip_word in company_name.upper() for skip_word in ['TOTAL', 'GRAND', 'SUMMARY', 'SUM']):
                    continue
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    # Convert to numeric
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            if volume_numeric > 0:  # Only record positive volumes
                                self.extracted_data['bdc'].append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month,
                                    'company_name': company_name,
                                    'product_original_name': str(product_col).strip(),
                                    'volume': volume_numeric,
                                    'unit_type': 'LITERS' if '**LPG' not in str(product_col) else 'KG',
                                    'volume_liters': volume_numeric if '**LPG' not in str(product_col) else None,
                                    'volume_kg': volume_numeric if '**LPG' in str(product_col) else None,
                                    'company_type': 'BDC'
                                })
                                extracted_count += 1
                        except (ValueError, TypeError):
                            continue  # Skip non-numeric values
            
            print(f"      Extracted {extracted_count} records from {sheet_name}")
            
        except Exception as e:
            print(f"      Error extracting {sheet_name}: {e}")
    
    def extract_omc_files(self):
        """Extract data from all OMC Excel files"""
        print("\nExtracting OMC data from raw Excel files...")
        
        omc_folder = self.raw_data_path / "initial raw data from npa website" / "omc"
        omc_files = list(omc_folder.glob("*.xlsx"))
        
        print(f"Found {len(omc_files)} OMC files:")
        for file in omc_files:
            print(f"  - {file.name}")
        
        for omc_file in omc_files:
            print(f"\nProcessing: {omc_file.name}")
            try:
                # Extract year from filename
                year_match = re.search(r'(\d{4})', omc_file.name)
                if not year_match:
                    print(f"  Warning: Could not extract year from {omc_file.name}")
                    continue
                
                file_year = int(year_match.group(1))
                print(f"  File year: {file_year}")
                
                # Get sheet names
                xl = pd.ExcelFile(omc_file)
                print(f"  Sheets: {xl.sheet_names}")
                
                # Process monthly sheets only (exclude quarterly and yearly summaries)
                monthly_sheets = []
                for sheet in xl.sheet_names:
                    sheet_lower = sheet.lower().strip()
                    
                    # Check if it's a monthly sheet
                    monthly_patterns = [
                        (r'jan(?:uary)?\s+(\d{4})', 1), (r'feb(?:ruary)?\s+(\d{4})', 2),
                        (r'mar(?:ch)?\s+(\d{4})', 3), (r'apr(?:il)?\s+(\d{4})', 4),
                        (r'may\s+(\d{4})', 5), (r'jun(?:e)?\s+(\d{4})', 6),
                        (r'jul(?:y)?\s+(\d{4})', 7), (r'aug(?:ust)?\s+(\d{4})', 8),
                        (r'sep(?:tember)?\s+(\d{4})', 9), (r'oct(?:ober)?\s+(\d{4})', 10),
                        (r'nov(?:ember)?\s+(\d{4})', 11), (r'dec(?:ember)?\s+(\d{4})', 12)
                    ]
                    
                    for pattern, month_num in monthly_patterns:
                        match = re.search(pattern, sheet_lower)
                        if match and int(match.group(1)) == file_year:
                            monthly_sheets.append((sheet, month_num))
                            break
                
                print(f"  Found {len(monthly_sheets)} monthly sheets")
                
                # Extract data from each monthly sheet
                for sheet_name, month_num in monthly_sheets:
                    self.extract_omc_sheet(omc_file, sheet_name, file_year, month_num)
                    
            except Exception as e:
                print(f"  Error processing {omc_file.name}: {e}")
                continue
    
    def extract_omc_sheet(self, file_path, sheet_name, year, month):
        """Extract data from a single OMC sheet"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # For OMC files, we know the structure: header at row 1, data starts at row 2
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=1)
            
            print(f"      Raw shape: {df.shape}")
            print(f"      Columns: {list(df.columns)[:10]}...")  # Show first 10 columns
            
            # Find company column (usually 'COMPANY' or similar)
            company_col = None
            for col in df.columns:
                if 'COMPANY' in str(col).upper():
                    company_col = col
                    break
            
            if company_col is None:
                print(f"      Warning: Could not find company column in {sheet_name}")
                return
            
            # Get product columns (main petroleum products)
            product_columns = []
            expected_products = ['GASOLINE', 'GASOIL', 'LPG', 'KEROSENE', 'ATK', 'PREMIX', 
                                'RFO', 'MGO', 'NAPHTHA', 'FUEL']
            
            for col in df.columns:
                col_str = str(col).upper()
                if (col_str not in ['NO.', 'COMPANY'] and 
                    not col_str.startswith('UNNAMED') and 
                    col_str != 'NAN'):
                    # Check if it matches expected products
                    if any(prod in col_str for prod in expected_products):
                        product_columns.append(col)
            
            print(f"      Found product columns: {product_columns}")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (df[company_col].astype(str).str.strip() != '') &
                (df[company_col].astype(str).str.upper() != 'COMPANY')
            ]
            
            print(f"      Valid companies: {len(valid_companies)}")
            
            # Extract data for each company-product combination
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                # Skip total rows and summary rows
                if any(skip_word in company_name.upper() for skip_word in ['TOTAL', 'GRAND', 'SUMMARY', 'SUM']):
                    continue
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    # Convert to numeric
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            if volume_numeric > 0:  # Only record positive volumes
                                # Determine unit type based on product
                                unit_type = 'KG' if '**LPG' in str(product_col) or 'LPG' in str(product_col) else 'LITERS'
                                
                                self.extracted_data['omc'].append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month,
                                    'company_name': company_name,
                                    'product_original_name': str(product_col).strip(),
                                    'volume': volume_numeric,
                                    'unit_type': unit_type,
                                    'volume_liters': volume_numeric if unit_type == 'LITERS' else None,
                                    'volume_kg': volume_numeric if unit_type == 'KG' else None,
                                    'company_type': 'OMC'
                                })
                                extracted_count += 1
                        except (ValueError, TypeError):
                            continue  # Skip non-numeric values
            
            print(f"      Extracted {extracted_count} records from {sheet_name}")
            
        except Exception as e:
            print(f"      Error extracting {sheet_name}: {e}")
    
    def convert_units_and_standardize(self):
        """Convert units and standardize the extracted data"""
        print("\nStandardizing extracted data...")
        
        # Conversion factors (kg/L)
        conversion_factors = {
            'GASOLINE': 0.740,
            'GASOIL': 0.832,
            'KEROSENE': 0.810,
            'FUEL_OIL': 0.950,
            'LPG': 0.540,
            'ATK': 0.810,
            'PREMIX': 0.740,
            'RFO': 0.950,
            'MGO': 0.832,
            'NAPHTHA': 0.740,
            'DEFAULT': 0.800
        }
        
        for dataset_name in ['bdc', 'omc']:
            dataset = self.extracted_data[dataset_name]
            print(f"  Standardizing {dataset_name.upper()} data: {len(dataset)} records")
            
            for record in dataset:
                # Standardize product name
                product = record['product_original_name'].upper()
                
                # Map to standard product categories
                if 'GASOLINE' in product or 'PETROL' in product:
                    standard_product = 'Gasoline'
                    density = conversion_factors['GASOLINE']
                elif 'GASOIL' in product or 'DIESEL' in product:
                    standard_product = 'Gasoil'
                    density = conversion_factors['GASOIL']
                elif 'LPG' in product:
                    standard_product = 'LPG'
                    density = conversion_factors['LPG']
                elif 'KEROSENE' in product:
                    standard_product = 'Kerosene'
                    density = conversion_factors['KEROSENE']
                elif 'ATK' in product:
                    standard_product = 'Aviation Turbine Kerosene'
                    density = conversion_factors['ATK']
                elif 'PREMIX' in product:
                    standard_product = 'Premix'
                    density = conversion_factors['PREMIX']
                elif 'RFO' in product or 'FUEL OIL' in product:
                    standard_product = 'Heavy Fuel Oil'
                    density = conversion_factors['RFO']
                elif 'MGO' in product or 'MARINE' in product:
                    standard_product = 'Marine Gas Oil'
                    density = conversion_factors['MGO']
                elif 'NAPHTHA' in product:
                    standard_product = 'Naphtha'
                    density = conversion_factors['NAPHTHA']
                else:
                    standard_product = product.title()
                    density = conversion_factors['DEFAULT']
                
                record['product'] = standard_product
                
                # Convert units
                volume_liters = record.get('volume_liters')
                volume_kg = record.get('volume_kg')
                
                if volume_liters and not volume_kg:
                    # Convert liters to kg
                    record['volume_kg'] = volume_liters * density
                elif volume_kg and not volume_liters:
                    # Convert kg to liters
                    record['volume_liters'] = volume_kg / density
                
                # Convert to metric tons
                if record.get('volume_kg'):
                    record['volume_mt'] = record['volume_kg'] / 1000
                
                # Add quality score
                record['data_quality_score'] = 1.0 if record.get('volume', 0) > 0 else 0.5
                record['is_outlier'] = False
    
    def save_extracted_data(self):
        """Save the extracted data to CSV files"""
        print("\nSaving extracted data...")
        
        output_dir = self.raw_data_path.parent
        
        # Save BDC data
        if self.extracted_data['bdc']:
            bdc_df = pd.DataFrame(self.extracted_data['bdc'])
            bdc_path = output_dir / "extracted_bdc_data.csv"
            bdc_df.to_csv(bdc_path, index=False)
            print(f"  Saved BDC data: {bdc_path}")
            print(f"    Records: {len(bdc_df):,}")
            print(f"    Companies: {bdc_df['company_name'].nunique()}")
            print(f"    Products: {bdc_df['product'].nunique()}")
            print(f"    Years: {sorted(bdc_df['year'].unique())}")
        
        # Save OMC data
        if self.extracted_data['omc']:
            omc_df = pd.DataFrame(self.extracted_data['omc'])
            omc_path = output_dir / "extracted_omc_data.csv"
            omc_df.to_csv(omc_path, index=False)
            print(f"  Saved OMC data: {omc_path}")
            print(f"    Records: {len(omc_df):,}")
            print(f"    Companies: {omc_df['company_name'].nunique()}")
            print(f"    Products: {omc_df['product'].nunique()}")
            print(f"    Years: {sorted(omc_df['year'].unique())}")
    
    def run_full_extraction(self):
        """Run the complete extraction process"""
        print("="*80)
        print("PETROVERSE RAW EXCEL DATA EXTRACTION")
        print("="*80)
        
        # Extract BDC data
        self.extract_bdc_files()
        
        # Extract OMC data
        self.extract_omc_files()
        
        # Standardize and convert units
        self.convert_units_and_standardize()
        
        # Save extracted data
        self.save_extracted_data()
        
        print("\n" + "="*80)
        print("EXTRACTION COMPLETED SUCCESSFULLY!")
        print("="*80)

def main():
    """Main execution function"""
    extractor = RawExcelExtractor(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw")
    extractor.run_full_extraction()

if __name__ == "__main__":
    main()