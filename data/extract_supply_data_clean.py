"""
Clean Supply Data Extraction Pipeline
Extracts supply data and converts units to match database structure
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class SupplyDataExtractor:
    def __init__(self):
        self.raw_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw\Raw_Organised_Supply"
        self.output_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\final"
        
        # Conversion factors (liters per MT) - from database analysis
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
            'Naphtha': 1324.5,
            'Premix': 1324.5
        }
        
        # Standardized product names matching database
        self.product_mapping = {
            'Gasoline': 'Gasoline',
            'Gasoil': 'Gasoil',
            'LPG': 'LPG',
            'LPG CRM': 'LPG',  # Standardize to LPG
            'Premix': 'Gasoline',  # Premix is a type of gasoline
            'Kerosene': 'Kerosene',
            'ATK': 'Aviation Turbine Kerosene',
            'Marine Gasoil Local': 'Marine Gasoil (Local)',
            'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
            'Gasoil Mines': 'Gasoil (Mines)',
            'Gasoil Rig': 'Gasoil (Rig)',
            'Gasoil Power Plant': 'Gasoil (Power Plant)',
            'Gasoil Cell Site': 'Gasoil (Cell Site)',
            'Fuel Oil Industrial': 'Heavy Fuel Oil',
            'Fuel Oil Power Plant': 'Heavy Fuel Oil',
            'Naphtha': 'Naphtha'
        }
        
    def extract_year_month(self, sheet_name):
        """Extract year and month from sheet name"""
        import re
        
        months = {
            'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
            'JUNE': 6, 'JULY': 7
        }
        
        sheet_clean = sheet_name.strip().upper().replace(' ', '')
        month = None
        year = None
        
        # Try different patterns
        # Pattern 1: JAN-22, FEB-2023
        pattern1 = r'([A-Z]+)-(\d+)'
        match = re.search(pattern1, sheet_clean)
        if match:
            month_str = match.group(1)
            year_str = match.group(2)
            
            # Get month
            for m_key in months:
                if m_key in month_str:
                    month = months[m_key]
                    break
            
            # Get year
            if len(year_str) == 2:
                year = 2000 + int(year_str)
            elif len(year_str) == 4:
                year = int(year_str)
        
        # Pattern 2: JAN 2025
        if not year or not month:
            parts = sheet_name.strip().split()
            for part in parts:
                part_upper = part.upper().replace('-', '').replace(',', '')
                if part_upper in months:
                    month = months[part_upper]
                elif part.replace('-', '').isdigit():
                    if len(part) == 4:
                        year = int(part)
                    elif len(part) == 2:
                        year = 2000 + int(part)
        
        return year, month
    
    def process_sheet(self, file_path, sheet_name):
        """Process a single sheet"""
        try:
            # Read the sheet
            df = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=2)
            
            # Get the actual column names from the first row after headers
            actual_columns = df.columns.tolist()
            
            # Find the region column (usually second column)
            region_col = None
            for col in actual_columns[:3]:
                if 'region' in str(col).lower() or col == 'Unnamed: 1':
                    region_col = col
                    break
            
            if region_col is None:
                region_col = actual_columns[1]
            
            # Rename columns for easier processing
            new_columns = ['NO', 'Region']
            product_cols = []
            
            for i, col in enumerate(actual_columns[2:], 2):
                col_str = str(col).strip()
                if col_str and not col_str.startswith('Unnamed'):
                    new_columns.append(col_str)
                    product_cols.append(col_str)
                else:
                    new_columns.append(f'Col_{i}')
            
            df.columns = new_columns[:len(df.columns)]
            
            # Remove invalid rows
            df = df[df['Region'].notna()]
            # Convert to string first to avoid str accessor error
            df['Region'] = df['Region'].astype(str)
            df = df[~df['Region'].str.upper().str.contains('TOTAL', na=False)]
            df['Region'] = df['Region'].str.strip()
            
            # Get year and month
            year, month = self.extract_year_month(sheet_name)
            
            # Process each product
            records = []
            for _, row in df.iterrows():
                region = row['Region']
                
                for col in product_cols:
                    if col in row:
                        value = pd.to_numeric(row[col], errors='coerce')
                        if pd.notna(value) and value > 0:
                            # Map to standardized product name
                            product_clean = col.strip().replace('_', ' ')
                            product_std = self.product_mapping.get(product_clean, product_clean)
                            
                            # Determine unit
                            unit = 'KG' if 'LPG' in col else 'LITERS'
                            
                            records.append({
                                'year': year,
                                'month': month,
                                'region': region,
                                'product': product_std,
                                'unit': unit,
                                'quantity_original': float(value),
                                'source_file': os.path.basename(file_path),
                                'period_date': pd.Timestamp(year, month, 1)
                            })
            
            return pd.DataFrame(records)
            
        except Exception as e:
            print(f"  Error processing {sheet_name}: {str(e)}")
            return pd.DataFrame()
    
    def apply_conversions(self, df):
        """Apply conversion factors to calculate volume in MT"""
        df['volume_mt'] = 0.0
        df['volume_liters'] = 0.0
        df['volume_kg'] = 0.0
        
        for idx, row in df.iterrows():
            quantity = row['quantity_original']
            product = row['product']
            unit = row['unit']
            
            if unit == 'KG':
                # LPG is in KG
                df.at[idx, 'volume_kg'] = quantity
                df.at[idx, 'volume_mt'] = quantity / 1000
                df.at[idx, 'volume_liters'] = quantity  # Approximate for LPG
            else:
                # Products in LITERS
                df.at[idx, 'volume_liters'] = quantity
                
                # Get conversion factor
                cf = self.conversion_factors.get(product, 1183.43)
                
                # Convert to MT
                df.at[idx, 'volume_mt'] = quantity / cf
                df.at[idx, 'volume_kg'] = (quantity / cf) * 1000
        
        return df
    
    def get_product_category(self, product):
        """Get product category"""
        if 'Gasoline' in product:
            return 'Gasoline'
        elif 'Gasoil' in product:
            return 'Gasoil'
        elif 'LPG' in product:
            return 'LPG'
        elif 'Kerosene' in product or 'Aviation' in product:
            return 'Kerosene/ATK'
        elif 'Heavy Fuel Oil' in product:
            return 'Heavy Fuel Oil'
        elif 'Marine' in product:
            return 'Marine Gasoil'
        elif 'Naphtha' in product:
            return 'Naphtha'
        else:
            return 'Other'
    
    def extract_all(self):
        """Main extraction function"""
        print("="*60)
        print("CLEAN SUPPLY DATA EXTRACTION")
        print("="*60)
        
        files = sorted([f for f in os.listdir(self.raw_path) if f.endswith('.xlsx')])
        print(f"\nFound {len(files)} files")
        
        all_data = []
        
        for file in files:
            print(f"\nProcessing: {file}")
            file_path = os.path.join(self.raw_path, file)
            xl = pd.ExcelFile(file_path)
            
            for sheet in xl.sheet_names:
                df = self.process_sheet(file_path, sheet)
                if not df.empty:
                    all_data.append(df)
                    print(f"  - {sheet}: {len(df)} records")
        
        if all_data:
            # Combine all data
            final_df = pd.concat(all_data, ignore_index=True)
            
            # Apply conversions
            final_df = self.apply_conversions(final_df)
            
            # Add required columns for database
            final_df['company_type'] = 'SUPPLY'
            final_df['product_name_clean'] = final_df['product']
            final_df['product_category'] = final_df['product'].apply(self.get_product_category)
            final_df['data_quality_score'] = 1.0
            final_df['is_outlier'] = False
            final_df['created_at'] = datetime.now()
            final_df['company_name_clean'] = None  # No company for supply data
            
            # Sort columns to match database
            columns_order = [
                'year', 'month', 'region', 'product', 'unit', 'quantity_original',
                'company_type', 'period_date', 'data_quality_score', 'source_file',
                'product_name_clean', 'product_category', 'company_name_clean', 'is_outlier',
                'created_at', 'volume_mt', 'volume_liters', 'volume_kg'
            ]
            
            # Keep only required columns
            final_columns = [col for col in columns_order if col in final_df.columns]
            final_df = final_df[final_columns]
            
            # Save to CSV
            output_file = os.path.join(self.output_path, 'SUPPLY_DATA_CLEAN.csv')
            final_df.to_csv(output_file, index=False)
            
            print(f"\n{'='*60}")
            print("EXTRACTION COMPLETE")
            print(f"Output: {output_file}")
            print(f"Total records: {len(final_df):,}")
            print(f"Total volume: {final_df['volume_mt'].sum():,.2f} MT")
            
            # Summary by year
            print("\nSUMMARY BY YEAR:")
            summary = final_df.groupby('year').agg({
                'volume_mt': 'sum',
                'region': 'nunique',
                'product': 'nunique'
            }).round(2)
            print(summary)
            
            # Top products
            print("\nTOP 5 PRODUCTS:")
            top = final_df.groupby('product')['volume_mt'].sum().nlargest(5)
            for product, vol in top.items():
                print(f"  {product}: {vol:,.2f} MT")
            
            # Regional distribution for 2025
            print("\n2025 REGIONS (16 total):")
            regions_2025 = final_df[final_df['year'] == 2025]['region'].unique()
            print(f"  Count: {len(regions_2025)}")
            print(f"  Regions: {', '.join(sorted(regions_2025))}")
            
            return final_df
        
        return pd.DataFrame()

if __name__ == "__main__":
    extractor = SupplyDataExtractor()
    data = extractor.extract_all()