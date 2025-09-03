"""
Standardize and prepare supply data for database insertion
Ensures product names match database standards
"""

import pandas as pd
import numpy as np
from datetime import datetime

def standardize_supply_data():
    """Standardize supply data to match database format"""
    
    # Read the extracted data
    df = pd.read_csv('C:/Users/victo/Documents/Data_Science_Projects/petroverse_analytics/data/final/SUPPLY_DATA_CLEAN.csv')
    
    print(f"Original records: {len(df)}")
    print(f"Original products: {df['product'].nunique()}")
    
    # Comprehensive product name mapping to match database standards
    product_mapping = {
        # Gasoline variants
        'GASOLINE (Petrol)': 'Gasoline',
        'Gasoline': 'Gasoline',
        'PREMIX': 'Gasoline',  # Premix is a type of gasoline
        
        # Gasoil/Diesel variants
        'Gas oil (Diesel)': 'Gasoil',
        'Gasoil': 'Gasoil',
        
        # Gasoil special types
        'GASOIL - Cell Site': 'Gasoil (Cell Site)',
        'Gasoil (Cell Site)': 'Gasoil (Cell Site)',
        'GASOIL -Power Plant': 'Gasoil (Power Plant)',
        'Gasoil (Power Plant)': 'Gasoil (Power Plant)',
        'GASOIL-Mines': 'Gasoil (Mines)',
        'Gasoil (Mines)': 'Gasoil (Mines)',
        'GASOIL-Rig': 'Gasoil (Rig)',
        'Gasoil (Rig)': 'Gasoil (Rig)',
        
        # LPG variants
        'LPG': 'LPG',
        'LPG - Butane': 'LPG',
        
        # Kerosene variants
        'KEROSENE': 'Kerosene',
        'Kerosene': 'Kerosene',
        
        # Aviation fuel
        'Aviation Turbine Kerosene': 'Aviation Turbine Kerosene',
        
        # Marine Gasoil
        'MGO Local': 'Marine Gasoil (Local)',
        'Marine Gasoil (Local)': 'Marine Gasoil (Local)',
        'MGO Foreign': 'Marine Gasoil (Foreign)',
        'Marine Gasoil (Foreign)': 'Marine Gasoil (Foreign)',
        
        # Heavy Fuel Oil
        'Heavy Fuel Oil': 'Heavy Fuel Oil',
        'Heavy Fuel oil (Power Plant)': 'Heavy Fuel Oil',
        'HFO': 'Heavy Fuel Oil',
        'RFO': 'Heavy Fuel Oil',
        'Residual Fuel oil (Industrial)': 'Heavy Fuel Oil',
        
        # Naphtha
        'NAPHTHA': 'Naphtha',
        'Naphtha': 'Naphtha',
        'Naphtha (Unified)': 'Naphtha'
    }
    
    # Apply product standardization
    df['product'] = df['product'].map(product_mapping).fillna(df['product'])
    df['product_name_clean'] = df['product']
    
    # Recalculate product category based on standardized names
    def get_product_category(product):
        if 'Gasoline' in product:
            return 'Gasoline'
        elif 'Gasoil' in product:
            return 'Gasoil'
        elif 'LPG' in product:
            return 'LPG'
        elif 'Kerosene' in product or 'Aviation' in product:
            return 'Kerosene/ATK'
        elif 'Heavy Fuel Oil' in product:
            return 'Heavy Fuel Oil'
        elif 'Marine' in product:
            return 'Marine Gasoil'
        elif 'Naphtha' in product:
            return 'Naphtha'
        else:
            return 'Other'
    
    df['product_category'] = df['product'].apply(get_product_category)
    
    # Ensure all required columns exist
    if 'volume_mt' not in df.columns:
        # Apply conversion factors
        conversion_factors = {
            'Gasoline': 1324.5,
            'Gasoil': 1183.43,
            'Gasoil (Cell Site)': 1183.43,
            'Gasoil (Mines)': 1183.43,
            'Gasoil (Power Plant)': 1183.43,
            'Gasoil (Rig)': 1183.43,
            'LPG': 1000.0,
            'Kerosene': 1240.6,
            'Aviation Turbine Kerosene': 1240.6,
            'Marine Gasoil (Local)': 1183.43,
            'Marine Gasoil (Foreign)': 1183.43,
            'Heavy Fuel Oil': 1009.08,
            'Naphtha': 1324.5
        }
        
        df['volume_mt'] = df.apply(
            lambda row: row['quantity_original'] / 1000 if row['unit'] == 'KG' 
            else row['quantity_original'] / conversion_factors.get(row['product'], 1183.43),
            axis=1
        )
        
        df['volume_liters'] = df.apply(
            lambda row: row['quantity_original'] if row['unit'] == 'LITERS' else row['quantity_original'],
            axis=1
        )
        
        df['volume_kg'] = df['volume_mt'] * 1000
    
    # Sort by date and region
    df = df.sort_values(['year', 'month', 'region', 'product'])
    
    # Save standardized data
    output_file = 'C:/Users/victo/Documents/Data_Science_Projects/petroverse_analytics/data/final/SUPPLY_DATA_STANDARDIZED.csv'
    df.to_csv(output_file, index=False)
    
    print(f"\nStandardized records: {len(df)}")
    print(f"Standardized products: {df['product'].nunique()}")
    
    print("\nStandardized product list:")
    for product in sorted(df['product'].unique()):
        count = len(df[df['product'] == product])
        volume = df[df['product'] == product]['volume_mt'].sum()
        print(f"  {product}: {count} records, {volume:,.2f} MT")
    
    print("\nSummary by year:")
    summary = df.groupby('year').agg({
        'volume_mt': 'sum',
        'region': 'nunique',
        'product': 'nunique'
    }).round(2)
    summary.columns = ['Total Volume (MT)', 'Regions', 'Products']
    print(summary)
    
    print(f"\nOutput saved to: {output_file}")
    
    return df

if __name__ == "__main__":
    standardize_supply_data()