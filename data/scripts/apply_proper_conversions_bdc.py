"""
Apply proper conversion factors to BDC data
Using the official conversion factors from the Excel file
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_proper_conversions():
    """Apply proper conversion factors to get accurate MT values"""
    
    # Load the extracted BDC data
    df = pd.read_csv('CLEANED_BDC_data_20250827_084844.csv')
    
    logger.info(f"Loaded {len(df):,} BDC records")
    
    # Define conversion factors (Liters to KG)
    # From the conversion factors Excel file
    conversion_factors = {
        'Gasoline': 1324.5,
        'Premium': 1324.5,
        'Premium ': 1324.5,
        'Gasoline (Premium) ': 1324.5,
        'Gasoline (Premium)': 1324.5,
        'Premix': 1324.5,
        'Premix ': 1324.5,
        
        'Gasoil': 1183.43,
        'Gas oil': 1183.43,
        'Gas oil ': 1183.43,
        'Gas oil (Diesel)': 1183.43,
        'Gasoil (Cell Site)': 1183.43,
        'Gasoil Cell Site': 1183.43,
        'Gasoil (Mines)': 1183.43,
        'Gasoil(Mines)': 1183.43,
        'Gasoil(Mines) ': 1183.43,
        'Gasoil Mines': 1183.43,
        'Gasoil (Rig)': 1183.43,
        ' Gasoil (Rig)': 1183.43,
        'Gasoil Rig': 1183.43,
        'Gasoil (Power Plant)': 1183.43,
        'Gasoil Power Plant': 1183.43,
        
        'Marine Gasoil': 1183.43,
        'Marine Gasoil ': 1183.43,
        'Marine Gasoil (Local)': 1183.43,
        'Marine Gasoil (Local) ': 1183.43,
        'Marine Gasoil Local': 1183.43,
        'Marine Gasoil Foreign': 1183.43,
        'Marine (Foreign)': 1183.43,
        
        'LPG': 1000.0,  # LPG is already in KG
        '*LPG': 1000.0,
        '*LPG ': 1000.0,
        'LPG - Butane': 1000.0,
        'LPG - Butane ': 1000.0,
        'LPG (Domestic)': 1000.0,
        'LPG CRM': 1000.0,
        'LPG (Power Plant)': 1000.0,
        'LPG -Propane (Power Plant)': 1000.0,
        
        'Kerosene': 1240.6,
        'Kerosene ': 1240.6,
        'ATK': 1240.6,
        'ATK ': 1240.6,
        
        'Fuel Oil (Industrial)': 1009.08,
        'Fuel  Oil (Industrial)': 1009.08,
        'Fuel  oil (Industrial)': 1009.08,
        'Fuel Oil Industrial': 1009.08,
        'Residual Fuel Oil (Industrial)': 1009.08,
        'Residual Fuel oil (Industrial)': 1009.08,
        'Fuel Oil (Power Plant)': 1009.08,
        'Fuel  oil (Power Plants)': 1009.08,
        'Fuel Oil Power Plant': 1009.08,
        'Heavy Fuel Oil (Power Plants)': 1009.08,
        'Heavy Fuel oil (Power Plant)': 1009.08,
        
        'Naphtha': 1324.5,
        'Naphtha (Unified)': 1324.5
    }
    
    # Product standardization (same as before but keep for clarity)
    product_standardization = {
        'Gasoline': 'Gasoline',
        'Premium': 'Gasoline',
        'Premium ': 'Gasoline',
        'Gasoline (Premium) ': 'Gasoline',
        'Gasoline (Premium)': 'Gasoline',
        'Premix': 'Gasoline',
        'Premix ': 'Gasoline',
        
        'Gasoil': 'Gasoil',
        'Gas oil': 'Gasoil',
        'Gas oil ': 'Gasoil',
        'Gas oil (Diesel)': 'Gasoil',
        
        'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
        'Gasoil Cell Site': 'Gasoil (Cell Site)',
        
        'Gasoil (Mines)': 'Gasoil (Mines)',
        'Gasoil(Mines)': 'Gasoil (Mines)',
        'Gasoil(Mines) ': 'Gasoil (Mines)',
        'Gasoil Mines': 'Gasoil (Mines)',
        
        'Gasoil (Rig)': 'Gasoil (Rig)',
        ' Gasoil (Rig)': 'Gasoil (Rig)',
        'Gasoil Rig': 'Gasoil (Rig)',
        
        'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
        'Gasoil Power Plant': 'Gasoil (Power Plant)',
        
        'Marine Gasoil': 'Marine Gasoil',
        'Marine Gasoil ': 'Marine Gasoil',
        'Marine Gasoil (Local)': 'Marine Gasoil (Local)',
        'Marine Gasoil (Local) ': 'Marine Gasoil (Local)',
        'Marine Gasoil Local': 'Marine Gasoil (Local)',
        'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
        'Marine (Foreign)': 'Marine Gasoil (Foreign)',
        
        'LPG': 'LPG',
        '*LPG': 'LPG',
        '*LPG ': 'LPG',
        'LPG - Butane': 'LPG',
        'LPG - Butane ': 'LPG',
        'LPG (Domestic)': 'LPG',
        'LPG CRM': 'LPG',
        'LPG (Power Plant)': 'LPG (Power Plant)',
        'LPG -Propane (Power Plant)': 'LPG (Power Plant)',
        
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
        
        'ATK': 'Aviation Turbine Kerosene',
        'ATK ': 'Aviation Turbine Kerosene',
        'Kerosene': 'Kerosene',
        'Kerosene ': 'Kerosene',
        'Naphtha': 'Naphtha',
        'Naphtha (Unified)': 'Naphtha',
        
        'NO.': None,  # Remove
        'Unnamed: 16': None  # Remove
    }
    
    # Company standardization
    company_standardization = {
        'AKWAABA LINK': 'AKWAABA LINK GROUP',
        'AKWABA LINK': 'AKWAABA LINK GROUP',
        'AKWAABA LINK INVESTMENTS LIMITED': 'AKWAABA LINK GROUP',
        'AKWAABA LINK INVESTMENTS LTD': 'AKWAABA LINK GROUP',
        
        'ASTRA OIL SERVICES': 'ASTRA OIL SERVICES LIMITED',
        'ALFAPETRO GHANA': 'ALFAPETRO GHANA LIMITED',
        'BLUE OCEAN INVESTMENTS LTD': 'BLUE OCEAN INVESTMENTS LIMITED',
        'CHASE PET. GHANA LIMITED': 'CHASE PETROLEUM GHANA LIMITED',
        'CHASE PET. GHANA LTD': 'CHASE PETROLEUM GHANA LIMITED',
        'ADINKRA': 'ADINKRA SUPPLY COMPANY GHANA LIMITED',
        
        'AKWAABA OIL REFINERY LIMITED': 'AKWAABA OIL REFINERY LIMITED'
    }
    
    # Apply standardizations
    logger.info("Applying standardizations...")
    df['product_standardized'] = df['product'].map(lambda x: product_standardization.get(x, x))
    df['company_name_standardized'] = df['company_name'].map(lambda x: company_standardization.get(x, x))
    
    # Remove invalid records
    before_count = len(df)
    df = df[df['product_standardized'].notna()].copy()
    after_count = len(df)
    logger.info(f"Removed {before_count - after_count} invalid records")
    
    # Apply proper conversions
    logger.info("Applying proper conversion factors...")
    
    # Handle LPG differently (it's already in KG)
    is_lpg = df['product'].str.contains('LPG', case=False, na=False)
    
    # For LPG products, the volume is already in KG
    df.loc[is_lpg, 'volume_kg'] = df.loc[is_lpg, 'volume']
    df.loc[is_lpg, 'volume_liters'] = df.loc[is_lpg, 'volume']  # Keep as is for now
    df.loc[is_lpg, 'volume_mt'] = df.loc[is_lpg, 'volume'] / 1000
    df.loc[is_lpg, 'unit_type'] = 'KG'
    
    # For non-LPG products (in liters)
    for idx, row in df[~is_lpg].iterrows():
        product = row['product']
        volume = row['volume']
        
        # Get conversion factor
        cf = conversion_factors.get(product, None)
        
        if cf is None:
            logger.warning(f"No conversion factor for product: {product}")
            cf = 1000.0  # Default assumption
        
        # Calculate volumes
        volume_liters = volume  # Original is in liters
        volume_kg = volume_liters / cf  # Convert liters to KG
        volume_mt = volume_kg / 1000  # Convert KG to MT
        
        df.at[idx, 'volume_liters'] = volume_liters
        df.at[idx, 'volume_kg'] = volume_kg
        df.at[idx, 'volume_mt'] = volume_mt
        df.at[idx, 'unit_type'] = 'LITERS'
    
    # Update main columns with standardized values
    df['product'] = df['product_standardized']
    df['company_name'] = df['company_name_standardized']
    
    # Drop temporary columns
    df = df.drop(['product_standardized', 'company_name_standardized'], axis=1)
    
    # Data quality
    df['data_quality_score'] = 1.0
    volume_99th = df['volume_liters'].quantile(0.99)
    df.loc[df['volume_liters'] > volume_99th, 'is_outlier'] = True
    df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
    
    # Summary statistics
    logger.info("\nCONVERSION SUMMARY:")
    logger.info("=" * 50)
    logger.info(f"Total records: {len(df):,}")
    logger.info(f"Unique companies: {df['company_name'].nunique()}")
    logger.info(f"Unique products: {df['product'].nunique()}")
    
    # Volume summary
    logger.info("\nVOLUME SUMMARY:")
    logger.info(f"Total volume (Liters): {df['volume_liters'].sum():,.0f}")
    logger.info(f"Total volume (MT): {df['volume_mt'].sum():,.2f}")
    logger.info(f"Average MT per transaction: {df['volume_mt'].mean():,.2f}")
    
    # Product volume breakdown
    logger.info("\nPRODUCT VOLUMES (MT):")
    product_volumes = df.groupby('product')['volume_mt'].sum().sort_values(ascending=False)
    for product, volume_mt in product_volumes.items():
        logger.info(f"  {product}: {volume_mt:,.2f} MT")
    
    # Save with proper conversions
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'BDC_WITH_PROPER_CONVERSIONS_{timestamp}.csv'
    df.to_csv(output_file, index=False)
    
    logger.info(f"\nData saved to: {output_file}")
    
    return output_file, df

if __name__ == "__main__":
    print("APPLYING PROPER CONVERSION FACTORS TO BDC DATA")
    print("=" * 60)
    output_file, df = apply_proper_conversions()
    print(f"\nCOMPLETE! Properly converted BDC data saved to: {output_file}")