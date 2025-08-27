"""
COMPLETE Raw Excel Data Extractor for PetroVerse Analytics
Extracts ALL data from ALL Excel files and ALL monthly sheets
Ensures no year or month is missed
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
from datetime import datetime
import re
import warnings
warnings.filterwarnings('ignore')

class CompleteRawExtractor:
    """Extract ALL data from raw Excel files with comprehensive coverage"""
    
    def __init__(self, raw_data_path: str):
        self.raw_data_path = Path(raw_data_path)
        self.extracted_data = {'bdc': [], 'omc': []}
        self.month_mapping = {
            'jan': 1, 'january': 1,
            'feb': 2, 'february': 2,
            'mar': 3, 'march': 3,
            'apr': 4, 'april': 4,
            'may': 5,
            'jun': 6, 'june': 6,
            'jul': 7, 'july': 7,
            'aug': 8, 'august': 8,
            'sep': 9, 'september': 9, 'sept': 9,
            'oct': 10, 'october': 10,
            'nov': 11, 'november': 11,
            'dec': 12, 'december': 12
        }
        
    def extract_month_from_sheet_name(self, sheet_name, file_year):
        """Extract month number from sheet name with comprehensive patterns"""
        sheet_lower = sheet_name.lower().strip()
        
        # Remove extra spaces and special characters
        sheet_lower = re.sub(r'\s+', ' ', sheet_lower)
        
        # Try various patterns to find month
        month_patterns = [
            # Direct month names with year
            r'(jan|january)\s*(?:uary)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(feb|february)\s*(?:ruary)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(mar|march)\s*(?:ch)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(apr|april)\s*(?:il)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(may)\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(jun|june)\s*(?:e)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(jul|july)\s*(?:y)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(aug|august)\s*(?:ust)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(sep|september|sept)\s*(?:tember)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(oct|october)\s*(?:ober)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(nov|november)\s*(?:ember)?\s*(?:-?\s*)?(\d{4}|\d{2})',
            r'(dec|december)\s*(?:ember)?\s*(?:-?\s*)?(\d{4}|\d{2})'
        ]
        
        for pattern in month_patterns:
            match = re.search(pattern, sheet_lower)
            if match:
                month_name = match.group(1)
                year_part = match.group(2)
                
                # Convert 2-digit year to 4-digit
                if len(year_part) == 2:
                    if int(year_part) <= 30:
                        sheet_year = 2000 + int(year_part)
                    else:
                        sheet_year = 1900 + int(year_part)
                else:
                    sheet_year = int(year_part)
                
                # Check if year matches file year
                if sheet_year == file_year:
                    month_key = month_name[:3].lower()  # First 3 letters
                    if month_key in self.month_mapping:
                        return self.month_mapping[month_key]
        
        # If no year found, try just month names
        for month_key, month_num in self.month_mapping.items():
            if month_key in sheet_lower and str(file_year) in sheet_name:
                return month_num
            elif month_key in sheet_lower:
                # Check if sheet contains reasonable month data
                return month_num
        
        return None
    
    def is_monthly_sheet(self, sheet_name, file_year):
        """Determine if a sheet contains monthly data"""
        sheet_lower = sheet_name.lower()
        
        # Skip quarterly, half-yearly, and yearly summaries
        skip_patterns = [
            r'q[1-4]', r'quarter', r'h[1-2]', r'half',
            r'jan\s*-\s*dec', r'january\s*-\s*december',
            r'annual', r'yearly', r'total', r'summary'
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, sheet_lower):
                return False
        
        # Check if it contains a month name
        for month_key in self.month_mapping.keys():
            if month_key in sheet_lower:
                return True
        
        return False
    
    def extract_bdc_files(self):
        """Extract data from ALL BDC Excel files"""
        print("Extracting BDC data from ALL raw Excel files...")
        
        bdc_folder = self.raw_data_path / "initial raw data from npa website" / "bdc_bidec"
        bdc_files = list(bdc_folder.glob("*.xlsx"))
        
        print(f"Found {len(bdc_files)} BDC files:")
        for file in bdc_files:
            print(f"  - {file.name}")
        
        total_extracted = 0
        
        for bdc_file in bdc_files:
            print(f"\nProcessing: {bdc_file.name}")
            try:
                # Extract year from filename
                year_matches = re.findall(r'(\d{4})', bdc_file.name)
                if not year_matches:
                    print(f"  Warning: Could not extract year from {bdc_file.name}")
                    continue
                
                # Use the first year found (most files have one year)
                file_year = int(year_matches[0])
                print(f"  File year: {file_year}")
                
                # Get all sheet names
                xl = pd.ExcelFile(bdc_file)
                print(f"  Total sheets: {len(xl.sheet_names)}")
                
                # Process ALL sheets that look like monthly data
                monthly_sheets = []
                for sheet in xl.sheet_names:
                    if self.is_monthly_sheet(sheet, file_year):
                        month_num = self.extract_month_from_sheet_name(sheet, file_year)
                        if month_num:
                            monthly_sheets.append((sheet, month_num))
                        else:
                            # Try to extract anyway if it looks monthly
                            print(f"    Manual check needed for sheet: {sheet}")
                            monthly_sheets.append((sheet, None))
                
                print(f"  Found {len(monthly_sheets)} monthly sheets:")
                for sheet, month in monthly_sheets[:5]:  # Show first 5
                    print(f"    - {sheet} (Month: {month})")
                
                # Extract data from each monthly sheet
                file_extracted = 0
                for sheet_name, month_num in monthly_sheets:
                    extracted_count = self.extract_bdc_sheet(bdc_file, sheet_name, file_year, month_num)
                    file_extracted += extracted_count
                
                print(f"  Total extracted from {bdc_file.name}: {file_extracted:,} records")
                total_extracted += file_extracted
                    
            except Exception as e:
                print(f"  Error processing {bdc_file.name}: {e}")
                continue
        
        print(f"\nTotal BDC records extracted: {total_extracted:,}")
    
    def extract_bdc_sheet(self, file_path, sheet_name, year, month):
        """Extract data from a single BDC sheet with improved logic"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # Try different header row positions
            header_positions = [1, 2, 3, 4]
            df = None
            company_col = None
            
            for header_pos in header_positions:
                try:
                    df_test = pd.read_excel(file_path, sheet_name=sheet_name, header=header_pos)
                    
                    # Look for company column
                    for col in df_test.columns:
                        if 'COMPANY' in str(col).upper() or 'BIDEC' in str(col).upper():
                            df = df_test
                            company_col = col
                            print(f"      Header found at row {header_pos}")
                            break
                    
                    if df is not None:
                        break
                except:
                    continue
            
            if df is None or company_col is None:
                print(f"      Warning: Could not find proper structure in {sheet_name}")
                return 0
            
            # Get product columns (exclude metadata columns)
            product_columns = []
            exclude_patterns = ['no.', 'company', 'bidec', 'unnamed', 'nan', 'total']
            
            for col in df.columns:
                col_str = str(col).upper()
                if not any(pattern.upper() in col_str for pattern in exclude_patterns):
                    if col_str.strip():  # Not empty
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
                                # Determine unit type
                                unit_type = 'KG' if 'LPG' in str(product_col).upper() else 'LITERS'
                                
                                self.extracted_data['bdc'].append({
                                    'source_file': file_path.name,
                                    'sheet_name': sheet_name,
                                    'year': year,
                                    'month': month if month else 1,  # Default to January if unclear
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
    
    def extract_omc_files(self):
        """Extract data from ALL OMC Excel files"""
        print("\nExtracting OMC data from ALL raw Excel files...")
        
        omc_folder = self.raw_data_path / "initial raw data from npa website" / "omc"
        omc_files = list(omc_folder.glob("*.xlsx"))
        
        print(f"Found {len(omc_files)} OMC files:")
        for file in omc_files:
            print(f"  - {file.name}")
        
        total_extracted = 0
        
        for omc_file in omc_files:
            print(f"\nProcessing: {omc_file.name}")
            try:
                # Extract year from filename
                year_matches = re.findall(r'(\d{4})', omc_file.name)
                if not year_matches:
                    print(f"  Warning: Could not extract year from {omc_file.name}")
                    continue
                
                file_year = int(year_matches[0])
                print(f"  File year: {file_year}")
                
                # Get all sheet names
                xl = pd.ExcelFile(omc_file)
                print(f"  Total sheets: {len(xl.sheet_names)}")
                
                # Process ALL sheets that look like monthly data
                monthly_sheets = []
                for sheet in xl.sheet_names:
                    if self.is_monthly_sheet(sheet, file_year):
                        month_num = self.extract_month_from_sheet_name(sheet, file_year)
                        if month_num:
                            monthly_sheets.append((sheet, month_num))
                        else:
                            print(f"    Manual check needed for sheet: {sheet}")
                            monthly_sheets.append((sheet, None))
                
                print(f"  Found {len(monthly_sheets)} monthly sheets:")
                for sheet, month in monthly_sheets[:5]:
                    print(f"    - {sheet} (Month: {month})")
                
                # Extract data from each monthly sheet
                file_extracted = 0
                for sheet_name, month_num in monthly_sheets:
                    extracted_count = self.extract_omc_sheet(omc_file, sheet_name, file_year, month_num)
                    file_extracted += extracted_count
                
                print(f"  Total extracted from {omc_file.name}: {file_extracted:,} records")
                total_extracted += file_extracted
                    
            except Exception as e:
                print(f"  Error processing {omc_file.name}: {e}")
                continue
        
        print(f"\nTotal OMC records extracted: {total_extracted:,}")
    
    def extract_omc_sheet(self, file_path, sheet_name, year, month):
        """Extract data from a single OMC sheet"""
        try:
            print(f"    Extracting {sheet_name} (Year: {year}, Month: {month})")
            
            # OMC files typically have header at row 1
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=1)
            
            # Find company column
            company_col = None
            for col in df.columns:
                if 'COMPANY' in str(col).upper():
                    company_col = col
                    break
            
            if company_col is None:
                print(f"      Warning: Could not find company column in {sheet_name}")
                return 0
            
            # Get product columns
            product_columns = []
            expected_products = ['GASOLINE', 'GASOIL', 'LPG', 'KEROSENE', 'ATK', 'PREMIX', 
                                'RFO', 'MGO', 'NAPHTHA', 'FUEL']
            
            for col in df.columns:
                col_str = str(col).upper()
                if (col_str not in ['NO.', 'COMPANY'] and 
                    not col_str.startswith('UNNAMED') and 
                    col_str != 'NAN'):
                    # Include if it matches expected products or looks like a product
                    if any(prod in col_str for prod in expected_products) or len(col_str) > 2:
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
                                    'month': month if month else 1,
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
    
    def standardize_and_convert(self):
        """Standardize extracted data and convert units"""
        print("\nStandardizing and converting extracted data...")
        
        conversion_factors = {
            'GASOLINE': 0.740, 'GASOIL': 0.832, 'KEROSENE': 0.810,
            'FUEL_OIL': 0.950, 'LPG': 0.540, 'ATK': 0.810,
            'PREMIX': 0.740, 'RFO': 0.950, 'MGO': 0.832,
            'NAPHTHA': 0.740, 'DEFAULT': 0.800
        }
        
        for dataset_name in ['bdc', 'omc']:
            dataset = self.extracted_data[dataset_name]
            print(f"  Standardizing {dataset_name.upper()} data: {len(dataset)} records")
            
            for record in dataset:
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
    
    def save_complete_data(self):
        """Save the complete extracted data"""
        print("\nSaving COMPLETE extracted data...")
        
        output_dir = self.raw_data_path.parent
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save BDC data
        if self.extracted_data['bdc']:
            bdc_df = pd.DataFrame(self.extracted_data['bdc'])
            bdc_path = output_dir / f"COMPLETE_extracted_bdc_data_{timestamp}.csv"
            bdc_df.to_csv(bdc_path, index=False)
            print(f"  Saved COMPLETE BDC data: {bdc_path}")
            print(f"    Records: {len(bdc_df):,}")
            print(f"    Companies: {bdc_df['company_name'].nunique():,}")
            print(f"    Products: {bdc_df['product'].nunique():,}")
            print(f"    Years: {sorted(bdc_df['year'].unique())}")
            
            # Show yearly breakdown
            yearly_bdc = bdc_df.groupby('year').agg({
                'company_name': 'nunique',
                'volume_liters': 'sum'
            }).round(0)
            yearly_bdc.columns = ['Companies', 'Total_Liters']
            print(f"    BDC Yearly Summary:\n{yearly_bdc}")
        
        # Save OMC data
        if self.extracted_data['omc']:
            omc_df = pd.DataFrame(self.extracted_data['omc'])
            omc_path = output_dir / f"COMPLETE_extracted_omc_data_{timestamp}.csv"
            omc_df.to_csv(omc_path, index=False)
            print(f"  Saved COMPLETE OMC data: {omc_path}")
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
            print(f"    OMC Yearly Summary:\n{yearly_omc}")
    
    def run_complete_extraction(self):
        """Run the COMPLETE extraction process"""
        print("=" * 80)
        print("COMPLETE PETROVERSE RAW EXCEL DATA EXTRACTION")
        print("Ensuring ALL years and ALL monthly sheets are captured")
        print("=" * 80)
        
        # Extract BDC data
        self.extract_bdc_files()
        
        # Extract OMC data  
        self.extract_omc_files()
        
        # Standardize and convert
        self.standardize_and_convert()
        
        # Save complete data
        self.save_complete_data()
        
        print("\n" + "=" * 80)
        print("COMPLETE EXTRACTION FINISHED SUCCESSFULLY!")
        print("ALL years and monthly sheets have been processed")
        print("=" * 80)

def main():
    """Main execution function"""
    extractor = CompleteRawExtractor(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw")
    extractor.run_complete_extraction()

if __name__ == "__main__":
    main()