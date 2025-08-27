"""
Fix LPG conversion - values are in GRAMS not KG
Despite header saying KG, the values are clearly in grams
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_lpg_grams_to_mt():
    """Fix LPG conversion - values are in grams"""
    
    # Load the final BDC data
    df = pd.read_csv('FINAL_BDC_DATA.csv')
    logger.info(f"Loaded {len(df):,} BDC records")
    
    # Conversion factors for non-LPG products (Liters to MT)
    conversion_factors = {
        'Gasoline': 1324.5,          # 1324.5 liters = 1 MT
        'Gasoil': 1183.43,           # 1183.43 liters = 1 MT
        'Gasoil (Cell Site)': 1183.43,
        'Gasoil (Mines)': 1183.43,
        'Gasoil (Rig)': 1183.43,
        'Gasoil (Power Plant)': 1183.43,
        'Marine Gasoil': 1183.43,
        'Marine Gasoil (Local)': 1183.43,
        'Marine Gasoil (Foreign)': 1183.43,
        'Kerosene': 1240.6,          # 1240.6 liters = 1 MT
        'Aviation Turbine Kerosene': 1240.6,
        'Heavy Fuel Oil': 1009.08,    # 1009.08 liters = 1 MT
        'Naphtha': 1324.5            # 1324.5 liters = 1 MT
    }
    
    logger.info("Fixing volume conversions (LPG is in GRAMS)...")
    
    # Process each record
    for idx, row in df.iterrows():
        product = row['product']
        original_volume = row['volume']
        
        if 'LPG' in product:
            # LPG values are in GRAMS (not KG as header states)
            # volume = GRAM value from Excel
            # volume_kg = grams / 1000
            # volume_mt = grams / 1,000,000
            # volume_liters = kg * 1.96 (1 kg LPG ≈ 1.96 liters)
            
            volume_grams = original_volume
            volume_kg = volume_grams / 1000
            volume_mt = volume_grams / 1000000
            volume_liters = volume_kg * 1.96  # 1 kg LPG = 1.96 liters
            
            df.at[idx, 'volume'] = original_volume  # Keep original (grams)
            df.at[idx, 'volume_liters'] = volume_liters
            df.at[idx, 'volume_kg'] = volume_kg
            df.at[idx, 'volume_mt'] = volume_mt
            df.at[idx, 'unit_type'] = 'GRAMS'
            
        else:
            # Other products are in LITERS (correct as is)
            cf = conversion_factors.get(product, 1183.43)  # Default to gasoil
            
            volume_liters = original_volume
            volume_mt = volume_liters / cf     # Liters to MT
            volume_kg = volume_mt * 1000       # MT to KG
            
            df.at[idx, 'volume'] = original_volume  # Keep original
            df.at[idx, 'volume_liters'] = volume_liters
            df.at[idx, 'volume_kg'] = volume_kg
            df.at[idx, 'volume_mt'] = volume_mt
            df.at[idx, 'unit_type'] = 'LITERS'
    
    # Summary statistics
    logger.info("\nCORRECTED VOLUME SUMMARY:")
    logger.info("=" * 60)
    
    # Overall totals
    total_mt = df['volume_mt'].sum()
    logger.info(f"Total volume (MT): {total_mt:,.2f}")
    
    # By category
    logger.info("\nVOLUME BY CATEGORY (MT):")
    category_volumes = df.groupby('product_category')['volume_mt'].sum().sort_values(ascending=False)
    for category, volume_mt in category_volumes.items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {category}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # By product
    logger.info("\nTOP 10 PRODUCTS BY VOLUME (MT):")
    product_volumes = df.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
    for product, volume_mt in product_volumes.head(10).items():
        logger.info(f"  {product}: {volume_mt:,.2f} MT")
    
    # Check LPG specifically
    lpg_data = df[df['product'].str.contains('LPG', na=False)]
    logger.info(f"\nLPG VERIFICATION (corrected from grams):")
    logger.info(f"  LPG records: {len(lpg_data):,}")
    logger.info(f"  Total LPG (KG): {lpg_data['volume_kg'].sum():,.0f}")
    logger.info(f"  Total LPG (MT): {lpg_data['volume_mt'].sum():,.2f}")
    logger.info(f"  Average per transaction (KG): {lpg_data['volume_kg'].mean():,.0f}")
    logger.info(f"  Average per transaction (MT): {lpg_data['volume_mt'].mean():,.2f}")
    
    # Compare with other major products
    logger.info("\nCOMPARISON WITH OTHER PRODUCTS:")
    for prod in ['Gasoline', 'Gasoil', 'LPG']:
        prod_data = df[df['product'] == prod] if prod != 'LPG' else lpg_data
        if len(prod_data) > 0:
            total_mt = prod_data['volume_mt'].sum()
            avg_mt = prod_data['volume_mt'].mean()
            logger.info(f"  {prod}: Total {total_mt:,.2f} MT, Avg {avg_mt:,.2f} MT/transaction")
    
    # Save corrected data
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'BDC_DATA_FINAL_CORRECTED_{timestamp}.csv'
    df.to_csv(output_file, index=False)
    
    # Also save to standard location
    df.to_csv('FINAL_BDC_DATA_CORRECTED.csv', index=False)
    
    logger.info(f"\nCorrected data saved to: {output_file}")
    logger.info(f"Also saved to: FINAL_BDC_DATA_CORRECTED.csv")
    
    return output_file, df

if __name__ == "__main__":
    print("FIXING LPG CONVERSION - VALUES ARE IN GRAMS")
    print("=" * 60)
    print("Despite header saying KG, the LPG values are clearly in GRAMS")
    print("This will correct the conversion to get realistic MT values")
    print()
    output_file, df = fix_lpg_grams_to_mt()
    print(f"\nCOMPLETE! Corrected BDC data with proper LPG conversion saved.")