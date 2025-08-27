"""
Standardize OMC data and apply conversions
Following the same pattern as BDC
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def standardize_omc_data():
    """Standardize OMC products and companies, apply conversions"""
    
    # Load raw OMC data
    df = pd.read_csv('CLEANED_OMC_data_20250827_103202.csv')
    logger.info(f"Loaded {len(df):,} OMC records")
    
    # Remove invalid "NO." product entries
    before = len(df)
    df = df[df['product'] != 'NO.'].copy()
    logger.info(f"Removed {before - len(df)} invalid 'NO.' entries")
    
    # Product standardization mapping (same pattern as BDC)
    product_mapping = {
        # Gasoline variations
        'GASOLINE': 'Gasoline',
        'Gasoline': 'Gasoline',
        'Gasoline (Premium)': 'Gasoline',
        'Gasoline (Premium) ': 'Gasoline',
        'PREMIUM': 'Gasoline',
        'PREMIX': 'Gasoline',
        'Premix': 'Gasoline',
        'Premix ': 'Gasoline',
        
        # Gasoil/Diesel variations
        'GASOIL': 'Gasoil',
        'Gasoil': 'Gasoil',
        'Gas oil (Diesel)': 'Gasoil',
        'Gas oil': 'Gasoil',
        'DIESEL': 'Gasoil',
        
        # LPG variations
        '**LPG': 'LPG',
        '*LPG': 'LPG',
        'LPG': 'LPG',
        'LPG - Butane': 'LPG',
        'LPG - Butane ': 'LPG',
        'LPG (BULK)': 'LPG',
        'LPG - CRM': 'LPG',
        
        # Kerosene
        'KEROSENE': 'Kerosene',
        'Kerosene': 'Kerosene',
        'Kerosene ': 'Kerosene',
        
        # Aviation fuel
        'ATK': 'Aviation Turbine Kerosene',
        'ATK ': 'Aviation Turbine Kerosene',
        'JET A1': 'Aviation Turbine Kerosene',
        
        # Marine fuels
        'MARINE GASOIL': 'Marine Gasoil',
        'Marine Gasoil': 'Marine Gasoil',
        'MGO': 'Marine Gasoil',
        
        # Heavy fuel oils
        'HFO': 'Heavy Fuel Oil',
        'RFO': 'Heavy Fuel Oil',
        'FUEL OIL': 'Heavy Fuel Oil',
        
        # Naphtha
        'NAPHTHA': 'Naphtha',
        'Naphtha': 'Naphtha',
        
        # Lubricants
        'LUBRICANTS': 'Lubricants',
        'LUBES': 'Lubricants'
    }
    
    # Product category mapping
    product_categories = {
        'Gasoline': 'Gasoline',
        'Gasoil': 'Gasoil',
        'LPG': 'LPG',
        'Kerosene': 'Kerosene',
        'Aviation Turbine Kerosene': 'Aviation Turbine Kerosene',
        'Marine Gasoil': 'Gasoil',  # Group with Gasoil
        'Heavy Fuel Oil': 'Heavy Fuel Oil',
        'Naphtha': 'Naphtha',
        'Lubricants': 'Lubricants'
    }
    
    # Apply product standardization
    df['product_original'] = df['product']
    df['product'] = df['product'].str.strip()  # Remove whitespace
    df['product_standardized'] = df['product'].map(product_mapping)
    
    # Log unmapped products
    unmapped = df[df['product_standardized'].isna()]['product'].unique()
    if len(unmapped) > 0:
        logger.warning(f"\nUnmapped products found:")
        for prod in unmapped[:20]:  # Show first 20
            count = len(df[df['product'] == prod])
            logger.warning(f"  '{prod}': {count} records")
    
    # Remove records with unmapped products
    before = len(df)
    df = df[df['product_standardized'].notna()].copy()
    logger.info(f"Removed {before - len(df)} records with unmapped products")
    
    # Update product column
    df['product'] = df['product_standardized']
    df['product_category'] = df['product'].map(product_categories)
    
    # Company standardization (identify and standardize major variations)
    company_mapping = {}
    
    # Group similar company names
    companies = df['company_name'].unique()
    for company in companies:
        if pd.isna(company):
            continue
        
        company_clean = str(company).strip().upper()
        
        # Standardize common patterns
        if 'GOIL' in company_clean:
            company_mapping[company] = 'GOIL COMPANY LIMITED'
        elif 'TOTAL' in company_clean and 'ENERGIES' in company_clean:
            company_mapping[company] = 'TOTAL ENERGIES MARKETING GHANA LIMITED'
        elif 'VIVO' in company_clean:
            company_mapping[company] = 'VIVO ENERGY GHANA LIMITED'
        elif 'PUMA' in company_clean:
            company_mapping[company] = 'PUMA ENERGY DISTRIBUTION GHANA LIMITED'
        elif 'SHELL' in company_clean:
            company_mapping[company] = 'SHELL GHANA LIMITED'
        elif 'PETROSOL' in company_clean:
            company_mapping[company] = 'PETROSOL GHANA LIMITED'
        elif 'SO ENERGY' in company_clean:
            company_mapping[company] = 'SO ENERGY GH LIMITED'
        elif 'STAR OIL' in company_clean:
            company_mapping[company] = 'STAR OIL COMPANY LIMITED'
        else:
            # Keep original for others
            company_mapping[company] = company.strip()
    
    # Apply company standardization
    df['company_name_original'] = df['company_name']
    df['company_name'] = df['company_name'].map(lambda x: company_mapping.get(x, x) if pd.notna(x) else x)
    
    # Conversion factors (same as BDC)
    conversion_factors = {
        'Gasoline': 1324.5,          # 1324.5 liters = 1 MT
        'Gasoil': 1183.43,           # 1183.43 liters = 1 MT
        'Marine Gasoil': 1183.43,
        'Kerosene': 1240.6,          # 1240.6 liters = 1 MT
        'Aviation Turbine Kerosene': 1240.6,
        'Heavy Fuel Oil': 1009.08,    # 1009.08 liters = 1 MT
        'Naphtha': 1324.5,           # Same as Gasoline
        'Lubricants': 1100.0         # Approximate
    }
    
    logger.info("\nApplying conversion factors...")
    
    # Apply conversions
    for idx, row in df.iterrows():
        product = row['product']
        original_volume = row['volume']
        
        if 'LPG' in product or '**LPG' in str(row['product_original']):
            # LPG is in KG (as stated in file headers)
            volume_kg = original_volume
            volume_mt = volume_kg / 1000      # KG to MT
            volume_liters = volume_kg * 1.96  # KG to liters (approximate)
            unit_type = 'KG'
        else:
            # Other products are in LITERS
            cf = conversion_factors.get(product, 1183.43)  # Default to gasoil
            
            volume_liters = original_volume
            volume_mt = volume_liters / cf     # Liters to MT
            volume_kg = volume_mt * 1000       # MT to KG
            unit_type = 'LITERS'
        
        df.at[idx, 'volume'] = original_volume
        df.at[idx, 'volume_liters'] = volume_liters
        df.at[idx, 'volume_kg'] = volume_kg
        df.at[idx, 'volume_mt'] = volume_mt
        df.at[idx, 'unit_type'] = unit_type
    
    # Add data quality indicators
    df['data_quality_score'] = 1.0
    
    # Flag outliers (>99th percentile)
    volume_99th = df['volume_mt'].quantile(0.99)
    df['is_outlier'] = df['volume_mt'] > volume_99th
    df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
    
    # Flag very small volumes
    df.loc[df['volume_mt'] < 0.01, 'data_quality_score'] = 0.7
    
    # Summary statistics
    logger.info("\n" + "=" * 60)
    logger.info("OMC DATA STANDARDIZATION SUMMARY:")
    logger.info("=" * 60)
    logger.info(f"Total records: {len(df):,}")
    logger.info(f"Years covered: {df['year'].min()} - {df['year'].max()}")
    logger.info(f"Unique companies: {df['company_name'].nunique()}")
    logger.info(f"Unique products: {df['product'].nunique()}")
    logger.info(f"Total volume (MT): {df['volume_mt'].sum():,.2f}")
    
    # Category breakdown
    logger.info("\nVOLUME BY CATEGORY (MT):")
    category_volumes = df.groupby('product_category')['volume_mt'].sum().sort_values(ascending=False)
    total_mt = df['volume_mt'].sum()
    for category, volume_mt in category_volumes.items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {category}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Product breakdown
    logger.info("\nTOP 10 PRODUCTS BY VOLUME (MT):")
    product_volumes = df.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
    for product, volume_mt in product_volumes.head(10).items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {product}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Top companies
    logger.info("\nTOP 10 COMPANIES BY VOLUME (MT):")
    company_volumes = df.groupby('company_name')['volume_mt'].sum().sort_values(ascending=False)
    for company, volume_mt in company_volumes.head(10).items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {company}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Save standardized data
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'OMC_STANDARDIZED_{timestamp}.csv'
    df.to_csv(output_file, index=False)
    
    logger.info(f"\nStandardized OMC data saved to: {output_file}")
    
    return output_file, df

def create_mapping_file(df):
    """Create Excel file with mappings for review"""
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_file = f'OMC_STANDARDIZATION_MAPPINGS_{timestamp}.xlsx'
    
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        # Product mapping
        product_df = pd.DataFrame({
            'Original_Product': df['product_original'].unique(),
        })
        product_df['Standardized_Product'] = product_df['Original_Product'].map(
            lambda x: df[df['product_original'] == x]['product'].iloc[0] if not df[df['product_original'] == x].empty else None
        )
        product_df['Category'] = product_df['Standardized_Product'].map(
            lambda x: df[df['product'] == x]['product_category'].iloc[0] if not df[df['product'] == x].empty else None
        )
        product_df['Record_Count'] = product_df['Original_Product'].map(
            lambda x: len(df[df['product_original'] == x])
        )
        product_df = product_df.sort_values('Record_Count', ascending=False)
        product_df.to_excel(writer, sheet_name='Product_Mapping', index=False)
        
        # Company mapping (top 100 by volume)
        company_df = df.groupby(['company_name_original', 'company_name']).agg({
            'volume_mt': 'sum',
            'year': 'count'
        }).reset_index()
        company_df.columns = ['Original_Company', 'Standardized_Company', 'Total_Volume_MT', 'Record_Count']
        company_df = company_df.sort_values('Total_Volume_MT', ascending=False).head(100)
        company_df.to_excel(writer, sheet_name='Company_Mapping', index=False)
        
        # Summary statistics
        summary_data = {
            'Metric': [
                'Total Records',
                'Total Companies',
                'Total Products',
                'Total Volume (MT)',
                'Years Covered',
                'Data Quality Score'
            ],
            'Value': [
                f"{len(df):,}",
                f"{df['company_name'].nunique()}",
                f"{df['product'].nunique()}",
                f"{df['volume_mt'].sum():,.2f}",
                f"{df['year'].min()} - {df['year'].max()}",
                f"{df['data_quality_score'].mean():.3f}"
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
    
    logger.info(f"Mapping file created: {excel_file}")
    return excel_file

if __name__ == "__main__":
    print("STANDARDIZING OMC DATA")
    print("=" * 60)
    output_file, df = standardize_omc_data()
    mapping_file = create_mapping_file(df)
    print(f"\nComplete! Files created:")
    print(f"  - Standardized data: {output_file}")
    print(f"  - Mapping file: {mapping_file}")