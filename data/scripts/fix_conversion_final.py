"""
Fix the conversion error in BDC data
Conversion factors represent liters per MT (e.g., 1324.5 liters = 1 MT)
So MT = Liters / Factor (NOT Liters / Factor / 1000)
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_conversion_final():
    """Apply CORRECT conversion: MT = Liters / Factor"""
    
    # Load the final BDC data
    df = pd.read_csv('FINAL_BDC_DATA.csv')
    logger.info(f"Loaded {len(df):,} BDC records")
    
    # Conversion factors (Liters per MT)
    # These mean: X liters = 1 MT
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
    
    logger.info("Applying CORRECT conversion factors...")
    
    # Process each record
    for idx, row in df.iterrows():
        product = row['product']
        original_volume = row['volume']
        
        if 'LPG' in product:
            # LPG is already in KG (confirmed by user)
            # volume = KG value from Excel
            # volume_kg = same as volume (already in KG)
            # volume_mt = KG / 1000
            # volume_liters = KG * 1.96 (1 kg LPG ≈ 1.96 liters)
            
            volume_kg = original_volume
            volume_mt = volume_kg / 1000      # KG to MT
            volume_liters = volume_kg * 1.96  # KG to liters (approximate)
            
            df.at[idx, 'volume'] = original_volume  # Keep original (KG)
            df.at[idx, 'volume_liters'] = volume_liters
            df.at[idx, 'volume_kg'] = volume_kg
            df.at[idx, 'volume_mt'] = volume_mt
            df.at[idx, 'unit_type'] = 'KG'
            
        else:
            # Other products are in LITERS
            # CORRECT CONVERSION:
            # volume = Liter value from Excel
            # volume_liters = same as volume
            # volume_mt = liters / (liters per MT)  <- THIS IS THE FIX
            # volume_kg = MT * 1000
            
            cf = conversion_factors.get(product, 1183.43)  # Default to gasoil
            
            volume_liters = original_volume
            volume_mt = volume_liters / cf     # CORRECT: Liters to MT directly
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
    
    # By product - TOP 10
    logger.info("\nTOP 10 PRODUCTS BY VOLUME (MT):")
    product_volumes = df.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
    for product, volume_mt in product_volumes.head(10).items():
        pct = (volume_mt / total_mt) * 100
        logger.info(f"  {product}: {volume_mt:,.2f} MT ({pct:.1f}%)")
    
    # Check specific products the user questioned
    logger.info("\nVERIFICATION OF CORRECTED FIGURES:")
    logger.info("-" * 50)
    
    # LPG verification
    lpg_data = df[df['product'].str.contains('LPG', na=False)]
    lpg_total_mt = lpg_data['volume_mt'].sum()
    logger.info(f"LPG Total: {lpg_total_mt:,.2f} MT (from {lpg_data['volume_kg'].sum():,.0f} KG)")
    
    # Gasoline verification
    gasoline_data = df[df['product'] == 'Gasoline']
    gasoline_total_liters = gasoline_data['volume_liters'].sum()
    gasoline_total_mt = gasoline_data['volume_mt'].sum()
    logger.info(f"Gasoline: {gasoline_total_liters:,.0f} liters = {gasoline_total_mt:,.2f} MT")
    logger.info(f"  Check: {gasoline_total_liters:,.0f} / 1324.5 = {gasoline_total_liters/1324.5:,.2f} MT ✓")
    
    # Gasoil verification (all variants)
    gasoil_data = df[df['product'].str.contains('Gasoil', na=False)]
    gasoil_total_liters = gasoil_data['volume_liters'].sum()
    gasoil_total_mt = gasoil_data['volume_mt'].sum()
    logger.info(f"Gasoil (all variants): {gasoil_total_liters:,.0f} liters = {gasoil_total_mt:,.2f} MT")
    
    # Aviation Turbine Kerosene
    atk_data = df[df['product'] == 'Aviation Turbine Kerosene']
    atk_total_liters = atk_data['volume_liters'].sum()
    atk_total_mt = atk_data['volume_mt'].sum()
    logger.info(f"Aviation Turbine Kerosene: {atk_total_liters:,.0f} liters = {atk_total_mt:,.2f} MT")
    
    # Heavy Fuel Oil
    hfo_data = df[df['product'] == 'Heavy Fuel Oil']
    hfo_total_liters = hfo_data['volume_liters'].sum()
    hfo_total_mt = hfo_data['volume_mt'].sum()
    logger.info(f"Heavy Fuel Oil: {hfo_total_liters:,.0f} liters = {hfo_total_mt:,.2f} MT")
    
    # Save corrected data
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'FINAL_BDC_DATA_CORRECTED_{timestamp}.csv'
    df.to_csv(output_file, index=False)
    
    # Also overwrite the standard location
    df.to_csv('FINAL_BDC_DATA.csv', index=False)
    
    logger.info(f"\nCorrected data saved to: {output_file}")
    logger.info(f"Also overwrote: FINAL_BDC_DATA.csv")
    
    return output_file, df

if __name__ == "__main__":
    print("FIXING CONVERSION ERROR - APPLYING CORRECT FORMULA")
    print("=" * 60)
    print("Conversion factors represent liters per MT")
    print("Correct formula: MT = Liters / Factor")
    print()
    output_file, df = fix_conversion_final()
    print(f"\nCOMPLETE! Corrected BDC data with proper conversion saved.")