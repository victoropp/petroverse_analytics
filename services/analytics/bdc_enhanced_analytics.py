# Enhanced BDC Analytics Module
# Provides additional metrics for the main BDC dashboard
# All metrics are 100% database-driven with no synthetic data

from typing import Optional, List, Dict, Any
from datetime import datetime, date
import asyncpg
from decimal import Decimal

async def get_bdc_operational_metrics(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Calculate operational efficiency metrics for BDC companies.
    """
    
    # Build WHERE clause
    where_conditions = []
    params = []
    param_count = 0
    
    if start_date:
        param_count += 1
        where_conditions.append(f"t.full_date >= ${param_count}")
        params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
    
    if end_date:
        param_count += 1
        where_conditions.append(f"t.full_date <= ${param_count}")
        params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
    
    if company_ids:
        param_count += 1
        where_conditions.append(f"f.company_id = ANY(${param_count}::integer[])")
        params.append(company_ids)
    
    if product_ids:
        param_count += 1
        where_conditions.append(f"f.product_id = ANY(${param_count}::integer[])")
        params.append(product_ids)
    
    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
    
    # 1. Operational Consistency Metrics
    operational_consistency = await conn.fetch(f"""
        WITH company_metrics AS (
            SELECT 
                c.company_name,
                COUNT(DISTINCT CONCAT(t.year, '-', t.month)) as active_months,
                COUNT(DISTINCT f.product_id) as products_handled,
                COUNT(f.transaction_id) as total_transactions,
                SUM(f.volume_mt) as total_volume_mt,
                SUM(f.volume_liters) as total_volume_liters,
                AVG(f.data_quality_score) as avg_quality_score,
                COUNT(DISTINCT t.full_date) as active_days,
                (MAX(t.full_date) - MIN(t.full_date)) as operational_span_days
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY c.company_name
        )
        SELECT 
            company_name,
            active_months,
            products_handled,
            total_transactions,
            total_volume_mt::numeric(15,2) as total_volume_mt,
            total_volume_liters::numeric(15,2) as total_volume_liters,
            avg_quality_score::numeric(5,4) as avg_quality_score,
            active_days,
            operational_span_days,
            CASE 
                WHEN operational_span_days > 0 THEN
                    active_months::float / GREATEST(operational_span_days / 30.0, 1.0)
                ELSE 1.0
            END::numeric(5,3) as consistency_score,
            (total_volume_mt / NULLIF(active_months, 0))::numeric(12,2) as monthly_avg_volume_mt,
            (total_transactions::float / NULLIF(active_months, 0))::numeric(8,2) as monthly_avg_transactions,
            (total_volume_mt / NULLIF(active_days, 0))::numeric(12,2) as daily_avg_volume_mt,
            RANK() OVER (ORDER BY total_volume_mt DESC) as volume_rank,
            RANK() OVER (ORDER BY avg_quality_score DESC) as quality_rank,
            RANK() OVER (ORDER BY products_handled DESC) as diversity_rank
        FROM company_metrics
        ORDER BY total_volume_mt DESC
        LIMIT 20
    """, *params)
    
    # 2. Product Flow Analysis
    product_flow = await conn.fetch(f"""
        WITH product_metrics AS (
            SELECT 
                p.product_id,
                p.product_name,
                p.product_category,
                COUNT(DISTINCT f.company_id) as unique_suppliers,
                COUNT(DISTINCT t.full_date) as active_days,
                COUNT(f.transaction_id) as total_transactions,
                SUM(f.volume_mt) as total_volume_mt,
                SUM(f.volume_liters) as total_volume_liters,
                AVG(f.volume_mt) as avg_transaction_size_mt,
                STDDEV(f.volume_mt) as volume_stddev,
                MIN(f.volume_mt) as min_transaction_mt,
                MAX(f.volume_mt) as max_transaction_mt,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY f.volume_mt) as median_transaction_mt
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.products p ON f.product_id = p.product_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY p.product_id, p.product_name, p.product_category
        )
        SELECT 
            product_name,
            product_category,
            unique_suppliers,
            active_days,
            total_transactions,
            total_volume_mt,
            total_volume_liters,
            avg_transaction_size_mt,
            median_transaction_mt,
            CASE 
                WHEN avg_transaction_size_mt > 0 THEN 
                    volume_stddev / avg_transaction_size_mt 
                ELSE 0 
            END as coefficient_variation,
            min_transaction_mt,
            max_transaction_mt,
            total_volume_mt / NULLIF(active_days, 0) as daily_throughput_mt,
            RANK() OVER (ORDER BY total_volume_mt DESC) as volume_rank
        FROM product_metrics
        ORDER BY total_volume_mt DESC
    """, *params)
    
    # 3. Time-based Performance Patterns
    temporal_patterns = await conn.fetch(f"""
        WITH daily_volumes AS (
            SELECT 
                t.full_date,
                t.year,
                t.month,
                EXTRACT(DOW FROM t.full_date) as day_of_week,
                EXTRACT(DAY FROM t.full_date) as day_of_month,
                COUNT(DISTINCT f.company_id) as active_companies,
                COUNT(DISTINCT f.product_id) as active_products,
                COUNT(f.transaction_id) as daily_transactions,
                SUM(f.volume_mt) as daily_volume_mt,
                SUM(f.volume_liters) as daily_volume_liters,
                AVG(f.data_quality_score) as daily_avg_quality
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.full_date, t.year, t.month
        ),
        pattern_analysis AS (
            SELECT 
                day_of_week,
                AVG(daily_volume_mt) as avg_volume_mt,
                AVG(daily_transactions) as avg_transactions,
                AVG(active_companies) as avg_companies,
                COUNT(*) as sample_size
            FROM daily_volumes
            GROUP BY day_of_week
        )
        SELECT 
            CASE day_of_week
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as weekday,
            day_of_week::int as day_number,
            avg_volume_mt,
            avg_transactions,
            avg_companies,
            sample_size
        FROM pattern_analysis
        ORDER BY day_of_week
    """, *params)
    
    # 4. Data Quality Overview
    quality_metrics = await conn.fetchrow(f"""
        SELECT 
            COUNT(*) as total_records,
            AVG(f.data_quality_score)::numeric(10,4) as avg_quality_score,
            MIN(f.data_quality_score)::numeric(10,4) as min_quality_score,
            MAX(f.data_quality_score)::numeric(10,4) as max_quality_score,
            STDDEV(f.data_quality_score)::numeric(10,4) as quality_stddev,
            COUNT(*) FILTER (WHERE f.data_quality_score >= 0.95) as high_quality_count,
            COUNT(*) FILTER (WHERE f.data_quality_score BETWEEN 0.8 AND 0.95) as medium_quality_count,
            COUNT(*) FILTER (WHERE f.data_quality_score < 0.8) as low_quality_count,
            COUNT(*) FILTER (WHERE f.is_outlier = true) as outlier_count,
            COUNT(*) FILTER (WHERE f.is_outlier = false) as normal_count
        FROM petroverse.fact_bdc_transactions f
        JOIN petroverse.time_dimension t ON f.date_id = t.date_id
        WHERE {where_clause}
    """, *params)
    
    # 5. Market Dynamics and Competition
    market_dynamics = await conn.fetch(f"""
        WITH monthly_shares AS (
            SELECT 
                t.year,
                t.month,
                c.company_name,
                SUM(f.volume_mt) as monthly_volume,
                SUM(SUM(f.volume_mt)) OVER (PARTITION BY t.year, t.month) as total_monthly_volume
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.year, t.month, c.company_name
        ),
        market_concentration AS (
            SELECT 
                year,
                month,
                COUNT(DISTINCT company_name) as active_companies,
                SUM(POWER(monthly_volume * 100.0 / total_monthly_volume, 2)) as hhi_index,
                MAX(monthly_volume * 100.0 / total_monthly_volume) as top_share,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY monthly_volume) as median_company_volume
            FROM monthly_shares
            GROUP BY year, month
        )
        SELECT 
            year,
            month,
            active_companies,
            hhi_index,
            top_share,
            median_company_volume,
            CASE 
                WHEN hhi_index < 1500 THEN 'Competitive'
                WHEN hhi_index BETWEEN 1500 AND 2500 THEN 'Moderately Concentrated'
                ELSE 'Highly Concentrated'
            END as market_structure
        FROM market_concentration
        ORDER BY year DESC, month DESC
        LIMIT 12
    """, *params)
    
    return {
        "operational_consistency": [dict(row) for row in operational_consistency],
        "product_flow": [dict(row) for row in product_flow],
        "temporal_patterns": [dict(row) for row in temporal_patterns],
        "quality_metrics": dict(quality_metrics) if quality_metrics else {},
        "market_dynamics": [dict(row) for row in market_dynamics]
    }


async def get_bdc_growth_analytics(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Calculate growth and trend analytics for BDC operations.
    """
    
    # Build WHERE clause
    where_conditions = []
    params = []
    param_count = 0
    
    if start_date:
        param_count += 1
        where_conditions.append(f"t.full_date >= ${param_count}")
        params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
    
    if end_date:
        param_count += 1
        where_conditions.append(f"t.full_date <= ${param_count}")
        params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
    
    if company_ids:
        param_count += 1
        where_conditions.append(f"f.company_id = ANY(${param_count}::integer[])")
        params.append(company_ids)
    
    if product_ids:
        param_count += 1
        where_conditions.append(f"f.product_id = ANY(${param_count}::integer[])")
        params.append(product_ids)
    
    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
    
    # 1. Year-over-Year Growth Analysis
    yoy_growth = await conn.fetch(f"""
        WITH yearly_metrics AS (
            SELECT 
                t.year,
                COUNT(DISTINCT f.company_id) as companies,
                COUNT(DISTINCT f.product_id) as products,
                COUNT(f.transaction_id) as transactions,
                SUM(f.volume_mt) as volume_mt,
                SUM(f.volume_liters) as volume_liters,
                AVG(f.volume_mt) as avg_transaction_mt
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.year
        )
        SELECT 
            year,
            companies,
            products,
            transactions,
            volume_mt,
            volume_liters,
            avg_transaction_mt,
            LAG(volume_mt) OVER (ORDER BY year) as prev_year_volume,
            CASE 
                WHEN LAG(volume_mt) OVER (ORDER BY year) > 0 THEN
                    ((volume_mt - LAG(volume_mt) OVER (ORDER BY year)) / LAG(volume_mt) OVER (ORDER BY year) * 100)
                ELSE NULL
            END as yoy_growth_rate,
            volume_mt - LAG(volume_mt) OVER (ORDER BY year) as absolute_growth
        FROM yearly_metrics
        ORDER BY year
    """, *params)
    
    # 2. Quarter-over-Quarter Analysis
    qoq_growth = await conn.fetch(f"""
        WITH quarterly_metrics AS (
            SELECT 
                t.year,
                t.quarter,
                COUNT(DISTINCT f.company_id) as companies,
                COUNT(DISTINCT f.product_id) as products,
                COUNT(f.transaction_id) as transactions,
                SUM(f.volume_mt) as volume_mt,
                SUM(f.volume_liters) as volume_liters
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.year, t.quarter
        )
        SELECT 
            year,
            quarter,
            companies,
            products,
            transactions,
            volume_mt,
            volume_liters,
            LAG(volume_mt) OVER (ORDER BY year, quarter) as prev_quarter_volume,
            CASE 
                WHEN LAG(volume_mt) OVER (ORDER BY year, quarter) > 0 THEN
                    ((volume_mt - LAG(volume_mt) OVER (ORDER BY year, quarter)) / LAG(volume_mt) OVER (ORDER BY year, quarter) * 100)
                ELSE NULL
            END as qoq_growth_rate
        FROM quarterly_metrics
        ORDER BY year DESC, quarter DESC
        LIMIT 8
    """, *params)
    
    # 3. Company Growth Leaders
    company_growth = await conn.fetch(f"""
        WITH company_periods AS (
            SELECT 
                c.company_name,
                DATE_TRUNC('month', t.full_date) as month_period,
                SUM(f.volume_mt) as monthly_volume
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY c.company_name, DATE_TRUNC('month', t.full_date)
        ),
        growth_calc AS (
            SELECT 
                company_name,
                month_period,
                monthly_volume,
                LAG(monthly_volume, 1) OVER (PARTITION BY company_name ORDER BY month_period) as prev_month,
                LAG(monthly_volume, 12) OVER (PARTITION BY company_name ORDER BY month_period) as prev_year
            FROM company_periods
        ),
        company_growth_metrics AS (
            SELECT 
                company_name,
                AVG(CASE 
                    WHEN prev_month > 0 THEN 
                        (monthly_volume - prev_month) / prev_month * 100 
                    ELSE NULL 
                END) as avg_mom_growth,
                AVG(CASE 
                    WHEN prev_year > 0 THEN 
                        (monthly_volume - prev_year) / prev_year * 100 
                    ELSE NULL 
                END) as avg_yoy_growth,
                COUNT(*) as data_points,
                SUM(monthly_volume) as total_volume
            FROM growth_calc
            WHERE prev_month IS NOT NULL OR prev_year IS NOT NULL
            GROUP BY company_name
            HAVING COUNT(*) >= 3  -- Minimum data points for meaningful growth calc
        )
        SELECT 
            company_name,
            avg_mom_growth,
            avg_yoy_growth,
            total_volume,
            data_points,
            RANK() OVER (ORDER BY avg_yoy_growth DESC NULLS LAST) as growth_rank
        FROM company_growth_metrics
        ORDER BY avg_yoy_growth DESC NULLS LAST
        LIMIT 15
    """, *params)
    
    return {
        "yoy_growth": [dict(row) for row in yoy_growth],
        "qoq_growth": [dict(row) for row in qoq_growth],
        "company_growth": [dict(row) for row in company_growth]
    }


async def get_bdc_supply_chain_analytics(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Calculate supply chain resilience analytics for BDC operations.
    Focuses on product supply chain risk, volatility, and diversification metrics.
    """
    
    # Build WHERE clause
    where_conditions = ["1=1"]
    params = []
    param_count = 0
    
    if start_date:
        param_count += 1
        where_conditions.append(f"t.full_date >= ${param_count}")
        params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
    if end_date:
        param_count += 1
        where_conditions.append(f"t.full_date <= ${param_count}")
        params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
    if company_ids:
        param_count += 1
        where_conditions.append(f"f.company_id = ANY(${param_count})")
        params.append(company_ids)
        
    if product_ids:
        param_count += 1
        where_conditions.append(f"f.product_id = ANY(${param_count})")
        params.append(product_ids)
        
    where_clause = " AND ".join(where_conditions)
    
    # Product Supply Chain Resilience Analysis with dynamic thresholds
    supply_chain_resilience = await conn.fetch(f"""
        WITH initial_product_data AS (
            SELECT 
                p.product_name,
                p.product_category,
                COUNT(DISTINCT f.company_id) as supplier_count,
                COUNT(f.transaction_id) as total_transactions,
                SUM(f.volume_mt) as total_volume_mt,
                AVG(f.volume_mt) as avg_transaction_size,
                STDDEV(f.volume_mt) as volume_volatility,
                AVG(f.data_quality_score) as avg_quality_score,
                COUNT(DISTINCT CONCAT(t.year, '-', t.month)) as active_months,
                SUM(f.volume_liters) as total_volume_liters
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.products p ON f.product_id = p.product_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY p.product_name, p.product_category
        ),
        -- Calculate volume threshold dynamically (exclude bottom 10th percentile by volume)
        volume_threshold AS (
            SELECT 
                PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY total_volume_mt) as min_volume_threshold
            FROM initial_product_data
        ),
        -- Filter products using dynamic threshold
        product_analysis AS (
            SELECT 
                ipd.*
            FROM initial_product_data ipd
            CROSS JOIN volume_threshold vt
            WHERE ipd.total_volume_mt >= COALESCE(vt.min_volume_threshold, 0)
        ),
        -- Calculate statistical thresholds from actual data
        supplier_thresholds AS (
            SELECT 
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY supplier_count) as supplier_q1,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY supplier_count) as supplier_median,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY supplier_count) as supplier_q3
            FROM product_analysis
        ),
        volatility_thresholds AS (
            SELECT 
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cv) as cv_q1,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cv) as cv_median,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cv) as cv_q3
            FROM (
                SELECT (COALESCE(volume_volatility, 0) / NULLIF(avg_transaction_size, 0) * 100) as cv
                FROM product_analysis
                WHERE avg_transaction_size > 0
            ) cv_calc
        )
        SELECT 
            pa.product_name,
            pa.product_category,
            pa.supplier_count,
            pa.total_transactions,
            pa.total_volume_mt::numeric(12,2) as total_volume_mt,
            pa.total_volume_liters::numeric(15,2) as total_volume_liters,
            pa.avg_transaction_size::numeric(10,2) as avg_transaction_size,
            (COALESCE(pa.volume_volatility, 0) / NULLIF(pa.avg_transaction_size, 0) * 100)::numeric(8,2) as volatility_coefficient,
            pa.avg_quality_score::numeric(5,3) as avg_quality_score,
            pa.active_months as market_presence_months,
            -- Dynamic risk levels based on actual data distribution
            CASE 
                WHEN pa.supplier_count < st.supplier_q1 THEN 'High Risk'
                WHEN pa.supplier_count < st.supplier_median THEN 'Medium Risk'
                WHEN pa.supplier_count < st.supplier_q3 THEN 'Low Risk'
                ELSE 'Diversified'
            END as supply_risk_level,
            -- Dynamic volatility levels based on actual CV distribution
            CASE
                WHEN (COALESCE(pa.volume_volatility, 0) / NULLIF(pa.avg_transaction_size, 0) * 100) < vt.cv_q1 THEN 'Stable'
                WHEN (COALESCE(pa.volume_volatility, 0) / NULLIF(pa.avg_transaction_size, 0) * 100) < vt.cv_median THEN 'Moderate'
                WHEN (COALESCE(pa.volume_volatility, 0) / NULLIF(pa.avg_transaction_size, 0) * 100) < vt.cv_q3 THEN 'Volatile'
                ELSE 'Highly Volatile'
            END as volatility_level,
            -- Include threshold values for transparency
            st.supplier_q1::numeric(10,1) as supplier_threshold_q1,
            st.supplier_median::numeric(10,1) as supplier_threshold_median,
            st.supplier_q3::numeric(10,1) as supplier_threshold_q3,
            vt.cv_q1::numeric(10,1) as volatility_threshold_q1,
            vt.cv_median::numeric(10,1) as volatility_threshold_median,
            vt.cv_q3::numeric(10,1) as volatility_threshold_q3,
            -- Include volume threshold for transparency
            volt.min_volume_threshold::numeric(12,2) as volume_inclusion_threshold
        FROM product_analysis pa
        CROSS JOIN supplier_thresholds st
        CROSS JOIN volatility_thresholds vt
        CROSS JOIN volume_threshold volt
        ORDER BY pa.total_volume_mt DESC
        LIMIT 12
    """, *params)

    return {
        "supply_chain_resilience": [dict(row) for row in supply_chain_resilience]
    }


async def get_bdc_network_analytics(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Analyze BDC network relationships and product-company dynamics.
    """
    
    # Build WHERE clause
    where_conditions = []
    params = []
    param_count = 0
    
    if start_date:
        param_count += 1
        where_conditions.append(f"t.full_date >= ${param_count}")
        params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
    
    if end_date:
        param_count += 1
        where_conditions.append(f"t.full_date <= ${param_count}")
        params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
    
    if company_ids:
        param_count += 1
        where_conditions.append(f"f.company_id = ANY(${param_count}::integer[])")
        params.append(company_ids)
    
    if product_ids:
        param_count += 1
        where_conditions.append(f"f.product_id = ANY(${param_count}::integer[])")
        params.append(product_ids)
    
    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
    
    # Company-Product Network
    network_data = await conn.fetch(f"""
        SELECT 
            c.company_name,
            p.product_name,
            p.product_category,
            COUNT(f.transaction_id) as transaction_count,
            SUM(f.volume_mt) as total_volume_mt,
            SUM(f.volume_liters) as total_volume_liters,
            AVG(f.volume_mt) as avg_volume_mt,
            MIN(t.full_date) as first_transaction_date,
            MAX(t.full_date) as last_transaction_date,
            COUNT(DISTINCT CONCAT(t.year, '-', t.month)) as active_months
        FROM petroverse.fact_bdc_transactions f
        JOIN petroverse.companies c ON f.company_id = c.company_id
        JOIN petroverse.products p ON f.product_id = p.product_id
        JOIN petroverse.time_dimension t ON f.date_id = t.date_id
        WHERE {where_clause}
        GROUP BY c.company_name, p.product_name, p.product_category
        HAVING SUM(f.volume_mt) > 100  -- Filter out very small relationships
        ORDER BY total_volume_mt DESC
        LIMIT 100
    """, *params)
    
    return {
        "network_relationships": [dict(row) for row in network_data]
    }