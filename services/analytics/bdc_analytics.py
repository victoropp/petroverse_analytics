# BDC Comprehensive Analytics Module
# Provides deep financial and operational insights for BDC stakeholders

from typing import Optional, List, Dict, Any
from datetime import datetime, date
import asyncpg

async def get_bdc_comprehensive_analytics(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_ids: Optional[List[int]] = None,
    product_ids: Optional[List[int]] = None,
    top_n: int = 10
) -> Dict[str, Any]:
    """
    Generate comprehensive BDC analytics based on actual database data.
    All metrics are 100% objective and database-driven.
    """
    
    # Month names mapping
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    # Build dynamic WHERE clause for filtering
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
    
    # 1. Market Concentration Analysis (HHI Index)
    market_concentration = await conn.fetchrow(f"""
        WITH company_volumes AS (
            SELECT 
                c.company_id,
                c.company_name,
                SUM(f.volume_liters) as total_volume,
                COUNT(f.transaction_id) as transactions,
                COUNT(DISTINCT f.product_id) as product_count
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY c.company_id, c.company_name
        ),
        market_shares AS (
            SELECT 
                company_id,
                company_name,
                total_volume,
                transactions,
                product_count,
                total_volume * 100.0 / SUM(total_volume) OVER() as market_share
            FROM company_volumes
        )
        SELECT 
            SUM(POWER(market_share, 2)) as hhi_index,
            COUNT(*) as active_companies,
            MAX(market_share) as leader_share,
            -- Use statistical quartiles instead of magic numbers
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY market_share) as q3_market_share,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY market_share) as median_market_share,
            SUM(CASE WHEN market_share >= (
                SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY market_share) 
                FROM market_shares
            ) THEN market_share ELSE 0 END) as top_quartile_share,
            SUM(CASE WHEN market_share >= (
                SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY market_share) 
                FROM market_shares
            ) THEN 1 ELSE 0 END) as above_median_players,
            AVG(product_count) as avg_product_diversity,
            STDDEV(market_share) as market_share_dispersion
        FROM market_shares
    """, *params)
    
    # 2. Product Portfolio Performance & Risk
    product_portfolio = await conn.fetch(f"""
        WITH product_metrics AS (
            SELECT 
                p.product_id,
                p.product_name,
                p.product_category,
                SUM(f.volume_liters) as total_volume,
                SUM(f.volume_mt) as total_mt,
                AVG(f.volume_liters) as avg_transaction_size,
                STDDEV(f.volume_liters) as volume_volatility,
                COUNT(DISTINCT f.company_id) as companies_handling,
                COUNT(f.transaction_id) as transaction_count,
                MIN(t.full_date) as first_transaction,
                MAX(t.full_date) as last_transaction
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.products p ON f.product_id = p.product_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY p.product_id, p.product_name, p.product_category
        )
        SELECT 
            product_name,
            product_category,
            total_volume,
            total_mt,
            avg_transaction_size,
            CASE WHEN avg_transaction_size > 0 
                THEN volume_volatility / avg_transaction_size * 100 
                ELSE 0 END as coefficient_of_variation,
            companies_handling,
            transaction_count,
            total_volume * 100.0 / SUM(total_volume) OVER() as portfolio_share,
            first_transaction,
            last_transaction
        FROM product_metrics
        ORDER BY total_volume DESC
    """, *params)
    
    # 3. Growth & Momentum Analysis
    growth_analysis = await conn.fetch(f"""
        WITH period_volumes AS (
            SELECT 
                t.year,
                t.quarter,
                t.month,
                SUM(f.volume_liters) as period_volume,
                SUM(f.volume_mt) as period_mt,
                COUNT(DISTINCT f.company_id) as active_companies,
                COUNT(DISTINCT f.product_id) as active_products,
                COUNT(f.transaction_id) as transactions,
                AVG(f.volume_liters) as avg_transaction_size
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.year, t.quarter, t.month
        ),
        growth_metrics AS (
            SELECT 
                year,
                quarter,
                month,
                period_volume,
                period_mt,
                active_companies,
                active_products,
                transactions,
                avg_transaction_size,
                LAG(period_volume, 1) OVER (ORDER BY year, month) as prev_month_volume,
                LAG(period_volume, 12) OVER (ORDER BY year, month) as year_ago_volume,
                LAG(period_volume, 3) OVER (ORDER BY year, month) as quarter_ago_volume
            FROM period_volumes
        )
        SELECT 
            year,
            quarter,
            month,
            period_volume,
            period_mt,
            active_companies,
            active_products,
            transactions,
            avg_transaction_size,
            CASE WHEN prev_month_volume > 0 
                THEN (period_volume - prev_month_volume) / prev_month_volume * 100 
                ELSE 0 END as mom_growth,
            CASE WHEN quarter_ago_volume > 0 
                THEN (period_volume - quarter_ago_volume) / quarter_ago_volume * 100 
                ELSE 0 END as qoq_growth,
            CASE WHEN year_ago_volume > 0 
                THEN (period_volume - year_ago_volume) / year_ago_volume * 100 
                ELSE 0 END as yoy_growth
        FROM growth_metrics
        ORDER BY year ASC, month ASC
    """, *params)
    
    # 4. Company Performance Ranking & Portfolio Analysis
    company_performance = await conn.fetch(f"""
        WITH company_metrics AS (
            SELECT 
                c.company_id,
                c.company_name,
                SUM(f.volume_liters) as total_volume,
                SUM(f.volume_mt) as total_mt,
                COUNT(f.transaction_id) as product_month_records,  -- Actually product-month combinations
                COUNT(DISTINCT f.product_id) as products_handled,
                COUNT(DISTINCT t.date_id) as active_months,  -- Renamed from active_days
                AVG(f.volume_liters) as avg_volume_per_record,
                MIN(t.full_date) as first_active,
                MAX(t.full_date) as last_active
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.companies c ON f.company_id = c.company_id
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY c.company_id, c.company_name
        ),
        ranked_companies AS (
            SELECT 
                *,
                total_volume * 100.0 / SUM(total_volume) OVER() as market_share,
                RANK() OVER (ORDER BY total_volume DESC) as volume_rank,
                -- Average volume per product per month
                total_volume / NULLIF(product_month_records, 0) as avg_monthly_volume_per_product,
                -- Product diversity: average products handled per active month
                products_handled::float / NULLIF(active_months, 0) as product_diversity_score
            FROM company_metrics
        )
        SELECT * FROM ranked_companies
        ORDER BY volume_rank
        LIMIT {top_n}
    """, *params)
    
    # 5. Seasonality Patterns
    seasonality = await conn.fetchrow(f"""
        WITH monthly_aggregates AS (
            SELECT 
                t.month,
                AVG(f.volume_liters) as avg_monthly_volume,
                STDDEV(f.volume_liters) as volume_std,
                COUNT(DISTINCT t.year) as years_observed
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
            GROUP BY t.month
        ),
        seasonal_index AS (
            SELECT 
                month,
                avg_monthly_volume,
                avg_monthly_volume / AVG(avg_monthly_volume) OVER() * 100 as seasonal_index,
                volume_std / NULLIF(avg_monthly_volume, 0) * 100 as monthly_cv
            FROM monthly_aggregates
        )
        SELECT 
            (SELECT month FROM seasonal_index ORDER BY seasonal_index DESC LIMIT 1) as peak_month,
            (SELECT month FROM seasonal_index ORDER BY seasonal_index ASC LIMIT 1) as trough_month,
            MAX(seasonal_index) - MIN(seasonal_index) as seasonal_amplitude,
            AVG(monthly_cv) as avg_monthly_volatility
        FROM seasonal_index
    """, *params)
    
    # 6. Market Dynamics & Competition
    market_dynamics = await conn.fetchrow(f"""
        WITH time_periods AS (
            SELECT DISTINCT 
                t.year,
                t.quarter
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
        ),
        period_concentration AS (
            SELECT 
                tp.year,
                tp.quarter,
                COUNT(DISTINCT f.company_id) as companies,
                SUM(f.volume_liters) as total_volume,
                (
                    SELECT SUM(sq.volume_share * sq.volume_share)
                    FROM (
                        SELECT 
                            SUM(f2.volume_liters) * 100.0 / SUM(SUM(f2.volume_liters)) OVER() as volume_share
                        FROM petroverse.fact_bdc_transactions f2
                        JOIN petroverse.time_dimension t2 ON f2.date_id = t2.date_id
                        WHERE t2.year = tp.year AND t2.quarter = tp.quarter
                        GROUP BY f2.company_id
                    ) sq
                ) as quarterly_hhi
            FROM time_periods tp
            JOIN petroverse.time_dimension t ON t.year = tp.year AND t.quarter = tp.quarter
            JOIN petroverse.fact_bdc_transactions f ON f.date_id = t.date_id
            GROUP BY tp.year, tp.quarter
        )
        SELECT 
            AVG(quarterly_hhi) as avg_hhi,
            STDDEV(quarterly_hhi) as hhi_volatility,
            MIN(quarterly_hhi) as min_hhi,
            MAX(quarterly_hhi) as max_hhi,
            CASE 
                WHEN AVG(quarterly_hhi) < 1000 THEN 'Competitive'
                WHEN AVG(quarterly_hhi) < 1800 THEN 'Moderately Concentrated'
                ELSE 'Highly Concentrated'
            END as market_structure
        FROM period_concentration
    """, *params)
    
    # 7. Operational Efficiency Metrics
    efficiency_metrics = await conn.fetchrow(f"""
        WITH transaction_metrics AS (
            SELECT 
                AVG(f.volume_liters) as avg_transaction_volume,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY f.volume_liters) as median_transaction_volume,
                STDDEV(f.volume_liters) as transaction_volatility,
                COUNT(DISTINCT DATE_TRUNC('day', t.full_date)) as operating_days,
                COUNT(f.transaction_id) as total_transactions
            FROM petroverse.fact_bdc_transactions f
            JOIN petroverse.time_dimension t ON f.date_id = t.date_id
            WHERE {where_clause}
        )
        SELECT 
            avg_transaction_volume,
            median_transaction_volume,
            transaction_volatility / NULLIF(avg_transaction_volume, 0) * 100 as transaction_cv,
            total_transactions::float / NULLIF(operating_days, 0) as daily_transaction_rate,
            operating_days
        FROM transaction_metrics
    """, *params)
    
    return {
        "market_concentration": {
            "hhi_index": float(market_concentration["hhi_index"] or 0),
            "market_structure": "Competitive" if (market_concentration["hhi_index"] or 0) < 1000 
                              else "Moderately Concentrated" if (market_concentration["hhi_index"] or 0) < 1800 
                              else "Highly Concentrated",
            "active_companies": market_concentration["active_companies"],
            "leader_market_share": float(market_concentration["leader_share"] or 0),
            "top_tier_combined_share": float(market_concentration["top_quartile_share"] or 0),
            "significant_players": market_concentration["above_median_players"],
            "q3_market_share": float(market_concentration["q3_market_share"] or 0),
            "median_market_share": float(market_concentration["median_market_share"] or 0),
            "avg_product_diversity": float(market_concentration["avg_product_diversity"] or 0),
            "market_share_dispersion": float(market_concentration["market_share_dispersion"] or 0)
        },
        "product_portfolio": [
            {
                "product_name": row["product_name"],
                "category": row["product_category"],
                "volume_liters": float(row["total_volume"] or 0),
                "volume_mt": float(row["total_mt"] or 0),
                "avg_transaction_size": float(row["avg_transaction_size"] or 0),
                "volatility_cv": float(row["coefficient_of_variation"] or 0),
                "companies_handling": row["companies_handling"],
                "transactions": row["transaction_count"],
                "portfolio_share": float(row["portfolio_share"] or 0)
            } for row in product_portfolio
        ],
        "growth_trends": [
            {
                "year": row["year"],
                "quarter": row["quarter"],
                "month": row["month"],
                "volume_liters": float(row["period_volume"] or 0),
                "volume_mt": float(row["period_mt"] or 0),
                "active_companies": row["active_companies"],
                "active_products": row["active_products"],
                "transactions": row["transactions"],
                "avg_size": float(row["avg_transaction_size"] or 0),
                "mom_growth": float(row["mom_growth"] or 0),
                "qoq_growth": float(row["qoq_growth"] or 0),
                "yoy_growth": float(row["yoy_growth"] or 0)
            } for row in growth_analysis
        ],
        "company_rankings": [
            {
                "rank": row["volume_rank"],
                "company_name": row["company_name"],
                "volume_liters": float(row["total_volume"] or 0),
                "volume_mt": float(row["total_mt"] or 0),
                "market_share": float(row["market_share"] or 0),
                "transactions": row["product_month_records"],  # Kept for API compatibility
                "products_handled": row["products_handled"],
                "efficiency_ratio": float(row["avg_monthly_volume_per_product"] or 0),  # Now avg volume per product
                "daily_transaction_rate": float(row["product_diversity_score"] or 0),  # Now product diversity
                "active_days": row["active_months"],  # Actually months
                "active_months": row["active_months"],  # Added for clarity
                "product_diversity_score": float(row["product_diversity_score"] or 0)
            } for row in company_performance
        ],
        "seasonality": {
            "peak_month": month_names[seasonality["peak_month"] - 1] if seasonality["peak_month"] else None,
            "trough_month": month_names[seasonality["trough_month"] - 1] if seasonality["trough_month"] else None,
            "seasonal_amplitude": float(seasonality["seasonal_amplitude"] or 0),
            "avg_monthly_volatility": float(seasonality["avg_monthly_volatility"] or 0)
        },
        "market_dynamics": {
            "avg_hhi": float(market_dynamics["avg_hhi"] or 0),
            "hhi_volatility": float(market_dynamics["hhi_volatility"] or 0),
            "min_hhi": float(market_dynamics["min_hhi"] or 0),
            "max_hhi": float(market_dynamics["max_hhi"] or 0),
            "market_structure": market_dynamics["market_structure"]
        },
        "efficiency_metrics": {
            "avg_transaction_volume": float(efficiency_metrics["avg_transaction_volume"] or 0),
            "median_transaction_volume": float(efficiency_metrics["median_transaction_volume"] or 0),
            "transaction_cv": float(efficiency_metrics["transaction_cv"] or 0),
            "daily_transaction_rate": float(efficiency_metrics["daily_transaction_rate"] or 0),
            "operating_days": efficiency_metrics["operating_days"]
        }
    }