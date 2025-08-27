"""
CORRECTED Complete Raw Excel Data Extractor
- Preserves zero values (no random number contamination)
- Uses actual conversion factors from conversion factors.xlsx
- Properly handles unit conversions
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
from datetime import datetime
import re
import warnings
warnings.filterwarnings('ignore')

class CorrectedCompleteExtractor:
    """Extract ALL data with proper zero handling and conversion factors"""
    
    def __init__(self, raw_data_path: str):
        self.raw_data_path = Path(raw_data_path)
        self.extracted_data = {'bdc': [], 'omc': []}
        
        # Load actual conversion factors from Excel file
        self.load_conversion_factors()
    
    def load_conversion_factors(self):
        """Load conversion factors from the Excel file"""
        try:
            conv_file = self.raw_data_path / "coversion factors.xlsx"
            df = pd.read_excel(conv_file)
            
            print("Loading conversion factors from Excel file:")
            
            # Parse conversion factors (liters to kg)
            self.conversion_factors = {}
            
            # Extract values from the second row (index 1, but data is in index 0)
            factors_row = df.iloc[0]  # First (and only) data row
            
            # Map column names to our product names
            # Note: These are conversion factors from liters to kg (density * 1000)
            self.conversion_factors = {
                'GASOLINE': factors_row['Premium '] / 1000,  # Premium gasoline
                'GASOIL': factors_row['Gas oil '] / 1000,    # Gas oil (diesel)
                'MARINE_GASOIL': factors_row['Marine Gasoil '] / 1000,
                'FUEL_OIL': factors_row['Fuel  oil '] / 1000,  # Note the double space
                'KEROSENE': factors_row['Kerosene '] / 1000,
                'LPG': factors_row['LPG '] / 1000,
                'ATK': factors_row['Kerosene '] / 1000,  # Use kerosene density for ATK
                'PREMIX': factors_row['Premium '] / 1000,  # Use premium gasoline density
                'NAPHTHA': factors_row['Unified'] / 1000,   # Use unified density
                'DEFAULT': factors_row['Unified'] / 1000    # Default to unified
            }
            
            print("  Conversion factors loaded:")
            for product, factor in self.conversion_factors.items():
                print(f"    {product}: {factor:.4f} kg/L")
                
        except Exception as e:
            print(f"Warning: Could not load conversion factors: {e}")
            # Fallback to approximate densities
            self.conversion_factors = {
                'GASOLINE': 0.740, 'GASOIL': 0.832, 'KEROSENE': 0.810,
                'FUEL_OIL': 0.950, 'LPG': 0.540, 'ATK': 0.810,
                'PREMIX': 0.740, 'MARINE_GASOIL': 0.832,
                'NAPHTHA': 0.740, 'DEFAULT': 0.800
            }
    
    def extract_all_files(self):
        """Extract from ALL Excel files with corrected logic"""
        print("\n" + "=" * 80)
        print("CORRECTED COMPLETE EXTRACTION - ALL FILES")
        print("=" * 80)
        
        # Extract BDC files
        self.extract_all_bdc_files()
        
        # Extract OMC files
        self.extract_all_omc_files()
        
        # Standardize and convert (with proper zero handling)
        self.standardize_and_convert_corrected()
        
        # Save final data
        self.save_corrected_complete_data()
    
    def extract_all_bdc_files(self):
        """Extract from all BDC files"""
        print("\nExtracting from ALL BDC files...")
        
        bdc_folder = self.raw_data_path / "initial raw data from npa website" / "bdc_bidec"
        bdc_files = list(bdc_folder.glob("*.xlsx"))
        
        for file_path in bdc_files:
            print(f"\nProcessing BDC file: {file_path.name}")
            
            try:
                xl = pd.ExcelFile(file_path)
                
                # Extract year from filename
                year = self.extract_year_from_filename(file_path.name)
                
                # Get monthly sheets
                monthly_sheets = [s for s in xl.sheet_names if self.is_monthly_sheet(s)]
                
                total_extracted = 0
                for sheet_name in monthly_sheets:
                    month = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_bdc_sheet_corrected(file_path, sheet_name, year, month)
                    total_extracted += extracted
                
                print(f"  Total extracted from {file_path.name}: {total_extracted:,} records")
                
            except Exception as e:
                print(f"  Error processing {file_path.name}: {e}")
    
    def extract_all_omc_files(self):
        """Extract from all OMC files"""
        print("\nExtracting from ALL OMC files...")
        
        omc_folder = self.raw_data_path / "initial raw data from npa website" / "omc"
        omc_files = list(omc_folder.glob("*.xlsx"))
        
        for file_path in omc_files:
            print(f"\nProcessing OMC file: {file_path.name}")
            
            try:
                xl = pd.ExcelFile(file_path)
                
                # Extract year from filename
                year = self.extract_year_from_filename(file_path.name)
                
                # Get monthly sheets
                monthly_sheets = [s for s in xl.sheet_names if self.is_monthly_sheet(s)]
                
                total_extracted = 0
                for sheet_name in monthly_sheets:
                    month = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_omc_sheet_corrected(file_path, sheet_name, year, month)
                    total_extracted += extracted
                
                print(f"  Total extracted from {file_path.name}: {total_extracted:,} records")
                
            except Exception as e:
                print(f"  Error processing {file_path.name}: {e}")
    
    def extract_bdc_sheet_corrected(self, file_path, sheet_name, year, month):
        """Extract BDC sheet data with proper zero handling"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Try different header positions
            header_positions = [1, 2, 3, 4]
            df = None
            company_col = None
            
            for header_pos in header_positions:
                try:
                    test_df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_pos)
                    
                    # Look for company column
                    for col in test_df.columns:
                        if 'COMPANY' in str(col).upper():
                            company_col = col
                            df = test_df
                            break
                    
                    if company_col:
                        break
                        
                except:
                    continue
            
            if df is None or company_col is None:
                print(f"      Warning: Could not find proper structure for {sheet_name}")
                return 0
            
            # Get product columns
            product_columns = []
            skip_patterns = ['no', 'company', 'unnamed', 'nan', 'total']
            
            for col in df.columns:
                col_str = str(col).upper().strip()
                if not any(skip in col_str for skip in skip_patterns):
                    if col_str and len(col_str) > 1:
                        product_columns.append(col)
            
            print(f"      Found {len(product_columns)} product columns")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (~df[company_col].astype(str).str.upper().str.contains('COMPANY|TOTAL|GRAND|SUM', na=False))
            ]
            
            # Extract data with proper zero handling
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    # CRITICAL: Only process non-null, non-zero values
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            
                            # IMPORTANT: Include zero values, don't filter them out
                            if volume_numeric >= 0:  # Changed from > 0 to >= 0
                                unit_type = 'KG' if 'LPG' in str(product_col).upper() else 'LITERS'
                                
                                self.extracted_data['bdc'].append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month,
                                    'company_name': company_name,
                                    'product_original_name': str(product_col).strip(),
                                    'volume': volume_numeric,
                                    'unit_type': unit_type,
                                    'company_type': 'BDC'
                                })
                                extracted_count += 1
                        except (ValueError, TypeError):
                            continue
            
            print(f"      Extracted {extracted_count} records from {sheet_name}")
            return extracted_count
            
        except Exception as e:
            print(f"      Error extracting {sheet_name}: {e}")
            return 0
    
    def extract_omc_sheet_corrected(self, file_path, sheet_name, year, month):
        """Extract OMC sheet data with proper zero handling"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Try different header positions
            header_positions = [1, 2, 3, 4]
            df = None
            company_col = None
            
            for header_pos in header_positions:
                try:
                    test_df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_pos)
                    
                    # Look for company column
                    for col in test_df.columns:
                        if 'COMPANY' in str(col).upper():
                            company_col = col
                            df = test_df
                            break
                    
                    if company_col:
                        break
                        
                except:
                    continue
            
            if df is None or company_col is None:
                print(f"      Warning: Could not find proper structure for {sheet_name}")
                return 0
            
            # Get product columns (skip NO. and COMPANY columns)
            product_columns = []
            for col in df.columns:
                col_str = str(col).upper().strip()
                if ('NO.' not in col_str and 
                    'COMPANY' not in col_str and 
                    'UNNAMED' not in col_str and 
                    col_str != 'NAN' and 
                    col_str):
                    product_columns.append(col)
            
            print(f"      Found {len(product_columns)} product columns")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (~df[company_col].astype(str).str.upper().str.contains('COMPANY|TOTAL|GRAND|SUM', na=False))
            ]
            
            # Extract data with proper zero handling
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    # CRITICAL: Only process non-null values, but include zeros
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            
                            # IMPORTANT: Include zero values, don't filter them out
                            if volume_numeric >= 0:  # Changed from > 0 to >= 0
                                unit_type = 'KG' if 'LPG' in str(product_col).upper() else 'LITERS'
                                
                                self.extracted_data['omc'].append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month,
                                    'company_name': company_name,
                                    'product_original_name': str(product_col).strip(),
                                    'volume': volume_numeric,
                                    'unit_type': unit_type,
                                    'company_type': 'OMC'
                                })
                                extracted_count += 1
                        except (ValueError, TypeError):
                            continue
            
            print(f"      Extracted {extracted_count} records from {sheet_name}")
            return extracted_count
            
        except Exception as e:
            print(f"      Error extracting {sheet_name}: {e}")
            return 0
    
    def standardize_and_convert_corrected(self):
        """Standardize data with proper zero handling"""
        print("\nStandardizing extracted data with corrected logic...")
        
        for dataset_name in ['bdc', 'omc']:
            dataset = self.extracted_data[dataset_name]
            print(f"  Processing {dataset_name.upper()}: {len(dataset)} records")
            
            zero_count = 0
            for record in dataset:
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
                elif 'RFO' in product or 'FUEL OIL' in product or 'FUEL_OIL' in product:
                    standard_product = 'Heavy Fuel Oil'
                    density = self.conversion_factors['FUEL_OIL']
                elif 'MGO' in product or 'MARINE' in product:
                    standard_product = 'Marine Gas Oil'
                    density = self.conversion_factors['MARINE_GASOIL']
                elif 'NAPHTHA' in product:
                    standard_product = 'Naphtha'
                    density = self.conversion_factors['NAPHTHA']
                else:
                    standard_product = product.title()
                    density = self.conversion_factors['DEFAULT']
                
                record['product'] = standard_product
                
                # CRITICAL ZERO HANDLING: Only convert if volume > 0
                volume = record['volume']
                unit_type = record['unit_type']
                
                if volume == 0:
                    # For zero values, set all derived fields to zero
                    record['volume_liters'] = 0.0
                    record['volume_kg'] = 0.0
                    record['volume_mt'] = 0.0
                    zero_count += 1
                else:
                    # Only perform conversions for non-zero values
                    if unit_type == 'LITERS':
                        record['volume_liters'] = volume
                        record['volume_kg'] = volume * density
                    elif unit_type == 'KG':
                        record['volume_kg'] = volume
                        record['volume_liters'] = volume / density
                    
                    # Convert to metric tons (only if kg > 0)
                    record['volume_mt'] = record['volume_kg'] / 1000
                
                # Add quality metrics
                record['data_quality_score'] = 1.0
                record['is_outlier'] = False
            
            print(f"    Zero values preserved: {zero_count:,}")
    
    def extract_year_from_filename(self, filename):
        """Extract year from filename"""
        years = re.findall(r'20\d{2}', filename)
        return int(years[0]) if years else 2019
    
    def is_monthly_sheet(self, sheet_name):
        """Check if sheet is a monthly sheet"""
        monthly_patterns = [
            r'jan', r'feb', r'mar', r'apr', r'may', r'jun',
            r'jul', r'aug', r'sep', r'oct', r'nov', r'dec'
        ]
        sheet_lower = sheet_name.lower()
        return any(re.search(pattern, sheet_lower) for pattern in monthly_patterns)
    
    def get_month_from_sheet_name(self, sheet_name):
        """Extract month number from sheet name"""
        month_mapping = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        
        sheet_lower = sheet_name.lower()
        for month_name, month_num in month_mapping.items():
            if month_name in sheet_lower:
                return month_num
        
        return 1  # Default to January
    
    def save_corrected_complete_data(self):
        """Save the corrected complete dataset"""
        print("\nSaving CORRECTED COMPLETE extracted data...")
        
        output_dir = self.raw_data_path.parent
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save BDC data
        if self.extracted_data['bdc']:
            bdc_df = pd.DataFrame(self.extracted_data['bdc'])
            bdc_path = output_dir / f"CORRECTED_COMPLETE_bdc_data_{timestamp}.csv"
            bdc_df.to_csv(bdc_path, index=False)
            print(f"  Saved CORRECTED BDC data: {bdc_path}")
            print(f"    Records: {len(bdc_df):,}")
            print(f"    Zero values: {(bdc_df['volume'] == 0).sum():,}")
            print(f"    Companies: {bdc_df['company_name'].nunique():,}")
            print(f"    Products: {bdc_df['product'].nunique():,}")
            print(f"    Years: {sorted(bdc_df['year'].unique())}")
        
        # Save OMC data
        if self.extracted_data['omc']:
            omc_df = pd.DataFrame(self.extracted_data['omc'])
            omc_path = output_dir / f"CORRECTED_COMPLETE_omc_data_{timestamp}.csv"
            omc_df.to_csv(omc_path, index=False)
            print(f"  Saved CORRECTED OMC data: {omc_path}")
            print(f"    Records: {len(omc_df):,}")
            print(f"    Zero values: {(omc_df['volume'] == 0).sum():,}")
            print(f"    Companies: {omc_df['company_name'].nunique():,}")
            print(f"    Products: {omc_df['product'].nunique():,}")
            print(f"    Years: {sorted(omc_df['year'].unique())}")
            
            # Show verification
            print(f"\n  VERIFICATION - Zero value handling:")
            zero_records = omc_df[omc_df['volume'] == 0]
            if len(zero_records) > 0:
                sample = zero_records.head(3)
                print(f"    Sample zero records:")
                for _, row in sample.iterrows():
                    print(f"      {row['company_name']} - {row['product']} - Vol:{row['volume']}, L:{row['volume_liters']}, KG:{row['volume_kg']}, MT:{row['volume_mt']}")

def main():
    """Main execution"""
    print("CORRECTED COMPLETE DATA EXTRACTION")
    print("- Preserves zero values")
    print("- Uses actual conversion factors from Excel file")
    print("- Proper unit conversions")
    
    extractor = CorrectedCompleteExtractor(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw")
    extractor.extract_all_files()

if __name__ == "__main__":
    main()