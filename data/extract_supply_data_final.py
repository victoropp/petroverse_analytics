"""
Final Supply Data Extraction Pipeline
Handles both 2022-2024 format (regions in column 1) and 2025 format (regions in column 2)
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime
import re
import warnings
warnings.filterwarnings('ignore')

class SupplyDataExtractor:
    def __init__(self):
        self.raw_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw\Raw_Organised_Supply"
        self.output_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\final"
        
        # Conversion factors (liters per MT)
        self.conversion_factors = {
            'Gasoline': 1324.5,
            'Gasoil': 1183.43,
            'LPG': 1000.0,
            'Kerosene': 1240.6,
            'Aviation Turbine Kerosene': 1240.6,
            'Marine Gasoil (Local)': 1183.43,
            'Marine Gasoil (Foreign)': 1183.43,
            'Gasoil (Mines)': 1183.43,
            'Gasoil (Rig)': 1183.43,
            'Gasoil (Power Plant)': 1183.43,
            'Gasoil (Cell Site)': 1183.43,
            'Heavy Fuel Oil': 1009.08,
            'Naphtha': 1324.5
        }
        
        # Product standardization
        self.product_mapping = {
            'GASOLINE (Petrol)': 'Gasoline',
            'Gasoline': 'Gasoline',
            'Gas oil (Diesel)': 'Gasoil',
            'Gasoil': 'Gasoil',
            'LPG': 'LPG',
            'LPG - Butane': 'LPG',
            'PREMIX': 'Gasoline',
            'Premix': 'Gasoline',
            'KEROSENE': 'Kerosene',
            'Kerosene': 'Kerosene',
            'ATK': 'Aviation Turbine Kerosene',
            'Aviation Turbine Kerosene': 'Aviation Turbine Kerosene',
            'MGO Local': 'Marine Gasoil (Local)',
            'Marine Gasoil Local': 'Marine Gasoil (Local)',
            'MGO Foreign': 'Marine Gasoil (Foreign)',
            'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
            'GASOIL-Mines': 'Gasoil (Mines)',
            'Gasoil Mines': 'Gasoil (Mines)',
            'GASOIL-Rig': 'Gasoil (Rig)',
            'Gasoil Rig': 'Gasoil (Rig)',
            'GASOIL -Power Plant': 'Gasoil (Power Plant)',
            'Gasoil Power Plant': 'Gasoil (Power Plant)',
            'GASOIL - Cell Site': 'Gasoil (Cell Site)',
            'Gasoil Cell Site': 'Gasoil (Cell Site)',
            'HFO': 'Heavy Fuel Oil',
            'RFO': 'Heavy Fuel Oil',
            'Heavy Fuel Oil': 'Heavy Fuel Oil',
            'Heavy Fuel oil (Power Plant)': 'Heavy Fuel Oil',
            'Fuel Oil Industrial': 'Heavy Fuel Oil',
            'Fuel Oil Power Plant': 'Heavy Fuel Oil',
            'Residual Fuel oil (Industrial)': 'Heavy Fuel Oil',
            'NAPHTHA': 'Naphtha',
            'Naphtha': 'Naphtha',
            'Naphtha (Unified)': 'Naphtha'
        }
    
    def extract_year_month(self, sheet_name):
        """Extract year and month from sheet name"""
        months = {
            'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
            'JUNE': 6, 'JULY': 7
        }
        
        sheet_clean = sheet_name.strip().upper().replace(' ', '')
        
        # Pattern: JAN-22, FEB-2023, JAN 2025
        pattern = r'([A-Z]+)-?(\d+)'
        match = re.search(pattern, sheet_clean)
        
        if match:
            month_str = match.group(1)
            year_str = match.group(2)
            
            # Get month
            month = None
            for m_key in months:
                if m_key in month_str:
                    month = months[m_key]
                    break
            
            # Get year
            if len(year_str) == 2:
                year = 2000 + int(year_str)
            elif len(year_str) == 4:
                year = int(year_str)
            else:
                year = None
            
            return year, month
        
        return None, None
    
    def detect_format(self, df):
        """Detect if format is 2022-2024 or 2025 style"""
        # Check first few rows of first column
        first_col = df.iloc[:10, 0]
        
        # If first column contains region names like 'Ashanti', 'Central', etc.
        regions = ['Ashanti', 'Central', 'Eastern', 'Greater Accra', 'Northern', 
                  'Volta', 'Western', 'Upper East', 'Upper West', 'Brong Ahafo',
                  'Ahafo', 'Bono', 'Bono East', 'Oti', 'Savannah', 'North East', 'Western North']
        
        for val in first_col:
            if pd.notna(val) and str(val) in regions:
                return 'old'  # 2022-2024 format
        
        return 'new'  # 2025 format
    
    def process_old_format(self, file_path, sheet_name):
        """Process 2022-2024 format (regions in first column)"""
        try:
            # Read with 2 header rows
            df = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=1, header=[0, 1])
            
            # Flatten column names
            df.columns = [' '.join(col).strip() if col[1] != 'Unnamed: 0_level_1' 
                         else col[0] for col in df.columns.values]
            
            # First column is regions
            df.rename(columns={df.columns[0]: 'Region'}, inplace=True)
            
            # Clean region column
            df = df[df['Region'].notna()]
            df['Region'] = df['Region'].astype(str).str.strip()
            df = df[~df['Region'].str.upper().str.contains('TOTAL|REGIONAL|UNIT', na=False)]
            
            # Get year and month
            year, month = self.extract_year_month(sheet_name)
            
            records = []
            for _, row in df.iterrows():
                region = row['Region']
                
                for col in df.columns[1:]:
                    if pd.notna(row[col]) and row[col] != 0:
                        # Clean product name
                        product_raw = str(col).strip()
                        product = self.product_mapping.get(product_raw, product_raw)
                        
                        # Determine unit
                        unit = 'KG' if 'LPG' in product_raw else 'LITERS'
                        
                        records.append({
                            'year': year,
                            'month': month,
                            'region': region,
                            'product': product,
                            'unit': unit,
                            'quantity_original': float(row[col]),
                            'source_file': os.path.basename(file_path)
                        })
            
            return pd.DataFrame(records)
            
        except Exception as e:
            print(f"    Error: {e}")
            return pd.DataFrame()
    
    def process_new_format(self, file_path, sheet_name):
        """Process 2025 format (regions in second column)"""
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=2)
            
            # Rename columns
            if len(df.columns) > 1:
                df.rename(columns={df.columns[1]: 'Region'}, inplace=True)
            
            # Clean regions
            df = df[df['Region'].notna()]
            df['Region'] = df['Region'].astype(str).str.strip()
            df = df[~df['Region'].str.upper().str.contains('TOTAL|REGION', na=False)]
            
            # Get year and month
            year, month = self.extract_year_month(sheet_name)
            
            records = []
            for _, row in df.iterrows():
                region = row['Region']
                
                for col in df.columns[2:]:
                    if pd.notna(row[col]) and row[col] != 0:
                        # Clean product name
                        product_raw = str(col).strip().replace(' ', '')
                        product = self.product_mapping.get(product_raw, product_raw)
                        
                        # Determine unit
                        unit = 'KG' if 'LPG' in col else 'LITERS'
                        
                        records.append({
                            'year': year,
                            'month': month,
                            'region': region,
                            'product': product,
                            'unit': unit,
                            'quantity_original': float(row[col]),
                            'source_file': os.path.basename(file_path)
                        })
            
            return pd.DataFrame(records)
            
        except Exception as e:
            print(f"    Error: {e}")
            return pd.DataFrame()
    
    def process_sheet(self, file_path, sheet_name):
        """Process a sheet based on its format"""
        # Read first few rows to detect format
        df_test = pd.read_excel(file_path, sheet_name=sheet_name, nrows=10)
        format_type = self.detect_format(df_test)
        
        if format_type == 'old':
            return self.process_old_format(file_path, sheet_name)
        else:
            return self.process_new_format(file_path, sheet_name)
    
    def apply_conversions(self, df):
        """Apply conversion factors"""
        df['volume_mt'] = 0.0
        df['volume_liters'] = 0.0
        df['volume_kg'] = 0.0
        
        for idx, row in df.iterrows():
            quantity = row['quantity_original']
            product = row['product']
            unit = row['unit']
            
            if unit == 'KG':
                df.at[idx, 'volume_kg'] = quantity
                df.at[idx, 'volume_mt'] = quantity / 1000
                df.at[idx, 'volume_liters'] = quantity  # Approximate
            else:
                df.at[idx, 'volume_liters'] = quantity
                cf = self.conversion_factors.get(product, 1183.43)
                df.at[idx, 'volume_mt'] = quantity / cf
                df.at[idx, 'volume_kg'] = (quantity / cf) * 1000
        
        return df
    
    def extract_all(self):
        """Main extraction function"""
        print("="*60)
        print("FINAL SUPPLY DATA EXTRACTION")
        print("="*60)
        
        files = sorted([f for f in os.listdir(self.raw_path) if f.endswith('.xlsx')])
        all_data = []
        
        for file in files:
            print(f"\n{file}")
            file_path = os.path.join(self.raw_path, file)
            xl = pd.ExcelFile(file_path)
            
            for sheet in xl.sheet_names:
                df = self.process_sheet(file_path, sheet)
                if not df.empty:
                    all_data.append(df)
                    year, month = self.extract_year_month(sheet)
                    print(f"  {sheet}: {len(df)} records (Year: {year}, Month: {month})")
        
        if all_data:
            # Combine all data
            final_df = pd.concat(all_data, ignore_index=True)
            
            # Apply conversions
            final_df = self.apply_conversions(final_df)
            
            # Add required columns
            final_df['period_date'] = pd.to_datetime(
                final_df['year'].astype(str) + '-' + 
                final_df['month'].astype(str).str.zfill(2) + '-01'
            )
            final_df['company_type'] = 'SUPPLY'
            final_df['product_name_clean'] = final_df['product']
            final_df['product_category'] = final_df['product'].apply(
                lambda x: 'Gasoline' if 'Gasoline' in x 
                else 'Gasoil' if 'Gasoil' in x
                else 'LPG' if 'LPG' in x
                else 'Kerosene/ATK' if 'Kerosene' in x or 'Aviation' in x
                else 'Heavy Fuel Oil' if 'Heavy' in x
                else 'Marine Gasoil' if 'Marine' in x
                else 'Naphtha' if 'Naphtha' in x
                else 'Other'
            )
            final_df['data_quality_score'] = 1.0
            final_df['is_outlier'] = False
            final_df['created_at'] = datetime.now()
            final_df['company_name_clean'] = None
            
            # Save
            output_file = os.path.join(self.output_path, 'SUPPLY_DATA_FINAL.csv')
            final_df.to_csv(output_file, index=False)
            
            print(f"\n{'='*60}")
            print("EXTRACTION COMPLETE")
            print(f"Total records: {len(final_df):,}")
            print(f"Total volume: {final_df['volume_mt'].sum():,.2f} MT")
            
            # Summary
            print("\nSUMMARY BY YEAR:")
            summary = final_df.groupby('year').agg({
                'volume_mt': 'sum',
                'region': 'nunique',
                'product': 'nunique'
            }).round(2)
            print(summary)
            
            print("\nREGIONS BY YEAR:")
            for year in sorted(final_df['year'].unique()):
                regions = final_df[final_df['year'] == year]['region'].nunique()
                print(f"  {year}: {regions} regions")
            
            return final_df
        
        return pd.DataFrame()

if __name__ == "__main__":
    extractor = SupplyDataExtractor()
    data = extractor.extract_all()