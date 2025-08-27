"""
Database Corruption Analysis and Mapping Proposal
Analyzes the fuzzy matching disaster and proposes proper company mapping
"""

import pandas as pd
import psycopg2

def analyze_corruption_and_propose_mapping():
    """Analyze the corruption and propose proper mapping"""
    
    print("DATABASE CORRUPTION ANALYSIS & MAPPING PROPOSAL")
    print("=" * 80)
    
    # Load extracted data (what should be in DB)
    omc_extracted = pd.read_csv('CORRECTED_COMPLETE_omc_data_20250826_222926.csv')
    bdc_extracted = pd.read_csv('CORRECTED_COMPLETE_bdc_data_20250826_222926.csv')
    
    # Connect to database to see current state
    conn = psycopg2.connect(
        host="localhost", port=5432, database="petroverse_analytics",
        user="postgres", password="postgres"
    )
    
    # Get current corrupted state
    omc_db = pd.read_sql("SELECT company_name, COUNT(*) as records FROM petroverse.omc_data GROUP BY company_name", conn)
    bdc_db = pd.read_sql("SELECT company_name, COUNT(*) as records FROM petroverse.bdc_data GROUP BY company_name", conn)
    
    conn.close()
    
    print("\n1. CORRUPTION SUMMARY:")
    print("=" * 40)
    print(f"Should have OMC companies: {omc_extracted['company_name'].nunique():,}")
    print(f"Actually has OMC companies: {len(omc_db):,}")
    print(f"Loss: {omc_extracted['company_name'].nunique() - len(omc_db):,} companies")
    print()
    print(f"Should have BDC companies: {bdc_extracted['company_name'].nunique():,}")
    print(f"Actually has BDC companies: {len(bdc_db):,}")
    print(f"Loss: {bdc_extracted['company_name'].nunique() - len(bdc_db):,} companies")
    
    print("\n2. PROPOSED COMPANY CLEANING & MAPPING:")
    print("=" * 50)
    
    # Analyze OMC companies that need cleaning
    print("\nOMC COMPANIES TO CLEAN/STANDARDIZE:")
    omc_companies = sorted(omc_extracted['company_name'].unique())
    
    # Group similar companies for standardization
    company_groups = {}
    standardized_names = {}
    
    for company in omc_companies:
        clean_company = clean_company_name(company)
        if clean_company:
            # Find the best representative name for this group
            base_name = find_base_company_name(clean_company)
            
            if base_name not in company_groups:
                company_groups[base_name] = []
            company_groups[base_name].append(company)
            standardized_names[company] = base_name
    
    # Show mapping proposal for OMC
    print(f"\nOMC MAPPING PROPOSAL ({len(company_groups)} unique companies):")
    print("-" * 60)
    
    for i, (standard_name, variations) in enumerate(sorted(company_groups.items())[:30], 1):
        if len(variations) > 1:
            print(f"{i:2d}. {standard_name}")
            for var in variations:
                if var != standard_name:
                    print(f"     ← {var}")
        else:
            print(f"{i:2d}. {standard_name}")
    
    if len(company_groups) > 30:
        print(f"... and {len(company_groups) - 30} more companies")
    
    # Same for BDC
    print(f"\nBDC COMPANIES TO CLEAN/STANDARDIZE:")
    bdc_companies = sorted(bdc_extracted['company_name'].unique())
    
    bdc_groups = {}
    bdc_standardized = {}
    
    for company in bdc_companies:
        clean_company = clean_company_name(company)
        if clean_company:
            base_name = find_base_company_name(clean_company)
            
            if base_name not in bdc_groups:
                bdc_groups[base_name] = []
            bdc_groups[base_name].append(company)
            bdc_standardized[company] = base_name
    
    print(f"\nBDC MAPPING PROPOSAL ({len(bdc_groups)} unique companies):")
    print("-" * 60)
    
    for i, (standard_name, variations) in enumerate(sorted(bdc_groups.items())[:20], 1):
        if len(variations) > 1:
            print(f"{i:2d}. {standard_name}")
            for var in variations:
                if var != standard_name:
                    print(f"     ← {var}")
        else:
            print(f"{i:2d}. {standard_name}")
    
    if len(bdc_groups) > 20:
        print(f"... and {len(bdc_groups) - 20} more companies")
    
    print("\n3. DATABASE CLEANING PLAN:")
    print("=" * 40)
    print("✓ Clear all corrupted data from omc_data and bdc_data tables")
    print("✓ Clear companies table completely")
    print("✓ Re-import with proper company name standardization")
    print("✓ Create company mapping table for reference")
    
    print("\n4. EXPECTED FINAL RESULTS:")
    print("=" * 35)
    print(f"OMC Companies: {len(company_groups):,} (down from {omc_extracted['company_name'].nunique():,} raw)")
    print(f"BDC Companies: {len(bdc_groups):,} (down from {bdc_extracted['company_name'].nunique():,} raw)")
    print(f"Total Companies: {len(company_groups) + len(bdc_groups):,}")
    print(f"OMC Records: ~{len(omc_extracted):,}")
    print(f"BDC Records: ~{len(bdc_extracted):,}")
    
    return {
        'omc_mapping': standardized_names,
        'bdc_mapping': bdc_standardized,
        'omc_groups': company_groups,
        'bdc_groups': bdc_groups
    }

def clean_company_name(company_name):
    """Clean a company name"""
    if pd.isna(company_name):
        return None
        
    clean = str(company_name).strip()
    
    # Remove leading asterisks
    clean = clean.lstrip('*')
    
    # Remove obviously bad entries
    if clean.upper() in ['COMPANY', 'TOTAL', 'GRAND', 'SUM', 'NO', 'NAN', 'UNNAMED']:
        return None
    
    if len(clean.strip()) < 2:
        return None
        
    return clean.strip()

def find_base_company_name(company_name):
    """Find the best base name for a company"""
    clean = company_name.upper()
    
    # Remove common suffixes for grouping
    suffixes_to_remove = [
        'LIMITED', 'LTD', 'LTD.', 'COMPANY', 'CO', 'CO.', 'GHANA', 'GH', 'GH.',
        'SERVICES', 'SERVICE', 'PETROLEUM', 'OIL', 'ENERGY', 'GROUP'
    ]
    
    base = clean
    for suffix in suffixes_to_remove:
        if base.endswith(' ' + suffix):
            base = base[:-len(suffix)-1].strip()
    
    # Handle some common variations
    standardizations = {
        'AI ENERGY & PETROLEUM': 'AI ENERGY GROUP',
        'AI ENERGY AND PETROLEUM': 'AI ENERGY GROUP', 
        'ALIVE GAS SERVICES': 'ALIVE GAS SERVICE',
        'ALIVE GAS SERVICE': 'ALIVE GAS SERVICE',
        'AKWAABA LINK INVESTMENTS': 'AKWAABA LINK GROUP',
        'AKWABA LINK': 'AKWAABA LINK GROUP',
        'BLUE OCEAN INVESTMENTS': 'BLUE OCEAN GROUP',
        'BLUE OCEAN ENERGY': 'BLUE OCEAN GROUP',
        'CHASE PET. GHANA': 'CHASE PETROLEUM GHANA',
        'CHASE PETROLEUM GHANA': 'CHASE PETROLEUM GHANA'
    }
    
    if base in standardizations:
        return standardizations[base]
    
    # Use the cleaned base name as title case
    return ' '.join(word.capitalize() for word in base.split())

if __name__ == "__main__":
    mapping_proposal = analyze_corruption_and_propose_mapping()
    
    print("\n" + "=" * 80)
    print("REVIEW THE MAPPING ABOVE BEFORE PROCEEDING!")
    print("=" * 80)
    print("This will help you understand what will be standardized.")