"""
Import Validated Data to Database
"""
import psycopg2
import pandas as pd
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def import_validated_data():
    """Import the validated and corrected data"""
    
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    cursor = conn.cursor()
    
    try:
        logger.info("Loading validated data files...")
        bdc_data = pd.read_csv('VALIDATED_bdc_data_20250827_012534.csv')
        omc_data = pd.read_csv('VALIDATED_omc_data_20250827_012534.csv')
        
        logger.info(f"BDC Records: {len(bdc_data):,}")
        logger.info(f"OMC Records: {len(omc_data):,}")
        
        # Clear existing data
        logger.info("Clearing existing data tables...")
        cursor.execute("TRUNCATE TABLE petroverse.bdc_data CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.omc_data CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.fact_bdc_transactions CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.fact_omc_transactions CASCADE")
        conn.commit()
        
        # Insert BDC data
        logger.info("Importing BDC data...")
        for _, row in bdc_data.iterrows():
            cursor.execute("""
                INSERT INTO petroverse.bdc_data (
                    source_file, company_name, company_type, product, product_code,
                    year, month, volume_liters, volume_kg, volume_mt,
                    data_quality_score, is_outlier, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                row.get('source_file', ''), row['company_name'], row['company_type'],
                row['product'], row.get('product_code', ''), row['year'], row['month'],
                row['volume_liters'], row.get('volume_kg', 0), row.get('volume_mt', 0),
                row.get('data_quality_score', 1.0), row.get('is_outlier', False),
                datetime.now()
            ))
        
        # Insert OMC data
        logger.info("Importing OMC data...")
        for _, row in omc_data.iterrows():
            cursor.execute("""
                INSERT INTO petroverse.omc_data (
                    source_file, company_name, company_type, product, product_code,
                    year, month, volume_liters, volume_kg, volume_mt,
                    data_quality_score, is_outlier, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                row.get('source_file', ''), row['company_name'], row['company_type'],
                row['product'], row.get('product_code', ''), row['year'], row['month'],
                row['volume_liters'], row.get('volume_kg', 0), row.get('volume_mt', 0),
                row.get('data_quality_score', 1.0), row.get('is_outlier', False),
                datetime.now()
            ))
        
        conn.commit()
        logger.info("Data imported successfully!")
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM petroverse.bdc_data")
        bdc_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM petroverse.omc_data")
        omc_count = cursor.fetchone()[0]
        
        logger.info(f"Verification - BDC: {bdc_count:,}, OMC: {omc_count:,}")
        
        return True
        
    except Exception as e:
        logger.error(f"Import failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("IMPORTING VALIDATED DATA TO DATABASE")
    print("=" * 50)
    import_validated_data()
    print("SUCCESS: Validated data imported!")