"""
Update Database with New OMC Data Only
Keep existing BDC data intact, replace only OMC data with updated mappings
"""

import psycopg2
import pandas as pd
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_omc_data_only():
    """Replace OMC data while keeping BDC data intact"""
    
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    cursor = conn.cursor()
    
    try:
        logger.info("Starting OMC data update...")
        
        # Load updated OMC data
        omc_df = pd.read_csv('FINAL_OMC_DATA.csv')
        logger.info(f"Loaded {len(omc_df):,} updated OMC records")
        
        # 1. Clear ONLY OMC data (preserve BDC)
        logger.info("\n" + "=" * 50)
        logger.info("CLEARING ONLY OMC DATA")
        logger.info("=" * 50)
        
        # Clear OMC fact table
        cursor.execute("DELETE FROM petroverse.fact_omc_transactions")
        omc_fact_deleted = cursor.rowcount
        logger.info(f"Deleted {omc_fact_deleted:,} OMC fact records")
        
        # Clear OMC raw data
        cursor.execute("DELETE FROM petroverse.omc_data")
        omc_raw_deleted = cursor.rowcount
        logger.info(f"Deleted {omc_raw_deleted:,} OMC raw records")
        
        # Clear OMC companies (IDs 2001+)
        cursor.execute("DELETE FROM petroverse.companies WHERE company_type = 'OMC'")
        omc_companies_deleted = cursor.rowcount
        logger.info(f"Deleted {omc_companies_deleted} OMC companies")
        
        # Check if we need to add new products
        logger.info("\n" + "-" * 40)
        logger.info("UPDATING PRODUCTS")
        logger.info("-" * 40)
        
        # Get existing products
        cursor.execute("SELECT product_name FROM petroverse.products")
        existing_products = set([row[0] for row in cursor.fetchall()])
        
        # Get products from new OMC data
        new_omc_products = set(omc_df['product'].unique())
        products_to_add = new_omc_products - existing_products
        
        if products_to_add:
            # Get current max product_id
            cursor.execute("SELECT MAX(product_id) FROM petroverse.products")
            max_id = cursor.fetchone()[0] or 0
            
            # Add new products
            for idx, product in enumerate(products_to_add, max_id + 1):
                # Get category from OMC data
                category = omc_df[omc_df['product'] == product]['product_category'].iloc[0]
                cursor.execute("""
                    INSERT INTO petroverse.products (product_id, product_name, product_category, created_at)
                    VALUES (%s, %s, %s, %s)
                """, (idx, product, category, datetime.now()))
            
            logger.info(f"Added {len(products_to_add)} new products: {list(products_to_add)}")
        else:
            logger.info("No new products to add")
        
        # 2. Insert Updated OMC Companies
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING UPDATED OMC COMPANIES")
        logger.info("-" * 40)
        
        omc_companies = omc_df['company_name'].unique()
        omc_companies = [c for c in omc_companies if pd.notna(c)]
        
        company_id_map = {}
        # Start OMC IDs from 2001
        for idx, company in enumerate(omc_companies, 2001):
            cursor.execute("""
                INSERT INTO petroverse.companies (company_id, company_name, company_type, created_at)
                VALUES (%s, %s, %s, %s)
            """, (idx, company, 'OMC', datetime.now()))
            company_id_map[company] = idx
        
        logger.info(f"Inserted {len(omc_companies)} updated OMC companies")
        
        # 3. Update Time Dimension if needed
        logger.info("\n" + "-" * 40)
        logger.info("UPDATING TIME DIMENSION")
        logger.info("-" * 40)
        
        # Get existing time periods
        cursor.execute("SELECT CONCAT(year, '-', month) FROM petroverse.time_dimension")
        existing_periods = set([row[0] for row in cursor.fetchall()])
        
        # Get periods from new OMC data
        omc_periods = set([f"{int(row['year'])}-{int(row['month'])}" for _, row in omc_df.iterrows()])
        periods_to_add = omc_periods - existing_periods
        
        if periods_to_add:
            # Get current max date_id
            cursor.execute("SELECT MAX(date_id) FROM petroverse.time_dimension")
            max_date_id = cursor.fetchone()[0] or 0
            
            for idx, period in enumerate(periods_to_add, max_date_id + 1):
                year, month = period.split('-')
                year, month = int(year), int(month)
                full_date = f"{year}-{month:02d}-01"
                quarter = (month - 1) // 3 + 1
                
                cursor.execute("""
                    INSERT INTO petroverse.time_dimension (date_id, full_date, year, month, quarter, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (idx, full_date, year, month, quarter, datetime.now()))
            
            logger.info(f"Added {len(periods_to_add)} new time periods")
        else:
            logger.info("No new time periods to add")
        
        # 4. Insert Updated OMC Raw Data
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING UPDATED OMC RAW DATA")
        logger.info("-" * 40)
        
        omc_count = 0
        for _, row in omc_df.iterrows():
            year = int(row['year'])
            month = int(row['month'])
            
            cursor.execute("""
                INSERT INTO petroverse.omc_data (
                    source_file, sheet_name, extraction_date, year, month,
                    period_date, period_type, company_name, product_code,
                    product_original_name, unit_type, volume, volume_liters,
                    volume_kg, volume_mt, company_type, product,
                    data_quality_score, is_outlier, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(row.get('source_file', '')),
                str(row.get('sheet_name', '')),
                row.get('extraction_date', datetime.now().date()),
                year, month,
                row.get('period_date', f"{year}-{month:02d}-01"),
                row.get('period_type', 'monthly'),
                str(row['company_name']),
                str(row.get('product_code', '')),
                str(row.get('product_original_name', row['product'])),
                str(row.get('unit_type', 'LITERS')),
                float(row.get('volume', 0)),
                float(row.get('volume_liters', 0)),
                float(row.get('volume_kg', 0)),
                float(row.get('volume_mt', 0)),
                'OMC',
                str(row['product']),
                float(row.get('data_quality_score', 1.0)),
                bool(row.get('is_outlier', False)),
                datetime.now()
            ))
            omc_count += 1
            
            if omc_count % 2000 == 0:
                logger.info(f"  Inserted {omc_count:,} OMC records...")
        
        logger.info(f"Total updated OMC records inserted: {omc_count:,}")
        
        # 5. Rebuild OMC Fact Table
        logger.info("\n" + "-" * 40)
        logger.info("REBUILDING OMC FACT TABLE")
        logger.info("-" * 40)
        
        cursor.execute("""
            INSERT INTO petroverse.fact_omc_transactions (
                transaction_id, company_id, product_id, date_id,
                volume_liters, volume_mt, volume_kg,
                data_quality_score, is_outlier, source_file, created_at
            )
            SELECT 
                od.id, c.company_id, p.product_id, t.date_id,
                od.volume_liters, od.volume_mt, od.volume_kg,
                od.data_quality_score, od.is_outlier,
                od.source_file, od.created_at
            FROM petroverse.omc_data od
            JOIN petroverse.companies c ON od.company_name = c.company_name
            JOIN petroverse.products p ON od.product = p.product_name
            JOIN petroverse.time_dimension t ON (od.year = t.year AND od.month = t.month)
        """)
        omc_fact_count = cursor.rowcount
        logger.info(f"Rebuilt OMC fact table: {omc_fact_count:,} records")
        
        conn.commit()
        
        # 6. Verification
        logger.info("\n" + "=" * 50)
        logger.info("FINAL VERIFICATION")
        logger.info("=" * 50)
        
        # Check BDC data is intact
        cursor.execute("""
            SELECT 
                COUNT(*) as records,
                COUNT(DISTINCT company_id) as companies,
                SUM(volume_mt) as total_mt
            FROM petroverse.fact_bdc_transactions
        """)
        bdc_stats = cursor.fetchone()
        logger.info(f"BDC Data (preserved): {bdc_stats[0]:,} records, {bdc_stats[1]} companies, {bdc_stats[2]:,.2f} MT")
        
        # Check new OMC data
        cursor.execute("""
            SELECT 
                COUNT(*) as records,
                COUNT(DISTINCT company_id) as companies,
                SUM(volume_mt) as total_mt
            FROM petroverse.fact_omc_transactions
        """)
        omc_stats = cursor.fetchone()
        logger.info(f"OMC Data (updated): {omc_stats[0]:,} records, {omc_stats[1]} companies, {omc_stats[2]:,.2f} MT")
        
        # Combined totals
        total_records = bdc_stats[0] + omc_stats[0]
        total_companies = bdc_stats[1] + omc_stats[1]
        total_mt = bdc_stats[2] + omc_stats[2]
        
        logger.info(f"\nCOMBINED TOTALS: {total_records:,} records, {total_companies} companies, {total_mt:,.2f} MT")
        
        # Product breakdown
        cursor.execute("""
            SELECT 
                p.product_category,
                SUM(CASE WHEN c.company_type = 'BDC' THEN f.volume_mt ELSE 0 END) as bdc_mt,
                SUM(CASE WHEN c.company_type = 'OMC' THEN f.volume_mt ELSE 0 END) as omc_mt,
                SUM(f.volume_mt) as total_mt
            FROM (
                SELECT transaction_id, company_id, product_id, volume_mt FROM petroverse.fact_bdc_transactions
                UNION ALL
                SELECT transaction_id, company_id, product_id, volume_mt FROM petroverse.fact_omc_transactions
            ) f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.products p ON f.product_id = p.product_id
            GROUP BY p.product_category
            ORDER BY total_mt DESC
        """)
        
        logger.info(f"\nPRODUCT CATEGORY BREAKDOWN:")
        for row in cursor.fetchall():
            category, bdc_mt, omc_mt, total_mt = row
            logger.info(f"  {category}: BDC {bdc_mt:,.0f} MT + OMC {omc_mt:,.0f} MT = {total_mt:,.0f} MT")
        
        logger.info("\n" + "=" * 50)
        logger.info("OMC DATA UPDATE COMPLETE!")
        logger.info("=" * 50)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to update OMC data: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("UPDATING DATABASE WITH NEW OMC DATA ONLY")
    print("=" * 60)
    print("This will:")
    print("  1. Keep all existing BDC data intact")
    print("  2. Delete only OMC data and companies")
    print("  3. Import updated OMC data with your mappings")
    print("  4. Rebuild only OMC fact table")
    print()
    
    try:
        update_omc_data_only()
        print("\nSUCCESS! Database updated with your OMC mappings.")
        print("BDC data remains unchanged.")
    except Exception as e:
        print(f"\nFAILED: {e}")