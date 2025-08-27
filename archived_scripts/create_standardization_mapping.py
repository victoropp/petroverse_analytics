"""
Create Comprehensive Standardization Mapping for Review
Exports all company name mappings to Excel for user review and correction
"""

import pandas as pd
from datetime import datetime
import re

def create_standardization_mapping():
    """Create full standardization mapping for review"""
    
    print("CREATING COMPREHENSIVE STANDARDIZATION MAPPING")
    print("=" * 60)
    
    # Load extracted data
    omc_data = pd.read_csv('CORRECTED_COMPLETE_omc_data_20250826_222926.csv')
    bdc_data = pd.read_csv('CORRECTED_COMPLETE_bdc_data_20250826_222926.csv')
    
    # Process OMC companies
    omc_companies = process_companies(omc_data, 'OMC')
    
    # Process BDC companies
    bdc_companies = process_companies(bdc_data, 'BDC')
    
    # Create Excel file with multiple sheets
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    excel_file = f'COMPANY_STANDARDIZATION_MAPPING_{timestamp}.xlsx'
    
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        # Sheet 1: OMC Company Mapping
        omc_mapping_df = create_mapping_dataframe(omc_companies, 'OMC')
        omc_mapping_df.to_excel(writer, sheet_name='OMC_Mapping', index=False)
        
        # Sheet 2: BDC Company Mapping
        bdc_mapping_df = create_mapping_dataframe(bdc_companies, 'BDC')
        bdc_mapping_df.to_excel(writer, sheet_name='BDC_Mapping', index=False)
        
        # Sheet 3: Summary
        summary_df = create_summary_dataframe(omc_mapping_df, bdc_mapping_df)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        # Sheet 4: Instructions
        instructions_df = create_instructions_dataframe()
        instructions_df.to_excel(writer, sheet_name='Instructions', index=False)
    
    print(f"\nMAPPING FILE CREATED: {excel_file}")
    print("\nSUMMARY:")
    print(f"- OMC companies: {len(omc_companies)} unique raw names")
    print(f"- BDC companies: {len(bdc_companies)} unique raw names")
    print(f"- Total mappings to review: {len(omc_companies) + len(bdc_companies)}")
    
    return excel_file

def process_companies(data, company_type):
    """Process companies and get unique names with counts"""
    # Get unique companies with their record counts
    company_counts = data.groupby('company_name').size().reset_index(name='record_count')
    
    # Get volume totals for each company
    company_volumes = data.groupby('company_name')['volume_liters'].sum().reset_index(name='total_volume_liters')
    
    # Merge counts and volumes
    companies = company_counts.merge(company_volumes, on='company_name')
    
    # Sort by record count descending
    companies = companies.sort_values('record_count', ascending=False)
    
    return companies

def create_mapping_dataframe(companies, company_type):
    """Create mapping dataframe for Excel export"""
    mapping_data = []
    
    for _, row in companies.iterrows():
        original_name = row['company_name']
        
        # Apply intelligent standardization rules
        standardized_name = standardize_company_name(original_name, company_type)
        
        # Check if standardization is needed
        needs_standardization = (original_name != standardized_name)
        
        mapping_data.append({
            'Original_Name': original_name,
            'Proposed_Standard_Name': standardized_name,
            'Needs_Standardization': 'YES' if needs_standardization else 'NO',
            'Record_Count': row['record_count'],
            'Total_Volume_Liters': row['total_volume_liters'],
            'Your_Corrected_Name': '',  # Empty for user to fill
            'Notes': ''  # For user comments
        })
    
    return pd.DataFrame(mapping_data)

def standardize_company_name(name, company_type):
    """Apply intelligent standardization rules"""
    if pd.isna(name):
        return name
    
    # Clean the name
    clean = str(name).strip()
    
    # Remove leading asterisks
    clean = clean.lstrip('*')
    
    # Check if it's a junk entry
    if clean.upper() in ['COMPANY', 'TOTAL', 'GRAND', 'SUM', 'NO', 'NAN', 'UNNAMED']:
        return f"INVALID_{clean}"
    
    if len(clean) < 2:
        return f"INVALID_{clean}"
    
    # Apply specific standardization rules
    if company_type == 'OMC':
        standardized = apply_omc_standardization(clean)
    else:
        standardized = apply_bdc_standardization(clean)
    
    return standardized

def apply_omc_standardization(name):
    """Apply OMC-specific standardization rules"""
    upper_name = name.upper()
    
    # Specific mappings for known variations
    omc_mappings = {
        'AI ENERGY GROUP LIMITED': 'AI ENERGY GROUP',
        'AI ENERGY & PETROLEUM LIMITED': 'AI ENERGY GROUP',
        'AI ENERGY AND PETROLEUM LIMITED': 'AI ENERGY GROUP',
        'ALIVE GAS': 'ALIVE GAS SERVICE',
        'ALIVE GAS SERVICE LIMITED': 'ALIVE GAS SERVICE',
        'ALIVE GAS SERVICES LIMITED': 'ALIVE GAS SERVICE',
        'AGAPET LIMITED': 'AGAPET',
        'ANNANDALE GHANA LIMITED': 'ANNANDALE GHANA',
        'AP OIL & GAS GHANA LIMITED': 'AP OIL & GAS',
        'APEX PETROLEUM GHANA LIMITED': 'APEX PETROLEUM',
        'BEAP ENERGY GHANA LIMITED': 'BEAP ENERGY',
        'BF PETROLEUM LIMITED': 'BF PETROLEUM',
        'BG PETROLEUM LIMITED': 'BG PETROLEUM',
        'BIG ENERGY LIMITED': 'BIGEN PETROLEUM',
        'BIGEN PETROLEUM LIMITED': 'BIGEN PETROLEUM',
        'BIGEN PETROLEUM LIMITED (formally Big Energy Limited)': 'BIGEN PETROLEUM',
        'BLACK ROCK ENERGY LIMITED': 'BLACK ROCK ENERGY',
        'BLOOM PETROLEUM LIMITED': 'BLOOM PETROLEUM',
        'BRENT PETROLEUM LIMITED': 'BRENT PETROLEUM',
        'CENTRAL BRENT PETROLEUM LIMITED': 'CENTRAL BRENT PETROLEUM',
        'CHAMPION OIL CO. LTD': 'CHAMPION OIL',
        'DA OIL CO. LTD': 'DA OIL',
        'DESERT OIL GHANA LIMITED': 'DESERT OIL',
        'EV. OIL CO. LTD': 'EV OIL',
        'EXCEL OIL CO. LTD': 'EXCEL OIL',
        'FRIMPS OIL CO. LTD': 'FRIMPS OIL',
        'GALAXY OIL CO. LTD': 'GALAXY OIL',
        'GLORY OIL CO. LTD': 'GLORY OIL',
        'GLORY OIL CO.LTD': 'GLORY OIL',
        'GOIL COMPANY LIMITED': 'GOIL',
        'GOIL PLC': 'GOIL',
        'GRACE OIL PETROLEUM CO. LTD.': 'GRACE OIL PETROLEUM',
        'JO&JU OIL LIMITED': 'JO & JU ENERGY',
        'JO & JU ENERGY LIMITED': 'JO & JU ENERGY',
        'MAXX ENERGY LIMITED': 'MAXX ENERGY GROUP',
        'MAXX ENERGY GROUP LIMITED': 'MAXX ENERGY GROUP',
        'NAAGAMNI GHANA LTD': 'NAAGAMNI GHANA',
        'NAAGAMNI GHANA LIMITED': 'NAAGAMNI GHANA',
        'PETROSOL GHANA LIMITED': 'PETROSOL GROUP',
        'PETROSOL GROUP LIMITED': 'PETROSOL GROUP',
        'RUNEL ENERGY LIMITED': 'RUNEL ENERGY',
        'RUNEL ENERGY LTD': 'RUNEL ENERGY'
    }
    
    if upper_name in omc_mappings:
        return omc_mappings[upper_name]
    
    # General cleanup - remove common suffixes
    clean = name
    for suffix in ['LIMITED', 'LTD', 'LTD.', 'CO.', 'COMPANY', 'GHANA']:
        if clean.upper().endswith(' ' + suffix):
            clean = clean[:-len(suffix)-1].strip()
    
    return clean if clean else name

def apply_bdc_standardization(name):
    """Apply BDC-specific standardization rules"""
    upper_name = name.upper()
    
    # Specific mappings for known variations
    bdc_mappings = {
        'AKWAABA LINK': 'AKWAABA LINK GROUP',
        'AKWABA LINK': 'AKWAABA LINK GROUP',
        'AKWAABA LINK INVESTMENTS LIMITED': 'AKWAABA LINK GROUP',
        'AKWAABA OIL REFINERY LIMITED': 'AKWAABA OIL REFINERY',
        'ALFAPETRO GHANA': 'ALFAPETRO GHANA',
        'ALFAPETRO GHANA LIMITED': 'ALFAPETRO GHANA',
        'ASTRA OIL SERVICES': 'ASTRA OIL SERVICES',
        'ASTRA OIL SERVICES LIMITED': 'ASTRA OIL SERVICES',
        'BATTOP ENERGY LIMITED': 'BATTOP ENERGY',
        'Battop Energy Limited': 'BATTOP ENERGY',
        'BAZUKA ENERGY LTD': 'BAZUKA ENERGY',
        'BLUE OCEAN BOTTLING PLANT': 'BLUE OCEAN GROUP',
        'BLUE OCEAN ENERGY LIMITED': 'BLUE OCEAN GROUP',
        'BLUE OCEAN INVESTMENTS LIMITED': 'BLUE OCEAN GROUP',
        'BLUE OCEAN INVESTMENTS LTD': 'BLUE OCEAN GROUP',
        'CHASE PET. GHANA LIMITED': 'CHASE PETROLEUM GHANA',
        'CHASE PETROLEUM GHANA LIMITED': 'CHASE PETROLEUM GHANA',
        'CHRISVILLE ENERGY SOLUTIONS LTD': 'CHRISVILLE ENERGY SOLUTIONS',
        'PETROLEUM WAREHOUSING & SUPPLY LTD': 'PETROLEUM WAREHOUSING & SUPPLY',
        'PET. WAREHSN & SUPPLY': 'PETROLEUM WAREHOUSING & SUPPLY',
        'PETROLEUM WARE HOUSE AND SUPPLIES LIMITED': 'PETROLEUM WAREHOUSING & SUPPLY',
        'PETROLEUM WAREHOUSING AND SUPPLIES LIMITED': 'PETROLEUM WAREHOUSING & SUPPLY',
        'RESTON ENERGY TRADING LTD': 'RESTON ENERGY TRADING',
        'RESTON ENERGY TRADING LTD CO': 'RESTON ENERGY TRADING',
        'PLATON GAS OIL LTD': 'PLATON GROUP',
        'PLATON OIL AND GAS': 'PLATON GROUP'
    }
    
    if upper_name in bdc_mappings:
        return bdc_mappings[upper_name]
    
    # General cleanup
    clean = name
    for suffix in ['LIMITED', 'LTD', 'LTD.', 'CO.', 'COMPANY']:
        if clean.upper().endswith(' ' + suffix):
            clean = clean[:-len(suffix)-1].strip()
    
    return clean if clean else name

def create_summary_dataframe(omc_df, bdc_df):
    """Create summary statistics"""
    summary_data = [
        {'Metric': 'Total OMC Raw Companies', 'Value': len(omc_df)},
        {'Metric': 'OMC Needing Standardization', 'Value': len(omc_df[omc_df['Needs_Standardization'] == 'YES'])},
        {'Metric': 'OMC Unique Standard Names', 'Value': omc_df['Proposed_Standard_Name'].nunique()},
        {'Metric': '', 'Value': ''},
        {'Metric': 'Total BDC Raw Companies', 'Value': len(bdc_df)},
        {'Metric': 'BDC Needing Standardization', 'Value': len(bdc_df[bdc_df['Needs_Standardization'] == 'YES'])},
        {'Metric': 'BDC Unique Standard Names', 'Value': bdc_df['Proposed_Standard_Name'].nunique()},
        {'Metric': '', 'Value': ''},
        {'Metric': 'Total Raw Companies', 'Value': len(omc_df) + len(bdc_df)},
        {'Metric': 'Total Unique After Standardization', 'Value': 
         omc_df['Proposed_Standard_Name'].nunique() + bdc_df['Proposed_Standard_Name'].nunique()},
    ]
    
    return pd.DataFrame(summary_data)

def create_instructions_dataframe():
    """Create instructions sheet"""
    instructions = [
        {'Step': 1, 'Instruction': 'Review the OMC_Mapping sheet for Oil Marketing Companies'},
        {'Step': 2, 'Instruction': 'Review the BDC_Mapping sheet for Bulk Distribution Companies'},
        {'Step': 3, 'Instruction': 'For each row, check if the Proposed_Standard_Name is correct'},
        {'Step': 4, 'Instruction': 'If you disagree with a proposed name, enter your correction in Your_Corrected_Name column'},
        {'Step': 5, 'Instruction': 'Add any notes or comments in the Notes column'},
        {'Step': 6, 'Instruction': 'Save the file and send it back for processing'},
        {'Step': '', 'Instruction': ''},
        {'Step': 'IMPORTANT', 'Instruction': 'Only fill Your_Corrected_Name if you want to override the proposed standardization'},
        {'Step': 'NOTE', 'Instruction': 'Entries marked as INVALID_ are likely junk data and should be excluded'},
        {'Step': 'TIP', 'Instruction': 'Sort by Record_Count to focus on high-volume companies first'},
    ]
    
    return pd.DataFrame(instructions)

if __name__ == "__main__":
    excel_file = create_standardization_mapping()
    print("\nPLEASE REVIEW THE EXCEL FILE AND MAKE CORRECTIONS AS NEEDED")
    print("The file contains all company mappings for your review.")