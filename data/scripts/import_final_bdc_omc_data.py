"""
Import Final BDC and OMC Data to Database
Clears existing data and imports both datasets
"""

import psycopg2
import pandas as pd
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def import_final_data():
    """Import both BDC and OMC data to database"""
    
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    cursor = conn.cursor()
    
    try:
        logger.info("Starting database import of BDC and OMC data...")
        
        # Load both datasets
        logger.info("\nLoading data files...")
        bdc_df = pd.read_csv('FINAL_BDC_DATA.csv')
        omc_df = pd.read_csv('FINAL_OMC_DATA.csv')
        
        logger.info(f"Loaded {len(bdc_df):,} BDC records")
        logger.info(f"Loaded {len(omc_df):,} OMC records")
        logger.info(f"Total records: {len(bdc_df) + len(omc_df):,}")
        
        # 1. Clear ALL existing data
        logger.info("\n" + "=" * 50)
        logger.info("CLEARING ALL EXISTING DATA")
        logger.info("=" * 50)
        
        # Clear fact tables first
        cursor.execute("TRUNCATE TABLE petroverse.fact_bdc_transactions CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.fact_omc_transactions CASCADE")
        
        # Clear raw data tables
        cursor.execute("TRUNCATE TABLE petroverse.bdc_data CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.omc_data CASCADE")
        
        # Clear dimension tables
        cursor.execute("TRUNCATE TABLE petroverse.companies CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.products CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.time_dimension CASCADE")
        
        conn.commit()
        logger.info("All existing data cleared!")
        
        # 2. Insert Products (combine from both datasets)
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING PRODUCTS")
        logger.info("-" * 40)
        
        # Get unique products from both datasets
        bdc_products = bdc_df[['product', 'product_category']].drop_duplicates()
        omc_products = omc_df[['product', 'product_category']].drop_duplicates()
        
        # Combine and deduplicate
        all_products = pd.concat([bdc_products, omc_products]).drop_duplicates()
        all_products = all_products[all_products['product'].notna()]
        
        product_id_map = {}
        for idx, (product, category) in enumerate(all_products.values, 1):
            cursor.execute("""
                INSERT INTO petroverse.products (product_id, product_name, product_category, created_at)
                VALUES (%s, %s, %s, %s)
            """, (idx, product, category, datetime.now()))
            product_id_map[product] = idx
        
        logger.info(f"Inserted {len(product_id_map)} unique products")
        
        # 3. Insert Companies (BDC and OMC)
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING COMPANIES")
        logger.info("-" * 40)
        
        # BDC companies
        bdc_companies = bdc_df['company_name'].unique()
        bdc_companies = [c for c in bdc_companies if pd.notna(c)]
        
        company_id_map = {}
        for idx, company in enumerate(bdc_companies, 1001):
            cursor.execute("""
                INSERT INTO petroverse.companies (company_id, company_name, company_type, created_at)
                VALUES (%s, %s, %s, %s)
            """, (idx, company, 'BDC', datetime.now()))
            company_id_map[company] = idx
        
        logger.info(f"Inserted {len(bdc_companies)} BDC companies")
        
        # OMC companies
        omc_companies = omc_df['company_name'].unique()
        omc_companies = [c for c in omc_companies if pd.notna(c)]
        
        # Start OMC IDs from 2001
        omc_start_id = 2001
        for idx, company in enumerate(omc_companies, omc_start_id):
            # Skip if already exists (some companies might be in both)
            if company not in company_id_map:
                cursor.execute("""
                    INSERT INTO petroverse.companies (company_id, company_name, company_type, created_at)
                    VALUES (%s, %s, %s, %s)
                """, (idx, company, 'OMC', datetime.now()))
                company_id_map[company] = idx
        
        logger.info(f"Inserted {len(omc_companies)} OMC companies")
        logger.info(f"Total companies: {len(company_id_map)}")
        
        # 4. Insert Time Dimension (combine from both)
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING TIME DIMENSION")
        logger.info("-" * 40)
        
        # Get unique year-month combinations from both datasets
        bdc_time = bdc_df[['year', 'month']].drop_duplicates()
        omc_time = omc_df[['year', 'month']].drop_duplicates()
        
        all_time = pd.concat([bdc_time, omc_time]).drop_duplicates()
        all_time = all_time.sort_values(['year', 'month'])
        
        date_id_map = {}
        for idx, (year, month) in enumerate(all_time.values, 1):
            year = int(year)
            month = int(month)
            full_date = f"{year}-{month:02d}-01"
            quarter = (month - 1) // 3 + 1
            cursor.execute("""
                INSERT INTO petroverse.time_dimension (date_id, full_date, year, month, quarter, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (idx, full_date, year, month, quarter, datetime.now()))
            date_id_map[f"{year}-{month}"] = idx
        
        logger.info(f"Inserted {len(date_id_map)} time periods")
        
        # 5. Insert BDC Raw Data
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING BDC RAW DATA")
        logger.info("-" * 40)
        
        bdc_count = 0
        for _, row in bdc_df.iterrows():
            year = int(row['year'])
            month = int(row['month'])
            
            cursor.execute("""
                INSERT INTO petroverse.bdc_data (
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
                'BDC',
                str(row['product']),
                float(row.get('data_quality_score', 1.0)),
                bool(row.get('is_outlier', False)),
                datetime.now()
            ))
            bdc_count += 1
            
            if bdc_count % 1000 == 0:
                logger.info(f"  Inserted {bdc_count:,} BDC records...")
        
        logger.info(f"Total BDC records inserted: {bdc_count:,}")
        
        # 6. Insert OMC Raw Data
        logger.info("\n" + "-" * 40)
        logger.info("INSERTING OMC RAW DATA")
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
        
        logger.info(f"Total OMC records inserted: {omc_count:,}")
        
        # 7. Build BDC Fact Table
        logger.info("\n" + "-" * 40)
        logger.info("BUILDING FACT TABLES")
        logger.info("-" * 40)
        
        cursor.execute("""
            INSERT INTO petroverse.fact_bdc_transactions (
                transaction_id, company_id, product_id, date_id,
                volume_liters, volume_mt, volume_kg,
                data_quality_score, is_outlier, source_file, created_at
            )
            SELECT 
                bd.id, c.company_id, p.product_id, t.date_id,
                bd.volume_liters, bd.volume_mt, bd.volume_kg,
                bd.data_quality_score, bd.is_outlier,
                bd.source_file, bd.created_at
            FROM petroverse.bdc_data bd
            JOIN petroverse.companies c ON bd.company_name = c.company_name
            JOIN petroverse.products p ON bd.product = p.product_name
            JOIN petroverse.time_dimension t ON (bd.year = t.year AND bd.month = t.month)
        """)
        bdc_fact_count = cursor.rowcount
        logger.info(f"Inserted {bdc_fact_count:,} BDC fact records")
        
        # 8. Build OMC Fact Table
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
        logger.info(f"Inserted {omc_fact_count:,} OMC fact records")
        
        conn.commit()
        
        # 9. Verify the import
        logger.info("\n" + "=" * 50)
        logger.info("VERIFICATION")
        logger.info("=" * 50)
        
        # Summary queries
        cursor.execute("""
            SELECT 
                'BDC' as dataset,
                COUNT(*) as records,
                COUNT(DISTINCT company_id) as companies,
                COUNT(DISTINCT product_id) as products,
                SUM(volume_mt) as total_mt
            FROM petroverse.fact_bdc_transactions
            UNION ALL
            SELECT 
                'OMC',
                COUNT(*),
                COUNT(DISTINCT company_id),
                COUNT(DISTINCT product_id),
                SUM(volume_mt)
            FROM petroverse.fact_omc_transactions
        """)
        
        for row in cursor.fetchall():
            dataset, records, companies, products, total_mt = row
            logger.info(f"{dataset}: {records:,} records, {companies} companies, {products} products, {total_mt:,.2f} MT")
        
        # Combined totals
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                SUM(volume_mt) as total_mt
            FROM (
                SELECT volume_mt FROM petroverse.fact_bdc_transactions
                UNION ALL
                SELECT volume_mt FROM petroverse.fact_omc_transactions
            ) combined
        """)
        total_records, total_mt = cursor.fetchone()
        logger.info(f"\nCOMBINED TOTAL: {total_records:,} records, {total_mt:,.2f} MT")
        
        logger.info("\n" + "=" * 50)
        logger.info("DATABASE IMPORT COMPLETE!")
        logger.info("=" * 50)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to import data: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("IMPORTING FINAL BDC AND OMC DATA TO DATABASE")
    print("=" * 60)
    print("This will:")
    print("  1. Delete ALL existing data")
    print("  2. Import BDC data (8,475 records)")
    print("  3. Import OMC data (24,208 records)")
    print("  4. Build fact tables for both")
    print()
    
    try:
        import_final_data()
        print("\nSUCCESS! Database has been populated with both BDC and OMC data.")
    except Exception as e:
        print(f"\nFAILED: {e}")