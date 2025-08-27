"""
Replace Database with Final BDC Data
Deletes all existing data and imports the final cleaned BDC extraction
"""

import psycopg2
import pandas as pd
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def replace_database_with_final_bdc():
    """Replace all database data with final BDC extraction"""
    
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    cursor = conn.cursor()
    
    try:
        logger.info("Starting database replacement with final BDC data...")
        
        # Load the final BDC data
        logger.info("Loading final BDC data...")
        bdc_df = pd.read_csv('FINAL_BDC_DATA.csv')
        logger.info(f"Loaded {len(bdc_df):,} BDC records")
        
        # 1. Clear ALL existing data
        logger.info("\nCLEARING ALL EXISTING DATA:")
        logger.info("=" * 50)
        
        # Clear fact tables first (due to foreign keys)
        logger.info("Clearing fact tables...")
        cursor.execute("TRUNCATE TABLE petroverse.fact_bdc_transactions CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.fact_omc_transactions CASCADE")
        
        # Clear raw data tables
        logger.info("Clearing raw data tables...")
        cursor.execute("TRUNCATE TABLE petroverse.bdc_data CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.omc_data CASCADE")
        
        # Clear dimension tables
        logger.info("Clearing dimension tables...")
        cursor.execute("TRUNCATE TABLE petroverse.companies CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.products CASCADE")
        cursor.execute("TRUNCATE TABLE petroverse.time_dimension CASCADE")
        
        conn.commit()
        logger.info("All existing data cleared!")
        
        # 2. Insert Products
        logger.info("\nINSERTING PRODUCTS:")
        logger.info("-" * 40)
        
        # Get unique products and categories from final data
        products_df = bdc_df[['product', 'product_category']].drop_duplicates()
        products_df = products_df[products_df['product'].notna()]
        
        product_id_map = {}
        for idx, (product, category) in enumerate(products_df.values, 1):
            cursor.execute("""
                INSERT INTO petroverse.products (product_id, product_name, product_category, created_at)
                VALUES (%s, %s, %s, %s)
            """, (idx, product, category, datetime.now()))
            product_id_map[product] = idx
        
        logger.info(f"Inserted {len(product_id_map)} products")
        
        # 3. Insert Companies
        logger.info("\nINSERTING COMPANIES:")
        logger.info("-" * 40)
        
        # Get unique companies from final data
        companies = bdc_df['company_name'].unique()
        companies = [c for c in companies if pd.notna(c)]
        
        company_id_map = {}
        for idx, company in enumerate(companies, 1001):  # Start from 1001 for BDC companies
            cursor.execute("""
                INSERT INTO petroverse.companies (company_id, company_name, company_type, created_at)
                VALUES (%s, %s, %s, %s)
            """, (idx, company, 'BDC', datetime.now()))
            company_id_map[company] = idx
        
        logger.info(f"Inserted {len(company_id_map)} BDC companies")
        
        # 4. Insert Time Dimension
        logger.info("\nINSERTING TIME DIMENSION:")
        logger.info("-" * 40)
        
        # Get unique year-month combinations
        time_data = bdc_df[['year', 'month']].drop_duplicates()
        time_data = time_data.sort_values(['year', 'month'])
        
        date_id_map = {}
        for idx, (year, month) in enumerate(time_data.values, 1):
            # Convert numpy types to Python native types
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
        logger.info("\nINSERTING BDC RAW DATA:")
        logger.info("-" * 40)
        
        inserted_count = 0
        for _, row in bdc_df.iterrows():
            # Convert numpy types to Python native types
            year = int(row['year'])
            month = int(row['month'])
            volume_liters = float(row['volume_liters'])
            volume_kg = float(row.get('volume_kg', 0))
            volume_mt = float(row.get('volume_mt', 0))
            
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
                year,
                month,
                row.get('period_date', f"{year}-{month:02d}-01"),
                row.get('period_type', 'monthly'),
                str(row['company_name']),
                str(row.get('product_code', '')),
                str(row.get('product_original_name', row['product'])),
                str(row.get('unit_type', 'LITERS')),
                float(row.get('volume', volume_liters)),
                volume_liters,
                volume_kg,
                volume_mt,
                'BDC',
                str(row['product']),
                float(row.get('data_quality_score', 1.0)),
                bool(row.get('is_outlier', False)),
                datetime.now()
            ))
            inserted_count += 1
            
            if inserted_count % 1000 == 0:
                logger.info(f"  Inserted {inserted_count:,} records...")
        
        logger.info(f"Total BDC records inserted: {inserted_count:,}")
        
        # 6. Build BDC Fact Table
        logger.info("\nBUILDING BDC FACT TABLE:")
        logger.info("-" * 40)
        
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
        fact_count = cursor.rowcount
        logger.info(f"Inserted {fact_count:,} BDC fact records")
        
        conn.commit()
        
        # 7. Verify the import
        logger.info("\nVERIFYING DATABASE IMPORT:")
        logger.info("=" * 50)
        
        # Check counts
        cursor.execute("SELECT COUNT(*) FROM petroverse.products")
        product_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM petroverse.companies WHERE company_type = 'BDC'")
        company_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM petroverse.bdc_data")
        bdc_data_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM petroverse.fact_bdc_transactions")
        fact_count = cursor.fetchone()[0]
        
        logger.info(f"Products: {product_count}")
        logger.info(f"BDC Companies: {company_count}")
        logger.info(f"BDC Raw Records: {bdc_data_count:,}")
        logger.info(f"BDC Fact Records: {fact_count:,}")
        
        # Check volume totals
        cursor.execute("""
            SELECT 
                SUM(volume_liters) as total_liters,
                SUM(volume_mt) as total_mt
            FROM petroverse.bdc_data
        """)
        volumes = cursor.fetchone()
        logger.info(f"\nVolume Totals:")
        logger.info(f"  Liters: {volumes[0]:,.0f}")
        logger.info(f"  MT: {volumes[1]:,.2f}")
        
        # Check product categories
        cursor.execute("""
            SELECT product_category, COUNT(*) as count
            FROM petroverse.products
            GROUP BY product_category
            ORDER BY product_category
        """)
        logger.info(f"\nProduct Categories:")
        for row in cursor.fetchall():
            logger.info(f"  {row[0]}: {row[1]} products")
        
        logger.info("\nDATABASE REPLACEMENT COMPLETE!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to replace database: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("REPLACING DATABASE WITH FINAL BDC DATA")
    print("=" * 60)
    print("This will:")
    print("  1. Delete ALL existing data (BDC and OMC)")
    print("  2. Clear all products and companies")
    print("  3. Import the final cleaned BDC data")
    print("  4. Rebuild fact tables")
    print()
    
    try:
        replace_database_with_final_bdc()
        print("\nSUCCESS! Database has been replaced with final BDC data.")
        print("Ready for OMC data when available.")
    except Exception as e:
        print(f"\nFAILED: {e}")