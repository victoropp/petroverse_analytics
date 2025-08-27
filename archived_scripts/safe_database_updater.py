"""
Safe Database Updater
Imports complete extracted data with proper standardization and deduplication
Uses existing standardized companies and products from database
"""

import pandas as pd
import psycopg2
from datetime import datetime
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'database_update_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SafeDatabaseUpdater:
    """Safely update database with complete extracted data"""
    
    def __init__(self):
        self.db_config = {
            "host": "localhost",
            "port": 5432,
            "database": "petroverse_analytics",
            "user": "postgres",
            "password": "postgres"
        }
        self.conn = None
        self.standardized_mappings = {}
        
    def connect_to_database(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.conn.autocommit = False
            logger.info("Connected to database successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def create_database_backup(self):
        """Create full database backup before any changes"""
        logger.info("Creating database backup...")
        
        backup_file = f"petroverse_analytics_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        import subprocess
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
    
    def load_standardized_mappings(self):
        """Load existing standardized companies and products from database"""
        logger.info("Loading standardized company and product mappings...")
        
        cursor = self.conn.cursor()
        
        # Load standardized companies
        cursor.execute("""
            SELECT company_id, company_name, company_type 
            FROM petroverse.companies 
            ORDER BY company_name
        """)
        
        companies = cursor.fetchall()
        self.standardized_mappings['companies'] = {}
        
        for company_id, company_name, company_type in companies:
            # Create mapping for exact matches and variations
            key = f"{company_name.upper()}_{company_type.upper()}"
            self.standardized_mappings['companies'][key] = {
                'id': company_id,
                'name': company_name,
                'type': company_type
            }
        
        logger.info(f"Loaded {len(companies)} standardized companies")
        
        # Load standardized products
        cursor.execute("""
            SELECT product_id, product_name, product_category 
            FROM petroverse.products 
            ORDER BY product_name
        """)
        
        products = cursor.fetchall()
        self.standardized_mappings['products'] = {}
        
        for product_id, product_name, product_category in products:
            self.standardized_mappings['products'][product_name.upper()] = {
                'id': product_id,
                'name': product_name,
                'category': product_category
            }
        
        logger.info(f"Loaded {len(products)} standardized products")
        
        cursor.close()
    
    def map_company_to_standardized(self, company_name, company_type):
        """Map extracted company to standardized database company"""
        # Try exact match first
        key = f"{company_name.upper()}_{company_type.upper()}"
        if key in self.standardized_mappings['companies']:
            return self.standardized_mappings['companies'][key]
        
        # Try fuzzy matching for similar company names
        company_upper = company_name.upper()
        
        # Check for partial matches within same company type
        for std_key, std_company in self.standardized_mappings['companies'].items():
            if std_company['type'].upper() == company_type.upper():
                std_name = std_company['name'].upper()
                
                # Check if names are similar (basic similarity)
                if (company_upper in std_name or std_name in company_upper or
                    self.company_names_similar(company_upper, std_name)):
                    logger.warning(f"Fuzzy match: '{company_name}' -> '{std_company['name']}'")
                    return std_company
        
        # No match found - will need to create new company
        logger.warning(f"No standardized mapping found for: {company_name} ({company_type})")
        return None
    
    def company_names_similar(self, name1, name2):
        """Basic company name similarity check"""
        # Remove common business suffixes and prefixes
        suffixes = ['LIMITED', 'LTD', 'COMPANY', 'CO', 'GHANA', 'GH']
        
        clean1 = name1
        clean2 = name2
        
        for suffix in suffixes:
            clean1 = clean1.replace(suffix, '').strip()
            clean2 = clean2.replace(suffix, '').strip()
        
        # Check if core names are similar
        if len(clean1) > 3 and len(clean2) > 3:
            return (clean1 in clean2 or clean2 in clean1 or
                   abs(len(clean1) - len(clean2)) <= 2)
        
        return False
    
    def map_product_to_standardized(self, product_name):
        """Map extracted product to standardized database product"""
        product_upper = product_name.upper()
        
        if product_upper in self.standardized_mappings['products']:
            return self.standardized_mappings['products'][product_upper]
        
        logger.warning(f"No standardized mapping found for product: {product_name}")
        return None
    
    def create_missing_companies(self, extracted_data, data_type):
        """Create any missing companies that don't exist in standardized list"""
        logger.info(f"Checking for missing {data_type} companies...")
        
        cursor = self.conn.cursor()
        
        # Get unique companies from extracted data
        unique_companies = extracted_data[['company_name', 'company_type']].drop_duplicates()
        
        missing_companies = []
        
        for _, row in unique_companies.iterrows():
            company_name = row['company_name']
            company_type = row['company_type']
            
            mapped = self.map_company_to_standardized(company_name, company_type)
            
            if mapped is None:
                missing_companies.append({
                    'name': company_name,
                    'type': company_type
                })
        
        if missing_companies:
            logger.info(f"Found {len(missing_companies)} missing companies to create")
            
            for company in missing_companies:
                # Insert new company
                cursor.execute("""
                    INSERT INTO petroverse.companies (company_name, company_type, created_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (company_name) DO NOTHING
                    RETURNING company_id
                """, (company['name'], company['type'], datetime.now()))
                
                result = cursor.fetchone()
                if result:
                    company_id = result[0]
                    logger.info(f"Created new company: {company['name']} (ID: {company_id})")
                    
                    # Update our mapping
                    key = f"{company['name'].upper()}_{company['type'].upper()}"
                    self.standardized_mappings['companies'][key] = {
                        'id': company_id,
                        'name': company['name'],
                        'type': company['type']
                    }
        
        self.conn.commit()
    
    def clear_existing_data(self, data_type):
        """Clear existing data for re-import"""
        logger.info(f"Clearing existing {data_type} data...")
        
        cursor = self.conn.cursor()
        
        if data_type == 'OMC':
            cursor.execute("DELETE FROM petroverse.omc_data")
            cursor.execute("DELETE FROM petroverse.fact_omc_transactions")
        elif data_type == 'BDC':
            cursor.execute("DELETE FROM petroverse.bdc_data")  
            cursor.execute("DELETE FROM petroverse.fact_bdc_transactions")
        
        deleted_count = cursor.rowcount
        logger.info(f"Deleted {deleted_count} existing {data_type} records")
        
        self.conn.commit()
        cursor.close()
    
    def import_data_to_database(self, extracted_data, data_type):
        """Import extracted data to database with proper standardization"""
        logger.info(f"Importing {data_type} data to database...")
        
        cursor = self.conn.cursor()
        
        # Prepare data with proper mappings
        import_records = []
        mapping_errors = []
        
        for _, row in extracted_data.iterrows():
            # Map company
            company_mapping = self.map_company_to_standardized(
                row['company_name'], 
                row['company_type']
            )
            
            if company_mapping is None:
                mapping_errors.append(f"No company mapping: {row['company_name']}")
                continue
            
            # Map product
            product_mapping = self.map_product_to_standardized(row['product'])
            
            if product_mapping is None:
                mapping_errors.append(f"No product mapping: {row['product']}")
                continue
            
            # Prepare record for insertion
            record = {
                'source_file': row.get('source_file', ''),
                'sheet_name': row.get('sheet_name', ''),
                'year': int(row['year']),
                'month': int(row['month']),
                'company_name': company_mapping['name'],  # Use standardized name
                'product': product_mapping['name'],       # Use standardized name
                'product_original_name': row.get('product_original_name', row['product']),
                'unit_type': row['unit_type'],
                'volume': float(row['volume']),
                'volume_liters': float(row['volume_liters']),
                'volume_kg': float(row['volume_kg']),
                'volume_mt': float(row['volume_mt']),
                'company_type': company_mapping['type'],
                'data_quality_score': float(row.get('data_quality_score', 1.0)),
                'is_outlier': bool(row.get('is_outlier', False))
            }
            
            import_records.append(record)
        
        if mapping_errors:
            logger.warning(f"Found {len(mapping_errors)} mapping errors (first 10):")
            for error in mapping_errors[:10]:
                logger.warning(f"  {error}")
        
        logger.info(f"Prepared {len(import_records)} records for import")
        
        # Import to appropriate table
        if data_type == 'OMC':
            table_name = 'petroverse.omc_data'
        else:
            table_name = 'petroverse.bdc_data'
        
        # Batch insert
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
        
        # Add created_at timestamp to each record
        for record in import_records:
            record['created_at'] = datetime.now()
        
        cursor.executemany(insert_query, import_records)
        
        inserted_count = cursor.rowcount
        logger.info(f"Inserted {inserted_count} {data_type} records")
        
        self.conn.commit()
        cursor.close()
        
        return inserted_count, len(mapping_errors)
    
    def validate_import(self, data_type):
        """Validate the imported data"""
        logger.info(f"Validating {data_type} import...")
        
        cursor = self.conn.cursor()
        
        if data_type == 'OMC':
            table_name = 'petroverse.omc_data'
        else:
            table_name = 'petroverse.bdc_data'
        
        # Check record counts
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_records = cursor.fetchone()[0]
        
        # Check data integrity
        cursor.execute(f"""
            SELECT 
                COUNT(DISTINCT year) as years,
                COUNT(DISTINCT company_name) as companies,
                COUNT(DISTINCT product) as products,
                MIN(year) as min_year,
                MAX(year) as max_year,
                SUM(volume_liters) as total_volume
            FROM {table_name}
        """)
        
        stats = cursor.fetchone()
        
        logger.info(f"{data_type} Validation Results:")
        logger.info(f"  Total records: {total_records:,}")
        logger.info(f"  Years covered: {stats[0]} ({stats[3]}-{stats[4]})")
        logger.info(f"  Companies: {stats[1]:,}")
        logger.info(f"  Products: {stats[2]:,}")
        logger.info(f"  Total volume: {stats[5]:,.0f} liters")
        
        cursor.close()
        
        return {
            'total_records': total_records,
            'years': stats[0],
            'companies': stats[1],
            'products': stats[2],
            'year_range': f"{stats[3]}-{stats[4]}",
            'total_volume': stats[5]
        }
    
    def update_database_with_complete_data(self):
        """Main method to update database with complete extracted data"""
        logger.info("=" * 80)
        logger.info("STARTING SAFE DATABASE UPDATE WITH COMPLETE EXTRACTED DATA")
        logger.info("=" * 80)
        
        try:
            # Step 1: Connect to database
            self.connect_to_database()
            
            # Step 2: Create backup
            backup_file = self.create_database_backup()
            
            # Step 3: Load standardized mappings
            self.load_standardized_mappings()
            
            # Step 4: Load extracted data
            logger.info("Loading corrected extracted data...")
            omc_data = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
            bdc_data = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
            
            logger.info(f"Loaded OMC data: {len(omc_data):,} records")
            logger.info(f"Loaded BDC data: {len(bdc_data):,} records")
            
            # Step 5: Create missing companies if any
            self.create_missing_companies(omc_data, 'OMC')
            self.create_missing_companies(bdc_data, 'BDC')
            
            # Reload mappings after creating new companies
            self.load_standardized_mappings()
            
            # Step 6: Clear existing data and import OMC
            logger.info("\nProcessing OMC data...")
            self.clear_existing_data('OMC')
            omc_inserted, omc_errors = self.import_data_to_database(omc_data, 'OMC')
            omc_validation = self.validate_import('OMC')
            
            # Step 7: Clear existing data and import BDC
            logger.info("\nProcessing BDC data...")
            self.clear_existing_data('BDC')
            bdc_inserted, bdc_errors = self.import_data_to_database(bdc_data, 'BDC')
            bdc_validation = self.validate_import('BDC')
            
            # Step 8: Final validation
            logger.info("\n" + "=" * 80)
            logger.info("DATABASE UPDATE COMPLETED SUCCESSFULLY!")
            logger.info("=" * 80)
            
            logger.info("FINAL SUMMARY:")
            logger.info(f"  Backup created: {backup_file}")
            logger.info(f"  OMC records imported: {omc_inserted:,} (errors: {omc_errors})")
            logger.info(f"  BDC records imported: {bdc_inserted:,} (errors: {bdc_errors})")
            logger.info(f"  Total records: {omc_inserted + bdc_inserted:,}")
            
            logger.info("\nOMC FINAL STATS:")
            for key, value in omc_validation.items():
                logger.info(f"  {key}: {value}")
            
            logger.info("\nBDC FINAL STATS:")
            for key, value in bdc_validation.items():
                logger.info(f"  {key}: {value}")
            
            return True
            
        except Exception as e:
            logger.error(f"Database update failed: {e}")
            if self.conn:
                self.conn.rollback()
                logger.info("Transaction rolled back")
            raise
        
        finally:
            if self.conn:
                self.conn.close()
                logger.info("Database connection closed")

def main():
    """Main execution"""
    updater = SafeDatabaseUpdater()
    
    print("SAFE DATABASE UPDATE - COMPLETE EXTRACTED DATA")
    print("=" * 60)
    print("This will:")
    print("1. Create a full database backup")
    print("2. Use existing standardized companies and products")
    print("3. Import ALL extracted data with proper mapping")
    print("4. Validate data integrity")
    
    confirm = input("\nProceed with database update? (yes/no): ")
    
    if confirm.lower() == 'yes':
        try:
            updater.update_database_with_complete_data()
            print("\n✅ DATABASE SUCCESSFULLY UPDATED WITH COMPLETE DATA!")
        except Exception as e:
            print(f"\n❌ UPDATE FAILED: {e}")
            print("Check the log file for details.")
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    main()