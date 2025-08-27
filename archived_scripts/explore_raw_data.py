"""
Explore and analyze raw data files to understand structure and content
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path

# Set paths
RAW_DATA_PATH = Path(r"C:\Users\victo\Documents\Data_Science_Projects\petroverse_v2\data\raw")

print("=" * 80)
print("RAW DATA EXPLORATION")
print("=" * 80)

# 1. BDC Monthly Data
print("\n1. BDC MONTHLY DATA")
print("-" * 40)
bdc_file = RAW_DATA_PATH / "bidec_monthly_clean.csv"
if bdc_file.exists():
    bdc_df = pd.read_csv(bdc_file)
    print(f"Shape: {bdc_df.shape}")
    print(f"Columns: {list(bdc_df.columns)}")
    print("\nFirst 5 rows:")
    print(bdc_df.head())
    print("\nData types:")
    print(bdc_df.dtypes)
    print("\nNull values:")
    print(bdc_df.isnull().sum())
    print("\nUnique values per column:")
    for col in bdc_df.columns:
        print(f"  {col}: {bdc_df[col].nunique()}")

# 2. OMC Monthly Data
print("\n2. OMC MONTHLY DATA")
print("-" * 40)
omc_file = RAW_DATA_PATH / "omc_monthly_clean.csv"
if omc_file.exists():
    omc_df = pd.read_csv(omc_file)
    print(f"Shape: {omc_df.shape}")
    print(f"Columns: {list(omc_df.columns)}")
    print("\nFirst 5 rows:")
    print(omc_df.head())
    print("\nData types:")
    print(omc_df.dtypes)
    print("\nNull values:")
    print(omc_df.isnull().sum())
    print("\nUnique values per column:")
    for col in omc_df.columns:
        print(f"  {col}: {omc_df[col].nunique()}")

# 3. Supply Data
print("\n3. SUPPLY DATA MONTHLY SUMMARY")
print("-" * 40)
supply_file = RAW_DATA_PATH / "supply_data_monthly_summary.csv"
if supply_file.exists():
    supply_df = pd.read_csv(supply_file)
    print(f"Shape: {supply_df.shape}")
    print(f"Columns: {list(supply_df.columns)}")
    print("\nFirst 5 rows:")
    print(supply_df.head())
    print("\nData types:")
    print(supply_df.dtypes)
    print("\nNull values:")
    print(supply_df.isnull().sum())

# 4. Conversion Factors
print("\n4. CONVERSION FACTORS")
print("-" * 40)
conv_file = RAW_DATA_PATH / "coversion factors.xlsx"
if conv_file.exists():
    conv_df = pd.read_excel(conv_file)
    print(f"Shape: {conv_df.shape}")
    print(f"Columns: {list(conv_df.columns)}")
    print("\nContent:")
    print(conv_df)

print("\n" + "=" * 80)
print("END OF EXPLORATION")
print("=" * 80)