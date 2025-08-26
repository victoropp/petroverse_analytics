# PetroVerse Analytics Strategy
## Objective, Data-Driven Analytics for the Petroleum Industry

### Executive Summary
This document outlines a comprehensive analytics strategy for the petroleum industry using only verified, cleaned data from BDC, OMC, and Supply datasets. All analytics are designed to be objective, defensible, and based solely on actual recorded transactions without any synthetic data introduction.

### CRITICAL INDUSTRY STRUCTURE
**Understanding the Data to Avoid Double Counting:**
- **BDCs (Bulk Distribution Companies)**: Import/supply petroleum products in bulk - their volumes represent wholesale supply INTO the market
- **OMCs (Oil Marketing Companies)**: Purchase from BDCs and distribute to end consumers - their volumes represent retail distribution TO consumers
- **Important**: BDC volumes and OMC volumes represent different stages of the same supply chain, NOT additive total market volume
- **Analytics Approach**: Track BDC and OMC metrics separately to understand both wholesale supply patterns and retail distribution patterns

---

## 1. DATA FOUNDATION ANALYSIS

### Available Datasets
- **BDC Performance Metrics**: 6,021 records (2019-2025)
- **OMC Performance Metrics**: 15,497 records (2019-2025)  
- **Supply Data Metrics**: 3,307 records (2010-2025)
- **Time Coverage**: 86 unique time periods
- **Company Coverage**: 246 entities (61 BDC, 184 OMC)
- **Product Coverage**: 33 standardized products

### Data Strengths
1. **Volume Completeness**: 100% volume data after zero-filling missing values
2. **Scientific Accuracy**: Conversion factors applied using exact petroleum densities
3. **Quality Scoring**: 97.7% BDC, 96.7% OMC average quality scores
4. **Outlier Detection**: 2,192 identified outliers for anomaly analysis

### Data Limitations
1. **Time Gap**: Supply data has gaps between 2010-2017
2. **Geographic Scope**: No explicit location data for regional analysis
3. **Price Data**: Limited to supply dataset only
4. **Customer Segmentation**: No end-user data available

---

## 2. CORE ANALYTICS FRAMEWORK

### A. DESCRIPTIVE ANALYTICS (What Happened?)

#### 1. Industry Volume Analysis (No Double Counting)
**Objective**: Understand industry dynamics at different supply chain stages
- **Wholesale Metrics (BDC Level)**:
  - Total BDC Supply Volume (Monthly/Quarterly/Yearly)
  - BDC Supply Growth Rate (MoM, QoQ, YoY)
  - BDC Market Share Distribution
  - Product Mix at Wholesale Level

- **Retail Metrics (OMC Level)**:
  - Total OMC Distribution Volume (Monthly/Quarterly/Yearly)
  - OMC Distribution Growth Rate (MoM, QoQ, YoY)
  - OMC Market Share Distribution
  - Product Mix at Retail Level

- **Key Insight**: BDC and OMC volumes are tracked SEPARATELY, not summed

**Implementation**:
```sql
-- SEPARATE BDC and OMC analysis to avoid double counting
-- BDC Wholesale Supply Analysis
WITH bdc_monthly AS (
  SELECT 
    year, month,
    SUM(volume_liters) as bdc_supply_volume,
    LAG(SUM(volume_liters)) OVER (ORDER BY year, month) as prev_bdc_volume
  FROM bdc_performance_metrics
  GROUP BY year, month
),
-- OMC Retail Distribution Analysis
omc_monthly AS (
  SELECT 
    year, month,
    SUM(volume_liters) as omc_distribution_volume,
    LAG(SUM(volume_liters)) OVER (ORDER BY year, month) as prev_omc_volume
  FROM omc_performance_metrics
  GROUP BY year, month
)
SELECT 
  COALESCE(b.year, o.year) as year,
  COALESCE(b.month, o.month) as month,
  b.bdc_supply_volume,
  o.omc_distribution_volume,
  -- These are SEPARATE metrics, NOT summed
  (b.bdc_supply_volume - b.prev_bdc_volume) / NULLIF(b.prev_bdc_volume, 0) * 100 as bdc_growth_rate,
  (o.omc_distribution_volume - o.prev_omc_volume) / NULLIF(o.prev_omc_volume, 0) * 100 as omc_growth_rate
FROM bdc_monthly b
FULL OUTER JOIN omc_monthly o ON b.year = o.year AND b.month = o.month;
```

#### 2. Product Mix Analysis
**Objective**: Understand product distribution and preferences
- **Metrics**:
  - Product Volume Distribution (%)
  - Product Growth Trends
  - Product Seasonality Index
  - Product Category Performance

#### 3. Company Performance Metrics
**Objective**: Rank and benchmark company performance
- **Metrics**:
  - Market Share by Volume
  - Company Growth Rates
  - Product Diversification Index
  - Performance Consistency Score

### B. DIAGNOSTIC ANALYTICS (Why Did It Happen?)

#### 1. Outlier Investigation
**Objective**: Identify and explain unusual patterns
- **Analysis**:
  - Statistical outlier classification (IQR, Z-score, Isolation Forest)
  - Temporal outlier clustering
  - Company-specific anomalies
  - Product-specific irregularities

#### 2. Seasonal Decomposition
**Objective**: Isolate seasonal patterns from trends
- **Components**:
  - Trend Component (long-term direction)
  - Seasonal Component (recurring patterns)
  - Residual Component (unexplained variation)
  - Holiday/Event Impact Analysis

#### 3. Correlation Analysis
**Objective**: Identify relationships between variables
- **Correlations to Explore**:
  - Product volumes correlation matrix
  - Company type performance correlation
  - Time-lagged correlations
  - Cross-product elasticity

### C. PREDICTIVE ANALYTICS (What Will Happen?)

#### 1. Time Series Forecasting
**Objective**: Project future volumes based on historical patterns
- **Models** (using only historical data):
  - ARIMA for trend projection
  - Exponential Smoothing for seasonality
  - Prophet for complex seasonality
  - Ensemble forecasting for robustness

#### 2. Market Share Prediction
**Objective**: Forecast company market positions
- **Approach**:
  - Historical market share trends
  - Competitive dynamics modeling
  - Entry/exit pattern analysis
  - Share volatility assessment

#### 3. Demand Forecasting by Product
**Objective**: Predict product-specific demand
- **Methodology**:
  - Product lifecycle analysis
  - Substitution pattern detection
  - Seasonal demand modeling
  - Growth curve fitting

### D. PRESCRIPTIVE ANALYTICS (What Should We Do?)

#### 1. Inventory Optimization Indicators
**Objective**: Suggest optimal stock levels
- **Metrics**:
  - Average daily consumption
  - Demand variability coefficient
  - Stockout risk indicators
  - Overstock warning signals

#### 2. Market Opportunity Identification
**Objective**: Highlight underserved segments
- **Analysis**:
  - Product gap analysis
  - Geographic coverage gaps (if data available)
  - Temporal demand gaps
  - Competitive white spaces

#### 3. Performance Benchmarking
**Objective**: Provide actionable performance targets
- **Benchmarks**:
  - Top quartile performance metrics
  - Best-in-class growth rates
  - Efficiency ratios
  - Product mix optimization targets

---

## 3. KEY PERFORMANCE INDICATORS (KPIs)

### Industry-Level KPIs (Separate Tracking)
1. **BDC Supply Volume** (Monthly/Quarterly/Yearly) - Wholesale supply into market
2. **OMC Distribution Volume** (Monthly/Quarterly/Yearly) - Retail distribution to consumers
3. **BDC Market Concentration** (HHI Index for wholesale)
4. **OMC Market Concentration** (HHI Index for retail)
5. **Supply-Distribution Ratio** (BDC volume vs OMC volume comparison)

### Company-Level KPIs
1. **Market Share** (%)
2. **Volume Growth Rate** (%)
3. **Product Portfolio Breadth**
4. **Performance Consistency Score**
5. **Outlier Frequency Rate**

### Product-Level KPIs
1. **Product Market Share** (%)
2. **Product Growth Rate** (%)
3. **Seasonal Stability Index**
4. **Cross-Product Correlation**
5. **Demand Volatility Score**

### Data Quality KPIs
1. **Data Completeness Rate** (%)
2. **Data Quality Score** (0-1)
3. **Outlier Detection Rate** (%)
4. **Update Frequency**
5. **Coverage Ratio** (companies/products)

---

## 4. ANALYTICAL DASHBOARDS

### Dashboard 1: Executive Overview
- BDC Supply Volume Trends (Wholesale)
- OMC Distribution Volume Trends (Retail)
- Top 10 BDCs by supply volume
- Top 10 OMCs by distribution volume
- Product mix at both BDC and OMC levels
- Industry health indicators (NO double counting)

### Dashboard 2: Company Performance
- Company rankings and market share
- Growth trajectories
- Product portfolio analysis
- Competitive positioning matrix
- Performance benchmarks

### Dashboard 3: Product Analytics
- Product volume trends
- Seasonal patterns
- Product correlation heatmap
- Growth/decline indicators
- Category performance

### Dashboard 4: Market Dynamics
- BDC vs OMC comparison
- New entrant analysis
- Market concentration trends
- Competitive intensity metrics
- Share shift analysis

### Dashboard 5: Data Quality Monitor
- Data freshness indicators
- Quality score trends
- Outlier detection summary
- Coverage metrics
- Missing data patterns

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)
- Set up automated data refresh pipelines
- Implement basic descriptive analytics
- Create initial KPI calculations
- Develop data quality monitoring

### Phase 2: Core Analytics (Weeks 3-4)
- Deploy market volume analysis
- Implement company performance metrics
- Create product mix analytics
- Develop seasonal decomposition

### Phase 3: Advanced Analytics (Weeks 5-6)
- Build time series forecasting models
- Implement correlation analysis
- Create outlier detection system
- Develop competitive dynamics metrics

### Phase 4: Dashboards (Weeks 7-8)
- Design and build executive dashboard
- Create operational dashboards
- Implement alerting systems
- Develop self-service analytics tools

### Phase 5: Optimization (Ongoing)
- Model performance tuning
- Feedback incorporation
- New metric development
- Continuous improvement

---

## 6. ANALYTICAL METHODOLOGY

### Statistical Rigor
1. **Confidence Intervals**: All metrics include 95% CI
2. **Statistical Significance**: p-value < 0.05 for correlations
3. **Sample Size Validation**: Minimum 30 data points
4. **Outlier Treatment**: Document and flag, don't remove
5. **Missing Data**: Transparent handling (zero-fill documented)

### Objectivity Measures
1. **No Subjective Adjustments**: Pure data-driven results
2. **Transparent Calculations**: All formulas documented
3. **Reproducible Results**: Version-controlled queries
4. **Audit Trail**: Complete data lineage
5. **Peer Review**: Cross-validation of results

### Validation Framework
1. **Back-testing**: Historical forecast accuracy
2. **Cross-validation**: K-fold validation for models
3. **Sensitivity Analysis**: Parameter impact assessment
4. **Robustness Checks**: Multiple methodology comparison
5. **External Validation**: Industry benchmark comparison

---

## 7. RISK MITIGATION

### Data Risks
1. **Incomplete Time Series**: Use available data only
2. **Outlier Impact**: Flag and analyze separately
3. **Seasonal Gaps**: Interpolate cautiously
4. **Company Churn**: Track entry/exit patterns

### Analytical Risks
1. **Overfitting**: Use simple models first
2. **Extrapolation**: Limit forecast horizons
3. **Correlation≠Causation**: Clear disclaimers
4. **Sample Bias**: Document data limitations

### Business Risks
1. **Misinterpretation**: Clear documentation
2. **Over-reliance**: Multiple metric validation
3. **False Precision**: Appropriate rounding
4. **Actionability**: Focus on practical insights

---

## 8. SUCCESS METRICS

### Analytics Success
1. **Forecast Accuracy**: MAPE < 10%
2. **Dashboard Adoption**: >80% weekly users
3. **Decision Impact**: Documented use cases
4. **Time to Insight**: <5 minutes for key metrics
5. **Data Freshness**: <24 hour lag

### Business Success
1. **Market Understanding**: Improved visibility
2. **Competitive Intelligence**: Better positioning
3. **Operational Efficiency**: Reduced stockouts
4. **Strategic Planning**: Data-driven decisions
5. **Risk Management**: Early warning system

---

## 9. DELIVERABLES

### Reports
1. **Monthly Market Report**: Automated PDF/Excel
2. **Quarterly Performance Review**: Detailed analysis
3. **Annual Market Study**: Comprehensive insights
4. **Ad-hoc Analysis**: On-demand reports

### Dashboards
1. **Real-time Executive Dashboard**: Web-based
2. **Operational Dashboards**: Department-specific
3. **Mobile Analytics**: Key metrics on-the-go
4. **Self-service Portal**: Query builder interface

### Data Products
1. **API Endpoints**: Programmatic access
2. **Data Extracts**: Scheduled exports
3. **Alert System**: Threshold-based notifications
4. **Forecast Feed**: Prediction updates

---

## 10. CONCLUSION

This analytics strategy provides a comprehensive, objective, and defensible framework for petroleum industry analytics using only actual transaction data. By focusing on statistical rigor, transparent methodology, and practical insights, this approach delivers actionable intelligence while maintaining complete data integrity.

The strategy emphasizes:
- **Objectivity**: No synthetic data or subjective adjustments
- **Defensibility**: Statistical validation and audit trails
- **Actionability**: Practical insights for decision-making
- **Scalability**: Automated and repeatable processes
- **Reliability**: Robust methodology and validation

Implementation of this strategy will provide petroleum industry stakeholders with the data-driven insights needed for strategic planning, operational optimization, and competitive positioning.