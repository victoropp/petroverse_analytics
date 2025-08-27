"""
Create detailed mapping files for BDC data standardization review
"""

import pandas as pd
import numpy as np

# Load the original extracted data
df_original = pd.read_csv('CLEANED_BDC_data_20250827_084844.csv')

print("CREATING BDC STANDARDIZATION MAPPINGS FOR REVIEW")
print("=" * 60)

# 1. Product Mapping Analysis
product_mapping = {
    # Gasoline variants
    'Gasoline': 'Gasoline',
    'Premium ': 'Gasoline',
    'Gasoline (Premium) ': 'Gasoline', 
    'Gasoline (Premium)': 'Gasoline',
    'Premium': 'Gasoline',
    'Premix ': 'Gasoline',
    'Premix': 'Gasoline',
    
    # Gasoil/Diesel variants
    'Gasoil': 'Gasoil', 
    'Gas oil': 'Gasoil',
    'Gas oil ': 'Gasoil',
    'Gas oil (Diesel)': 'Gasoil',
    
    # Gasoil specialized
    'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
    'Gasoil Cell Site': 'Gasoil (Cell Site)',
    'Gasoil (Mines)': 'Gasoil (Mines)',
    'Gasoil(Mines)': 'Gasoil (Mines)',
    'Gasoil Mines': 'Gasoil (Mines)',
    'Gasoil (Mines) ': 'Gasoil (Mines)',
    'Gasoil (Rig)': 'Gasoil (Rig)',
    ' Gasoil (Rig)': 'Gasoil (Rig)',
    'Gasoil Rig': 'Gasoil (Rig)',
    'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
    'Gasoil Power Plant': 'Gasoil (Power Plant)',
    
    # Marine Gasoil variants
    'Marine Gasoil': 'Marine Gasoil',
    'Marine Gasoil ': 'Marine Gasoil',
    'Marine Gasoil (Local)': 'Marine Gasoil (Local)',
    'Marine Gasoil (Local) ': 'Marine Gasoil (Local)',
    'Marine Gasoil Local': 'Marine Gasoil (Local)',
    'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
    'Marine (Foreign)': 'Marine Gasoil (Foreign)',
    
    # LPG variants
    'LPG': 'LPG',
    '*LPG': 'LPG',
    '*LPG ': 'LPG',
    'LPG - Butane': 'LPG',
    'LPG - Butane ': 'LPG',
    'LPG (Domestic)': 'LPG',
    'LPG CRM': 'LPG',
    'LPG (Power Plant)': 'LPG (Power Plant)',
    'LPG -Propane (Power Plant)': 'LPG (Power Plant)',
    
    # Fuel Oil variants
    'Fuel Oil (Industrial)': 'Heavy Fuel Oil',
    'Fuel  Oil (Industrial)': 'Heavy Fuel Oil',
    'Fuel  oil (Industrial)': 'Heavy Fuel Oil',
    'Fuel Oil Industrial': 'Heavy Fuel Oil',
    'Residual Fuel Oil (Industrial)': 'Heavy Fuel Oil',
    'Residual Fuel oil (Industrial)': 'Heavy Fuel Oil',
    'Fuel Oil (Power Plant)': 'Heavy Fuel Oil',
    'Fuel  oil (Power Plants)': 'Heavy Fuel Oil',
    'Fuel Oil Power Plant': 'Heavy Fuel Oil',
    'Heavy Fuel Oil (Power Plants)': 'Heavy Fuel Oil',
    'Heavy Fuel oil (Power Plant)': 'Heavy Fuel Oil',
    
    # Other products
    'ATK': 'Aviation Turbine Kerosene',
    'ATK ': 'Aviation Turbine Kerosene',
    'Kerosene': 'Kerosene',
    'Kerosene ': 'Kerosene',
    'Naphtha': 'Naphtha',
    'Naphtha (Unified)': 'Naphtha',
    
    # Invalid entries to remove
    'NO.': 'REMOVE - Invalid Entry',
    'Unnamed: 16': 'REMOVE - Invalid Entry'
}

# Create product mapping dataframe with counts
product_counts = df_original['product'].value_counts()
product_df = pd.DataFrame({
    'Original_Product': product_counts.index,
    'Record_Count': product_counts.values,
    'Standardized_Product': [product_mapping.get(p, f'UNMAPPED - {p}') for p in product_counts.index],
    'Action': ['Remove' if product_mapping.get(p, '').startswith('REMOVE') else 'Standardize' for p in product_counts.index]
})

# 2. Company Mapping Analysis
company_mapping = {
    # AKWAABA variations
    'AKWAABA LINK': 'AKWAABA LINK GROUP',
    'AKWABA LINK': 'AKWAABA LINK GROUP', 
    'AKWAABA LINK INVESTMENTS LIMITED': 'AKWAABA LINK GROUP',
    'AKWAABA LINK INVESTMENTS LTD': 'AKWAABA LINK GROUP',
    
    # ASTRA variations
    'ASTRA OIL SERVICES': 'ASTRA OIL SERVICES LIMITED',
    
    # ALFAPETRO variations
    'ALFAPETRO GHANA': 'ALFAPETRO GHANA LIMITED',
    
    # BLUE OCEAN variations
    'BLUE OCEAN INVESTMENTS LTD': 'BLUE OCEAN INVESTMENTS LIMITED',
    
    # CHASE variations
    'CHASE PET. GHANA LIMITED': 'CHASE PETROLEUM GHANA LIMITED',
    'CHASE PET. GHANA LTD': 'CHASE PETROLEUM GHANA LIMITED',
    
    # ADINKRA variations
    'ADINKRA': 'ADINKRA SUPPLY COMPANY GHANA LIMITED',
    
    # Keep AKWAABA OIL REFINERY separate
    'AKWAABA OIL REFINERY LIMITED': 'AKWAABA OIL REFINERY LIMITED'
}

# Create company mapping dataframe
company_counts = df_original['company_name'].value_counts()
company_df = pd.DataFrame({
    'Original_Company': company_counts.index,
    'Record_Count': company_counts.values,
    'Standardized_Company': [company_mapping.get(c, c) for c in company_counts.index]
})

# 3. Conversion Factors
conversion_factors = {
    'Gasoline': 1324.5,
    'Gasoil': 1183.43,
    'Gasoil (Cell Site)': 1183.43,
    'Gasoil (Mines)': 1183.43,
    'Gasoil (Rig)': 1183.43,
    'Gasoil (Power Plant)': 1183.43,
    'LPG': 1000.0,  # LPG is already in KG
    'LPG (Power Plant)': 1000.0,
    'Kerosene': 1240.6,
    'Aviation Turbine Kerosene': 1240.6,
    'Marine Gasoil': 1183.43,
    'Marine Gasoil (Local)': 1183.43,
    'Marine Gasoil (Foreign)': 1183.43,
    'Heavy Fuel Oil': 1009.08,
    'Naphtha': 1324.5
}

# Create conversion factors dataframe
cf_df = pd.DataFrame({
    'Product': list(conversion_factors.keys()),
    'Conversion_Factor_Liters_to_KG': list(conversion_factors.values()),
    'Units': ['Liters to KG' for _ in conversion_factors],
    'MT_Conversion': ['Divide KG by 1000' for _ in conversion_factors]
})

# 4. Removed Records Analysis
removed_analysis = []
for product in product_counts.index:
    if product_mapping.get(product, '').startswith('REMOVE'):
        removed_analysis.append({
            'Removed_Product': product,
            'Records_Removed': product_counts[product],
            'Reason': product_mapping.get(product, 'Unknown')
        })

removed_df = pd.DataFrame(removed_analysis)

# 5. Save all mappings to Excel for review
with pd.ExcelWriter('BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx', engine='openpyxl') as writer:
    # Product mapping sheet
    product_df.to_excel(writer, sheet_name='Product_Mapping', index=False)
    
    # Company mapping sheet
    company_df.to_excel(writer, sheet_name='Company_Mapping', index=False)
    
    # Conversion factors sheet
    cf_df.to_excel(writer, sheet_name='Conversion_Factors', index=False)
    
    # Removed records sheet
    removed_df.to_excel(writer, sheet_name='Removed_Records', index=False)
    
    # Summary sheet
    summary_df = pd.DataFrame({
        'Metric': ['Total Original Records', 'Total Products', 'Standardized Products', 
                   'Total Companies', 'Standardized Companies', 'Records to Remove'],
        'Value': [len(df_original), df_original['product'].nunique(), 
                  len(set([v for v in product_mapping.values() if not v.startswith('REMOVE')])),
                  df_original['company_name'].nunique(),
                  len(set([company_mapping.get(c, c) for c in df_original['company_name'].unique()])),
                  removed_df['Records_Removed'].sum()]
    })
    summary_df.to_excel(writer, sheet_name='Summary', index=False)

print("Mapping files created successfully!")
print()
print("SUMMARY:")
print(f"Products: {df_original['product'].nunique()} original -> {len(set([v for v in product_mapping.values() if not v.startswith('REMOVE')]))} standardized")
print(f"Companies: {df_original['company_name'].nunique()} original -> {len(set([company_mapping.get(c, c) for c in df_original['company_name'].unique()]))} standardized")
print(f"Records to remove: {removed_df['Records_Removed'].sum() if len(removed_df) > 0 else 0}")
print()
print("File saved: BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx")
print("Please review all sheets and confirm the mappings.")