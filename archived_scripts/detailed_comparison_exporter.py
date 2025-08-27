"""
Detailed Comparison Exporter
Export comprehensive comparison analysis to Excel and CSV for granular review
"""

import pandas as pd
import psycopg2
from datetime import datetime
from pathlib import Path

def connect_to_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="petroverse_analytics",
        user="postgres",
        password="postgres"
    )

def create_year_by_year_summary():
    """Create year-by-year summary comparison"""
    print("Creating year-by-year summary...")
    
    conn = connect_to_db()
    
    # Load database data
    omc_db_query = """
    SELECT year, COUNT(*) as db_records, COUNT(DISTINCT company_name) as db_companies,
           SUM(volume_liters) as db_volume_liters, SUM(volume_mt) as db_volume_mt
    FROM petroverse.omc_data 
    GROUP BY year ORDER BY year
    """
    
    bdc_db_query = """
    SELECT year, COUNT(*) as db_records, COUNT(DISTINCT company_name) as db_companies,
           SUM(volume_liters) as db_volume_liters, SUM(volume_mt) as db_volume_mt
    FROM petroverse.bdc_data 
    GROUP BY year ORDER BY year
    """
    
    omc_db = pd.read_sql(omc_db_query, conn)
    bdc_db = pd.read_sql(bdc_db_query, conn)
    conn.close()
    
    # Load extracted data
    omc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
    bdc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
    
    # Create OMC summary
    omc_ext_summary = omc_extracted[omc_extracted['volume'] > 0].groupby('year').agg({
        'volume': 'count',
        'company_name': 'nunique',
        'volume_liters': 'sum',
        'volume_mt': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'company_name': 'ext_companies',
        'volume_liters': 'ext_volume_liters',
        'volume_mt': 'ext_volume_mt'
    }).reset_index()
    
    # Add total records (including zeros)
    omc_total_records = omc_extracted.groupby('year')['volume'].count().reset_index()
    omc_total_records.columns = ['year', 'ext_total_records_with_zeros']
    omc_ext_summary = omc_ext_summary.merge(omc_total_records, on='year')
    
    # Merge OMC data
    omc_comparison = omc_ext_summary.merge(omc_db, on='year', how='outer').fillna(0)
    
    # Calculate OMC metrics
    omc_comparison['data_capture_pct'] = (omc_comparison['db_volume_liters'] / omc_comparison['ext_volume_liters'] * 100).fillna(0)
    omc_comparison['data_loss_pct'] = 100 - omc_comparison['data_capture_pct']
    omc_comparison['missing_volume_liters'] = omc_comparison['ext_volume_liters'] - omc_comparison['db_volume_liters']
    omc_comparison['data_type'] = 'OMC'
    
    # Create BDC summary
    bdc_ext_summary = bdc_extracted[bdc_extracted['volume'] > 0].groupby('year').agg({
        'volume': 'count',
        'company_name': 'nunique',
        'volume_liters': 'sum',
        'volume_mt': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'company_name': 'ext_companies',
        'volume_liters': 'ext_volume_liters',
        'volume_mt': 'ext_volume_mt'
    }).reset_index()
    
    # Add total records (including zeros)
    bdc_total_records = bdc_extracted.groupby('year')['volume'].count().reset_index()
    bdc_total_records.columns = ['year', 'ext_total_records_with_zeros']
    bdc_ext_summary = bdc_ext_summary.merge(bdc_total_records, on='year')
    
    # Merge BDC data
    bdc_comparison = bdc_ext_summary.merge(bdc_db, on='year', how='outer').fillna(0)
    
    # Calculate BDC metrics
    bdc_comparison['data_capture_pct'] = (bdc_comparison['db_volume_liters'] / bdc_comparison['ext_volume_liters'] * 100).fillna(0)
    bdc_comparison['data_loss_pct'] = 100 - bdc_comparison['data_capture_pct']
    bdc_comparison['missing_volume_liters'] = bdc_comparison['ext_volume_liters'] - bdc_comparison['db_volume_liters']
    bdc_comparison['data_type'] = 'BDC'
    
    # Combine both datasets
    combined_comparison = pd.concat([omc_comparison, bdc_comparison], ignore_index=True)
    
    # Add status column
    def get_status(loss_pct):
        if loss_pct > 75:
            return 'CRITICAL'
        elif loss_pct > 50:
            return 'SEVERE'
        elif loss_pct > 20:
            return 'SIGNIFICANT'
        elif loss_pct > 5:
            return 'MINOR'
        else:
            return 'OK'
    
    combined_comparison['status'] = combined_comparison['data_loss_pct'].apply(get_status)
    
    return combined_comparison

def create_company_comparison():
    """Create detailed company-level comparison"""
    print("Creating company-level comparison...")
    
    conn = connect_to_db()
    
    # Get all companies from database
    db_companies_query = """
    SELECT DISTINCT company_name, company_type as data_type,
           COUNT(*) as db_records,
           SUM(volume_liters) as db_total_volume
    FROM (
        SELECT company_name, 'OMC' as company_type, volume_liters FROM petroverse.omc_data
        UNION ALL
        SELECT company_name, 'BDC' as company_type, volume_liters FROM petroverse.bdc_data
    ) combined
    GROUP BY company_name, company_type
    ORDER BY company_type, company_name
    """
    
    db_companies = pd.read_sql(db_companies_query, conn)
    conn.close()
    
    # Load extracted data
    omc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
    bdc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
    
    # Get companies from extracted data
    omc_ext_companies = omc_extracted[omc_extracted['volume'] > 0].groupby('company_name').agg({
        'volume': 'count',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'volume_liters': 'ext_total_volume'
    }).reset_index()
    omc_ext_companies['data_type'] = 'OMC'
    
    bdc_ext_companies = bdc_extracted[bdc_extracted['volume'] > 0].groupby('company_name').agg({
        'volume': 'count',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'volume_liters': 'ext_total_volume'
    }).reset_index()
    bdc_ext_companies['data_type'] = 'BDC'
    
    # Combine extracted data
    ext_companies = pd.concat([omc_ext_companies, bdc_ext_companies], ignore_index=True)
    
    # Merge with database data
    company_comparison = ext_companies.merge(
        db_companies, 
        on=['company_name', 'data_type'], 
        how='outer'
    ).fillna(0)
    
    # Calculate metrics
    company_comparison['data_capture_pct'] = (company_comparison['db_total_volume'] / company_comparison['ext_total_volume'] * 100).fillna(0)
    company_comparison['data_loss_pct'] = 100 - company_comparison['data_capture_pct']
    company_comparison['missing_volume'] = company_comparison['ext_total_volume'] - company_comparison['db_total_volume']
    
    # Add status flags
    company_comparison['in_database'] = company_comparison['db_records'] > 0
    company_comparison['in_extracted'] = company_comparison['ext_records'] > 0
    company_comparison['missing_from_db'] = (company_comparison['ext_records'] > 0) & (company_comparison['db_records'] == 0)
    company_comparison['only_in_db'] = (company_comparison['db_records'] > 0) & (company_comparison['ext_records'] == 0)
    
    return company_comparison.sort_values(['data_type', 'data_loss_pct'], ascending=[True, False])

def create_product_comparison():
    """Create detailed product-level comparison"""
    print("Creating product-level comparison...")
    
    conn = connect_to_db()
    
    # Get all products from database
    db_products_query = """
    SELECT DISTINCT product, company_type as data_type,
           COUNT(*) as db_records,
           SUM(volume_liters) as db_total_volume
    FROM (
        SELECT product, 'OMC' as company_type, volume_liters FROM petroverse.omc_data
        UNION ALL
        SELECT product, 'BDC' as company_type, volume_liters FROM petroverse.bdc_data
    ) combined
    GROUP BY product, company_type
    ORDER BY company_type, product
    """
    
    db_products = pd.read_sql(db_products_query, conn)
    conn.close()
    
    # Load extracted data
    omc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
    bdc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
    
    # Get products from extracted data
    omc_ext_products = omc_extracted[omc_extracted['volume'] > 0].groupby('product').agg({
        'volume': 'count',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'volume_liters': 'ext_total_volume'
    }).reset_index()
    omc_ext_products['data_type'] = 'OMC'
    
    bdc_ext_products = bdc_extracted[bdc_extracted['volume'] > 0].groupby('product').agg({
        'volume': 'count',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'volume_liters': 'ext_total_volume'
    }).reset_index()
    bdc_ext_products['data_type'] = 'BDC'
    
    # Combine extracted data
    ext_products = pd.concat([omc_ext_products, bdc_ext_products], ignore_index=True)
    
    # Merge with database data
    product_comparison = ext_products.merge(
        db_products, 
        on=['product', 'data_type'], 
        how='outer'
    ).fillna(0)
    
    # Calculate metrics
    product_comparison['data_capture_pct'] = (product_comparison['db_total_volume'] / product_comparison['ext_total_volume'] * 100).fillna(0)
    product_comparison['data_loss_pct'] = 100 - product_comparison['data_capture_pct']
    product_comparison['missing_volume'] = product_comparison['ext_total_volume'] - product_comparison['db_total_volume']
    
    return product_comparison.sort_values(['data_type', 'data_loss_pct'], ascending=[True, False])

def create_monthly_comparison():
    """Create detailed month-by-month comparison"""
    print("Creating monthly comparison...")
    
    conn = connect_to_db()
    
    # Get monthly data from database
    db_monthly_query = """
    SELECT year, month, company_type as data_type,
           COUNT(*) as db_records,
           COUNT(DISTINCT company_name) as db_companies,
           SUM(volume_liters) as db_volume_liters
    FROM (
        SELECT year, month, company_name, volume_liters, 'OMC' as company_type FROM petroverse.omc_data
        UNION ALL
        SELECT year, month, company_name, volume_liters, 'BDC' as company_type FROM petroverse.bdc_data
    ) combined
    GROUP BY year, month, company_type
    ORDER BY company_type, year, month
    """
    
    db_monthly = pd.read_sql(db_monthly_query, conn)
    conn.close()
    
    # Load extracted data
    omc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv")
    bdc_extracted = pd.read_csv(r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv")
    
    # Get monthly data from extracted
    omc_ext_monthly = omc_extracted[omc_extracted['volume'] > 0].groupby(['year', 'month']).agg({
        'volume': 'count',
        'company_name': 'nunique',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'company_name': 'ext_companies',
        'volume_liters': 'ext_volume_liters'
    }).reset_index()
    omc_ext_monthly['data_type'] = 'OMC'
    
    bdc_ext_monthly = bdc_extracted[bdc_extracted['volume'] > 0].groupby(['year', 'month']).agg({
        'volume': 'count',
        'company_name': 'nunique',
        'volume_liters': 'sum'
    }).rename(columns={
        'volume': 'ext_records',
        'company_name': 'ext_companies',
        'volume_liters': 'ext_volume_liters'
    }).reset_index()
    bdc_ext_monthly['data_type'] = 'BDC'
    
    # Combine extracted data
    ext_monthly = pd.concat([omc_ext_monthly, bdc_ext_monthly], ignore_index=True)
    
    # Merge with database data
    monthly_comparison = ext_monthly.merge(
        db_monthly,
        on=['year', 'month', 'data_type'],
        how='outer'
    ).fillna(0)
    
    # Calculate metrics
    monthly_comparison['data_capture_pct'] = (monthly_comparison['db_volume_liters'] / monthly_comparison['ext_volume_liters'] * 100).fillna(0)
    monthly_comparison['data_loss_pct'] = 100 - monthly_comparison['data_capture_pct']
    monthly_comparison['missing_volume'] = monthly_comparison['ext_volume_liters'] - monthly_comparison['db_volume_liters']
    
    return monthly_comparison.sort_values(['data_type', 'year', 'month'])

def export_to_files():
    """Export all comparisons to Excel and CSV files"""
    print("Exporting detailed comparison reports...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create all comparison reports
    year_summary = create_year_by_year_summary()
    company_comparison = create_company_comparison()
    product_comparison = create_product_comparison()
    monthly_comparison = create_monthly_comparison()
    
    # Export to Excel with multiple sheets
    excel_path = f"DETAILED_DATA_COMPARISON_{timestamp}.xlsx"
    print(f"Creating Excel file: {excel_path}")
    
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        # Summary sheet
        year_summary.to_excel(writer, sheet_name='Year_Summary', index=False)
        
        # Company comparison
        company_comparison.to_excel(writer, sheet_name='Company_Comparison', index=False)
        
        # Product comparison
        product_comparison.to_excel(writer, sheet_name='Product_Comparison', index=False)
        
        # Monthly comparison
        monthly_comparison.to_excel(writer, sheet_name='Monthly_Comparison', index=False)
        
        # Critical issues summary
        critical_issues = year_summary[year_summary['data_loss_pct'] > 50].sort_values('data_loss_pct', ascending=False)
        critical_issues.to_excel(writer, sheet_name='Critical_Issues', index=False)
    
    # Export individual CSV files
    print("Creating CSV files...")
    year_summary.to_csv(f"year_by_year_comparison_{timestamp}.csv", index=False)
    company_comparison.to_csv(f"company_comparison_{timestamp}.csv", index=False)
    product_comparison.to_csv(f"product_comparison_{timestamp}.csv", index=False)
    monthly_comparison.to_csv(f"monthly_comparison_{timestamp}.csv", index=False)
    
    print(f"\nFiles created:")
    print(f"  Excel: {excel_path}")
    print(f"  CSV: year_by_year_comparison_{timestamp}.csv")
    print(f"  CSV: company_comparison_{timestamp}.csv")
    print(f"  CSV: product_comparison_{timestamp}.csv")
    print(f"  CSV: monthly_comparison_{timestamp}.csv")
    
    # Print summary statistics
    print(f"\nSUMMARY STATISTICS:")
    print(f"  Critical data gaps (>75% loss): {len(critical_issues):,}")
    print(f"  Companies needing attention: {len(company_comparison[company_comparison['data_loss_pct'] > 50]):,}")
    print(f"  Products with issues: {len(product_comparison[product_comparison['data_loss_pct'] > 50]):,}")
    print(f"  Months with severe loss: {len(monthly_comparison[monthly_comparison['data_loss_pct'] > 50]):,}")
    
    return excel_path

def main():
    """Main export function"""
    print("DETAILED DATA COMPARISON EXPORT")
    print("=" * 60)
    print(f"Export started: {datetime.now()}")
    
    try:
        excel_file = export_to_files()
        
        print("\n" + "=" * 60)
        print("EXPORT COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Main file: {excel_file}")
        print("You can now review the data in granular detail.")
        
    except Exception as e:
        print(f"Error during export: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()