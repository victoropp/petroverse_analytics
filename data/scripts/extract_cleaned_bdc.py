"""
Extract BDC Data from Cleaned Files
Handles the cleaned BDC dataset with consistent monthly sheets
"""

import pandas as pd
import numpy as np
import os
import logging
from datetime import datetime
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CleanedBDCExtractor:
    def __init__(self):
        self.results = []
        self.stats = {
            'files_processed': 0,
            'sheets_processed': 0,
            'records_extracted': 0,
            'companies_found': set(),
            'products_found': set(),
            'errors': []
        }
        
        # Product standardization mapping
        self.product_mapping = {
            # Gasoline variants
            'Premium ': 'Gasoline',
            'Gasoline (Premium) ': 'Gasoline', 
            'Gasoline (Premium)': 'Gasoline',
            'Premium': 'Gasoline',
            'Premix ': 'Gasoline',
            'Premix': 'Gasoline',
            
            # Gasoil/Diesel variants
            'Gas oil ': 'Gasoil',
            'Gas oil (Diesel)': 'Gasoil',
            'Gasoil': 'Gasoil',
            'Marine Gasoil ': 'Marine Gasoil',
            'Marine Gasoil (Local) ': 'Marine Gasoil',
            'Marine Gasoil (Foreign)': 'Marine Gasoil',
            'Marine (Foreign)': 'Marine Gasoil',
            'Gasoil(Mines) ': 'Gasoil (Mines)',
            'Gasoil (Mines) ': 'Gasoil (Mines)',
            'Gasoil (Mines)': 'Gasoil (Mines)',
            'Gasoil (Rig)': 'Gasoil (Rig)',
            ' Gasoil (Rig)': 'Gasoil (Rig)',
            'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
            'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
            
            # LPG variants
            '*LPG ': 'LPG',
            'LPG - Butane ': 'LPG',
            'LPG -Propane (Power Plant)': 'LPG (Power Plant)',
            'LPG (Power Plant)': 'LPG (Power Plant)',
            
            # Fuel Oil variants
            'Fuel  oil (Industrial)': 'Fuel Oil (Industrial)',
            'Fuel  oil (Power Plants)': 'Fuel Oil (Power Plant)',
            'Heavy Fuel oil (Power Plant)': 'Fuel Oil (Power Plant)',
            'Residual Fuel oil (Industrial)': 'Fuel Oil (Industrial)',
            
            # Other products
            'Naphtha (Unified)': 'Naphtha',
            'Naphtha': 'Naphtha',
            'Kerosene ': 'Kerosene',
            'Kerosene': 'Kerosene',
            'ATK ': 'ATK',
            'ATK': 'ATK'
        }
        
        # Conversion factors (liters per unit for non-liter products)
        self.conversion_factors = {
            'LPG': 1.0,  # LPG is in KG, convert to liters (~1:1 for calculation)
            'LPG (Power Plant)': 1.0
        }

    def extract_year_from_filename(self, filename):
        """Extract year from filename"""
        match = re.search(r'(\d{4})', filename)
        return int(match.group(1)) if match else None
    
    def extract_month_from_sheetname(self, sheet_name):
        """Extract month number from sheet name"""
        month_mapping = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        }
        
        sheet_lower = sheet_name.lower().strip()
        for month_name, month_num in month_mapping.items():
            if month_name in sheet_lower:
                return month_num
        return None
    
    def standardize_product_name(self, product_name):
        """Standardize product names"""
        if pd.isna(product_name):
            return None
        
        product_str = str(product_name).strip()
        return self.product_mapping.get(product_str, product_str)
    
    def extract_sheet_data(self, file_path, sheet_name, year):
        """Extract data from a single sheet"""
        try:
            month = self.extract_month_from_sheetname(sheet_name)
            if not month:
                logger.warning(f"Could not extract month from sheet: {sheet_name}")
                return []
            
            # Read with header=1 to get proper column names
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=1)
            
            if df.empty or len(df.columns) < 3:
                logger.warning(f"Sheet {sheet_name} is empty or has insufficient columns")
                return []
            
            records = []
            
            # Get company column (should be 'Company')
            company_col = None
            for col in df.columns:
                if str(col).lower().strip() in ['company', 'companies']:
                    company_col = col
                    break
            
            if company_col is None:
                logger.error(f"No company column found in {sheet_name}")
                return []
            
            # Process each row
            for idx, row in df.iterrows():
                company_name = row.get(company_col)
                
                if pd.isna(company_name) or str(company_name).strip() == '':
                    continue
                
                company_name = str(company_name).strip()
                
                # Skip header-like rows
                if company_name.lower() in ['company', 'companies', 'total', 'grand total']:
                    continue
                
                # Process each product column
                for col in df.columns:
                    if col == company_col or str(col).lower() in ['no', 'unnamed']:
                        continue
                    
                    volume = row.get(col)
                    
                    # Skip if no volume data
                    if pd.isna(volume) or volume == 0 or str(volume).strip() == '':
                        continue
                    
                    try:
                        volume_numeric = float(volume)
                        if volume_numeric <= 0:
                            continue
                    except (ValueError, TypeError):
                        continue
                    
                    # Standardize product name
                    product_name = self.standardize_product_name(col)
                    if not product_name:
                        continue
                    
                    # Apply conversion factors if needed
                    volume_liters = volume_numeric
                    volume_kg = 0
                    volume_mt = 0
                    
                    if 'LPG' in product_name:
                        # LPG is in KG, convert to liters and keep original KG
                        volume_kg = volume_numeric
                        volume_liters = volume_numeric * self.conversion_factors.get(product_name, 1.0)
                        volume_mt = volume_kg / 1000
                    else:
                        # Other products are in liters
                        volume_liters = volume_numeric
                        # Estimate kg/mt for liquid products (approximate density)
                        volume_kg = volume_numeric * 0.8  # Approximate density
                        volume_mt = volume_kg / 1000
                    
                    # Create record
                    record = {
                        'source_file': os.path.basename(file_path),
                        'sheet_name': sheet_name,
                        'extraction_date': datetime.now().date(),
                        'year': year,
                        'month': month,
                        'period_date': f"{year}-{month:02d}-01",
                        'period_type': 'monthly',
                        'company_name': company_name,
                        'product_code': '',
                        'product_original_name': str(col).strip(),
                        'unit_type': 'KG' if 'LPG' in product_name else 'LITERS',
                        'volume': volume_numeric,
                        'volume_liters': round(volume_liters, 2),
                        'volume_kg': round(volume_kg, 2),
                        'volume_mt': round(volume_mt, 6),
                        'company_type': 'BDC',
                        'product': product_name,
                        'data_quality_score': 1.0,
                        'is_outlier': False
                    }
                    
                    records.append(record)
                    self.stats['companies_found'].add(company_name)
                    self.stats['products_found'].add(product_name)
            
            logger.info(f"  {sheet_name}: {len(records)} records extracted")
            return records
            
        except Exception as e:
            error_msg = f"Error extracting {sheet_name}: {str(e)}"
            logger.error(error_msg)
            self.stats['errors'].append(error_msg)
            return []
    
    def extract_file(self, file_path):
        """Extract data from a single file"""
        logger.info(f"Processing file: {os.path.basename(file_path)}")
        
        year = self.extract_year_from_filename(os.path.basename(file_path))
        if not year:
            logger.error(f"Could not extract year from filename: {file_path}")
            return
        
        try:
            # Get all sheet names
            excel_file = pd.ExcelFile(file_path)
            sheets = excel_file.sheet_names
            
            logger.info(f"  Found {len(sheets)} sheets")
            
            file_records = []
            
            for sheet_name in sheets:
                records = self.extract_sheet_data(file_path, sheet_name, year)
                file_records.extend(records)
                self.stats['sheets_processed'] += 1
            
            self.results.extend(file_records)
            self.stats['records_extracted'] += len(file_records)
            self.stats['files_processed'] += 1
            
            logger.info(f"  Total records from file: {len(file_records)}")
            
        except Exception as e:
            error_msg = f"Error processing file {file_path}: {str(e)}"
            logger.error(error_msg)
            self.stats['errors'].append(error_msg)
    
    def extract_all(self, directory_path):
        """Extract data from all files in directory"""
        logger.info("Starting BDC extraction from cleaned files")
        logger.info("=" * 60)
        
        # Get all Excel files
        files = []
        for filename in os.listdir(directory_path):
            if filename.endswith('.xlsx') and 'BIDEC-Performance' in filename:
                files.append(os.path.join(directory_path, filename))
        
        files.sort()  # Process in chronological order
        
        logger.info(f"Found {len(files)} BDC files to process")
        
        for file_path in files:
            self.extract_file(file_path)
        
        # Generate summary
        self.print_summary()
        
        return self.results
    
    def print_summary(self):
        """Print extraction summary"""
        logger.info("\n" + "=" * 60)
        logger.info("BDC EXTRACTION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Files processed: {self.stats['files_processed']}")
        logger.info(f"Sheets processed: {self.stats['sheets_processed']}")
        logger.info(f"Records extracted: {self.stats['records_extracted']:,}")
        logger.info(f"Unique companies: {len(self.stats['companies_found'])}")
        logger.info(f"Unique products: {len(self.stats['products_found'])}")
        
        if self.stats['errors']:
            logger.warning(f"Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats['errors']:
                logger.warning(f"  {error}")
        
        logger.info("\nCompanies found:")
        for company in sorted(list(self.stats['companies_found']))[:10]:
            logger.info(f"  {company}")
        if len(self.stats['companies_found']) > 10:
            logger.info(f"  ... and {len(self.stats['companies_found']) - 10} more")
        
        logger.info("\nProducts found:")
        for product in sorted(list(self.stats['products_found'])):
            logger.info(f"  {product}")

def main():
    """Main extraction function"""
    directory = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\raw\Raw_Organised"
    
    extractor = CleanedBDCExtractor()
    results = extractor.extract_all(directory)
    
    if results:
        # Save to CSV
        df = pd.DataFrame(results)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f'CLEANED_BDC_data_{timestamp}.csv'
        df.to_csv(output_file, index=False)
        
        logger.info(f"\nData saved to: {output_file}")
        logger.info(f"Total records: {len(df):,}")
        
        # Show data verification
        logger.info("\nDATA VERIFICATION:")
        logger.info(f"Year range: {df['year'].min()} - {df['year'].max()}")
        logger.info(f"Companies: {df['company_name'].nunique()}")
        logger.info(f"Products: {df['product'].nunique()}")
        
        return output_file
    else:
        logger.error("No data extracted!")
        return None

if __name__ == "__main__":
    main()