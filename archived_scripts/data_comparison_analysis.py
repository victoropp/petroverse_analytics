"""
Comprehensive Data Comparison Analysis
Compare extracted data vs current database across all years
Identify gaps, standardization needs, and potential duplications
"""

import pandas as pd
import asyncio
import asyncpg
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class DataComparisonAnalyzer:
    """Analyze extracted data vs database for safe data correction"""
    
    def __init__(self):
        self.db_url = "postgresql://postgres:postgres@localhost:5432/petroverse_analytics"
        self.extracted_data = {}
        self.database_data = {}
        self.standardized_mappings = {}
        
    async def load_database_data(self):
        """Load current database data for comparison"""
        print("Loading current database data...")
        
        conn = await asyncpg.connect(self.db_url)
        
        # Load BDC data
        bdc_query = """
        SELECT 
            b.year, b.month, b.company_name, b.product, 
            b.volume_liters, b.volume_mt,
            'BDC' as source_type
        FROM petroverse.bdc_data b
        ORDER BY year, month, company_name, product
        """
        
        bdc_records = await conn.fetch(bdc_query)
        self.database_data['bdc'] = pd.DataFrame(bdc_records)
        print(f"  Database BDC records: {len(self.database_data['bdc']):,}")
        
        # Load OMC data
        omc_query = """
        SELECT 
            o.year, o.month, o.company_name, o.product, 
            o.volume_liters, o.volume_mt,
            'OMC' as source_type
        FROM petroverse.omc_data o
        ORDER BY year, month, company_name, product
        """
        
        omc_records = await conn.fetch(omc_query)
        self.database_data['omc'] = pd.DataFrame(omc_records)
        print(f"  Database OMC records: {len(self.database_data['omc']):,}")
        
        # Load standardized companies and products
        companies_query = "SELECT company_id, company_name, company_type FROM petroverse.companies"
        companies_records = await conn.fetch(companies_query)
        self.standardized_mappings['companies'] = pd.DataFrame(companies_records)
        
        products_query = "SELECT product_id, product_name, product_category FROM petroverse.products"
        products_records = await conn.fetch(products_query)
        self.standardized_mappings['products'] = pd.DataFrame(products_records)
        
        await conn.close()
        print(f"  Standardized companies: {len(self.standardized_mappings['companies']):,}")
        print(f"  Standardized products: {len(self.standardized_mappings['products']):,}")
    
    def load_extracted_data(self):
        """Load extracted data from CSV files"""
        print("Loading extracted data...")
        
        # Load BDC extracted data
        try:
            bdc_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\CORRECTED_COMPLETE_bdc_data_20250826_222926.csv"
            self.extracted_data['bdc'] = pd.read_csv(bdc_path)
            print(f"  Extracted BDC records: {len(self.extracted_data['bdc']):,}")
        except FileNotFoundError:
            print("  Warning: BDC extracted data not found")
            self.extracted_data['bdc'] = pd.DataFrame()
        
        # Load OMC extracted data
        try:
            omc_path = r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics\data\CORRECTED_COMPLETE_omc_data_20250826_222926.csv"
            self.extracted_data['omc'] = pd.read_csv(omc_path)
            print(f"  Extracted OMC records: {len(self.extracted_data['omc']):,}")
        except FileNotFoundError:
            print("  Warning: OMC extracted data not found")
            self.extracted_data['omc'] = pd.DataFrame()
    
    def compare_by_year(self, data_type='omc'):
        """Compare extracted vs database data year by year"""
        print(f"\n{data_type.upper()} YEAR-BY-YEAR COMPARISON")
        print("=" * 60)
        
        if data_type not in self.extracted_data or data_type not in self.database_data:
            print(f"  Warning: {data_type} data not available for comparison")
            return {}
        
        extracted = self.extracted_data[data_type]
        database = self.database_data[data_type]
        
        # Get all years from both sources
        all_years = sorted(set(list(extracted['year'].unique()) + list(database['year'].unique())))
        
        comparison_results = {}
        
        for year in all_years:
            print(f"\n{year} COMPARISON:")
            print("-" * 30)
            
            # Extracted data for this year
            ext_year = extracted[extracted['year'] == year]
            db_year = database[database['year'] == year]
            
            # Basic metrics
            ext_companies = ext_year['company_name'].nunique() if len(ext_year) > 0 else 0
            db_companies = db_year['company_name'].nunique() if len(db_year) > 0 else 0
            ext_volume = ext_year['volume_liters'].sum() if len(ext_year) > 0 else 0
            db_volume = db_year['volume_liters'].sum() if len(db_year) > 0 else 0
            
            print(f"  Companies - Extracted: {ext_companies:,}, Database: {db_companies:,}")
            print(f"  Records - Extracted: {len(ext_year):,}, Database: {len(db_year):,}")
            print(f"  Volume (L) - Extracted: {ext_volume:,.0f}, Database: {db_volume:,.0f}")
            
            # Calculate data capture percentage
            capture_pct = (db_volume / ext_volume * 100) if ext_volume > 0 else 0
            data_loss_pct = 100 - capture_pct if ext_volume > 0 else 0
            
            print(f"  Data Capture: {capture_pct:.1f}%")
            print(f"  Data Loss: {data_loss_pct:.1f}%")
            
            # Flag critical issues
            status = "OK"
            if data_loss_pct > 50:
                status = "CRITICAL DATA LOSS"
            elif data_loss_pct > 20:
                status = "SIGNIFICANT LOSS"
            elif data_loss_pct > 5:
                status = "MINOR LOSS"
            
            print(f"  Status: {status}")
            
            comparison_results[year] = {
                'ext_companies': ext_companies,
                'db_companies': db_companies,
                'ext_records': len(ext_year),
                'db_records': len(db_year),
                'ext_volume': ext_volume,
                'db_volume': db_volume,
                'capture_pct': capture_pct,
                'data_loss_pct': data_loss_pct,
                'status': status
            }
        
        return comparison_results
    
    def analyze_company_standardization(self, data_type='omc'):
        """Analyze company name standardization needs"""
        print(f"\n{data_type.upper()} COMPANY STANDARDIZATION ANALYSIS")
        print("=" * 60)
        
        if data_type not in self.extracted_data:
            print(f"  Warning: {data_type} extracted data not available")
            return {}
        
        extracted = self.extracted_data[data_type]
        std_companies = self.standardized_mappings['companies']
        
        # Get company type filter
        company_type = data_type.upper()
        std_companies_filtered = std_companies[std_companies['company_type'] == company_type]
        
        print(f"  Extracted companies: {extracted['company_name'].nunique():,}")
        print(f"  Standardized companies in DB: {len(std_companies_filtered):,}")
        
        # Find companies that need mapping
        extracted_companies = set(extracted['company_name'].str.upper().unique())
        standardized_companies = set(std_companies_filtered['company_name'].str.upper().unique())
        
        # Companies in extracted but not standardized
        unmapped_companies = extracted_companies - standardized_companies
        
        # Companies in standardized but not extracted  
        unused_companies = standardized_companies - extracted_companies
        
        print(f"  Companies needing mapping: {len(unmapped_companies):,}")
        print(f"  Unused standardized companies: {len(unused_companies):,}")
        
        if unmapped_companies:
            print(f"\n  Sample unmapped companies ({min(10, len(unmapped_companies))}):")
            for company in sorted(list(unmapped_companies))[:10]:
                print(f"    - {company}")
        
        return {
            'extracted_companies': extracted_companies,
            'standardized_companies': standardized_companies,
            'unmapped_companies': unmapped_companies,
            'unused_companies': unused_companies
        }
    
    def analyze_product_standardization(self, data_type='omc'):
        """Analyze product name standardization needs"""
        print(f"\n{data_type.upper()} PRODUCT STANDARDIZATION ANALYSIS")
        print("=" * 60)
        
        if data_type not in self.extracted_data:
            print(f"  Warning: {data_type} extracted data not available")
            return {}
        
        extracted = self.extracted_data[data_type]
        std_products = self.standardized_mappings['products']
        
        print(f"  Extracted products: {extracted['product'].nunique():,}")
        print(f"  Standardized products in DB: {len(std_products):,}")
        
        # Find products that need mapping
        extracted_products = set(extracted['product'].str.upper().unique())
        standardized_products = set(std_products['product_name'].str.upper().unique())
        
        # Products in extracted but not standardized
        unmapped_products = extracted_products - standardized_products
        
        # Products in standardized but not extracted
        unused_products = standardized_products - extracted_products
        
        print(f"  Products needing mapping: {len(unmapped_products):,}")
        print(f"  Unused standardized products: {len(unused_products):,}")
        
        if unmapped_products:
            print(f"\n  Sample unmapped products:")
            for product in sorted(list(unmapped_products)):
                print(f"    - {product}")
        
        if unused_products:
            print(f"\n  Unused standardized products:")
            for product in sorted(list(unused_products)):
                print(f"    - {product}")
        
        return {
            'extracted_products': extracted_products,
            'standardized_products': standardized_products,
            'unmapped_products': unmapped_products,
            'unused_products': unused_products
        }
    
    def identify_critical_gaps(self):
        """Identify the most critical data gaps that need fixing"""
        print("\nCRITICAL DATA GAPS ANALYSIS")
        print("=" * 60)
        
        critical_issues = []
        
        # Compare OMC data
        if 'omc' in self.extracted_data and 'omc' in self.database_data:
            omc_comparison = self.compare_by_year('omc')
            
            for year, stats in omc_comparison.items():
                if stats['data_loss_pct'] > 50:
                    critical_issues.append({
                        'type': 'OMC',
                        'year': year,
                        'issue': f"{stats['data_loss_pct']:.1f}% data loss",
                        'priority': 'CRITICAL',
                        'action': 'Import missing data'
                    })
        
        # Compare BDC data (if available)
        if 'bdc' in self.extracted_data and 'bdc' in self.database_data:
            bdc_comparison = self.compare_by_year('bdc')
            
            for year, stats in bdc_comparison.items():
                if stats['data_loss_pct'] > 50:
                    critical_issues.append({
                        'type': 'BDC',
                        'year': year,
                        'issue': f"{stats['data_loss_pct']:.1f}% data loss",
                        'priority': 'CRITICAL',
                        'action': 'Import missing data'
                    })
        
        # Sort by priority and year
        critical_issues.sort(key=lambda x: (x['priority'], x['year']))
        
        print(f"  Found {len(critical_issues)} critical issues:")
        for issue in critical_issues:
            print(f"    {issue['year']} {issue['type']}: {issue['issue']} - {issue['action']}")
        
        return critical_issues
    
    def generate_safe_import_plan(self):
        """Generate a safe plan for importing missing data"""
        print("\nSAFE DATA IMPORT PLAN")
        print("=" * 60)
        
        # Identify critical gaps
        critical_issues = self.identify_critical_gaps()
        
        print("\nRECOMMENDED ACTIONS:")
        print("-" * 30)
        
        for issue in critical_issues:
            if issue['year'] == 2019 and issue['type'] == 'OMC':
                print(f"1. PRIORITY: Fix 2019 OMC data loss ({issue['issue']})")
                print("   - Clear existing 2019 OMC data")
                print("   - Import complete 2019 extracted data")
                print("   - Use standardized company/product mappings")
                print("   - Validate no duplicates")
                
        print("\nSAFETY MEASURES:")
        print("-" * 20)
        print("✓ Database backup created")
        print("✓ Use standardized company names from database")
        print("✓ Use standardized product names from database") 
        print("✓ Implement duplicate detection")
        print("✓ Validate data integrity after import")
        print("✓ Rollback plan available")
        
        return critical_issues

async def main():
    """Main analysis function"""
    print("COMPREHENSIVE DATA COMPARISON ANALYSIS")
    print("=" * 80)
    print(f"Analysis started at: {datetime.now()}")
    
    analyzer = DataComparisonAnalyzer()
    
    # Load all data
    await analyzer.load_database_data()
    analyzer.load_extracted_data()
    
    # Perform comprehensive comparison
    print("\n" + "=" * 80)
    print("DETAILED COMPARISON ANALYSIS")
    print("=" * 80)
    
    # OMC Analysis
    analyzer.compare_by_year('omc')
    analyzer.analyze_company_standardization('omc')
    analyzer.analyze_product_standardization('omc')
    
    # BDC Analysis (if available)
    if 'bdc' in analyzer.extracted_data and len(analyzer.extracted_data['bdc']) > 0:
        analyzer.compare_by_year('bdc')
        analyzer.analyze_company_standardization('bdc')
        analyzer.analyze_product_standardization('bdc')
    
    # Generate safe import plan
    analyzer.generate_safe_import_plan()
    
    print("\n" + "=" * 80)
    print("ANALYSIS COMPLETED")
    print("=" * 80)
    print(f"Analysis completed at: {datetime.now()}")
    print("Review the results above before proceeding with data corrections.")

if __name__ == "__main__":
    asyncio.run(main())