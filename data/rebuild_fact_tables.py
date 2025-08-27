"""
Rebuild fact tables after data import
This will populate the fact tables that the dashboards use
"""

import psycopg2
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def rebuild_fact_tables():
    """Rebuild fact tables with the clean data"""
    
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    cursor = conn.cursor()
    
    try:
        logger.info("Starting fact table rebuild...")
        
        # Clear existing fact tables
        logger.info("Clearing existing fact tables...")
        cursor.execute("TRUNCATE TABLE petroverse.fact_bdc_transactions CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.fact_omc_transactions CASCADE")
        conn.commit()
        
        # Rebuild BDC fact table
        logger.info("Building BDC fact table...")
        cursor.execute("""
            INSERT INTO petroverse.fact_bdc_transactions (
                transaction_id, company_id, product_id, date_id,
                volume_liters, volume_mt, volume_kg,
                data_quality_score, is_outlier, source_file, created_at
            )
            SELECT 
                bd.id as transaction_id,
                c.company_id,
                p.product_id,
                t.date_id,
                bd.volume_liters,
                bd.volume_mt,
                bd.volume_kg,
                bd.data_quality_score,
                bd.is_outlier,
                bd.source_file,
                bd.created_at
            FROM petroverse.bdc_data bd
            JOIN petroverse.companies c ON bd.company_name = c.company_name
            JOIN petroverse.products p ON bd.product = p.product_name
            JOIN petroverse.time_dimension t ON (
                bd.year = t.year AND bd.month = t.month
            )
        """)
        bdc_count = cursor.rowcount
        logger.info(f"  Inserted {bdc_count:,} BDC fact records")
        
        # Rebuild OMC fact table
        logger.info("Building OMC fact table...")
        cursor.execute("""
            INSERT INTO petroverse.fact_omc_transactions (
                transaction_id, company_id, product_id, date_id,
                volume_liters, volume_mt, volume_kg,
                data_quality_score, is_outlier, source_file, created_at
            )
            SELECT 
                od.id as transaction_id,
                c.company_id,
                p.product_id,
                t.date_id,
                od.volume_liters,
                od.volume_mt,
                od.volume_kg,
                od.data_quality_score,
                od.is_outlier,
                od.source_file,
                od.created_at
            FROM petroverse.omc_data od
            JOIN petroverse.companies c ON od.company_name = c.company_name
            JOIN petroverse.products p ON od.product = p.product_name
            JOIN petroverse.time_dimension t ON (
                od.year = t.year AND od.month = t.month
            )
        """)
        omc_count = cursor.rowcount
        logger.info(f"  Inserted {omc_count:,} OMC fact records")
        
        conn.commit()
        
        # Verify the rebuild
        logger.info("\nVerifying fact table rebuild...")
        
        cursor.execute("""
            SELECT 
                'BDC' as dataset,
                COUNT(*) as records,
                COUNT(DISTINCT company_id) as companies,
                COUNT(DISTINCT product_id) as products,
                MIN(date_id) as min_date,
                MAX(date_id) as max_date
            FROM petroverse.fact_bdc_transactions
            UNION ALL
            SELECT 
                'OMC',
                COUNT(*),
                COUNT(DISTINCT company_id),
                COUNT(DISTINCT product_id),
                MIN(date_id),
                MAX(date_id)
            FROM petroverse.fact_omc_transactions
        """)
        
        results = cursor.fetchall()
        
        logger.info("\nFACT TABLE REBUILD COMPLETE:")
        logger.info("=" * 60)
        for row in results:
            logger.info(f"{row[0]}: {row[1]:,} records, {row[2]} companies, {row[3]} products")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to rebuild fact tables: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("REBUILDING FACT TABLES FOR DASHBOARDS")
    print("=" * 60)
    print("This will populate the fact tables that the charts use")
    print()
    
    try:
        rebuild_fact_tables()
        print("\nSUCCESS! Fact tables rebuilt.")
        print("The dashboards should now show the updated data.")
    except Exception as e:
        print(f"\nFAILED: {e}")