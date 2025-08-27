"""
Final OMC Data Extraction with complete mappings
Including all product variations found in the data
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def final_omc_extraction():
    """Final OMC extraction with complete mappings"""
    
    # Load raw OMC data
    df = pd.read_csv('CLEANED_OMC_data_20250827_103202.csv')
    logger.info(f"Loaded {len(df):,} OMC records")
    
    # Remove invalid "NO." product entries
    before = len(df)
    df = df[df['product'] != 'NO.'].copy()
    logger.info(f"Removed {before - len(df)} invalid 'NO.' entries")
    
    # Complete product standardization mapping
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
        
        # Gasoil specialized types
        'GASOIL MINES': 'Gasoil (Mines)',
        'Gasoil (Mines)': 'Gasoil (Mines)',
        'GASOIL(RIG)': 'Gasoil (Rig)',
        'Gasoil (Rig)': 'Gasoil (Rig)',
        'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
        'Gasoil Cell Site': 'Gasoil (Cell Site)',
        'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
        
        # Marine Gasoil
        'MARINE GASOIL': 'Marine Gasoil',
        'Marine Gasoil': 'Marine Gasoil',
        'MGO': 'Marine Gasoil',
        'MGO LOCAL': 'Marine Gasoil (Local)',
        'Marine Gasoil (Local)': 'Marine Gasoil (Local)',
        'MGO FOREIGN': 'Marine Gasoil (Foreign)',
        'Marine Gasoil (Foreign)': 'Marine Gasoil (Foreign)',
        'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
        
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
        
        # Heavy fuel oils
        'HFO': 'Heavy Fuel Oil',
        'RFO': 'Heavy Fuel Oil',
        'FUEL OIL': 'Heavy Fuel Oil',
        'Fuel Oil': 'Heavy Fuel Oil',
        'Fuel Oil Industrial': 'Heavy Fuel Oil',
        'Residual Fuel Oil (Industrial)': 'Heavy Fuel Oil',
        'Residual Fuel oil (Industrial)': 'Heavy Fuel Oil',
        'Heavy Fuel Oil (Power)': 'Heavy Fuel Oil',
        'Heavy Fuel oil (Power Plant)': 'Heavy Fuel Oil',
        
        # Naphtha
        'NAPHTHA': 'Naphtha',
        'Naphtha': 'Naphtha',
        'NAPHTHA (UNIFIED)': 'Naphtha',
        'Naphtha (Unified)': 'Naphtha',
        
        # Lubricants
        'LUBRICANTS': 'Lubricants',
        'LUBES': 'Lubricants'
    }
    
    # Product category mapping (same as BDC)
    product_categories = {
        'Gasoline': 'Gasoline',
        'Gasoil': 'Gasoil',
        'Gasoil (Mines)': 'Gasoil',
        'Gasoil (Rig)': 'Gasoil',
        'Gasoil (Cell Site)': 'Gasoil',
        'Gasoil (Power Plant)': 'Gasoil',
        'Marine Gasoil': 'Gasoil',
        'Marine Gasoil (Local)': 'Gasoil',
        'Marine Gasoil (Foreign)': 'Gasoil',
        'LPG': 'LPG',
        'Kerosene': 'Kerosene',
        'Aviation Turbine Kerosene': 'Aviation Turbine Kerosene',
        'Heavy Fuel Oil': 'Heavy Fuel Oil',
        'Naphtha': 'Naphtha',
        'Lubricants': 'Lubricants'
    }
    
    # Apply product standardization
    df['product_original'] = df['product']
    df['product'] = df['product'].str.strip()
    df['product_standardized'] = df['product'].map(product_mapping)
    
    # Check for unmapped products
    unmapped = df[df['product_standardized'].isna()]['product'].unique()
    if len(unmapped) > 0:
        logger.warning(f"\nUnmapped products found: {len(unmapped)}")
        for prod in unmapped[:10]:
            count = len(df[df['product'] == prod])
            logger.warning(f"  '{prod}': {count} records")
    
    # Remove unmapped products
    before = len(df)
    df = df[df['product_standardized'].notna()].copy()
    logger.info(f"Removed {before - len(df)} records with unmapped products")
    
    # Update columns
    df['product'] = df['product_standardized']
    df['product_category'] = df['product'].map(product_categories)
    
    # Company standardization
    company_mapping = {}
    companies = df['company_name'].unique()
    
    for company in companies:
        if pd.isna(company):
            continue
        
        company_clean = str(company).strip().upper()
        
        # Standardize major company variations
        if 'GOIL' in company_clean and 'GHANA OIL' not in company_clean:
            company_mapping[company] = 'GOIL COMPANY LIMITED'
        elif 'GHANA OIL' in company_clean:
            company_mapping[company] = 'GHANA OIL COMPANY LIMITED'
        elif 'TOTAL' in company_clean and 'ENERGIES' in company_clean:
            company_mapping[company] = 'TOTAL ENERGIES MARKETING GHANA LIMITED'
        elif 'VIVO' in company_clean:
            company_mapping[company] = 'VIVO ENERGY GHANA LIMITED'
        elif 'PUMA' in company_clean:
            company_mapping[company] = 'PUMA ENERGY DISTRIBUTION GHANA LIMITED'
        elif 'SHELL' in company_clean:
            company_mapping[company] = 'SHELL GHANA LIMITED'
        elif 'STAR OIL' in company_clean:
            company_mapping[company] = 'STAR OIL COMPANY LIMITED'
        elif 'PETROSOL' in company_clean:
            company_mapping[company] = 'PETROSOL GHANA LIMITED'
        elif 'SO ENERGY' in company_clean:
            company_mapping[company] = 'SO ENERGY GH LIMITED'
        elif 'ZEN PETROLEUM' in company_clean:
            company_mapping[company] = 'ZEN PETROLEUM LIMITED'
        else:
            # Keep original (cleaned)
            company_mapping[company] = company.strip()
    
    df['company_name_original'] = df['company_name']
    df['company_name'] = df['company_name'].map(lambda x: company_mapping.get(x, x) if pd.notna(x) else x)
    
    # Conversion factors (liters per MT)
    conversion_factors = {
        'Gasoline': 1324.5,
        'Gasoil': 1183.43,
        'Gasoil (Mines)': 1183.43,
        'Gasoil (Rig)': 1183.43,
        'Gasoil (Cell Site)': 1183.43,
        'Gasoil (Power Plant)': 1183.43,
        'Marine Gasoil': 1183.43,
        'Marine Gasoil (Local)': 1183.43,
        'Marine Gasoil (Foreign)': 1183.43,
        'Kerosene': 1240.6,
        'Aviation Turbine Kerosene': 1240.6,
        'Heavy Fuel Oil': 1009.08,
        'Naphtha': 1324.5,
        'Lubricants': 1100.0
    }
    
    logger.info("\nApplying conversion factors...")
    
    # Convert volume columns to float
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce')
    df['volume_liters'] = 0.0
    df['volume_kg'] = 0.0
    df['volume_mt'] = 0.0
    
    # Apply conversions
    for idx, row in df.iterrows():
        product = row['product']
        original_volume = row['volume']
        
        if pd.isna(original_volume) or original_volume == 0:
            continue
        
        if 'LPG' in product or '**LPG' in str(row['product_original']):
            # LPG is in KG
            volume_kg = float(original_volume)
            volume_mt = volume_kg / 1000
            volume_liters = volume_kg * 1.96
            unit_type = 'KG'
        else:
            # Other products are in LITERS
            cf = conversion_factors.get(product, 1183.43)
            
            volume_liters = float(original_volume)
            volume_mt = volume_liters / cf
            volume_kg = volume_mt * 1000
            unit_type = 'LITERS'
        
        df.at[idx, 'volume'] = original_volume
        df.at[idx, 'volume_liters'] = volume_liters
        df.at[idx, 'volume_kg'] = volume_kg
        df.at[idx, 'volume_mt'] = volume_mt
        df.at[idx, 'unit_type'] = unit_type
    
    # Data quality
    df['data_quality_score'] = 1.0
    volume_99th = df['volume_mt'].quantile(0.99)
    df['is_outlier'] = df['volume_mt'] > volume_99th
    df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
    df.loc[df['volume_mt'] < 0.01, 'data_quality_score'] = 0.7
    
    # Select final columns
    final_columns = [
        'source_file', 'sheet_name', 'extraction_date', 'year', 'month',
        'period_date', 'period_type', 'company_name', 'product_code',
        'product_original_name', 'product', 'product_category',
        'unit_type', 'volume', 'volume_liters', 'volume_kg', 'volume_mt',
        'company_type', 'data_quality_score', 'is_outlier'
    ]
    
    # Ensure all columns exist
    for col in final_columns:
        if col not in df.columns:
            if col == 'product_original_name':
                df[col] = df['product_original']
            elif col == 'product_code':
                df[col] = ''
            else:
                df[col] = None
    
    df_final = df[final_columns].copy()
    
    # Summary statistics
    logger.info("\n" + "=" * 60)
    logger.info("FINAL OMC EXTRACTION SUMMARY:")
    logger.info("=" * 60)
    logger.info(f"Total records: {len(df_final):,}")
    logger.info(f"Years covered: {df_final['year'].min()} - {df_final['year'].max()}")
    logger.info(f"Unique companies: {df_final['company_name'].nunique()}")
    logger.info(f"Unique products: {df_final['product'].nunique()}")
    logger.info(f"Total volume (MT): {df_final['volume_mt'].sum():,.2f}")
    
    # Category breakdown
    logger.info("\nVOLUME BY CATEGORY (MT):")
    category_volumes = df_final.groupby('product_category')['volume_mt'].sum().sort_values(ascending=False)
    total_mt = df_final['volume_mt'].sum()
    for category, volume_mt in category_volumes.items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {category}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Product breakdown
    logger.info("\nTOP 10 PRODUCTS BY VOLUME (MT):")
    product_volumes = df_final.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
    for product, volume_mt in product_volumes.head(10).items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {product}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Company breakdown
    logger.info("\nTOP 10 COMPANIES BY VOLUME (MT):")
    company_volumes = df_final.groupby('company_name')['volume_mt'].sum().sort_values(ascending=False)
    for company, volume_mt in company_volumes.head(10).items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {company}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Data quality
    logger.info("\nDATA QUALITY:")
    logger.info(f"Records flagged as outliers: {df_final['is_outlier'].sum():,} ({df_final['is_outlier'].mean()*100:.1f}%)")
    logger.info(f"Average data quality score: {df_final['data_quality_score'].mean():.3f}")
    
    # Save final dataset
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'FINAL_OMC_DATA_{timestamp}.csv'
    df_final.to_csv(output_file, index=False)
    
    # Also save to standard location
    df_final.to_csv('FINAL_OMC_DATA.csv', index=False)
    
    logger.info(f"\nFinal OMC dataset saved to: {output_file}")
    logger.info(f"Also saved to: FINAL_OMC_DATA.csv")
    
    return output_file, df_final

def create_mapping_excel(df):
    """Create Excel file with mappings for review"""
    
    excel_file = 'OMC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx'
    
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        # Product mapping
        product_df = df.groupby(['product_original_name', 'product', 'product_category']).agg({
            'volume_mt': 'sum',
            'year': 'count'
        }).reset_index()
        product_df.columns = ['Original_Product', 'Standardized_Product', 'Standardized_Category', 
                              'Total_Volume_MT', 'Record_Count']
        product_df = product_df.sort_values('Total_Volume_MT', ascending=False)
        product_df.to_excel(writer, sheet_name='Product_Mapping', index=False)
        
        # Company mapping (top 100)
        company_df = df.groupby('company_name').agg({
            'volume_mt': 'sum',
            'year': 'count'
        }).reset_index()
        company_df.columns = ['Standardized_Company', 'Total_Volume_MT', 'Record_Count']
        company_df = company_df.sort_values('Total_Volume_MT', ascending=False).head(100)
        company_df.to_excel(writer, sheet_name='Company_Mapping', index=False)
        
        # Conversion factors
        cf_data = {
            'Product': ['Gasoline', 'Gasoil', 'LPG', 'Aviation Turbine Kerosene', 
                       'Kerosene', 'Heavy Fuel Oil', 'Naphtha', 'Marine Gasoil'],
            'Liters_per_MT': [1324.5, 1183.43, 'N/A - in KG', 1240.6, 
                             1240.6, 1009.08, 1324.5, 1183.43],
            'Notes': ['Same as BDC', 'Same as BDC', 'Already in KG', 'Same as BDC',
                     'Same as BDC', 'Same as BDC', 'Same as Gasoline', 'Same as Gasoil']
        }
        cf_df = pd.DataFrame(cf_data)
        cf_df.to_excel(writer, sheet_name='Conversion_Factors', index=False)
        
        # Summary
        summary_data = {
            'Metric': [
                'Total Records',
                'Years Covered',
                'Unique Companies',
                'Unique Products',
                'Product Categories',
                'Total Volume (MT)',
                'Total Volume (Liters)',
                'Data Quality Score'
            ],
            'Value': [
                f"{len(df):,}",
                f"{df['year'].min()} - {df['year'].max()}",
                f"{df['company_name'].nunique()}",
                f"{df['product'].nunique()}",
                f"{df['product_category'].nunique()}",
                f"{df['volume_mt'].sum():,.2f}",
                f"{df['volume_liters'].sum():,.0f}",
                f"{df['data_quality_score'].mean():.3f}"
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
    
    logger.info(f"Mapping file created: {excel_file}")
    return excel_file

if __name__ == "__main__":
    print("FINAL OMC DATA EXTRACTION")
    print("=" * 60)
    output_file, df = final_omc_extraction()
    mapping_file = create_mapping_excel(df)
    print(f"\nComplete! Files created:")
    print(f"  - Final OMC data: {output_file}")
    print(f"  - Mapping file for review: {mapping_file}")