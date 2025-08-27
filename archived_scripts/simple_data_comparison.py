"""
Simple Direct Data Comparison
Compare corrected extracted data vs current database
"""

import pandas as pd
import psycopg2
from datetime import datetime

def connect_to_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="petroverse_analytics",
        user="postgres",
        password="postgres"
    )

def load_database_data():
    """Load current database data"""
    print("Loading current database data...")
    
    conn = connect_to_db()
    
    # Load OMC data
    omc_query = """
    SELECT year, month, company_name, product, volume_liters, volume_mt
    FROM petroverse.omc_data
    ORDER BY year, month, company_name, product
    """
    
    omc_db = pd.read_sql(omc_query, conn)
    print(f"  Database OMC records: {len(omc_db):,}")
    
    # Load BDC data
    bdc_query = """
    SELECT year, month, company_name, product, volume_liters, volume_mt
    FROM petroverse.bdc_data
    ORDER BY year, month, company_name, product
    """
    
    bdc_db = pd.read_sql(bdc_query, conn)
    print(f"  Database BDC records: {len(bdc_db):,}")
    
    conn.close()
    
    return {'omc': omc_db, 'bdc': bdc_db}

def load_extracted_data():
    """Load corrected extracted data"""
    print("Loading corrected extracted data...")
    
    # Load OMC extracted data
    omc_path = r"CORRECTED_COMPLETE_omc_data_20250826_222926.csv"
    omc_extracted = pd.read_csv(omc_path)
    
    # Filter to non-zero records for comparison (since DB likely only has non-zero)
    omc_nonzero = omc_extracted[omc_extracted['volume'] > 0].copy()
    print(f"  Extracted OMC records (non-zero): {len(omc_nonzero):,}")
    print(f"  Extracted OMC records (total with zeros): {len(omc_extracted):,}")
    
    # Load BDC extracted data  
    bdc_path = r"CORRECTED_COMPLETE_bdc_data_20250826_222926.csv"
    bdc_extracted = pd.read_csv(bdc_path)
    
    # Filter to non-zero records for comparison
    bdc_nonzero = bdc_extracted[bdc_extracted['volume'] > 0].copy()
    print(f"  Extracted BDC records (non-zero): {len(bdc_nonzero):,}")
    print(f"  Extracted BDC records (total with zeros): {len(bdc_extracted):,}")
    
    return {'omc': omc_nonzero, 'bdc': bdc_nonzero}

def compare_year_by_year(data_type, db_data, extracted_data):
    """Compare database vs extracted data year by year"""
    print(f"\n{data_type.upper()} YEAR-BY-YEAR COMPARISON")
    print("=" * 70)
    
    db_df = db_data[data_type]
    ext_df = extracted_data[data_type]
    
    # Get all years from both sources
    all_years = sorted(set(list(db_df['year'].unique()) + list(ext_df['year'].unique())))
    
    comparison_results = {}
    
    for year in all_years:
        print(f"\n{year} COMPARISON:")
        print("-" * 40)
        
        # Data for this year
        db_year = db_df[db_df['year'] == year]
        ext_year = ext_df[ext_df['year'] == year]
        
        # Basic metrics
        db_companies = db_year['company_name'].nunique() if len(db_year) > 0 else 0
        ext_companies = ext_year['company_name'].nunique() if len(ext_year) > 0 else 0
        db_volume = db_year['volume_liters'].sum() if len(db_year) > 0 else 0
        ext_volume = ext_year['volume_liters'].sum() if len(ext_year) > 0 else 0
        
        print(f"  Companies - Database: {db_companies:,}, Extracted: {ext_companies:,}")
        print(f"  Records - Database: {len(db_year):,}, Extracted: {len(ext_year):,}")
        print(f"  Volume (L) - Database: {db_volume:,.0f}, Extracted: {ext_volume:,.0f}")
        
        # Calculate data capture/loss
        if ext_volume > 0:
            capture_pct = (db_volume / ext_volume * 100)
            data_loss_pct = 100 - capture_pct
        else:
            capture_pct = 100 if db_volume == 0 else 0
            data_loss_pct = 0
        
        print(f"  Data Capture: {capture_pct:.1f}%")
        print(f"  Data Loss: {data_loss_pct:.1f}%")
        
        # Flag critical issues
        status = "OK"
        if data_loss_pct > 75:
            status = "CRITICAL DATA LOSS"
        elif data_loss_pct > 50:
            status = "SEVERE DATA LOSS"
        elif data_loss_pct > 20:
            status = "SIGNIFICANT LOSS"
        elif data_loss_pct > 5:
            status = "MINOR LOSS"
        
        print(f"  Status: {status}")
        
        comparison_results[year] = {
            'db_companies': db_companies,
            'ext_companies': ext_companies,
            'db_records': len(db_year),
            'ext_records': len(ext_year),
            'db_volume': db_volume,
            'ext_volume': ext_volume,
            'capture_pct': capture_pct,
            'data_loss_pct': data_loss_pct,
            'status': status
        }
    
    return comparison_results

def analyze_critical_gaps(omc_results, bdc_results):
    """Identify critical data gaps that need immediate attention"""
    print("\n" + "=" * 80)
    print("CRITICAL DATA GAPS ANALYSIS")
    print("=" * 80)
    
    critical_issues = []
    
    # Analyze OMC issues
    for year, stats in omc_results.items():
        if stats['data_loss_pct'] > 50:
            critical_issues.append({
                'type': 'OMC',
                'year': year,
                'data_loss_pct': stats['data_loss_pct'],
                'missing_volume': stats['ext_volume'] - stats['db_volume'],
                'priority': 'CRITICAL' if stats['data_loss_pct'] > 75 else 'HIGH'
            })
    
    # Analyze BDC issues  
    for year, stats in bdc_results.items():
        if stats['data_loss_pct'] > 50:
            critical_issues.append({
                'type': 'BDC',
                'year': year,
                'data_loss_pct': stats['data_loss_pct'],
                'missing_volume': stats['ext_volume'] - stats['db_volume'],
                'priority': 'CRITICAL' if stats['data_loss_pct'] > 75 else 'HIGH'
            })
    
    # Sort by priority and data loss
    critical_issues.sort(key=lambda x: (x['priority'] == 'CRITICAL', x['data_loss_pct']), reverse=True)
    
    print(f"Found {len(critical_issues)} critical data gaps:")
    print()
    
    for i, issue in enumerate(critical_issues, 1):
        print(f"{i}. {issue['year']} {issue['type']} Data Loss:")
        print(f"   - Missing: {issue['data_loss_pct']:.1f}% of data")
        print(f"   - Volume lost: {issue['missing_volume']:,.0f} liters")
        print(f"   - Priority: {issue['priority']}")
        print()
    
    if critical_issues:
        print("RECOMMENDED ACTION:")
        print("1. Focus on 2019 OMC data (likely most critical)")
        print("2. Create safe import script with company/product standardization")
        print("3. Import missing data with duplicate detection")
        print("4. Validate data integrity after import")
    else:
        print("No critical data gaps found!")
    
    return critical_issues

def main():
    """Main comparison function"""
    print("SIMPLE DIRECT DATA COMPARISON")
    print("=" * 80)
    print(f"Analysis started: {datetime.now()}")
    
    try:
        # Load data
        db_data = load_database_data()
        extracted_data = load_extracted_data()
        
        # Compare OMC data
        omc_results = compare_year_by_year('omc', db_data, extracted_data)
        
        # Compare BDC data
        bdc_results = compare_year_by_year('bdc', db_data, extracted_data)
        
        # Analyze critical gaps
        critical_issues = analyze_critical_gaps(omc_results, bdc_results)
        
        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print(f"Analysis completed: {datetime.now()}")
        
        return critical_issues
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    main()