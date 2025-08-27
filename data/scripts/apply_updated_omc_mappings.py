"""
Apply Updated OMC Mappings from Excel Review
Read the reviewed mappings and re-extract OMC data with your feedback
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_updated_omc_mappings():
    """Apply your reviewed OMC mappings to create final dataset"""
    
    # Load the updated mappings from your Excel file
    excel_file = 'OMC_STANDARDIZATION_MAPPINGS_DETAILED_20250827_104624.xlsx'
    
    try:
        # Read your updated mappings
        product_mapping_df = pd.read_excel(excel_file, sheet_name='Product_Mapping')
        company_mapping_df = pd.read_excel(excel_file, sheet_name='Company_Mapping')
        
        logger.info("Loaded your updated mappings:")
        logger.info(f"  Product mappings: {len(product_mapping_df)} entries")
        logger.info(f"  Company mappings: {len(company_mapping_df)} entries")
        
        # Create mapping dictionaries from your updates
        product_mapping = dict(zip(product_mapping_df['Original_Product'], 
                                  product_mapping_df['Standardized_Product']))
        
        product_category_mapping = dict(zip(product_mapping_df['Original_Product'],
                                           product_mapping_df['Standardized_Category']))
        
        company_mapping = dict(zip(company_mapping_df['Original_Company'],
                                  company_mapping_df['Standardized_Company']))
        
        logger.info("\nYour mapping updates:")
        
        # Show products to be excluded (marked as REMOVE or EXCLUDE)
        excluded_products = product_mapping_df[
            product_mapping_df['Standardized_Product'].str.contains('REMOVE|EXCLUDE|UNMAPPED', na=False, case=False)
        ]
        if len(excluded_products) > 0:
            logger.info(f"Products to exclude: {len(excluded_products)}")
            for _, row in excluded_products.iterrows():
                logger.info(f"  {row['Original_Product']} -> EXCLUDED ({row['Record_Count']} records)")
        
        # Show major company changes
        major_changes = company_mapping_df[
            (company_mapping_df['Change_Made'] == 'YES') & 
            (company_mapping_df['Final_Volume_MT'] > 10000)  # Major companies only
        ].head(10)
        
        if len(major_changes) > 0:
            logger.info(f"\nMajor company standardizations:")
            for _, row in major_changes.iterrows():
                logger.info(f"  {row['Original_Company']} -> {row['Standardized_Company']}")
        
    except Exception as e:
        logger.error(f"Error reading your updated mappings: {e}")
        logger.info("Using default mappings...")
        return None
    
    # Load raw OMC data
    df = pd.read_csv('CLEANED_OMC_data_20250827_103202.csv')
    logger.info(f"\nLoaded {len(df):,} raw OMC records")
    
    # Remove NO. entries
    df = df[df['product'] != 'NO.'].copy()
    
    # Apply your updated product mappings
    df['product_original'] = df['product']
    df['product'] = df['product'].str.strip()
    df['product_standardized'] = df['product'].map(product_mapping)
    df['product_category'] = df['product'].map(product_category_mapping)
    
    # Check for unmapped products
    unmapped = df[df['product_standardized'].isna()]
    if len(unmapped) > 0:
        logger.warning(f"\nStill unmapped products: {unmapped['product'].nunique()}")
        for prod in unmapped['product'].value_counts().head(5).index:
            count = unmapped[unmapped['product'] == prod].shape[0]
            logger.warning(f"  '{prod}': {count} records")
    
    # Remove products marked for exclusion
    before = len(df)
    df = df[~df['product_standardized'].str.contains('REMOVE|EXCLUDE|UNMAPPED', na=False, case=False)].copy()
    df = df[df['product_standardized'].notna()].copy()
    logger.info(f"Removed {before - len(df)} records based on your product mappings")
    
    # Apply your updated company mappings
    df['company_name_original'] = df['company_name']
    df['company_name'] = df['company_name'].map(lambda x: company_mapping.get(x, x) if pd.notna(x) else x)
    
    # Update product columns
    df['product'] = df['product_standardized']
    
    # Apply conversion factors (same as before)
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
    
    # Convert volumes
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce')
    df['volume_liters'] = 0.0
    df['volume_kg'] = 0.0
    df['volume_mt'] = 0.0
    
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
    
    # Data quality flags
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
    
    # Summary statistics with your updates
    logger.info("\n" + "=" * 60)
    logger.info("UPDATED OMC EXTRACTION SUMMARY:")
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
    
    # Save updated final dataset
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'FINAL_OMC_DATA_UPDATED_{timestamp}.csv'
    df_final.to_csv(output_file, index=False)
    
    # Also overwrite the standard file
    df_final.to_csv('FINAL_OMC_DATA.csv', index=False)
    
    logger.info(f"\nUpdated OMC dataset saved to: {output_file}")
    logger.info(f"Also overwrote: FINAL_OMC_DATA.csv")
    
    return output_file, df_final

if __name__ == "__main__":
    print("APPLYING YOUR UPDATED OMC MAPPINGS")
    print("=" * 60)
    output_file, df = apply_updated_omc_mappings()
    if output_file:
        print(f"\nComplete! Updated OMC data with your mappings saved.")
        print("Ready to re-import to database if needed.")
    else:
        print("\nFailed to apply mappings. Please check the Excel file.")