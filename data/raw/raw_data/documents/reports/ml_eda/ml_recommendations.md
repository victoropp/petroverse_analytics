# ML Pipeline Recommendations

Based on comprehensive EDA of NPA petroleum data

## DATA_CLEANING: performance
- **Action:** Remove duplicate records
- **Reason:** 23.8% duplicates found

## MODEL: regular_petrol_ron91
- **Action:** Use ensemble methods (Random Forest, XGBoost) for volatility
- **Reason:** High CV: 0.889

## PREPROCESSING: regular_petrol_ron91
- **Action:** Apply log transformation for skewness
- **Reason:** Skewness: 111.15

## PREPROCESSING: diesel_price
- **Action:** Apply log transformation for skewness
- **Reason:** Skewness: -3.11

## MODEL: lpg_price
- **Action:** Use ensemble methods (Random Forest, XGBoost) for volatility
- **Reason:** High CV: 0.377

## PREPROCESSING: lpg_price
- **Action:** Apply log transformation for skewness
- **Reason:** Skewness: -2.10

