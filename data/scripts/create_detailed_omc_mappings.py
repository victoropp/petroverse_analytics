"""
Create detailed OMC standardization mappings for review
Including all company variations and standardizations
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_detailed_omc_mappings():
    """Create comprehensive OMC mappings Excel file for review"""
    
    # Load the raw OMC data to get all original values
    df_raw = pd.read_csv('CLEANED_OMC_data_20250827_103202.csv')
    df_raw = df_raw[df_raw['product'] != 'NO.'].copy()  # Remove NO. entries
    
    # Load the final OMC data to get standardized values
    df_final = pd.read_csv('FINAL_OMC_DATA.csv')
    
    logger.info(f"Raw OMC data: {len(df_raw):,} records")
    logger.info(f"Final OMC data: {len(df_final):,} records")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_file = f'OMC_STANDARDIZATION_MAPPINGS_DETAILED_{timestamp}.xlsx'
    
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        
        # 1. PRODUCT MAPPING
        logger.info("Creating product mapping...")
        
        # Get all unique products from raw data
        raw_products = df_raw['product'].unique()
        raw_products = [p for p in raw_products if pd.notna(p)]
        
        product_mapping_data = []
        for orig_product in sorted(raw_products):
            # Find standardized version
            matching_records = df_raw[df_raw['product'] == orig_product]
            if len(matching_records) > 0:
                # Try to find in final data based on volume/company matching
                standardized_product = None
                category = None
                
                # Manual mapping based on our standardization logic
                if orig_product in ['GASOLINE', 'Gasoline', 'Gasoline (Premium)', 'Gasoline (Premium) ', 'PREMIUM', 'PREMIX', 'Premix', 'Premix ']:
                    standardized_product = 'Gasoline'
                    category = 'Gasoline'
                elif orig_product in ['GASOIL', 'Gasoil', 'Gas oil (Diesel)', 'Gas oil', 'DIESEL']:
                    standardized_product = 'Gasoil'
                    category = 'Gasoil'
                elif orig_product in ['GASOIL MINES', 'Gasoil (Mines)', 'Gasoil Mines']:
                    standardized_product = 'Gasoil (Mines)'
                    category = 'Gasoil'
                elif orig_product in ['GASOIL(RIG)', 'Gasoil (Rig)', 'Gasoil Rig']:
                    standardized_product = 'Gasoil (Rig)'
                    category = 'Gasoil'
                elif orig_product in ['Gasoil (Cell Site)', 'Gasoil Cell Site']:
                    standardized_product = 'Gasoil (Cell Site)'
                    category = 'Gasoil'
                elif orig_product in ['Gasoil (Power Plant)', 'Gasoil Power Plant']:
                    standardized_product = 'Gasoil (Power Plant)'
                    category = 'Gasoil'
                elif orig_product in ['MARINE GASOIL', 'Marine Gasoil', 'MGO']:
                    standardized_product = 'Marine Gasoil'
                    category = 'Gasoil'
                elif orig_product in ['MGO LOCAL', 'Marine Gasoil (Local)', 'Marine Gasoil Local']:
                    standardized_product = 'Marine Gasoil (Local)'
                    category = 'Gasoil'
                elif orig_product in ['MGO FOREIGN', 'Marine Gasoil (Foreign)', 'Marine Gasoil Foreign']:
                    standardized_product = 'Marine Gasoil (Foreign)'
                    category = 'Gasoil'
                elif orig_product in ['**LPG', '*LPG', 'LPG', 'LPG - Butane', 'LPG - Butane ', 'LPG (BULK)', 'LPG - CRM', 'LPG CRM']:
                    standardized_product = 'LPG'
                    category = 'LPG'
                elif orig_product in ['KEROSENE', 'Kerosene', 'Kerosene ']:
                    standardized_product = 'Kerosene'
                    category = 'Kerosene'
                elif orig_product in ['ATK', 'ATK ', 'JET A1']:
                    standardized_product = 'Aviation Turbine Kerosene'
                    category = 'Aviation Turbine Kerosene'
                elif orig_product in ['HFO', 'RFO', 'FUEL OIL', 'Fuel Oil', 'Fuel Oil Industrial', 'Residual Fuel Oil (Industrial)', 
                                     'Residual Fuel oil (Industrial)', 'Heavy Fuel Oil (Power)', 'Heavy Fuel oil (Power Plant)', 'Fuel Oil Power Plant']:
                    standardized_product = 'Heavy Fuel Oil'
                    category = 'Heavy Fuel Oil'
                elif orig_product in ['NAPHTHA', 'Naphtha', 'NAPHTHA (UNIFIED)', 'Naphtha (Unified)']:
                    standardized_product = 'Naphtha'
                    category = 'Naphtha'
                elif orig_product in ['LUBRICANTS', 'LUBES']:
                    standardized_product = 'Lubricants'
                    category = 'Lubricants'
                else:
                    standardized_product = 'UNMAPPED'
                    category = 'REVIEW NEEDED'
                
                record_count = len(matching_records)
                total_volume = matching_records['volume'].sum()
                
                product_mapping_data.append({
                    'Original_Product': orig_product,
                    'Standardized_Product': standardized_product,
                    'Standardized_Category': category,
                    'Record_Count': record_count,
                    'Total_Volume': total_volume,
                    'Sample_Company': matching_records['company_name'].iloc[0] if len(matching_records) > 0 else '',
                    'Notes': 'Included in final dataset' if standardized_product != 'UNMAPPED' else 'EXCLUDED - Review needed'
                })
        
        product_df = pd.DataFrame(product_mapping_data)
        product_df = product_df.sort_values(['Standardized_Category', 'Record_Count'], ascending=[True, False])
        product_df.to_excel(writer, sheet_name='Product_Mapping', index=False)
        
        logger.info(f"Product mappings: {len(product_df)} products")
        
        # 2. DETAILED COMPANY MAPPING
        logger.info("Creating detailed company mapping...")
        
        # Get all companies from raw data with their volumes and standardized versions
        company_mapping_data = []
        
        # Group raw data by company to get totals
        company_stats = df_raw.groupby('company_name').agg({
            'volume': 'sum',
            'year': 'count',
            'product': lambda x: list(x.unique())[:5]  # Sample products
        }).reset_index()
        
        for _, row in company_stats.iterrows():
            original_company = row['company_name']
            if pd.isna(original_company):
                continue
            
            # Apply the same standardization logic
            company_clean = str(original_company).strip().upper()
            
            if 'GOIL' in company_clean and 'GHANA OIL' not in company_clean:
                standardized_company = 'GOIL COMPANY LIMITED'
            elif 'GHANA OIL' in company_clean:
                standardized_company = 'GHANA OIL COMPANY LIMITED'
            elif 'TOTAL' in company_clean and 'ENERGIES' in company_clean:
                standardized_company = 'TOTAL ENERGIES MARKETING GHANA LIMITED'
            elif 'VIVO' in company_clean:
                standardized_company = 'VIVO ENERGY GHANA LIMITED'
            elif 'PUMA' in company_clean:
                standardized_company = 'PUMA ENERGY DISTRIBUTION GHANA LIMITED'
            elif 'SHELL' in company_clean:
                standardized_company = 'SHELL GHANA LIMITED'
            elif 'STAR OIL' in company_clean:
                standardized_company = 'STAR OIL COMPANY LIMITED'
            elif 'PETROSOL' in company_clean:
                standardized_company = 'PETROSOL GHANA LIMITED'
            elif 'SO ENERGY' in company_clean:
                standardized_company = 'SO ENERGY GH LIMITED'
            elif 'ZEN PETROLEUM' in company_clean:
                standardized_company = 'ZEN PETROLEUM LIMITED'
            else:
                standardized_company = original_company.strip()
            
            # Check if company appears in final data
            in_final_data = standardized_company in df_final['company_name'].values
            final_volume = 0
            if in_final_data:
                final_volume = df_final[df_final['company_name'] == standardized_company]['volume_mt'].sum()
            
            company_mapping_data.append({
                'Original_Company': original_company,
                'Standardized_Company': standardized_company,
                'Raw_Volume_Total': row['volume'],
                'Final_Volume_MT': final_volume,
                'Record_Count': row['year'],
                'Sample_Products': ', '.join(row['product'][:3]) if row['product'] else '',
                'Change_Made': 'YES' if original_company.strip() != standardized_company else 'NO',
                'In_Final_Dataset': 'YES' if in_final_data else 'NO',
                'Notes': _get_company_notes(original_company, standardized_company)
            })
        
        company_df = pd.DataFrame(company_mapping_data)
        company_df = company_df.sort_values('Final_Volume_MT', ascending=False)
        company_df.to_excel(writer, sheet_name='Company_Mapping', index=False)
        
        logger.info(f"Company mappings: {len(company_df)} companies")
        
        # 3. CONVERSION FACTORS
        logger.info("Creating conversion factors sheet...")
        
        cf_data = {
            'Product': [
                'Gasoline', 'Gasoil', 'Gasoil (Mines)', 'Gasoil (Rig)', 'Gasoil (Cell Site)', 
                'Gasoil (Power Plant)', 'Marine Gasoil', 'Marine Gasoil (Local)', 'Marine Gasoil (Foreign)',
                'LPG', 'Kerosene', 'Aviation Turbine Kerosene', 'Heavy Fuel Oil', 'Naphtha', 'Lubricants'
            ],
            'Unit_in_Excel': [
                'Liters', 'Liters', 'Liters', 'Liters', 'Liters',
                'Liters', 'Liters', 'Liters', 'Liters',
                'Kilograms', 'Liters', 'Liters', 'Liters', 'Liters', 'Liters'
            ],
            'Conversion_Factor': [
                '1324.5 L/MT', '1183.43 L/MT', '1183.43 L/MT', '1183.43 L/MT', '1183.43 L/MT',
                '1183.43 L/MT', '1183.43 L/MT', '1183.43 L/MT', '1183.43 L/MT',
                '1000 KG/MT', '1240.6 L/MT', '1240.6 L/MT', '1009.08 L/MT', '1324.5 L/MT', '1100 L/MT'
            ],
            'Formula_Used': [
                'MT = Liters ÷ 1324.5', 'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43',
                'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43', 'MT = Liters ÷ 1183.43',
                'MT = KG ÷ 1000', 'MT = Liters ÷ 1240.6', 'MT = Liters ÷ 1240.6', 'MT = Liters ÷ 1009.08', 'MT = Liters ÷ 1324.5', 'MT = Liters ÷ 1100'
            ],
            'Notes': [
                'Same as BDC', 'Same as BDC', 'Same as BDC', 'Same as BDC', 'Same as BDC',
                'Same as BDC', 'Same as BDC', 'Same as BDC', 'Same as BDC',
                'LPG already in KG in Excel files', 'Same as BDC', 'Same as BDC', 'Same as BDC', 'Same as BDC', 'Estimated'
            ]
        }
        
        cf_df = pd.DataFrame(cf_data)
        cf_df.to_excel(writer, sheet_name='Conversion_Factors', index=False)
        
        # 4. SUMMARY STATISTICS
        logger.info("Creating summary sheet...")
        
        summary_data = {
            'Metric': [
                'Raw OMC Records Extracted',
                'Invalid NO. Records Removed', 
                'Final OMC Records',
                'Years Covered',
                'Raw Companies (unique)',
                'Standardized Companies',
                'Raw Products (unique)',
                'Standardized Products',
                'Product Categories',
                'Total Volume (MT)',
                'Total Volume (Liters)',
                'Largest Company (by volume)',
                'Most Common Product',
                'Data Quality Score (avg)',
                'Outlier Records'
            ],
            'Value': [
                f"{len(df_raw):,}",
                "15,601",
                f"{len(df_final):,}",
                f"{df_final['year'].min()} - {df_final['year'].max()}",
                f"{df_raw['company_name'].nunique()}",
                f"{df_final['company_name'].nunique()}",
                f"{df_raw['product'].nunique()}",
                f"{df_final['product'].nunique()}",
                f"{df_final['product_category'].nunique()}",
                f"{df_final['volume_mt'].sum():,.2f}",
                f"{df_final['volume_liters'].sum():,.0f}",
                df_final.groupby('company_name')['volume_mt'].sum().idxmax(),
                df_final['product'].value_counts().index[0],
                f"{df_final['data_quality_score'].mean():.3f}",
                f"{df_final['is_outlier'].sum():,} ({df_final['is_outlier'].mean()*100:.1f}%)"
            ]
        }
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        # 5. REMOVED/UNMAPPED RECORDS
        logger.info("Creating removed records sheet...")
        
        # Find products that were in raw but not in final
        raw_products_set = set(df_raw['product'].unique())
        final_products_set = set(df_final['product_original_name'].unique())
        
        removed_products = []
        for prod in raw_products_set:
            if prod not in final_products_set and prod != 'NO.':
                count = len(df_raw[df_raw['product'] == prod])
                volume = df_raw[df_raw['product'] == prod]['volume'].sum()
                removed_products.append({
                    'Removed_Product': prod,
                    'Record_Count': count,
                    'Total_Volume': volume,
                    'Reason': 'Not mapped in standardization'
                })
        
        # Add the NO. records
        removed_products.append({
            'Removed_Product': 'NO.',
            'Record_Count': 15601,
            'Total_Volume': 0,
            'Reason': 'Invalid product - sequence number column'
        })
        
        removed_df = pd.DataFrame(removed_products)
        removed_df = removed_df.sort_values('Record_Count', ascending=False)
        removed_df.to_excel(writer, sheet_name='Removed_Records', index=False)
        
    logger.info(f"\nDetailed OMC mappings saved to: {excel_file}")
    return excel_file

def _get_company_notes(original, standardized):
    """Get notes about company standardization"""
    if original.strip() == standardized:
        return 'No change - kept original name'
    elif 'GOIL' in standardized:
        return 'Standardized GOIL variations'
    elif 'VIVO' in standardized:
        return 'Standardized VIVO variations'
    elif 'PUMA' in standardized:
        return 'Standardized PUMA variations'
    elif 'TOTAL' in standardized:
        return 'Standardized TOTAL variations'
    else:
        return 'Name standardized/cleaned'

if __name__ == "__main__":
    print("CREATING DETAILED OMC STANDARDIZATION MAPPINGS")
    print("=" * 60)
    excel_file = create_detailed_omc_mappings()
    print(f"\nComplete! Detailed mappings saved to: {excel_file}")
    print("\nThis includes:")
    print("  - Product mappings with categories")
    print("  - Detailed company standardizations") 
    print("  - Conversion factors used")
    print("  - Summary statistics")
    print("  - Records that were removed/excluded")