"""
Standardize the extracted cleaned BDC data
"""

import pandas as pd
import numpy as np
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def standardize_bdc_data():
    """Standardize the cleaned BDC data"""
    
    # Load extracted data
    df = pd.read_csv('CLEANED_BDC_data_20250827_084844.csv')
    
    logger.info(f"Loading {len(df):,} BDC records for standardization")
    
    # Product standardization mapping
    product_standardization = {
        # Gasoline variants
        'Gasoline': 'Gasoline',
        
        # Gasoil variants
        'Gasoil': 'Gasoil', 
        'Gas oil': 'Gasoil',
        'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
        'Gasoil Cell Site': 'Gasoil (Cell Site)',
        'Gasoil (Mines)': 'Gasoil (Mines)',
        'Gasoil(Mines)': 'Gasoil (Mines)',
        'Gasoil Mines': 'Gasoil (Mines)',
        'Gasoil (Rig)': 'Gasoil (Rig)',
        'Gasoil Rig': 'Gasoil (Rig)',
        'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
        'Gasoil Power Plant': 'Gasoil (Power Plant)',
        
        # Marine Gasoil variants
        'Marine Gasoil': 'Marine Gasoil',
        'Marine Gasoil (Local)': 'Marine Gasoil (Local)',
        'Marine Gasoil Local': 'Marine Gasoil (Local)',
        'Marine Gasoil Foreign': 'Marine Gasoil (Foreign)',
        
        # LPG variants
        'LPG': 'LPG',
        '*LPG': 'LPG',
        'LPG - Butane': 'LPG',
        'LPG (Domestic)': 'LPG',
        'LPG CRM': 'LPG',
        'LPG (Power Plant)': 'LPG (Power Plant)',
        
        # Fuel Oil variants
        'Fuel Oil (Industrial)': 'Heavy Fuel Oil',
        'Fuel  Oil (Industrial)': 'Heavy Fuel Oil',
        'Fuel Oil Industrial': 'Heavy Fuel Oil',
        'Residual Fuel Oil (Industrial)': 'Heavy Fuel Oil',
        'Fuel Oil (Power Plant)': 'Heavy Fuel Oil',
        'Fuel Oil Power Plant': 'Heavy Fuel Oil',
        'Heavy Fuel Oil (Power Plants)': 'Heavy Fuel Oil',
        
        # Other products
        'ATK': 'Aviation Turbine Kerosene',
        'Kerosene': 'Kerosene',
        'Naphtha': 'Naphtha',
        
        # Remove invalid entries
        'NO.': None,
        'Unnamed: 16': None
    }
    
    # Company standardization mapping
    company_standardization = {
        # AKWAABA variations
        'AKWAABA LINK': 'AKWAABA LINK GROUP',
        'AKWABA LINK': 'AKWAABA LINK GROUP', 
        'AKWAABA LINK INVESTMENTS LIMITED': 'AKWAABA LINK GROUP',
        
        # ASTRA variations
        'ASTRA OIL SERVICES': 'ASTRA OIL SERVICES LIMITED',
        
        # ALFAPETRO variations
        'ALFAPETRO GHANA': 'ALFAPETRO GHANA LIMITED',
        
        # BLUE OCEAN variations
        'BLUE OCEAN INVESTMENTS LTD': 'BLUE OCEAN INVESTMENTS LIMITED',
        
        # CHASE variations
        'CHASE PET. GHANA LIMITED': 'CHASE PETROLEUM GHANA LIMITED',
        
        # ADINKRA variations
        'ADINKRA': 'ADINKRA SUPPLY COMPANY GHANA LIMITED',
        
        # Keep AKWAABA OIL REFINERY separate (as specified previously)
        'AKWAABA OIL REFINERY LIMITED': 'AKWAABA OIL REFINERY LIMITED'
    }
    
    # Apply product standardization
    logger.info("Applying product standardization...")
    df['product_standardized'] = df['product'].map(lambda x: product_standardization.get(x, x))
    
    # Remove records with None products (invalid entries)
    before_count = len(df)
    df = df[df['product_standardized'].notna()].copy()
    after_count = len(df)
    logger.info(f"Removed {before_count - after_count} invalid product records")
    
    # Apply company standardization
    logger.info("Applying company standardization...")
    df['company_name_standardized'] = df['company_name'].map(lambda x: company_standardization.get(x, x))
    
    # Update the main columns
    df['product'] = df['product_standardized']
    df['company_name'] = df['company_name_standardized']
    
    # Drop temporary columns
    df = df.drop(['product_standardized', 'company_name_standardized'], axis=1)
    
    # Data quality improvements
    logger.info("Applying data quality improvements...")
    
    # Remove records with zero or negative volumes
    df = df[df['volume_liters'] > 0].copy()
    
    # Flag potential outliers (volumes > 99th percentile)
    volume_99th = df['volume_liters'].quantile(0.99)
    df['is_outlier'] = df['volume_liters'] > volume_99th
    
    # Update data quality score based on various factors
    df['data_quality_score'] = 1.0
    
    # Lower score for outliers
    df.loc[df['is_outlier'], 'data_quality_score'] = 0.8
    
    # Lower score for very small volumes (potential data entry errors)
    df.loc[df['volume_liters'] < 100, 'data_quality_score'] = 0.7
    
    # Print standardization summary
    logger.info("\nSTANDARDIZATION SUMMARY:")
    logger.info("=" * 50)
    logger.info(f"Final records: {len(df):,}")
    logger.info(f"Unique companies: {df['company_name'].nunique()}")
    logger.info(f"Unique products: {df['product'].nunique()}")
    
    logger.info("\nStandardized Products:")
    for product in sorted(df['product'].unique()):
        count = (df['product'] == product).sum()
        logger.info(f"  {product}: {count:,} records")
    
    logger.info("\nTop 10 Companies by Volume:")
    company_volumes = df.groupby('company_name')['volume_liters'].sum().sort_values(ascending=False)
    for company, volume in company_volumes.head(10).items():
        logger.info(f"  {company}: {volume:,.0f} liters")
    
    # Data validation
    logger.info("\nDATA VALIDATION:")
    logger.info(f"Year range: {df['year'].min()} - {df['year'].max()}")
    logger.info(f"Total volume: {df['volume_liters'].sum():,.0f} liters")
    logger.info(f"Average volume per transaction: {df['volume_liters'].mean():,.0f} liters")
    logger.info(f"Outliers identified: {df['is_outlier'].sum():,} ({df['is_outlier'].mean()*100:.1f}%)")
    
    # Save standardized data
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'STANDARDIZED_BDC_data_{timestamp}.csv'
    df.to_csv(output_file, index=False)
    
    logger.info(f"\nStandardized data saved to: {output_file}")
    
    return output_file, df

if __name__ == "__main__":
    print("STANDARDIZING CLEANED BDC DATA")
    print("=" * 50)
    output_file, df = standardize_bdc_data()
    print(f"\nCOMPLETE! Standardized BDC data saved to: {output_file}")