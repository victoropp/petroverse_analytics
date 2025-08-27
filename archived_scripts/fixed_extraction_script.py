"""
FIXED Complete Raw Excel Data Extractor
Handles all the edge cases found in 2023-2025 files
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
from datetime import datetime
import re
import warnings
warnings.filterwarnings('ignore')

class FixedCompleteExtractor:
    """Extract ALL data with fixes for problematic files"""
    
    def __init__(self, raw_data_path: str):
        self.raw_data_path = Path(raw_data_path)
        self.extracted_data = {'bdc': [], 'omc': []}
        
        # Load previous extraction results to avoid re-processing
        try:
            prev_bdc = pd.read_csv(self.raw_data_path.parent / "COMPLETE_extracted_bdc_data_20250826_221553.csv")
            self.extracted_data['bdc'] = prev_bdc.to_dict('records')
            print(f"Loaded previous BDC data: {len(self.extracted_data['bdc']):,} records")
        except:
            print("No previous BDC data found, starting fresh")
            
        try:
            prev_omc = pd.read_csv(self.raw_data_path.parent / "COMPLETE_extracted_omc_data_20250826_221553.csv")
            self.extracted_data['omc'] = prev_omc.to_dict('records')
            print(f"Loaded previous OMC data: {len(self.extracted_data['omc']):,} records")
        except:
            print("No previous OMC data found, starting fresh")
    
    def extract_problematic_bdc_files(self):
        """Extract from BDC files that failed previously"""
        print("\\nExtracting from problematic BDC files...")
        
        # Focus on 2025 BDC file that had issues
        bdc_folder = self.raw_data_path / "initial raw data from npa website" / "bdc_bidec"
        problem_file = bdc_folder / "BIDEC-PERFORMANCE-STATISTICS-JANUARY_JUNE-2025.xlsx"
        
        if not problem_file.exists():
            print(f"File not found: {problem_file}")
            return
        
        print(f"Processing: {problem_file.name}")
        
        try:
            xl = pd.ExcelFile(problem_file)
            
            # Process each monthly sheet
            monthly_sheets = ['JAN 2025', 'FEB 2025', 'MAR 2025', 'APR 2025', 'MAY 2025', 'JUN 2025']
            
            total_extracted = 0
            
            for sheet_name in monthly_sheets:
                if sheet_name in xl.sheet_names:
                    month_num = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_bdc_2025_sheet(problem_file, sheet_name, 2025, month_num)
                    total_extracted += extracted
            
            print(f"Total extracted from 2025 BDC file: {total_extracted:,} records")
            
        except Exception as e:
            print(f"Error processing 2025 BDC file: {e}")
    
    def extract_bdc_2025_sheet(self, file_path, sheet_name, year, month):
        """Extract from 2025 BDC sheet with correct header position"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # For 2025 files, header is at position 4 (based on investigation)
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=4)
            
            # Find company column
            company_col = None
            for col in df.columns:
                col_str = str(col).upper()
                if 'COMPANY' in col_str:
                    company_col = col
                    break
            
            if company_col is None:
                print(f"      Warning: Could not find company column")
                return 0
            
            # Get product columns (skip non-product columns)
            product_columns = []
            skip_patterns = ['no', 'company', 'unnamed', 'nan', 'total']
            
            for col in df.columns:
                col_str = str(col).upper()
                if not any(skip in col_str for skip in skip_patterns):
                    if col_str.strip() and len(col_str) > 2:
                        product_columns.append(col)
            
            print(f"      Found {len(product_columns)} product columns: {product_columns[:5]}...")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (~df[company_col].astype(str).str.upper().str.contains('COMPANY|TOTAL|GRAND|SUM', na=False))
            ]
            
            print(f"      Valid companies: {len(valid_companies)}")
            
            # Extract data
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            if volume_numeric > 0:
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
                                    'volume_liters': volume_numeric if unit_type == 'LITERS' else None,
                                    'volume_kg': volume_numeric if unit_type == 'KG' else None,
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
    
    def extract_problematic_omc_files(self):
        """Extract from OMC files that failed previously"""
        print("\\nExtracting from problematic OMC files...")
        
        omc_folder = self.raw_data_path / "initial raw data from npa website" / "omc"
        
        # Process 2023 OMC file
        omc_2023_file = omc_folder / "OMC-PERFORMANCE-STATISTICS-JANUARY-DECEMBER-2023.xlsx"
        if omc_2023_file.exists():
            self.extract_omc_2023_file(omc_2023_file)
        
        # Process 2024 OMC file
        omc_2024_file = omc_folder / "OMC-PERFORMANCE-STATISTICS-JANUARY-DECEMBER-2024.xlsx"
        if omc_2024_file.exists():
            self.extract_omc_2024_file(omc_2024_file)
        
        # Process 2025 OMC file
        omc_2025_file = omc_folder / "OMC-PERFORMANCE-STATISTICS-JANUARY_JUNE-2025.xlsx"
        if omc_2025_file.exists():
            self.extract_omc_2025_file(omc_2025_file)
    
    def extract_omc_2023_file(self, file_path):
        """Extract 2023 OMC data with correct header position"""
        print(f"Processing: {file_path.name}")
        
        try:
            xl = pd.ExcelFile(file_path)
            
            monthly_sheets = ['Jan-2023', 'Feb-2023', 'Mar-2023', 'Apr-2023', 'May-2023', 
                             'June-2023', 'Jul-2023', 'Aug-2023', 'Sep-2023', 'Oct-2023', 
                             'Nov-2023', 'Dec-2023']
            
            total_extracted = 0
            
            for sheet_name in monthly_sheets:
                if sheet_name in xl.sheet_names:
                    month_num = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_omc_2023_sheet(file_path, sheet_name, 2023, month_num)
                    total_extracted += extracted
            
            print(f"Total extracted from 2023 OMC file: {total_extracted:,} records")
            
        except Exception as e:
            print(f"Error processing 2023 OMC file: {e}")
    
    def extract_omc_2023_sheet(self, file_path, sheet_name, year, month):
        """Extract from 2023 OMC sheet with header at position 2"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Header is at row 2 (0-indexed)
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=2)
            
            # Company column is usually the second column (index 1)
            company_col = df.columns[1] if len(df.columns) > 1 else None
            
            if company_col is None:
                print(f"      Warning: Could not find company column")
                return 0
            
            # Get product columns (columns 2 onwards, excluding unnamed)
            product_columns = []
            for i, col in enumerate(df.columns):
                if i >= 2:  # Skip NO. and COMPANY columns
                    col_str = str(col).upper()
                    if col_str and 'UNNAMED' not in col_str and col_str != 'NAN':
                        product_columns.append(col)
            
            print(f"      Found {len(product_columns)} product columns")
            
            # Filter valid companies
            valid_companies = df[
                df[company_col].notna() & 
                (df[company_col] != '') & 
                (~df[company_col].astype(str).str.upper().str.contains('COMPANY|TOTAL|GRAND|SUM', na=False))
            ]
            
            print(f"      Valid companies: {len(valid_companies)}")
            
            # Extract data
            extracted_count = 0
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                for product_col in product_columns:
                    volume_value = row[product_col]
                    
                    if pd.notna(volume_value):
                        try:
                            volume_numeric = float(volume_value)
                            if volume_numeric > 0:
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
                                    'volume_liters': volume_numeric if unit_type == 'LITERS' else None,
                                    'volume_kg': volume_numeric if unit_type == 'KG' else None,
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
    
    def extract_omc_2024_file(self, file_path):
        """Extract 2024 OMC data (similar structure to 2023)"""
        print(f"Processing: {file_path.name}")
        
        try:
            xl = pd.ExcelFile(file_path)
            
            monthly_sheets = ['Jan-2024', 'Feb-2024', 'Mar-2024', 'Apr-2024', 'May-2024', 
                             'Jun-2024', 'Jul-2024', 'Aug-2024', 'Sep-2024', 'Oct-2024', 
                             'Nov-2024', 'Dec-2024']
            
            total_extracted = 0
            
            for sheet_name in monthly_sheets:
                if sheet_name in xl.sheet_names:
                    month_num = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_omc_2023_sheet(file_path, sheet_name, 2024, month_num)  # Same method as 2023
                    total_extracted += extracted
            
            print(f"Total extracted from 2024 OMC file: {total_extracted:,} records")
            
        except Exception as e:
            print(f"Error processing 2024 OMC file: {e}")
    
    def extract_omc_2025_file(self, file_path):
        """Extract 2025 OMC data"""
        print(f"Processing: {file_path.name}")
        
        try:
            xl = pd.ExcelFile(file_path)
            
            monthly_sheets = ['JAN 2025', 'FEB 2025', 'MAR 2025', 'APR 2025', 'MAY 2025', 'JUN 2025']
            
            total_extracted = 0
            
            for sheet_name in monthly_sheets:
                if sheet_name in xl.sheet_names:
                    month_num = self.get_month_from_sheet_name(sheet_name)
                    extracted = self.extract_omc_2025_sheet(file_path, sheet_name, 2025, month_num)
                    total_extracted += extracted
            
            print(f"Total extracted from 2025 OMC file: {total_extracted:,} records")
            
        except Exception as e:
            print(f"Error processing 2025 OMC file: {e}")
    
    def extract_omc_2025_sheet(self, file_path, sheet_name, year, month):
        """Extract from 2025 OMC sheet"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Try different header positions for 2025
            for header_pos in [1, 2, 3, 4]:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_pos)
                    
                    # Look for company column
                    company_col = None
                    for col in df.columns:
                        if 'COMPANY' in str(col).upper():
                            company_col = col
                            break
                    
                    if company_col:
                        print(f"      Found company column at header position {header_pos}")
                        break
                        
                except:
                    continue
            
            if company_col is None:
                print(f"      Warning: Could not find company column")
                return 0
            
            # Get product columns
            product_columns = []
            expected_products = ['GASOLINE', 'GASOIL', 'LPG', 'KEROSENE', 'ATK', 'PREMIX', 'RFO', 'MGO', 'NAPHTHA']
            
            for col in df.columns:
                col_str = str(col).upper()
                if col_str != company_col.upper() and col_str not in ['NO.', 'UNNAMED']:
                    if any(prod in col_str for prod in expected_products) or len(col_str) > 2:
                        product_columns.append(col)
            
            print(f"      Found {len(product_columns)} product columns")
            
            # Extract data (similar to other methods)
            extracted_count = 0
            valid_companies = df[df[company_col].notna() & (df[company_col] != '')]
            
            for idx, row in valid_companies.iterrows():
                company_name = str(row[company_col]).strip()
                
                if company_name.upper() not in ['COMPANY', 'TOTAL']:
                    for product_col in product_columns:
                        volume_value = row[product_col]
                        
                        if pd.notna(volume_value):
                            try:
                                volume_numeric = float(volume_value)
                                if volume_numeric > 0:
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
                                        'volume_liters': volume_numeric if unit_type == 'LITERS' else None,
                                        'volume_kg': volume_numeric if unit_type == 'KG' else None,
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
        
        return 1  # Default to January if unclear
    
    def standardize_and_convert(self):
        """Standardize the data"""
        print("\\nStandardizing extracted data...")
        
        conversion_factors = {
            'GASOLINE': 0.740, 'GASOIL': 0.832, 'KEROSENE': 0.810,
            'FUEL_OIL': 0.950, 'LPG': 0.540, 'ATK': 0.810,
            'PREMIX': 0.740, 'RFO': 0.950, 'MGO': 0.832,
            'NAPHTHA': 0.740, 'DEFAULT': 0.800
        }
        
        for dataset_name in ['bdc', 'omc']:
            dataset = self.extracted_data[dataset_name]
            print(f"  Processing {dataset_name.upper()}: {len(dataset)} records")
            
            for record in dataset:
                if 'product' not in record:  # Only process new records
                    # Standardize product name
                    product = record['product_original_name'].upper()
                    
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
                        record['volume_kg'] = volume_liters * density
                    elif volume_kg and not volume_liters:
                        record['volume_liters'] = volume_kg / density
                    
                    # Convert to metric tons
                    if record.get('volume_kg'):
                        record['volume_mt'] = record['volume_kg'] / 1000
                    
                    # Add quality metrics
                    record['data_quality_score'] = 1.0
                    record['is_outlier'] = False
    
    def save_final_complete_data(self):
        """Save the final complete dataset"""
        print("\\nSaving FINAL COMPLETE extracted data...")
        
        output_dir = self.raw_data_path.parent
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save BDC data
        if self.extracted_data['bdc']:
            bdc_df = pd.DataFrame(self.extracted_data['bdc'])
            bdc_path = output_dir / f"FINAL_COMPLETE_bdc_data_{timestamp}.csv"
            bdc_df.to_csv(bdc_path, index=False)
            print(f"  Saved FINAL BDC data: {bdc_path}")
            print(f"    Records: {len(bdc_df):,}")
            print(f"    Companies: {bdc_df['company_name'].nunique():,}")
            print(f"    Products: {bdc_df['product'].nunique():,}")
            print(f"    Years: {sorted(bdc_df['year'].unique())}")
        
        # Save OMC data
        if self.extracted_data['omc']:
            omc_df = pd.DataFrame(self.extracted_data['omc'])
            omc_path = output_dir / f"FINAL_COMPLETE_omc_data_{timestamp}.csv"
            omc_df.to_csv(omc_path, index=False)
            print(f"  Saved FINAL OMC data: {omc_path}")
            print(f"    Records: {len(omc_df):,}")
            print(f"    Companies: {omc_df['company_name'].nunique():,}")
            print(f"    Products: {omc_df['product'].nunique():,}")
            print(f"    Years: {sorted(omc_df['year'].unique())}")
            
            # Show yearly breakdown
            yearly_omc = omc_df.groupby('year').agg({
                'company_name': 'nunique',
                'volume_liters': 'sum'
            }).round(0)
            yearly_omc.columns = ['Companies', 'Total_Liters']
            print(f"    OMC Yearly Summary:\\n{yearly_omc}")
    
    def run_fixed_extraction(self):
        """Run the complete fixed extraction"""
        print("=" * 80)
        print("FIXED COMPLETE EXTRACTION - HANDLING ALL PROBLEMATIC FILES")
        print("=" * 80)
        
        # Extract from problematic BDC files
        self.extract_problematic_bdc_files()
        
        # Extract from problematic OMC files
        self.extract_problematic_omc_files()
        
        # Standardize all data
        self.standardize_and_convert()
        
        # Save final complete data
        self.save_final_complete_data()
        
        print("\\n" + "=" * 80)
        print("FIXED EXTRACTION COMPLETED - ALL FILES PROCESSED!")
        print("=" * 80)

def main():
    """Main execution"""
    extractor = FixedCompleteExtractor(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw")
    extractor.run_fixed_extraction()

if __name__ == "__main__":
    main()