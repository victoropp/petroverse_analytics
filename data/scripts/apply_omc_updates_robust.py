"""
Apply Updated OMC Mappings - Robust Version
Handle different column structures in your updated Excel file
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_omc_updates_robust():
    """Apply your OMC mappings with flexible column handling"""
    
    excel_file = 'OMC_STANDARDIZATION_MAPPINGS_DETAILED_20250827_104624.xlsx'
    
    try:
        # Read your updated mappings with flexible column handling
        product_mapping_df = pd.read_excel(excel_file, sheet_name='Product_Mapping')
        company_mapping_df = pd.read_excel(excel_file, sheet_name='Company_Mapping')
        
        logger.info("Loaded your updated mappings:")
        logger.info(f"  Product mappings: {len(product_mapping_df)} entries")
        logger.info(f"  Company mappings: {len(company_mapping_df)} entries")
        
        # Check what columns exist in your updates
        logger.info(f"\nProduct mapping columns: {list(product_mapping_df.columns)}")
        logger.info(f"Company mapping columns: {list(company_mapping_df.columns)}")
        
        # Create product mapping dictionary
        if 'Original_Product' in product_mapping_df.columns and 'Standardized_Product' in product_mapping_df.columns:
            product_mapping = dict(zip(product_mapping_df['Original_Product'], 
                                      product_mapping_df['Standardized_Product']))
        else:
            logger.error("Required product mapping columns not found")
            return None
        
        # Create category mapping
        if 'Standardized_Category' in product_mapping_df.columns:
            product_category_mapping = dict(zip(product_mapping_df['Original_Product'],
                                               product_mapping_df['Standardized_Category']))
        else:
            logger.warning("Using default category mapping")
            product_category_mapping = {}
        
        # Create company mapping dictionary
        if 'Original_Company' in company_mapping_df.columns and 'Standardized_Company' in company_mapping_df.columns:
            company_mapping = dict(zip(company_mapping_df['Original_Company'],
                                      company_mapping_df['Standardized_Company']))
        else:
            logger.error("Required company mapping columns not found")
            return None
        
        # Show key updates from your file
        logger.info("\nKey changes from your updates:")
        
        # Show products marked for exclusion
        excluded_products = product_mapping_df[
            product_mapping_df['Standardized_Product'].astype(str).str.contains('REMOVE|EXCLUDE|UNMAPPED|DELETE', na=False, case=False)
        ]
        logger.info(f"Products to exclude: {len(excluded_products)}")
        
        # Show sample product mappings
        sample_products = product_mapping_df[
            ~product_mapping_df['Standardized_Product'].astype(str).str.contains('REMOVE|EXCLUDE|UNMAPPED|DELETE', na=False, case=False)
        ].head(10)
        logger.info("\nSample product mappings:")
        for _, row in sample_products.iterrows():
            logger.info(f"  {row['Original_Product']} -> {row['Standardized_Product']}")
        
        # Show sample company changes
        sample_companies = company_mapping_df.head(10)
        logger.info(f"\nSample company mappings:")
        for _, row in sample_companies.iterrows():
            if row['Original_Company'] != row['Standardized_Company']:
                logger.info(f"  {row['Original_Company']} -> {row['Standardized_Company']}")
        
    except Exception as e:
        logger.error(f"Error reading your mappings: {e}")
        return None
    
    # Load and process raw OMC data
    df = pd.read_csv('CLEANED_OMC_data_20250827_103202.csv')
    logger.info(f"\nLoaded {len(df):,} raw OMC records")
    
    # Remove NO. entries
    df = df[df['product'] != 'NO.'].copy()
    
    # Apply your product mappings
    df['product_original'] = df['product']
    df['product'] = df['product'].str.strip()
    df['product_standardized'] = df['product'].map(product_mapping)
    
    # Apply category mapping if available
    if product_category_mapping:
        df['product_category'] = df['product'].map(product_category_mapping)
    else:
        # Default category mapping
        df['product_category'] = df['product_standardized'].map({
            'Gasoline': 'Gasoline',
            'Gasoil': 'Gasoil',
            'LPG': 'LPG',
            'Kerosene': 'Kerosene',
            'Aviation Turbine Kerosene': 'Aviation Turbine Kerosene',
            'Heavy Fuel Oil': 'Heavy Fuel Oil',
            'Naphtha': 'Naphtha',
            'Lubricants': 'Lubricants'
        })
    
    # Remove excluded products
    before = len(df)
    exclusion_patterns = ['REMOVE', 'EXCLUDE', 'UNMAPPED', 'DELETE', 'SKIP']
    for pattern in exclusion_patterns:
        df = df[~df['product_standardized'].astype(str).str.contains(pattern, na=False, case=False)].copy()
    
    df = df[df['product_standardized'].notna()].copy()
    logger.info(f"Removed {before - len(df)} records based on your product exclusions")
    
    # Apply company mappings
    df['company_name_original'] = df['company_name']
    df['company_name'] = df['company_name'].map(lambda x: company_mapping.get(x, x) if pd.notna(x) else x)
    
    # Update product column
    df['product'] = df['product_standardized']
    
    # Apply conversion factors
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
    
    # Initialize volume columns
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce')
    df['volume_liters'] = 0.0
    df['volume_kg'] = 0.0
    df['volume_mt'] = 0.0
    df['unit_type'] = 'LITERS'
    
    # Apply conversions
    for idx, row in df.iterrows():
        product = row['product']
        original_volume = row['volume']
        
        if pd.isna(original_volume) or original_volume == 0:
            continue
        
        if 'LPG' in str(product) or '**LPG' in str(row['product_original']):
            # LPG is in KG
            volume_kg = float(original_volume)
            volume_mt = volume_kg / 1000
            volume_liters = volume_kg * 1.96
            unit_type = 'KG'
        else:
            # Other products in LITERS
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
    if len(df) > 0:
        volume_99th = df['volume_mt'].quantile(0.99)
        df['is_outlier'] = df['volume_mt'] > volume_99th
        df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
        df.loc[df['volume_mt'] < 0.01, 'data_quality_score'] = 0.7
    else:
        df['is_outlier'] = False
    
    # Prepare final columns
    final_columns = [
        'source_file', 'sheet_name', 'extraction_date', 'year', 'month',
        'period_date', 'period_type', 'company_name', 'product_code',
        'product_original_name', 'product', 'product_category',
        'unit_type', 'volume', 'volume_liters', 'volume_kg', 'volume_mt',
        'company_type', 'data_quality_score', 'is_outlier'
    ]
    
    for col in final_columns:
        if col not in df.columns:
            if col == 'product_original_name':
                df[col] = df.get('product_original', '')
            elif col == 'product_code':
                df[col] = ''
            elif col == 'company_type':
                df[col] = 'OMC'
            else:
                df[col] = None
    
    df_final = df[final_columns].copy()
    
    # Summary statistics
    logger.info("\n" + "=" * 60)
    logger.info("UPDATED OMC EXTRACTION SUMMARY:")
    logger.info("=" * 60)
    logger.info(f"Total records: {len(df_final):,}")
    
    if len(df_final) > 0:
        logger.info(f"Years covered: {df_final['year'].min()} - {df_final['year'].max()}")
        logger.info(f"Unique companies: {df_final['company_name'].nunique()}")
        logger.info(f"Unique products: {df_final['product'].nunique()}")
        logger.info(f"Total volume (MT): {df_final['volume_mt'].sum():,.2f}")
        
        # Category breakdown
        logger.info("\nVOLUME BY CATEGORY (MT):")
        category_volumes = df_final.groupby('product_category')['volume_mt'].sum().sort_values(ascending=False)
        total_mt = df_final['volume_mt'].sum()
        for category, volume_mt in category_volumes.items():
            pct = (volume_mt / total_mt) * 100 if total_mt > 0 else 0
            logger.info(f"  {category}: {volume_mt:,.2f} MT ({pct:.1f}%)")
        
        # Top products
        logger.info("\nTOP 5 PRODUCTS BY VOLUME (MT):")
        product_volumes = df_final.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
        for product, volume_mt in product_volumes.head(5).items():
            pct = (volume_mt / total_mt) * 100 if total_mt > 0 else 0
            logger.info(f"  {product}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Save updated data
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'FINAL_OMC_DATA_UPDATED_{timestamp}.csv'
    df_final.to_csv(output_file, index=False)
    
    # Also overwrite standard file
    df_final.to_csv('FINAL_OMC_DATA.csv', index=False)
    
    logger.info(f"\nUpdated OMC data saved to: {output_file}")
    logger.info(f"Also overwrote: FINAL_OMC_DATA.csv")
    
    return output_file, df_final

if __name__ == "__main__":
    print("APPLYING YOUR UPDATED OMC MAPPINGS (ROBUST VERSION)")
    print("=" * 60)
    result = apply_omc_updates_robust()
    if result:
        print(f"\nSuccess! Updated OMC data processed with your mappings.")
    else:
        print("\nFailed to process mappings. Please check the Excel file structure.")