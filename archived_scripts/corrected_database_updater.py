"""
CORRECTED Database Updater
Properly imports all unique companies without aggressive fuzzy matching
Only standardizes products, keeps all companies unique
"""

import pandas as pd
import psycopg2
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'corrected_database_update_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CorrectedDatabaseUpdater:
    """Corrected updater that preserves all unique companies"""
    
    def __init__(self):
        self.db_config = {
            "host": "localhost",
            "port": 5432,
            "database": "petroverse_analytics",
            "user": "postgres",
            "password": "postgres"
        }
        self.conn = None
        self.product_mappings = {
            # Only standardize products, not companies
            'GASOLINE': 'Gasoline',
            'GASOLINE (PREMIUM)': 'Gasoline', 
            'PREMIUM GASOLINE': 'Gasoline',
            'REGULAR GASOLINE': 'Gasoline',
            'GASOIL': 'Gasoil',
            'GAS OIL': 'Gasoil',
            'AUTOMOTIVE GAS OIL (DIESEL)': 'Gasoil',
            'DIESEL': 'Gasoil',
            'LPG': 'LPG',
            'LIQUEFIED PETROLEUM GAS (LPG)': 'LPG',
            'LPG-BUTANE': 'LPG',
            'LPG-CRM': 'LPG',
            'KEROSENE': 'Kerosene',
            'ATK': 'Aviation Turbine Kerosene',
            'AVIATION TURBINE KEROSENE': 'Aviation Turbine Kerosene',
            'PREMIX': 'Premix',
            'HFO': 'Heavy Fuel Oil',
            'HEAVY FUEL OIL': 'Heavy Fuel Oil',
            'RFO': 'Heavy Fuel Oil',
            'FUEL OIL': 'Heavy Fuel Oil',
            'FUEL  OIL (INDUSTRIAL)': 'Heavy Fuel Oil',
            'FUEL  OIL (POWER PLANTS)': 'Heavy Fuel Oil',
            'MGO': 'Marine Gas Oil',
            'MARINE GAS OIL': 'Marine Gas Oil',
            'NAPHTHA': 'Naphtha',
            'NAPHTHA (UNIFIED)': 'Naphtha'
        }
        
    def connect_to_database(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.conn.autocommit = False
            logger.info("Connected to database successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def standardize_product_name(self, product_name):
        """Standardize product name only"""
        product_upper = str(product_name).upper().strip()
        
        # Direct mapping
        if product_upper in self.product_mappings:
            return self.product_mappings[product_upper]
        
        # Pattern matching for variations
        for pattern, standard in self.product_mappings.items():
            if pattern in product_upper or product_upper in pattern:
                return standard
        
        # If no mapping found, clean the name but keep it
        clean_name = product_name.strip()
        if clean_name and clean_name not in ['No', 'Unnamed', 'nan', 'NaN']:
            return clean_name.title()
        
        return None
    
    def clean_company_name(self, company_name):
        """Clean company name but keep it unique"""
        clean_name = str(company_name).strip()
        
        # Remove obvious bad entries
        if clean_name.upper() in ['COMPANY', 'TOTAL', 'GRAND', 'SUM', 'NO', 'NAN', 'UNNAMED']:
            return None
        
        # Remove leading/trailing special characters
        clean_name = clean_name.strip('*')
        
        if len(clean_name) < 2:
            return None
            
        return clean_name
    
    def clear_all_data(self):
        """Clear all existing data"""
        logger.info("Clearing all existing data...")
        
        cursor = self.conn.cursor()
        
        # Clear fact tables first (foreign key constraints)
        cursor.execute("DELETE FROM petroverse.fact_omc_transactions")
        cursor.execute("DELETE FROM petroverse.fact_bdc_transactions")
        
        # Clear data tables
        cursor.execute("DELETE FROM petroverse.omc_data")
        cursor.execute("DELETE FROM petroverse.bdc_data")
        
        # Clear and rebuild companies table
        cursor.execute("DELETE FROM petroverse.companies")
        
        self.conn.commit()
        cursor.close()
        logger.info("All existing data cleared")
    
    def import_all_companies(self, omc_data, bdc_data):
        """Import all unique companies from both datasets"""
        logger.info("Importing all unique companies...")
        
        cursor = self.conn.cursor()
        
        # Get all unique companies from OMC data
        omc_companies = set()
        for company_name in omc_data['company_name'].unique():
            clean_name = self.clean_company_name(company_name)
            if clean_name:
                omc_companies.add((clean_name, 'OMC'))
        
        # Get all unique companies from BDC data  
        bdc_companies = set()
        for company_name in bdc_data['company_name'].unique():
            clean_name = self.clean_company_name(company_name)
            if clean_name:
                bdc_companies.add((clean_name, 'BDC'))
        
        # Combine all companies
        all_companies = list(omc_companies | bdc_companies)
        
        logger.info(f"Found {len(omc_companies)} unique OMC companies")
        logger.info(f"Found {len(bdc_companies)} unique BDC companies")
        logger.info(f"Total unique companies to import: {len(all_companies)}")
        
        # Insert all companies
        for company_name, company_type in all_companies:
            cursor.execute("""
                INSERT INTO petroverse.companies (company_name, company_type, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (company_name) DO NOTHING
            """, (company_name, company_type, datetime.now()))
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"Imported {len(all_companies)} unique companies")
        return len(all_companies)
    
    def import_dataset(self, data, data_type):
        """Import a dataset (OMC or BDC) with proper standardization"""
        logger.info(f"Importing {data_type} dataset...")
        
        cursor = self.conn.cursor()
        
        # Prepare records
        import_records = []
        skipped_records = 0
        
        for _, row in data.iterrows():
            # Clean company name
            company_name = self.clean_company_name(row['company_name'])
            if not company_name:
                skipped_records += 1
                continue
            
            # Standardize product name
            product_name = self.standardize_product_name(row['product'])
            if not product_name:
                skipped_records += 1
                continue
            
            # Prepare record
            record = {
                'source_file': row.get('source_file', ''),
                'sheet_name': row.get('sheet_name', ''),
                'year': int(row['year']),
                'month': int(row['month']),
                'company_name': company_name,  # Keep original cleaned name
                'product': product_name,       # Use standardized product name
                'product_original_name': row.get('product_original_name', row['product']),
                'unit_type': row['unit_type'],
                'volume': float(row['volume']),
                'volume_liters': float(row['volume_liters']),
                'volume_kg': float(row['volume_kg']),
                'volume_mt': float(row['volume_mt']),
                'company_type': data_type,
                'data_quality_score': float(row.get('data_quality_score', 1.0)),
                'is_outlier': bool(row.get('is_outlier', False))
            }
            
            import_records.append(record)
        
        logger.info(f"Prepared {len(import_records)} records for {data_type} import")
        logger.info(f"Skipped {skipped_records} invalid records")
        
        # Import to database
        if data_type == 'OMC':
            table_name = 'petroverse.omc_data'
        else:
            table_name = 'petroverse.bdc_data'
        
        insert_query = f"""
            INSERT INTO {table_name} (
                source_file, sheet_name, year, month, company_name, product,
                product_original_name, unit_type, volume, volume_liters, 
                volume_kg, volume_mt, company_type, data_quality_score, is_outlier,
                created_at
            ) VALUES (
                %(source_file)s, %(sheet_name)s, %(year)s, %(month)s, %(company_name)s, 
                %(product)s, %(product_original_name)s, %(unit_type)s, %(volume)s, 
                %(volume_liters)s, %(volume_kg)s, %(volume_mt)s, %(company_type)s, 
                %(data_quality_score)s, %(is_outlier)s, NOW()
            )
        """
        
        cursor.executemany(insert_query, import_records)
        inserted_count = cursor.rowcount
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"Inserted {inserted_count} {data_type} records")
        return inserted_count
    
    def validate_import(self):
        """Validate the final import"""
        logger.info("Validating final import...")
        
        cursor = self.conn.cursor()
        
        # Check OMC data
        cursor.execute("""
            SELECT COUNT(*) as records, COUNT(DISTINCT company_name) as companies, 
                   COUNT(DISTINCT product) as products, MIN(year) as min_year, 
                   MAX(year) as max_year, SUM(volume_liters) as total_volume
            FROM petroverse.omc_data
        """)
        omc_stats = cursor.fetchone()
        
        # Check BDC data
        cursor.execute("""
            SELECT COUNT(*) as records, COUNT(DISTINCT company_name) as companies, 
                   COUNT(DISTINCT product) as products, MIN(year) as min_year, 
                   MAX(year) as max_year, SUM(volume_liters) as total_volume
            FROM petroverse.bdc_data
        """)
        bdc_stats = cursor.fetchone()
        
        # Check companies table
        cursor.execute("""
            SELECT COUNT(*) as total_companies,
                   SUM(CASE WHEN company_type = 'OMC' THEN 1 ELSE 0 END) as omc_companies,
                   SUM(CASE WHEN company_type = 'BDC' THEN 1 ELSE 0 END) as bdc_companies
            FROM petroverse.companies
        """)
        company_stats = cursor.fetchone()
        
        cursor.close()
        
        logger.info("\n" + "=" * 80)
        logger.info("CORRECTED IMPORT VALIDATION RESULTS")
        logger.info("=" * 80)
        
        logger.info("OMC DATA:")
        logger.info(f"  Records: {omc_stats[0]:,}")
        logger.info(f"  Companies: {omc_stats[1]:,}")
        logger.info(f"  Products: {omc_stats[2]:,}")
        logger.info(f"  Years: {omc_stats[3]}-{omc_stats[4]}")
        logger.info(f"  Volume: {omc_stats[5]:,.0f} liters")
        
        logger.info("\nBDC DATA:")
        logger.info(f"  Records: {bdc_stats[0]:,}")
        logger.info(f"  Companies: {bdc_stats[1]:,}")
        logger.info(f"  Products: {bdc_stats[2]:,}")
        logger.info(f"  Years: {bdc_stats[3]}-{bdc_stats[4]}")
        logger.info(f"  Volume: {bdc_stats[5]:,.0f} liters")
        
        logger.info("\nCOMPANIES:")
        logger.info(f"  Total: {company_stats[0]:,}")
        logger.info(f"  OMC: {company_stats[1]:,}")
        logger.info(f"  BDC: {company_stats[2]:,}")
        
        return {
            'omc': omc_stats,
            'bdc': bdc_stats,
            'companies': company_stats
        }
    
    def run_corrected_import(self):
        """Run the corrected import process"""
        logger.info("=" * 80)
        logger.info("CORRECTED DATABASE IMPORT - PRESERVING ALL COMPANIES")
        logger.info("=" * 80)
        
        try:
            # Connect to database
            self.connect_to_database()
            
            # Load extracted data
            logger.info("Loading corrected extracted data...")
            omc_data = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
            bdc_data = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
            
            logger.info(f"Loaded OMC data: {len(omc_data):,} records")
            logger.info(f"Loaded BDC data: {len(bdc_data):,} records")
            
            # Clear existing data
            self.clear_all_data()
            
            # Import all unique companies
            total_companies = self.import_all_companies(omc_data, bdc_data)
            
            # Import OMC data
            omc_imported = self.import_dataset(omc_data, 'OMC')
            
            # Import BDC data
            bdc_imported = self.import_dataset(bdc_data, 'BDC')
            
            # Validate import
            validation = self.validate_import()
            
            logger.info("\n" + "=" * 80)
            logger.info("CORRECTED IMPORT COMPLETED SUCCESSFULLY!")
            logger.info("=" * 80)
            logger.info(f"Companies imported: {total_companies:,}")
            logger.info(f"OMC records imported: {omc_imported:,}")
            logger.info(f"BDC records imported: {bdc_imported:,}")
            logger.info(f"Total records: {omc_imported + bdc_imported:,}")
            
            return True
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            if self.conn:
                self.conn.rollback()
            raise
        finally:
            if self.conn:
                self.conn.close()

def main():
    """Main execution"""
    updater = CorrectedDatabaseUpdater()
    
    print("CORRECTED DATABASE IMPORT")
    print("=" * 60)
    print("This will:")
    print("1. Clear all existing data")
    print("2. Import ALL unique companies (no aggressive fuzzy matching)")
    print("3. Standardize products only")
    print("4. Preserve all company uniqueness")
    
    confirm = input("\nProceed with corrected import? (yes/no): ")
    
    if confirm.lower() == 'yes':
        try:
            updater.run_corrected_import()
            print("\nSUCCESS! All companies now properly imported.")
        except Exception as e:
            print(f"\nFAILED: {e}")
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    main()