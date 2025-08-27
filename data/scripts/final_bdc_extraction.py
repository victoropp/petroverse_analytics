"""
Final BDC Data Extraction with Reviewed Mappings
Using feedback from BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx
"""

import pandas as pd
import numpy as np
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def final_bdc_extraction():
    """Apply reviewed mappings to create final BDC dataset"""
    
    # Load the reviewed mappings
    mapping_file = 'BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx'
    product_mapping_df = pd.read_excel(mapping_file, sheet_name='Product_Mapping')
    company_mapping_df = pd.read_excel(mapping_file, sheet_name='Company_Mapping')
    cf_df = pd.read_excel(mapping_file, sheet_name='Conversion_Factors')
    
    logger.info("Loaded reviewed mappings")
    
    # Create mapping dictionaries
    product_mapping = dict(zip(product_mapping_df['Original_Product'], 
                              product_mapping_df['Standardized_Product']))
    
    product_category = dict(zip(product_mapping_df['Original_Product'],
                               product_mapping_df['Standardized_Category']))
    
    company_mapping = dict(zip(company_mapping_df['Original_Company'],
                              company_mapping_df['Standardized_Company']))
    
    # Conversion factors from file (Liters to KG)
    conversion_factors = {
        'Gasoline': 1324.5,
        'Gasoil': 1183.43,
        'LPG': 1000.0,  # LPG is already in KG
        'Aviation Turbine Kerosene': 1240.6,
        'Kerosene': 1240.6,
        'Heavy Fuel Oil': 1009.08,
        'Naphtha': 1324.5,
        
        # Specific gasoil types use same factor
        'Gasoil (Cell Site)': 1183.43,
        'Gasoil (Mines)': 1183.43,
        'Gasoil (Rig)': 1183.43,
        'Gasoil (Power Plant)': 1183.43,
        'Marine Gasoil': 1183.43,
        'Marine Gasoil (Local)': 1183.43,
        'Marine Gasoil (Foreign)': 1183.43,
        
        # LPG variants
        'LPG (Power Plant)': 1000.0
    }
    
    # Load the raw extracted data
    df = pd.read_csv('CLEANED_BDC_data_20250827_084844.csv')
    logger.info(f"Loaded {len(df):,} raw BDC records")
    
    # Apply product standardization
    df['product_standardized'] = df['product'].map(product_mapping)
    df['product_category'] = df['product'].map(product_category)
    
    # Apply company standardization
    df['company_name_standardized'] = df['company_name'].map(
        lambda x: company_mapping.get(x, x)
    )
    
    # Remove invalid records (those marked as REMOVE)
    before_count = len(df)
    df = df[~df['product_category'].str.contains('REMOVE', na=False)].copy()
    df = df[df['product_standardized'].notna()].copy()
    after_count = len(df)
    logger.info(f"Removed {before_count - after_count} invalid records")
    
    # Apply proper conversions based on product type and units
    logger.info("Applying conversion factors...")
    
    for idx, row in df.iterrows():
        product = row['product_standardized']
        original_product = row['product']
        volume = row['volume']
        
        # Check if it's LPG (already in KG)
        is_lpg = 'LPG' in str(original_product) or '*LPG' in str(original_product)
        
        if is_lpg:
            # LPG is in KG
            volume_kg = volume
            volume_liters = volume  # Keep original for consistency
            volume_mt = volume / 1000
            unit_type = 'KG'
        else:
            # Other products are in liters
            cf = conversion_factors.get(product, 1183.43)  # Default to gasoil factor
            
            volume_liters = volume
            volume_kg = volume_liters / cf
            volume_mt = volume_kg / 1000
            unit_type = 'LITERS'
        
        df.at[idx, 'volume_liters'] = volume_liters
        df.at[idx, 'volume_kg'] = volume_kg
        df.at[idx, 'volume_mt'] = volume_mt
        df.at[idx, 'unit_type'] = unit_type
    
    # Update columns with standardized values
    df['product'] = df['product_standardized']
    df['company_name'] = df['company_name_standardized']
    
    # Add data quality indicators
    df['data_quality_score'] = 1.0
    
    # Flag outliers (>99th percentile)
    volume_99th = df['volume_mt'].quantile(0.99)
    df['is_outlier'] = df['volume_mt'] > volume_99th
    df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
    
    # Flag very small volumes as potential errors
    df.loc[df['volume_mt'] < 0.1, 'data_quality_score'] = 0.7
    
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
            if col == 'product_category':
                df[col] = df['product_category']
            else:
                df[col] = None
    
    df_final = df[final_columns].copy()
    
    # Summary statistics
    logger.info("\nFINAL EXTRACTION SUMMARY:")
    logger.info("=" * 60)
    logger.info(f"Total records: {len(df_final):,}")
    logger.info(f"Unique companies: {df_final['company_name'].nunique()}")
    logger.info(f"Unique products: {df_final['product'].nunique()}")
    logger.info(f"Unique categories: {df_final['product_category'].nunique()}")
    
    # Volume summary
    logger.info("\nVOLUME SUMMARY:")
    logger.info(f"Total volume (Liters): {df_final['volume_liters'].sum():,.0f}")
    logger.info(f"Total volume (MT): {df_final['volume_mt'].sum():,.2f}")
    
    # Category breakdown
    logger.info("\nCATEGORY VOLUMES (MT):")
    category_volumes = df_final.groupby('product_category')['volume_mt'].sum().sort_values(ascending=False)
    for category, volume_mt in category_volumes.items():
        pct = (volume_mt / df_final['volume_mt'].sum()) * 100
        logger.info(f"  {category}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Product breakdown within categories
    logger.info("\nPRODUCT BREAKDOWN BY CATEGORY:")
    for category in df_final['product_category'].unique():
        if pd.notna(category):
            cat_data = df_final[df_final['product_category'] == category]
            products = cat_data.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
            logger.info(f"\n{category}:")
            for product, vol in products.items():
                logger.info(f"  {product}: {vol:,.2f} MT")
    
    # Company summary
    logger.info("\nTOP 10 COMPANIES BY VOLUME (MT):")
    company_volumes = df_final.groupby('company_name')['volume_mt'].sum().sort_values(ascending=False)
    for company, volume_mt in company_volumes.head(10).items():
        logger.info(f"  {company}: {volume_mt:,.2f} MT")
    
    # Data quality summary
    logger.info("\nDATA QUALITY:")
    logger.info(f"Records flagged as outliers: {df_final['is_outlier'].sum():,} ({df_final['is_outlier'].mean()*100:.1f}%)")
    logger.info(f"Average data quality score: {df_final['data_quality_score'].mean():.3f}")
    
    # Save final dataset
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'FINAL_BDC_DATA_{timestamp}.csv'
    df_final.to_csv(output_file, index=False)
    
    logger.info(f"\nFinal BDC dataset saved to: {output_file}")
    
    # Also save to specific location for database import
    final_output = 'C:\\Users\\victo\\Documents\\Data_Science_Projects\\petroverse_analytics\\data\\FINAL_BDC_DATA.csv'
    df_final.to_csv(final_output, index=False)
    logger.info(f"Also saved to: {final_output}")
    
    return output_file, df_final

if __name__ == "__main__":
    print("FINAL BDC DATA EXTRACTION WITH REVIEWED MAPPINGS")
    print("=" * 60)
    output_file, df = final_bdc_extraction()
    print(f"\nCOMPLETE! Final BDC data saved.")