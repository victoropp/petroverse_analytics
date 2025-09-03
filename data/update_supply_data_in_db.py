"""
Update supply data in PostgreSQL database
Replaces existing supply data with cleaned and standardized data
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

def update_supply_data():
    """Replace supply data in database with new standardized data"""
    
    # Database connection parameters
    conn_params = {
        'host': 'localhost',
        'port': 5432,
        'database': 'petroverse_analytics',
        'user': 'postgres',
        'password': 'postgres123'
    }
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()
        
        # Check current supply data
        cur.execute("SELECT COUNT(*) FROM petroverse.supply_data")
        old_count = cur.fetchone()[0]
        print(f"Current supply data records: {old_count}")
        
        # Read standardized data
        print("\nReading standardized supply data...")
        df = pd.read_csv('C:/Users/victo/Documents/Data_Science_Projects/petroverse_analytics/data/final/SUPPLY_DATA_FINAL.csv')
        print(f"New records to insert: {len(df)}")
        
        # Prepare data for insertion
        # Map DataFrame columns to database columns
        df_insert = pd.DataFrame({
            'year': df['year'].astype(int),
            'month': df['month'].astype(int),
            'region': df['region'],
            'product': df['product'],
            'unit': df['unit'],
            'quantity_original': df['quantity_original'].astype(float),
            'company_type': df['company_type'],
            'period_date': pd.to_datetime(df['period_date']),
            'data_quality_score': df['data_quality_score'].astype(float),
            'source_file': df['source_file'],
            'product_name_clean': df['product_name_clean'],
            'product_category': df['product_category'],
            'company_name_clean': None,  # No company for supply data
            'is_outlier': df['is_outlier'].astype(bool),
            'created_at': datetime.now()
        })
        
        # Delete existing supply data
        print("\nDeleting existing supply data...")
        cur.execute("DELETE FROM petroverse.supply_data")
        deleted = cur.rowcount
        print(f"Deleted {deleted} records")
        
        # Prepare values for insertion
        values = []
        for _, row in df_insert.iterrows():
            values.append((
                row['year'],
                row['month'],
                row['region'],
                row['product'],
                row['unit'],
                row['quantity_original'],
                row['company_type'],
                row['period_date'],
                row['data_quality_score'],
                row['source_file'],
                row['product_name_clean'],
                row['product_category'],
                row['company_name_clean'],
                row['is_outlier'],
                row['created_at']
            ))
        
        # Insert new data
        print("\nInserting new supply data...")
        insert_query = """
            INSERT INTO petroverse.supply_data (
                year, month, region, product, unit, quantity_original,
                company_type, period_date, data_quality_score,
                source_file, product_name_clean, product_category,
                company_name_clean, is_outlier, created_at
            ) VALUES %s
        """
        
        execute_values(cur, insert_query, values)
        inserted = cur.rowcount
        print(f"Inserted {inserted} records")
        
        # Commit transaction
        conn.commit()
        print("\nTransaction committed successfully!")
        
        # Verify new data
        cur.execute("""
            SELECT year, COUNT(*) as records, COUNT(DISTINCT region) as regions,
                   COUNT(DISTINCT product) as products
            FROM petroverse.supply_data
            GROUP BY year
            ORDER BY year
        """)
        
        print("\nVerification - Data by year:")
        print("Year | Records | Regions | Products")
        print("-" * 40)
        for row in cur.fetchall():
            print(f"{row[0]:4d} | {row[1]:7d} | {row[2]:7d} | {row[3]:8d}")
        
        # Check total volume
        cur.execute("""
            SELECT product, COUNT(*) as records,
                   SUM(quantity_original) as total_quantity
            FROM petroverse.supply_data
            GROUP BY product
            ORDER BY total_quantity DESC
            LIMIT 5
        """)
        
        print("\nTop 5 products by quantity:")
        print("Product | Records | Total Quantity")
        print("-" * 50)
        for row in cur.fetchall():
            print(f"{row[0]:30s} | {row[1]:7d} | {row[2]:,.0f}")
        
        # Check regions for 2025
        cur.execute("""
            SELECT DISTINCT region
            FROM petroverse.supply_data
            WHERE year = 2025
            ORDER BY region
        """)
        
        regions_2025 = [row[0] for row in cur.fetchall()]
        print(f"\n2025 Regions ({len(regions_2025)} total):")
        print(", ".join(regions_2025))
        
        print("\n✅ Supply data successfully updated in database!")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        if conn:
            conn.rollback()
            print("Transaction rolled back")
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
            print("\nDatabase connection closed")

if __name__ == "__main__":
    update_supply_data()