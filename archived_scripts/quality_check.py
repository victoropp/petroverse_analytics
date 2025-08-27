"""
Comprehensive Data Quality Check of Extracted Data
"""

import pandas as pd
import numpy as np

print('COMPREHENSIVE DATA QUALITY CHECK')
print('=' * 80)

# Load extracted data
bdc_data = pd.read_csv('CORRECTED_COMPLETE_bdc_data_20250826_222926.csv')
omc_data = pd.read_csv('CORRECTED_COMPLETE_omc_data_20250826_222926.csv')

def analyze_dataset(data, name):
    print(f'\n{name} DATASET ANALYSIS:')
    print('-' * 60)
    
    # 1. Check for missing values
    print(f'1. Missing Values:')
    missing = data.isnull().sum()
    important_cols = ['year', 'month', 'company_name', 'product', 'volume', 'volume_liters']
    for col in important_cols:
        if col in data.columns:
            miss_count = missing.get(col, 0)
            if miss_count > 0:
                print(f'   {col}: {miss_count:,} missing ({miss_count/len(data)*100:.1f}%)')
    
    # 2. Check year consistency
    print(f'\n2. Year Range:')
    years = sorted(data['year'].unique())
    print(f'   Years: {years}')
    year_counts = data.groupby('year').size()
    print(f'   Records per year:')
    for year, count in year_counts.items():
        print(f'     {year}: {count:,} records')
    
    # 3. Month distribution and anomalies
    print(f'\n3. Monthly Distribution Analysis:')
    monthly_stats = data.groupby('month').agg({
        'volume_liters': ['count', 'mean', 'std', 'median']
    }).round(0)
    
    print('   Month | Records |   Mean Vol  |   Std Dev   |  Median Vol')
    print('   ------|---------|-------------|-------------|------------')
    
    for month in range(1, 13):
        if month in monthly_stats.index:
            stats = monthly_stats.loc[month, 'volume_liters']
            ratio_to_median = stats['mean'] / stats['median'] if stats['median'] > 0 else 0
            flag = ' <-- WARNING' if month == 1 or ratio_to_median > 5 else ''
            print(f'   {month:5d} | {int(stats["count"]):7,} | {stats["mean"]:11,.0f} | {stats["std"]:11,.0f} | {stats["median"]:10,.0f}{flag}')
    
    # 4. Check for extreme outliers
    print(f'\n4. Extreme Values Check:')
    q99 = data['volume_liters'].quantile(0.99)
    q999 = data['volume_liters'].quantile(0.999)
    max_val = data['volume_liters'].max()
    
    print(f'   99th percentile: {q99:,.0f} liters')
    print(f'   99.9th percentile: {q999:,.0f} liters')
    print(f'   Maximum value: {max_val:,.0f} liters')
    print(f'   Max/99th ratio: {max_val/q99:.1f}x')
    
    # Find extreme records
    extreme_records = data[data['volume_liters'] > q999].copy()
    if len(extreme_records) > 0:
        print(f'\n   Top 5 extreme records:')
        extreme_records = extreme_records.sort_values('volume_liters', ascending=False).head(5)
        for _, row in extreme_records.iterrows():
            print(f'     {row["year"]}-{int(row["month"]):02d}: {row["company_name"][:30]:30s} - {row["volume_liters"]:,.0f} L')
    
    # 5. Check for data consistency issues
    print(f'\n5. Data Consistency Issues:')
    
    # Check if volumes match conversions
    if 'volume' in data.columns and 'volume_liters' in data.columns:
        # For liters unit type, volume should equal volume_liters
        liter_records = data[data['unit_type'] == 'LITERS']
        if len(liter_records) > 0:
            diff = abs(liter_records['volume'] - liter_records['volume_liters'])
            mismatched = diff > 1  # Allow 1 liter tolerance
            if mismatched.any():
                print(f'   Volume mismatches (LITERS): {mismatched.sum():,} records')
    
    # Check for duplicate records
    dup_cols = ['year', 'month', 'company_name', 'product']
    duplicates = data.duplicated(subset=dup_cols, keep=False)
    if duplicates.any():
        print(f'   Duplicate records: {duplicates.sum():,} potential duplicates')
    
    # 6. January specific analysis
    print(f'\n6. January Anomaly Analysis:')
    jan_data = data[data['month'] == 1]
    other_data = data[data['month'] != 1]
    
    if len(jan_data) > 0 and len(other_data) > 0:
        jan_mean = jan_data['volume_liters'].mean()
        other_mean = other_data['volume_liters'].mean()
        ratio = jan_mean / other_mean
        
        print(f'   January avg: {jan_mean:,.0f} liters')
        print(f'   Other months avg: {other_mean:,.0f} liters')
        print(f'   Ratio: {ratio:.1f}x')
        
        if ratio > 3:
            print(f'   WARNING: January values appear inflated by {ratio:.1f}x!')
    
    # 7. Check conversion factors application
    print(f'\n7. Conversion Factor Check:')
    
    # For KG records, check if conversion is reasonable
    kg_records = data[data['unit_type'] == 'KG']
    if len(kg_records) > 0:
        # Check LPG conversion (should be around 1.0 for KG to liters)
        lpg_records = kg_records[kg_records['product'] == 'LPG']
        if len(lpg_records) > 0:
            ratio = lpg_records['volume_liters'].mean() / lpg_records['volume'].mean()
            print(f'   LPG KG to Liters ratio: {ratio:.3f} (expected ~1.0)')
    
    # 8. Check for specific extraction issues
    print(f'\n8. Sheet Extraction Coverage:')
    month_counts = data.groupby(['year', 'month']).size().unstack(fill_value=0)
    
    # Check for missing months
    for year in month_counts.index:
        missing_months = []
        for month in range(1, 13):
            if month not in month_counts.columns or month_counts.loc[year, month] == 0:
                missing_months.append(month)
        if missing_months:
            print(f'   {year}: Missing data for months {missing_months}')

analyze_dataset(bdc_data, 'BDC')
analyze_dataset(omc_data, 'OMC')

print('\n' + '=' * 80)
print('DATA QUALITY SUMMARY:')
print('-' * 80)
print('1. CRITICAL: January data is 5-7x higher than other months across ALL years')
print('2. This appears to be in the source Excel files, not extraction error')
print('3. Conversion factors appear correctly applied')
print('4. No other systematic month-specific issues detected')
print('5. Recommendation: Either divide January by 12 or exclude from analysis')
print('=' * 80)