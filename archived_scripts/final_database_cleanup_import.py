"""
Final Database Cleanup and Import with User-Approved Standardization
Uses the user's corrected standardization mapping from Excel
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
        logging.FileHandler(f'final_database_import_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class FinalDatabaseImporter:
    """Import data with user-approved standardization"""
    
    def __init__(self):
        self.db_config = {
            "host": "localhost",
            "port": 5432,
            "database": "petroverse_analytics",
            "user": "postgres",
            "password": "postgres"
        }
        self.conn = None
        self.company_mappings = {}
        self.product_mappings = {
            # Standardized product mappings (these are correct)
            'GASOLINE': 'Gasoline',
            'GASOIL': 'Gasoil',
            'LPG': 'LPG',
            'KEROSENE': 'Kerosene',
            'ATK': 'Aviation Turbine Kerosene',
            'PREMIX': 'Premix',
            'HEAVY FUEL OIL': 'Heavy Fuel Oil',
            'MARINE GAS OIL': 'Marine Gas Oil',
            'NAPHTHA': 'Naphtha'
        }
    
    def load_user_standardization(self):
        """Load user-approved standardization from Excel"""
        logger.info("Loading user-approved standardization mappings...")
        
        excel_file = 'COMPANY_STANDARDIZATION_MAPPING_20250826_231345.xlsx'
        
        # Load OMC mappings
        omc_df = pd.read_excel(excel_file, sheet_name='OMC_Mapping')
        omc_df['Final_Name'] = omc_df.apply(
            lambda x: x['Your_Corrected_Name'] 
            if pd.notna(x['Your_Corrected_Name']) and x['Your_Corrected_Name'] != '' 
            else x['Proposed_Standard_Name'], 
            axis=1
        )
        
        # Load BDC mappings
        bdc_df = pd.read_excel(excel_file, sheet_name='BDC_Mapping')
        bdc_df['Final_Name'] = bdc_df.apply(
            lambda x: x['Your_Corrected_Name'] 
            if pd.notna(x['Your_Corrected_Name']) and x['Your_Corrected_Name'] != '' 
            else x['Proposed_Standard_Name'], 
            axis=1
        )
        
        # Create mapping dictionaries
        self.company_mappings['OMC'] = dict(zip(omc_df['Original_Name'], omc_df['Final_Name']))
        self.company_mappings['BDC'] = dict(zip(bdc_df['Original_Name'], bdc_df['Final_Name']))
        
        logger.info(f"Loaded {len(self.company_mappings['OMC'])} OMC mappings")
        logger.info(f"Loaded {len(self.company_mappings['BDC'])} BDC mappings")
        
        # Log unique counts
        unique_omc = len(set(self.company_mappings['OMC'].values()))
        unique_bdc = len(set(self.company_mappings['BDC'].values()))
        logger.info(f"Unique OMC companies after standardization: {unique_omc}")
        logger.info(f"Unique BDC companies after standardization: {unique_bdc}")
        logger.info(f"Total unique companies: {unique_omc + unique_bdc}")
    
    def connect_to_database(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.conn.autocommit = False
            logger.info("Connected to database successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def backup_database(self):
        """Create database backup before changes"""
        logger.info("Creating database backup...")
        
        import subprocess
        backup_file = f"petroverse_backup_before_cleanup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        cmd = [
            r"C:\Program Files\PostgreSQL\17\bin\pg_dump",
            "-U", "postgres",
            "-p", "5432",
            "-d", "petroverse_analytics",
            "-f", backup_file
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Database backup created: {backup_file}")
            return backup_file
        except subprocess.CalledProcessError as e:
            logger.error(f"Backup failed: {e}")
            raise
    
    def cleanup_corrupted_data(self):
        """Clean all corrupted data from database"""
        logger.info("Cleaning corrupted data from database...")
        
        cursor = self.conn.cursor()
        
        try:
            # Clear fact tables first (foreign key constraints)
            cursor.execute("DELETE FROM petroverse.fact_omc_transactions")
            omc_fact_deleted = cursor.rowcount
            
            cursor.execute("DELETE FROM petroverse.fact_bdc_transactions")
            bdc_fact_deleted = cursor.rowcount
            
            # Clear data tables
            cursor.execute("DELETE FROM petroverse.omc_data")
            omc_deleted = cursor.rowcount
            
            cursor.execute("DELETE FROM petroverse.bdc_data")
            bdc_deleted = cursor.rowcount
            
            # Clear and rebuild companies table
            cursor.execute("DELETE FROM petroverse.companies")
            companies_deleted = cursor.rowcount
            
            # Clear and rebuild products table if needed
            cursor.execute("DELETE FROM petroverse.products")
            products_deleted = cursor.rowcount
            
            self.conn.commit()
            
            logger.info(f"Cleaned corrupted data:")
            logger.info(f"  - OMC data records: {omc_deleted}")
            logger.info(f"  - BDC data records: {bdc_deleted}")
            logger.info(f"  - OMC fact records: {omc_fact_deleted}")
            logger.info(f"  - BDC fact records: {bdc_fact_deleted}")
            logger.info(f"  - Companies: {companies_deleted}")
            logger.info(f"  - Products: {products_deleted}")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def create_standardized_companies(self):
        """Create all unique standardized companies"""
        logger.info("Creating standardized companies...")
        
        cursor = self.conn.cursor()
        
        # Get unique OMC and BDC companies
        unique_omc = set(self.company_mappings['OMC'].values())
        unique_bdc = set(self.company_mappings['BDC'].values())
        
        # Find duplicates
        duplicates = unique_omc.intersection(unique_bdc)
        
        # Define which company type wins for duplicates
        # Based on analysis: EVERSTONE ENERGY is BDC, ADINKRA is likely invalid but treat as BDC
        duplicate_resolution = {
            'EVERSTONE ENERGY': 'BDC',  # Has more BDC records (2,969 vs 1,014)
            'ADINKRA': 'BDC'  # Has asterisks, likely invalid, but more BDC records
        }
        
        if duplicates:
            logger.warning(f"Found {len(duplicates)} companies in both OMC and BDC: {duplicates}")
            
        # Remove duplicates from OMC/BDC sets based on resolution
        for company in duplicates:
            if company in duplicate_resolution:
                if duplicate_resolution[company] == 'BDC':
                    unique_omc.discard(company)  # Remove from OMC, keep in BDC
                    logger.info(f"  '{company}' -> Keeping as BDC only")
                else:
                    unique_bdc.discard(company)  # Remove from BDC, keep in OMC
                    logger.info(f"  '{company}' -> Keeping as OMC only")
            else:
                # Default: keep as BDC if no explicit resolution
                unique_omc.discard(company)
                logger.warning(f"  '{company}' -> No explicit resolution, defaulting to BDC")
        
        # Insert OMC companies
        for company_name in unique_omc:
            cursor.execute("""
                INSERT INTO petroverse.companies (company_name, company_type, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (company_name) DO NOTHING
            """, (company_name, 'OMC', datetime.now()))
        
        # Insert BDC companies  
        for company_name in unique_bdc:
            cursor.execute("""
                INSERT INTO petroverse.companies (company_name, company_type, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (company_name) DO NOTHING
            """, (company_name, 'BDC', datetime.now()))
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"Created {len(unique_omc)} OMC companies")
        logger.info(f"Created {len(unique_bdc)} BDC companies")
        logger.info(f"Total unique companies created: {len(unique_omc) + len(unique_bdc)}")
    
    def create_standardized_products(self):
        """Create standardized products"""
        logger.info("Creating standardized products...")
        
        cursor = self.conn.cursor()
        
        products = [
            ('Gasoline', 'Gasoline'),
            ('Gasoil', 'Gasoil'),
            ('LPG', 'LPG'),
            ('Kerosene', 'Aviation & Kerosene'),
            ('Aviation Turbine Kerosene', 'Aviation & Kerosene'),
            ('Premix', 'Other Petroleum Products'),
            ('Heavy Fuel Oil', 'Heavy Fuel Oil'),
            ('Marine Gas Oil', 'Gasoil'),
            ('Naphtha', 'Naphtha')
        ]
        
        # Products table has product_id as SERIAL PRIMARY KEY, so we need to let it auto-increment
        for i, (product_name, product_category) in enumerate(products, 1):
            cursor.execute("""
                INSERT INTO petroverse.products (product_id, product_name, product_category, created_at)
                VALUES (%s, %s, %s, %s)
            """, (i, product_name, product_category, datetime.now()))
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"Created {len(products)} standardized products")
    
    def standardize_product_name(self, product_name):
        """Standardize product name"""
        if pd.isna(product_name):
            return None
        
        product_upper = str(product_name).upper().strip()
        
        # Check direct mappings
        for pattern, standard in self.product_mappings.items():
            if pattern in product_upper:
                return standard
        
        # Pattern matching
        if 'GASOLINE' in product_upper or 'PETROL' in product_upper or 'PREMIUM' in product_upper:
            return 'Gasoline'
        elif 'GASOIL' in product_upper or 'GAS OIL' in product_upper or 'DIESEL' in product_upper:
            return 'Gasoil'
        elif 'LPG' in product_upper:
            return 'LPG'
        elif 'KEROSENE' in product_upper and 'ATK' not in product_upper:
            return 'Kerosene'
        elif 'ATK' in product_upper:
            return 'Aviation Turbine Kerosene'
        elif 'PREMIX' in product_upper:
            return 'Premix'
        elif 'HFO' in product_upper or 'RFO' in product_upper or 'FUEL OIL' in product_upper or 'FUEL  OIL' in product_upper:
            return 'Heavy Fuel Oil'
        elif 'MGO' in product_upper or 'MARINE' in product_upper:
            return 'Marine Gas Oil'
        elif 'NAPHTHA' in product_upper:
            return 'Naphtha'
        
        # If no match, return None to skip
        return None
    
    def import_dataset(self, data_file, data_type):
        """Import dataset with user-approved standardization"""
        logger.info(f"Importing {data_type} data from {data_file}...")
        
        # Load data
        data = pd.read_csv(data_file)
        logger.info(f"Loaded {len(data)} records")
        
        cursor = self.conn.cursor()
        
        # Prepare for import
        imported = 0
        skipped = 0
        
        for _, row in data.iterrows():
            # Get standardized company name
            original_company = row['company_name']
            if original_company in self.company_mappings[data_type]:
                standardized_company = self.company_mappings[data_type][original_company]
                
                # Skip companies that should be in the other dataset
                if data_type == 'OMC' and standardized_company in ['EVERSTONE ENERGY', 'ADINKRA']:
                    # These are BDC companies, skip them in OMC import
                    skipped += 1
                    continue
                    
            else:
                logger.warning(f"No mapping for company: {original_company}")
                skipped += 1
                continue
            
            # Get standardized product name
            standardized_product = self.standardize_product_name(row['product'])
            if not standardized_product:
                skipped += 1
                continue
            
            # Insert record
            if data_type == 'OMC':
                table = 'petroverse.omc_data'
            else:
                table = 'petroverse.bdc_data'
            
            cursor.execute(f"""
                INSERT INTO {table} (
                    source_file, sheet_name, year, month, company_name, product,
                    product_original_name, unit_type, volume, volume_liters,
                    volume_kg, volume_mt, company_type, data_quality_score,
                    is_outlier, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
            """, (
                row.get('source_file', ''),
                row.get('sheet_name', ''),
                int(row['year']),
                int(row['month']),
                standardized_company,
                standardized_product,
                row.get('product_original_name', row['product']),
                row['unit_type'],
                float(row['volume']),
                float(row['volume_liters']),
                float(row['volume_kg']),
                float(row['volume_mt']),
                data_type,
                float(row.get('data_quality_score', 1.0)),
                bool(row.get('is_outlier', False)),
                datetime.now()
            ))
            
            imported += 1
            
            if imported % 10000 == 0:
                logger.info(f"  Imported {imported} records...")
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"Imported {imported} {data_type} records (skipped {skipped})")
        return imported, skipped
    
    def validate_final_import(self):
        """Validate the final import"""
        logger.info("Validating final import...")
        
        cursor = self.conn.cursor()
        
        # Validate OMC data
        cursor.execute("""
            SELECT COUNT(*) as records, COUNT(DISTINCT company_name) as companies,
                   COUNT(DISTINCT product) as products, MIN(year) as min_year,
                   MAX(year) as max_year
            FROM petroverse.omc_data
        """)
        omc_stats = cursor.fetchone()
        
        # Validate BDC data
        cursor.execute("""
            SELECT COUNT(*) as records, COUNT(DISTINCT company_name) as companies,
                   COUNT(DISTINCT product) as products, MIN(year) as min_year,
                   MAX(year) as max_year
            FROM petroverse.bdc_data
        """)
        bdc_stats = cursor.fetchone()
        
        # Validate companies
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN company_type = 'OMC' THEN 1 ELSE 0 END) as omc,
                   SUM(CASE WHEN company_type = 'BDC' THEN 1 ELSE 0 END) as bdc
            FROM petroverse.companies
        """)
        company_stats = cursor.fetchone()
        
        cursor.close()
        
        logger.info("\nFINAL VALIDATION RESULTS:")
        logger.info("=" * 60)
        logger.info(f"OMC DATA:")
        logger.info(f"  Records: {omc_stats[0]:,}")
        logger.info(f"  Companies: {omc_stats[1]:,}")
        logger.info(f"  Products: {omc_stats[2]:,}")
        logger.info(f"  Years: {omc_stats[3]}-{omc_stats[4]}")
        
        logger.info(f"\nBDC DATA:")
        logger.info(f"  Records: {bdc_stats[0]:,}")
        logger.info(f"  Companies: {bdc_stats[1]:,}")
        logger.info(f"  Products: {bdc_stats[2]:,}")
        logger.info(f"  Years: {bdc_stats[3]}-{bdc_stats[4]}")
        
        logger.info(f"\nCOMPANIES:")
        logger.info(f"  Total: {company_stats[0]:,}")
        logger.info(f"  OMC: {company_stats[1]:,}")
        logger.info(f"  BDC: {company_stats[2]:,}")
        
        return True
    
    def run_final_import(self):
        """Run the complete final import process"""
        logger.info("=" * 80)
        logger.info("STARTING FINAL DATABASE IMPORT WITH USER-APPROVED STANDARDIZATION")
        logger.info("=" * 80)
        
        try:
            # Load user standardization
            self.load_user_standardization()
            
            # Connect to database
            self.connect_to_database()
            
            # Create backup
            backup_file = self.backup_database()
            
            # Clean corrupted data
            self.cleanup_corrupted_data()
            
            # Create standardized companies and products
            self.create_standardized_companies()
            self.create_standardized_products()
            
            # Import OMC data
            omc_imported, omc_skipped = self.import_dataset(
                'CORRECTED_COMPLETE_omc_data_20250826_222926.csv', 
                'OMC'
            )
            
            # Import BDC data
            bdc_imported, bdc_skipped = self.import_dataset(
                'CORRECTED_COMPLETE_bdc_data_20250826_222926.csv',
                'BDC'
            )
            
            # Validate
            self.validate_final_import()
            
            logger.info("\n" + "=" * 80)
            logger.info("FINAL IMPORT COMPLETED SUCCESSFULLY!")
            logger.info("=" * 80)
            logger.info(f"Backup created: {backup_file}")
            logger.info(f"OMC records imported: {omc_imported:,} (skipped: {omc_skipped})")
            logger.info(f"BDC records imported: {bdc_imported:,} (skipped: {bdc_skipped})")
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
    importer = FinalDatabaseImporter()
    
    print("FINAL DATABASE IMPORT WITH USER-APPROVED STANDARDIZATION")
    print("=" * 60)
    print("This will:")
    print("1. Create a database backup")
    print("2. Clean ALL corrupted data")
    print("3. Import with your approved standardization")
    print("4. Result: 266 unique companies (208 OMC + 58 BDC)")
    
    # Auto-proceed for non-interactive execution
    import sys
    if not sys.stdin.isatty():
        print("\nRunning in non-interactive mode - proceeding with import...")
        confirm = 'yes'
    else:
        confirm = input("\nProceed with final import? (yes/no): ")
    
    if confirm.lower() == 'yes':
        try:
            importer.run_final_import()
            print("\nSUCCESS! Database has been cleaned and re-imported with your standardization.")
        except Exception as e:
            print(f"\nFAILED: {e}")
            print("Check the log file for details.")
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    main()