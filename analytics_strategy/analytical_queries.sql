-- PetroVerse Analytical Queries
-- Objective, data-driven queries for petroleum industry analytics
-- IMPORTANT: BDCs supply to OMCs - volumes are NOT additive (avoid double counting)
-- BDC volumes = Wholesale supply INTO the market
-- OMC volumes = Retail distribution TO consumers

-- ============================================================================
-- 1. INDUSTRY VOLUME ANALYTICS (NO DOUBLE COUNTING)
-- ============================================================================

-- 1.1 Separate BDC and OMC Volume Tracking with Growth Rates
WITH bdc_volumes AS (
    SELECT 
        t.year,
        t.month,
        t.quarter,
        SUM(b.volume_liters) as bdc_supply_volume,
        SUM(b.volume_mt) as bdc_supply_mt
    FROM petroverse.time_dimension t
    LEFT JOIN petroverse.bdc_performance_metrics b ON t.date_id = b.date_id
    GROUP BY t.year, t.month, t.quarter
),
omc_volumes AS (
    SELECT 
        t.year,
        t.month,
        t.quarter,
        SUM(o.volume_liters) as omc_distribution_volume,
        SUM(o.volume_mt) as omc_distribution_mt
    FROM petroverse.time_dimension t
    LEFT JOIN petroverse.omc_performance_metrics o ON t.date_id = o.date_id
    GROUP BY t.year, t.month, t.quarter
),
combined_analysis AS (
    SELECT 
        COALESCE(b.year, o.year) as year,
        COALESCE(b.month, o.month) as month,
        COALESCE(b.quarter, o.quarter) as quarter,
        b.bdc_supply_volume,
        o.omc_distribution_volume,
        -- Calculate separate growth rates
        LAG(b.bdc_supply_volume) OVER (ORDER BY b.year, b.month) as prev_bdc_volume,
        LAG(o.omc_distribution_volume) OVER (ORDER BY o.year, o.month) as prev_omc_volume
    FROM bdc_volumes b
    FULL OUTER JOIN omc_volumes o ON b.year = o.year AND b.month = o.month
)
SELECT 
    year,
    month,
    quarter,
    bdc_supply_volume as bdc_wholesale_supply,
    omc_distribution_volume as omc_retail_distribution,
    -- IMPORTANT: Do NOT add BDC + OMC volumes together
    ROUND((bdc_supply_volume - prev_bdc_volume) / NULLIF(prev_bdc_volume, 0) * 100, 2) as bdc_growth_rate,
    ROUND((omc_distribution_volume - prev_omc_volume) / NULLIF(prev_omc_volume, 0) * 100, 2) as omc_growth_rate,
    -- Supply-Distribution Ratio (shows market efficiency)
    ROUND(omc_distribution_volume / NULLIF(bdc_supply_volume, 0), 2) as distribution_efficiency_ratio
FROM combined_analysis
WHERE bdc_supply_volume > 0 OR omc_distribution_volume > 0
ORDER BY year DESC, month DESC;

-- 1.2 Market Concentration - SEPARATE for BDC and OMC sectors
-- BDC Market Concentration (Wholesale)
WITH bdc_shares AS (
    SELECT 
        c.company_name,
        SUM(b.volume_liters) as company_volume,
        SUM(SUM(b.volume_liters)) OVER () as bdc_total
    FROM petroverse.companies c
    JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
    WHERE c.company_type = 'BDC'
    GROUP BY c.company_name
)
SELECT 
    'BDC Wholesale Market' as market_segment,
    COUNT(*) as total_companies,
    COUNT(CASE WHEN market_share > 1 THEN 1 END) as significant_players,
    ROUND(SUM(POWER(market_share, 2)), 2) as hhi_index,
    CASE 
        WHEN SUM(POWER(market_share, 2)) < 1500 THEN 'Competitive'
        WHEN SUM(POWER(market_share, 2)) < 2500 THEN 'Moderate Concentration'
        ELSE 'High Concentration'
    END as market_structure
FROM (
    SELECT 
        company_name,
        (company_volume / NULLIF(bdc_total, 0)) * 100 as market_share
    FROM bdc_shares
) bdc_market

UNION ALL

-- OMC Market Concentration (Retail)
SELECT 
    'OMC Retail Market' as market_segment,
    COUNT(*) as total_companies,
    COUNT(CASE WHEN market_share > 1 THEN 1 END) as significant_players,
    ROUND(SUM(POWER(market_share, 2)), 2) as hhi_index,
    CASE 
        WHEN SUM(POWER(market_share, 2)) < 1500 THEN 'Competitive'
        WHEN SUM(POWER(market_share, 2)) < 2500 THEN 'Moderate Concentration'
        ELSE 'High Concentration'
    END as market_structure
FROM (
    SELECT 
        c.company_name,
        SUM(o.volume_liters) as company_volume,
        (SUM(o.volume_liters) / SUM(SUM(o.volume_liters)) OVER ()) * 100 as market_share
    FROM petroverse.companies c
    JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
    WHERE c.company_type = 'OMC'
    GROUP BY c.company_name
) omc_market;

-- ============================================================================
-- 2. PRODUCT ANALYTICS
-- ============================================================================

-- 2.1 Product Volume Distribution and Growth
WITH product_volumes AS (
    SELECT 
        p.product_name,
        p.product_category,
        t.year,
        SUM(COALESCE(b.volume_liters, 0)) as bdc_volume,
        SUM(COALESCE(o.volume_liters, 0)) as omc_volume,
        SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as total_volume
    FROM petroverse.products p
    CROSS JOIN petroverse.time_dimension t
    LEFT JOIN petroverse.bdc_performance_metrics b 
        ON p.product_id = b.product_id AND t.date_id = b.date_id
    LEFT JOIN petroverse.omc_performance_metrics o 
        ON p.product_id = o.product_id AND t.date_id = o.date_id
    GROUP BY p.product_name, p.product_category, t.year
)
SELECT 
    product_name,
    product_category,
    year,
    total_volume,
    ROUND(total_volume / SUM(total_volume) OVER (PARTITION BY year) * 100, 2) as market_share_pct,
    LAG(total_volume) OVER (PARTITION BY product_name ORDER BY year) as prev_year_volume,
    ROUND((total_volume - LAG(total_volume) OVER (PARTITION BY product_name ORDER BY year)) / 
          NULLIF(LAG(total_volume) OVER (PARTITION BY product_name ORDER BY year), 0) * 100, 2) as yoy_growth
FROM product_volumes
WHERE total_volume > 0
ORDER BY year DESC, total_volume DESC;

-- 2.2 Product Seasonality Analysis
WITH monthly_product AS (
    SELECT 
        p.product_name,
        t.month,
        AVG(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as avg_volume,
        STDDEV(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as std_volume
    FROM petroverse.products p
    CROSS JOIN petroverse.time_dimension t
    LEFT JOIN petroverse.bdc_performance_metrics b 
        ON p.product_id = b.product_id AND t.date_id = b.date_id
    LEFT JOIN petroverse.omc_performance_metrics o 
        ON p.product_id = o.product_id AND t.date_id = o.date_id
    GROUP BY p.product_name, t.month
)
SELECT 
    product_name,
    month,
    ROUND(avg_volume, 0) as avg_monthly_volume,
    ROUND(avg_volume / AVG(avg_volume) OVER (PARTITION BY product_name) * 100, 2) as seasonality_index,
    ROUND(std_volume / NULLIF(avg_volume, 0), 3) as coefficient_of_variation
FROM monthly_product
WHERE avg_volume > 0
ORDER BY product_name, month;

-- ============================================================================
-- 3. COMPANY PERFORMANCE ANALYTICS
-- ============================================================================

-- 3.1 Top Performing Companies with Metrics
WITH company_metrics AS (
    SELECT 
        c.company_name,
        c.company_type,
        COUNT(DISTINCT COALESCE(b.product_id, o.product_id)) as product_diversity,
        COUNT(DISTINCT COALESCE(b.date_id, o.date_id)) as active_periods,
        SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as total_volume,
        AVG(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as avg_transaction,
        AVG(COALESCE(b.data_quality_score, o.data_quality_score)) as avg_quality_score
    FROM petroverse.companies c
    LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
    LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
    GROUP BY c.company_name, c.company_type
)
SELECT 
    company_name,
    company_type,
    total_volume,
    ROUND(total_volume / SUM(total_volume) OVER () * 100, 3) as market_share_pct,
    product_diversity,
    active_periods,
    ROUND(avg_transaction, 0) as avg_transaction_size,
    ROUND(avg_quality_score, 3) as data_quality_score,
    RANK() OVER (ORDER BY total_volume DESC) as volume_rank,
    RANK() OVER (ORDER BY product_diversity DESC) as diversity_rank
FROM company_metrics
WHERE total_volume > 0
ORDER BY total_volume DESC
LIMIT 50;

-- 3.2 Company Growth Trajectory
WITH company_yearly AS (
    SELECT 
        c.company_name,
        c.company_type,
        t.year,
        SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as annual_volume
    FROM petroverse.companies c
    CROSS JOIN petroverse.time_dimension t
    LEFT JOIN petroverse.bdc_performance_metrics b 
        ON c.company_id = b.company_id AND t.date_id = b.date_id
    LEFT JOIN petroverse.omc_performance_metrics o 
        ON c.company_id = o.company_id AND t.date_id = o.date_id
    GROUP BY c.company_name, c.company_type, t.year
),
growth_analysis AS (
    SELECT 
        company_name,
        company_type,
        year,
        annual_volume,
        LAG(annual_volume) OVER (PARTITION BY company_name ORDER BY year) as prev_year,
        LEAD(annual_volume) OVER (PARTITION BY company_name ORDER BY year) as next_year
    FROM company_yearly
)
SELECT 
    company_name,
    company_type,
    COUNT(CASE WHEN annual_volume > 0 THEN 1 END) as active_years,
    MIN(CASE WHEN annual_volume > 0 THEN year END) as first_year,
    MAX(CASE WHEN annual_volume > 0 THEN year END) as last_year,
    SUM(annual_volume) as total_volume_all_time,
    AVG(CASE WHEN annual_volume > 0 THEN annual_volume END) as avg_annual_volume,
    COUNT(CASE WHEN annual_volume > prev_year THEN 1 END) as growth_years,
    COUNT(CASE WHEN annual_volume < prev_year THEN 1 END) as decline_years
FROM growth_analysis
GROUP BY company_name, company_type
HAVING SUM(annual_volume) > 0
ORDER BY total_volume_all_time DESC;

-- ============================================================================
-- 4. OUTLIER AND ANOMALY DETECTION
-- ============================================================================

-- 4.1 Statistical Outliers by Company
WITH volume_stats AS (
    SELECT 
        company_id,
        AVG(volume_liters) as mean_volume,
        STDDEV(volume_liters) as std_volume,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY volume_liters) as q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY volume_liters) as q3
    FROM (
        SELECT company_id, volume_liters FROM petroverse.bdc_performance_metrics
        UNION ALL
        SELECT company_id, volume_liters FROM petroverse.omc_performance_metrics
    ) combined
    WHERE volume_liters > 0
    GROUP BY company_id
)
SELECT 
    c.company_name,
    c.company_type,
    COUNT(*) as total_outliers,
    COUNT(CASE WHEN outlier_type = 'High' THEN 1 END) as high_outliers,
    COUNT(CASE WHEN outlier_type = 'Low' THEN 1 END) as low_outliers,
    AVG(volume_liters) as avg_outlier_volume,
    MAX(volume_liters) as max_outlier_volume
FROM (
    SELECT 
        b.company_id,
        b.volume_liters,
        CASE 
            WHEN b.volume_liters > v.q3 + 1.5 * (v.q3 - v.q1) THEN 'High'
            WHEN b.volume_liters < v.q1 - 1.5 * (v.q3 - v.q1) THEN 'Low'
        END as outlier_type
    FROM petroverse.bdc_performance_metrics b
    JOIN volume_stats v ON b.company_id = v.company_id
    WHERE b.is_outlier = true
    
    UNION ALL
    
    SELECT 
        o.company_id,
        o.volume_liters,
        CASE 
            WHEN o.volume_liters > v.q3 + 1.5 * (v.q3 - v.q1) THEN 'High'
            WHEN o.volume_liters < v.q1 - 1.5 * (v.q3 - v.q1) THEN 'Low'
        END as outlier_type
    FROM petroverse.omc_performance_metrics o
    JOIN volume_stats v ON o.company_id = v.company_id
    WHERE o.is_outlier = true
) outliers
JOIN petroverse.companies c ON outliers.company_id = c.company_id
GROUP BY c.company_name, c.company_type
ORDER BY total_outliers DESC;

-- ============================================================================
-- 5. CORRELATION AND RELATIONSHIP ANALYSIS
-- ============================================================================

-- 5.1 Product Correlation Matrix (simplified for top products)
WITH product_monthly AS (
    SELECT 
        t.year,
        t.month,
        MAX(CASE WHEN p.product_name = 'Automotive Gas Oil (Diesel)' 
            THEN COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0) END) as diesel,
        MAX(CASE WHEN p.product_name = 'Premium Gasoline' 
            THEN COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0) END) as premium,
        MAX(CASE WHEN p.product_name = 'Liquefied Petroleum Gas (LPG)' 
            THEN COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0) END) as lpg,
        MAX(CASE WHEN p.product_name = 'Kerosene' 
            THEN COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0) END) as kerosene
    FROM petroverse.time_dimension t
    CROSS JOIN petroverse.products p
    LEFT JOIN petroverse.bdc_performance_metrics b 
        ON p.product_id = b.product_id AND t.date_id = b.date_id
    LEFT JOIN petroverse.omc_performance_metrics o 
        ON p.product_id = o.product_id AND t.date_id = o.date_id
    GROUP BY t.year, t.month
)
SELECT 
    'Diesel-Premium' as product_pair,
    CORR(diesel, premium) as correlation,
    COUNT(*) as observations
FROM product_monthly
WHERE diesel IS NOT NULL AND premium IS NOT NULL
UNION ALL
SELECT 
    'Diesel-LPG' as product_pair,
    CORR(diesel, lpg) as correlation,
    COUNT(*) as observations
FROM product_monthly
WHERE diesel IS NOT NULL AND lpg IS NOT NULL
UNION ALL
SELECT 
    'Premium-LPG' as product_pair,
    CORR(premium, lpg) as correlation,
    COUNT(*) as observations
FROM product_monthly
WHERE premium IS NOT NULL AND lpg IS NOT NULL;

-- ============================================================================
-- 6. PERFORMANCE BENCHMARKING
-- ============================================================================

-- 6.1 Performance Quartiles for Benchmarking
WITH company_performance AS (
    SELECT 
        c.company_name,
        c.company_type,
        SUM(COALESCE(b.volume_liters, 0) + COALESCE(o.volume_liters, 0)) as total_volume,
        AVG(COALESCE(b.data_quality_score, 0) + COALESCE(o.data_quality_score, 0)) as avg_quality,
        COUNT(DISTINCT COALESCE(b.product_id, o.product_id)) as product_count
    FROM petroverse.companies c
    LEFT JOIN petroverse.bdc_performance_metrics b ON c.company_id = b.company_id
    LEFT JOIN petroverse.omc_performance_metrics o ON c.company_id = o.company_id
    GROUP BY c.company_name, c.company_type
)
SELECT 
    'Volume' as metric,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_volume) as q1_benchmark,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_volume) as median_benchmark,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_volume) as q3_benchmark,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_volume) as top_10pct_benchmark,
    MAX(total_volume) as best_in_class
FROM company_performance
WHERE total_volume > 0
UNION ALL
SELECT 
    'Product Diversity' as metric,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY product_count) as q1_benchmark,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY product_count) as median_benchmark,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY product_count) as q3_benchmark,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY product_count) as top_10pct_benchmark,
    MAX(product_count) as best_in_class
FROM company_performance
WHERE product_count > 0;

-- ============================================================================
-- 7. DATA QUALITY MONITORING
-- ============================================================================

-- 7.1 Data Quality Dashboard Metrics
SELECT 
    'BDC' as dataset,
    COUNT(*) as total_records,
    AVG(data_quality_score) as avg_quality_score,
    COUNT(CASE WHEN data_quality_score >= 0.9 THEN 1 END) as high_quality_records,
    COUNT(CASE WHEN data_quality_score < 0.7 THEN 1 END) as low_quality_records,
    COUNT(CASE WHEN is_outlier = true THEN 1 END) as outlier_count,
    MIN(data_quality_score) as min_quality,
    MAX(data_quality_score) as max_quality
FROM petroverse.bdc_performance_metrics
UNION ALL
SELECT 
    'OMC' as dataset,
    COUNT(*) as total_records,
    AVG(data_quality_score) as avg_quality_score,
    COUNT(CASE WHEN data_quality_score >= 0.9 THEN 1 END) as high_quality_records,
    COUNT(CASE WHEN data_quality_score < 0.7 THEN 1 END) as low_quality_records,
    COUNT(CASE WHEN is_outlier = true THEN 1 END) as outlier_count,
    MIN(data_quality_score) as min_quality,
    MAX(data_quality_score) as max_quality
FROM petroverse.omc_performance_metrics;

-- ============================================================================
-- 8. SUPPLY-DEMAND ANALYSIS (If Supply Data Available)
-- ============================================================================

-- 8.1 Supply Coverage Analysis
WITH supply_summary AS (
    SELECT 
        t.year,
        t.month,
        SUM(s.production_volume + s.import_volume) as total_supply,
        SUM(s.consumption_volume + s.export_volume) as total_demand,
        AVG(s.stock_levels) as avg_stock
    FROM petroverse.supply_data_metrics s
    JOIN petroverse.time_dimension t ON s.date_id = t.date_id
    GROUP BY t.year, t.month
)
SELECT 
    year,
    month,
    total_supply,
    total_demand,
    avg_stock,
    CASE 
        WHEN total_supply > total_demand THEN 'Surplus'
        WHEN total_supply < total_demand THEN 'Deficit'
        ELSE 'Balanced'
    END as supply_status,
    ROUND((total_supply - total_demand) / NULLIF(total_demand, 0) * 100, 2) as supply_gap_pct
FROM supply_summary
WHERE total_supply > 0 OR total_demand > 0
ORDER BY year DESC, month DESC;