"""
Supply Chain Enhanced Analytics Module
Provides comprehensive analytics for petroleum supply data
Following the same pattern as BDC and OMC analytics
"""

import asyncpg
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

async def get_supply_kpi_metrics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    volume_unit: str = 'liters'
) -> Dict[str, Any]:
    """
    Get comprehensive KPI metrics for the Ghana map dashboard
    Returns key performance indicators including total supply, growth rates, quality scores, and risk analysis
    """
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"s.period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"s.period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"s.region = ANY(${param_count})")
            params.append(region_ids)
        
        # Note: In supply_data, products are stored as strings not IDs
        # The product_ids parameter is kept for interface consistency but not used
        # Filtering would be done by product names if needed
        
        where_clause = " AND ".join(filters) if filters else "1=1"
        
        # 1. Total Supply Metrics
        supply_query = f"""
        SELECT 
            SUM(s.volume_liters) as total_liters,
            SUM(s.volume_mt) as total_mt,
            COUNT(DISTINCT s.region) as active_regions,
            COUNT(DISTINCT s.product) as active_products,
            COUNT(DISTINCT DATE_TRUNC('month', s.period_date)) as active_months,
            AVG(s.data_quality_score) as avg_quality_score,
            COUNT(*) as total_transactions
        FROM petroverse.supply_data s
        WHERE {where_clause}
        """
        
        supply_metrics = await conn.fetchrow(supply_query, *params)
        
        # 2. Growth Metrics - Compare with previous period
        growth_query = f"""
        WITH current_period AS (
            SELECT 
                SUM(s.volume_liters) as current_volume,
                COUNT(DISTINCT s.region) as current_regions
            FROM petroverse.supply_data s
            WHERE {where_clause}
        ),
        previous_period AS (
            SELECT 
                SUM(s.volume_liters) as previous_volume,
                COUNT(DISTINCT s.region) as previous_regions
            FROM petroverse.supply_data s
            WHERE s.period_date >= ${param_count + 1} 
            AND s.period_date <= ${param_count + 2}
            {' AND s.region = ANY($' + str(param_count + 3) + ')' if region_ids else ''}
            {' AND s.product = ANY($' + str(param_count + 4) + ')' if product_ids else ''}
        )
        SELECT 
            c.current_volume,
            p.previous_volume,
            CASE 
                WHEN p.previous_volume > 0 THEN 
                    ((c.current_volume - p.previous_volume) / p.previous_volume) * 100
                ELSE 0 
            END as volume_growth_rate,
            c.current_regions,
            p.previous_regions,
            c.current_regions - COALESCE(p.previous_regions, 0) as new_regions
        FROM current_period c, previous_period p
        """
        
        # Calculate previous period dates
        if start_date and end_date:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
            period_length = (end_dt - start_dt).days
            prev_start = start_dt - timedelta(days=period_length)
            prev_end = start_dt - timedelta(days=1)
            
            growth_params = params + [prev_start, prev_end]
            if region_ids:
                growth_params.append(region_ids)
            if product_ids:
                growth_params.append(product_ids)
            
            growth_metrics = await conn.fetchrow(growth_query, *growth_params)
        else:
            growth_metrics = None
        
        # 3. Regional Performance Metrics
        regional_query = f"""
        SELECT 
            s.region,
            SUM(s.volume_liters) as total_quantity,
            COUNT(DISTINCT s.product) as product_count,
            AVG(s.data_quality_score) as quality_score,
            STDDEV(s.volume_liters) as volume_volatility,
            CASE 
                WHEN STDDEV(s.volume_liters) > 0 AND AVG(s.volume_liters) > 0 THEN
                    (STDDEV(s.volume_liters) / AVG(s.volume_liters)) * 100
                ELSE 0
            END as volatility_coefficient
        FROM petroverse.supply_data s
        WHERE {where_clause}
        GROUP BY s.region
        ORDER BY total_quantity DESC
        """
        
        regional_data = await conn.fetch(regional_query, *params)
        
        # 4. Risk Analysis
        risk_analysis_query = f"""
        WITH risk_metrics AS (
            SELECT 
                s.region,
                SUM(s.volume_liters) as total_volume,
                AVG(s.data_quality_score) as quality_score,
                STDDEV(s.volume_liters) / NULLIF(AVG(s.volume_liters), 0) as volatility,
                COUNT(DISTINCT s.product) as product_diversity
            FROM petroverse.supply_data s
            WHERE {where_clause}
            GROUP BY s.region
        ),
        risk_thresholds AS (
            SELECT 
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_volume) as volume_p25,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY volatility) as volatility_p75,
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY quality_score) as quality_p25
            FROM risk_metrics
        )
        SELECT 
            COUNT(CASE 
                WHEN rm.total_volume < rt.volume_p25 
                  OR rm.volatility > rt.volatility_p75 
                  OR rm.quality_score < rt.quality_p25 
                THEN 1 
            END) as high_risk_regions,
            COUNT(CASE 
                WHEN rm.volatility > rt.volatility_p75 * 1.5
                  OR rm.quality_score < rt.quality_p25 * 0.8
                THEN 1 
            END) as critical_risk_regions,
            AVG(rm.volatility) * 100 as avg_volatility_percent,
            MIN(rm.quality_score) as min_quality_score,
            MAX(rm.volatility) * 100 as max_volatility_percent
        FROM risk_metrics rm, risk_thresholds rt
        """
        
        risk_metrics = await conn.fetchrow(risk_analysis_query, *params)
        
        # 5. Top Performing Regions
        top_regions_query = f"""
        SELECT 
            s.region,
            SUM(s.volume_liters) as total_quantity,
            SUM(s.volume_mt) as total_quantity_mt,
            COUNT(DISTINCT s.product) as product_count,
            AVG(s.data_quality_score) as quality_score
        FROM petroverse.supply_data s
        WHERE {where_clause}
        GROUP BY s.region
        ORDER BY total_quantity DESC
        LIMIT 5
        """
        
        top_regions = await conn.fetch(top_regions_query, *params)
        
        # 6. Recent Trends (Last 7 days of data within the period)
        trend_query = f"""
        WITH daily_volumes AS (
            SELECT 
                s.period_date,
                SUM(s.volume_liters) as daily_volume
            FROM petroverse.supply_data s
            WHERE {where_clause}
            GROUP BY s.period_date
            ORDER BY s.period_date DESC
            LIMIT 7
        ),
        aggregated AS (
            SELECT 
                AVG(daily_volume) as avg_daily_volume,
                MAX(period_date) as latest_date,
                MIN(period_date) as earliest_date,
                MAX(CASE WHEN period_date = (SELECT MAX(period_date) FROM daily_volumes) THEN daily_volume END) as latest_volume,
                MAX(CASE WHEN period_date = (SELECT MIN(period_date) FROM daily_volumes) THEN daily_volume END) as earliest_volume
            FROM daily_volumes
        )
        SELECT 
            avg_daily_volume,
            CASE 
                WHEN earliest_volume > 0 AND latest_volume IS NOT NULL AND earliest_volume IS NOT NULL THEN
                    ((latest_volume - earliest_volume) / earliest_volume) * 100
                ELSE 0
            END as recent_trend_percent
        FROM aggregated
        """
        
        trend_metrics = await conn.fetchrow(trend_query, *params)
        
        # Process and format results
        total_volume = float(supply_metrics['total_liters'] or 0)
        total_volume_mt = float(supply_metrics['total_mt'] or 0)
        
        # Calculate growth indicators
        growth_rate = 0
        growth_direction = 'stable'
        if growth_metrics and growth_metrics['volume_growth_rate']:
            growth_rate = float(growth_metrics['volume_growth_rate'])
            if growth_rate > 5:
                growth_direction = 'up'
            elif growth_rate < -5:
                growth_direction = 'down'
        
        # Process regional data for risk classification
        regions_by_risk = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        for region in regional_data:
            volatility = float(region['volatility_coefficient'] or 0)
            quality = float(region['quality_score'] or 1)
            
            if volatility > 50 or quality < 0.7:
                regions_by_risk['critical'] += 1
            elif volatility > 30 or quality < 0.8:
                regions_by_risk['high'] += 1
            elif volatility > 15 or quality < 0.9:
                regions_by_risk['medium'] += 1
            else:
                regions_by_risk['low'] += 1
        
        return {
            'kpi_metrics': {
                'total_supply': {
                    'value_liters': float(total_volume),
                    'value_mt': float(total_volume_mt),
                    'unit': volume_unit,
                    'formatted': format_volume_value(total_volume if volume_unit == 'liters' else total_volume_mt, volume_unit),
                    'trend': growth_direction,
                    'change_percent': growth_rate
                },
                'average_growth': {
                    'value': growth_rate,
                    'formatted': f"{growth_rate:+.1f}%",
                    'direction': growth_direction,
                    'growing_regions': len([r for r in regional_data if float(r['total_quantity'] or 0) > 0])
                },
                'average_quality': {
                    'value': float(supply_metrics['avg_quality_score'] or 0),
                    'formatted': f"{float(supply_metrics['avg_quality_score'] or 0):.2f}",
                    'status': 'good' if float(supply_metrics['avg_quality_score'] or 0) > 0.85 else 'warning'
                },
                'risk_summary': {
                    'high_risk_count': int(risk_metrics['high_risk_regions'] or 0),
                    'critical_risk_count': int(risk_metrics['critical_risk_regions'] or 0),
                    'total_at_risk': int(risk_metrics['high_risk_regions'] or 0) + int(risk_metrics['critical_risk_regions'] or 0),
                    'regions_by_risk': regions_by_risk,
                    'max_volatility': float(risk_metrics['max_volatility_percent'] or 0)
                }
            },
            'summary_stats': {
                'active_regions': int(supply_metrics['active_regions'] or 0),
                'active_products': int(supply_metrics['active_products'] or 0),
                'active_months': int(supply_metrics['active_months'] or 0),
                'total_transactions': int(supply_metrics['total_transactions'] or 0),
                'avg_daily_volume': float(trend_metrics['avg_daily_volume'] or 0) if trend_metrics else 0,
                'recent_trend': float(trend_metrics['recent_trend_percent'] or 0) if trend_metrics else 0
            },
            'top_regions': [
                {
                    'region': r['region'],
                    'total_quantity': float(r['total_quantity'] or 0),
                    'total_quantity_mt': float(r['total_quantity_mt'] or 0),
                    'product_count': int(r['product_count'] or 0),
                    'quality_score': float(r['quality_score'] or 0)
                }
                for r in top_regions
            ],
            'timestamp': datetime.now().isoformat()
        }

def format_volume_value(value: float, unit: str) -> str:
    """Format volume values with appropriate units"""
    if value >= 1e9:
        return f"{value/1e9:.2f}B {unit.upper() if unit == 'mt' else 'L'}"
    elif value >= 1e6:
        return f"{value/1e6:.2f}M {unit.upper() if unit == 'mt' else 'L'}"
    elif value >= 1e3:
        return f"{value/1e3:.2f}K {unit.upper() if unit == 'mt' else 'L'}"
    else:
        return f"{value:.0f} {unit.upper() if unit == 'mt' else 'L'}"

async def get_supply_performance_metrics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    top_n: int = 10
) -> Dict[str, Any]:
    """Get supply performance metrics including regional and product analysis"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"s.period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"s.period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"s.region = ANY(${param_count})")
            params.append(region_ids)
        
        if product:
            param_count += 1
            filters.append(f"s.product = ${param_count}")
            params.append(product)
        
        if min_quality:
            param_count += 1
            filters.append(f"s.data_quality_score >= ${param_count}")
            params.append(min_quality)
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Top regions by supply volume
        top_regions_query = f"""
            SELECT 
                s.region,
                COUNT(DISTINCT s.product) as product_count,
                COUNT(DISTINCT s.year || '-' || s.month) as active_months,
                SUM(s.volume_liters) as total_quantity,
                SUM(s.volume_mt) as total_quantity_mt,
                AVG(s.volume_liters) as avg_quantity,
                AVG(s.volume_mt) as avg_quantity_mt,
                MAX(s.volume_liters) as max_quantity,
                MIN(s.volume_liters) as min_quantity,
                MAX(s.volume_mt) as max_quantity_mt,
                MIN(s.volume_mt) as min_quantity_mt,
                COUNT(*) as supply_count,
                ROUND(100.0 * SUM(s.volume_liters) / 
                    NULLIF((SELECT SUM(volume_liters) FROM petroverse.supply_data), 0), 2) as market_share_percent
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.region
            ORDER BY total_quantity DESC
            LIMIT {top_n}
        """
        
        # Product supply distribution
        product_distribution_query = f"""
            SELECT 
                s.product,
                s.product_category,
                COUNT(DISTINCT s.region) as region_count,
                SUM(s.volume_liters) as total_quantity,
                SUM(s.volume_mt) as total_quantity_mt,
                AVG(s.volume_liters) as avg_quantity,
                AVG(s.volume_mt) as avg_quantity_mt,
                STDDEV(s.volume_liters) as quantity_stddev,
                STDDEV(s.volume_mt) as quantity_stddev_mt,
                COUNT(*) as supply_count,
                COUNT(DISTINCT s.year || '-' || s.month) as active_months
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.product, s.product_category
            ORDER BY total_quantity DESC
            LIMIT {top_n}
        """
        
        # Monthly supply trends
        monthly_trend_query = f"""
            SELECT 
                s.year,
                s.month,
                TO_CHAR(MIN(s.period_date), 'YYYY-MM') as period,
                COUNT(DISTINCT s.region) as regions,
                COUNT(DISTINCT s.product) as products,
                SUM(s.volume_liters) as total_quantity,
                SUM(s.volume_mt) as total_quantity_mt,
                AVG(s.volume_liters) as avg_quantity,
                AVG(s.volume_mt) as avg_quantity_mt,
                COUNT(*) as transactions
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.year, s.month
            ORDER BY s.year, s.month
        """
        
        # Execute queries
        top_regions = await conn.fetch(top_regions_query, *params)
        product_distribution = await conn.fetch(product_distribution_query, *params)
        monthly_trends = await conn.fetch(monthly_trend_query, *params)
        
        return {
            "top_regions": [dict(r) for r in top_regions],
            "product_distribution": [dict(r) for r in product_distribution],
            "monthly_trends": [dict(r) for r in monthly_trends]
        }

async def get_supply_quality_trends_data(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    product: Optional[str] = None
) -> Dict[str, Any]:
    """Get quality score trends over time for supply data"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"s.period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"s.period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"s.region = ANY(${param_count})")
            params.append(region_ids)
        
        if product_ids:
            param_count += 1
            filters.append(f"s.product_id = ANY(${param_count})")
            params.append(product_ids)
        
        if product:
            param_count += 1
            filters.append(f"s.product ILIKE ${param_count}")
            params.append(f"%{product}%")
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Monthly quality trends
        monthly_quality_query = f"""
            SELECT 
                s.year,
                s.month,
                TO_CHAR(MIN(s.period_date), 'YYYY-MM') as period,
                AVG(s.data_quality_score) as avg_quality_score,
                MIN(s.data_quality_score) as min_quality_score,
                MAX(s.data_quality_score) as max_quality_score,
                STDDEV(s.data_quality_score) as quality_stddev,
                COUNT(*) as record_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.95 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.85 AND s.data_quality_score < 0.95 THEN 1 END) as good_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.75 AND s.data_quality_score < 0.85 THEN 1 END) as fair_count,
                COUNT(CASE WHEN s.data_quality_score < 0.75 THEN 1 END) as poor_count
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.year, s.month
            ORDER BY s.year, s.month
        """
        
        # Regional quality comparison
        regional_quality_query = f"""
            SELECT 
                s.region,
                AVG(s.data_quality_score) as avg_quality_score,
                MIN(s.data_quality_score) as min_quality_score,
                MAX(s.data_quality_score) as max_quality_score,
                STDDEV(s.data_quality_score) as quality_stddev,
                COUNT(*) as record_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.95 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.85 AND s.data_quality_score < 0.95 THEN 1 END) as good_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.75 AND s.data_quality_score < 0.85 THEN 1 END) as fair_count,
                COUNT(CASE WHEN s.data_quality_score < 0.75 THEN 1 END) as poor_count,
                ROUND(100.0 * COUNT(CASE WHEN s.data_quality_score >= 0.95 THEN 1 END) / COUNT(*), 2) as excellent_percentage,
                ROUND(100.0 * COUNT(CASE WHEN s.data_quality_score >= 0.85 THEN 1 END) / COUNT(*), 2) as good_or_better_percentage
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.region
            ORDER BY avg_quality_score DESC
            LIMIT 15
        """
        
        # Product quality comparison
        product_quality_query = f"""
            SELECT 
                s.product_name_clean as product,
                s.product_category,
                AVG(s.data_quality_score) as avg_quality_score,
                MIN(s.data_quality_score) as min_quality_score,
                MAX(s.data_quality_score) as max_quality_score,
                STDDEV(s.data_quality_score) as quality_stddev,
                COUNT(*) as record_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.95 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.85 AND s.data_quality_score < 0.95 THEN 1 END) as good_count,
                COUNT(CASE WHEN s.data_quality_score >= 0.75 AND s.data_quality_score < 0.85 THEN 1 END) as fair_count,
                COUNT(CASE WHEN s.data_quality_score < 0.75 THEN 1 END) as poor_count
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.product_name_clean, s.product_category
            HAVING COUNT(*) >= 10  -- Only include products with sufficient data
            ORDER BY avg_quality_score DESC
            LIMIT 20
        """
        
        # Execute queries
        monthly_quality = await conn.fetch(monthly_quality_query, *params)
        regional_quality = await conn.fetch(regional_quality_query, *params)
        product_quality = await conn.fetch(product_quality_query, *params)
        
        return {
            "monthly_quality": [dict(r) for r in monthly_quality],
            "regional_quality": [dict(r) for r in regional_quality],
            "product_quality": [dict(r) for r in product_quality]
        }

async def get_supply_regional_analytics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    product: Optional[str] = None,
    min_quality: Optional[float] = None
) -> Dict[str, Any]:
    """Get detailed regional supply analytics"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"s.period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"s.period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"s.region = ANY(${param_count})")
            params.append(region_ids)
        
        if product:
            param_count += 1
            filters.append(f"s.product = ${param_count}")
            params.append(product)
        
        if min_quality:
            param_count += 1
            filters.append(f"s.data_quality_score >= ${param_count}")
            params.append(min_quality)
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Regional consistency metrics
        regional_consistency_query = f"""
            WITH regional_metrics AS (
                SELECT 
                    s.region,
                    s.year,
                    s.month,
                    COUNT(DISTINCT s.product) as products_supplied,
                    SUM(s.volume_liters) as monthly_quantity,
                    AVG(s.data_quality_score) as avg_quality
                FROM petroverse.supply_data s
                {where_clause}
                GROUP BY s.region, s.year, s.month
            ),
            regional_stats AS (
                SELECT 
                    region,
                    COUNT(*) as active_months,
                    AVG(products_supplied) as avg_products,
                    SUM(monthly_quantity) as total_quantity,
                    AVG(monthly_quantity) as avg_monthly_quantity,
                    STDDEV(monthly_quantity) as quantity_stddev,
                    MIN(monthly_quantity) as min_monthly_quantity,
                    MAX(monthly_quantity) as max_monthly_quantity,
                    AVG(avg_quality) as overall_quality_score,
                    CASE 
                        WHEN STDDEV(monthly_quantity) > 0 
                        THEN (STDDEV(monthly_quantity) / AVG(monthly_quantity)) * 100
                        ELSE 0 
                    END as volatility_coefficient
                FROM regional_metrics
                GROUP BY region
            )
            SELECT 
                *,
                RANK() OVER (ORDER BY total_quantity DESC) as volume_rank,
                RANK() OVER (ORDER BY volatility_coefficient ASC) as stability_rank,
                RANK() OVER (ORDER BY avg_products DESC) as diversity_rank
            FROM regional_stats
            ORDER BY total_quantity DESC
        """
        
        # Product flow by region
        product_flow_query = f"""
            SELECT 
                s.region,
                s.product,
                s.product_category,
                COUNT(*) as supply_count,
                SUM(s.volume_liters) as total_quantity,
                SUM(s.volume_mt) as total_quantity_mt,
                AVG(s.volume_liters) as avg_quantity,
                AVG(s.volume_mt) as avg_quantity_mt,
                MIN(s.volume_liters) as min_quantity,
                MAX(s.volume_liters) as max_quantity,
                STDDEV(s.volume_liters) as quantity_stddev,
                STDDEV(s.volume_mt) as quantity_stddev_mt,
                COUNT(DISTINCT s.year || '-' || s.month) as active_months
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY s.region, s.product, s.product_category
            ORDER BY s.region, total_quantity DESC
        """
        
        # Temporal patterns
        temporal_patterns_query = f"""
            SELECT 
                EXTRACT(MONTH FROM s.period_date) as month_num,
                TO_CHAR(s.period_date, 'Month') as month_name,
                COUNT(DISTINCT s.region) as avg_regions,
                AVG(s.volume_liters) as avg_quantity,
                SUM(s.volume_liters) as total_quantity,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT s.product) as product_diversity
            FROM petroverse.supply_data s
            {where_clause}
            GROUP BY EXTRACT(MONTH FROM s.period_date), TO_CHAR(s.period_date, 'Month')
            ORDER BY month_num
        """
        
        # Execute queries
        regional_consistency = await conn.fetch(regional_consistency_query, *params)
        product_flow = await conn.fetch(product_flow_query, *params)
        temporal_patterns = await conn.fetch(temporal_patterns_query, *params)
        
        return {
            "regional_consistency": [dict(r) for r in regional_consistency],
            "product_flow": [dict(r) for r in product_flow],
            "temporal_patterns": [dict(r) for r in temporal_patterns]
        }

async def get_supply_growth_analytics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    product: Optional[str] = None
) -> Dict[str, Any]:
    """Get supply growth trends and analytics"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"region = ANY(${param_count})")
            params.append(region_ids)
        
        if product:
            param_count += 1
            filters.append(f"product = ${param_count}")
            params.append(product)
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Year-over-year growth
        yoy_growth_query = f"""
            WITH yearly_metrics AS (
                SELECT 
                    year,
                    COUNT(DISTINCT region) as regions,
                    COUNT(DISTINCT product) as products,
                    SUM(volume_liters) as total_quantity,
                    COUNT(*) as transactions
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY year
            )
            SELECT 
                year,
                regions,
                products,
                transactions,
                total_quantity,
                LAG(total_quantity) OVER (ORDER BY year) as prev_year_quantity,
                CASE 
                    WHEN LAG(total_quantity) OVER (ORDER BY year) > 0 
                    THEN ((total_quantity - LAG(total_quantity) OVER (ORDER BY year)) / 
                          LAG(total_quantity) OVER (ORDER BY year)) * 100
                    ELSE NULL 
                END as yoy_growth_rate
            FROM yearly_metrics
            ORDER BY year
        """
        
        # Quarter-over-quarter growth
        qoq_growth_query = f"""
            WITH quarterly_metrics AS (
                SELECT 
                    year,
                    EXTRACT(QUARTER FROM period_date) as quarter,
                    COUNT(DISTINCT region) as regions,
                    COUNT(DISTINCT product) as products,
                    SUM(volume_liters) as total_quantity,
                    COUNT(*) as transactions
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY year, EXTRACT(QUARTER FROM period_date)
            )
            SELECT 
                year,
                quarter,
                regions,
                products,
                transactions,
                total_quantity,
                LAG(total_quantity) OVER (ORDER BY year, quarter) as prev_quarter_quantity,
                CASE 
                    WHEN LAG(total_quantity) OVER (ORDER BY year, quarter) > 0 
                    THEN ((total_quantity - LAG(total_quantity) OVER (ORDER BY year, quarter)) / 
                          LAG(total_quantity) OVER (ORDER BY year, quarter)) * 100
                    ELSE NULL 
                END as qoq_growth_rate
            FROM quarterly_metrics
            ORDER BY year, quarter
        """
        
        # Regional growth trends
        regional_growth_query = f"""
            WITH regional_monthly AS (
                SELECT 
                    region,
                    year,
                    month,
                    SUM(volume_liters) as monthly_quantity
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY region, year, month
            ),
            regional_growth AS (
                SELECT 
                    region,
                    year,
                    month,
                    monthly_quantity,
                    LAG(monthly_quantity) OVER (PARTITION BY region ORDER BY year, month) as prev_month_quantity,
                    LAG(monthly_quantity, 12) OVER (PARTITION BY region ORDER BY year, month) as prev_year_month_quantity
                FROM regional_monthly
            )
            SELECT 
                region,
                AVG(CASE 
                    WHEN prev_month_quantity > 0 
                    THEN ((monthly_quantity - prev_month_quantity) / prev_month_quantity) * 100
                    ELSE NULL 
                END) as avg_mom_growth,
                AVG(CASE 
                    WHEN prev_year_month_quantity > 0 
                    THEN ((monthly_quantity - prev_year_month_quantity) / prev_year_month_quantity) * 100
                    ELSE NULL 
                END) as avg_yoy_growth,
                SUM(monthly_quantity) as total_quantity,
                COUNT(*) as data_points,
                RANK() OVER (ORDER BY AVG(CASE 
                    WHEN prev_year_month_quantity > 0 
                    THEN ((monthly_quantity - prev_year_month_quantity) / prev_year_month_quantity) * 100
                    ELSE NULL 
                END) DESC NULLS LAST) as growth_rank
            FROM regional_growth
            WHERE prev_month_quantity IS NOT NULL OR prev_year_month_quantity IS NOT NULL
            GROUP BY region
            ORDER BY avg_yoy_growth DESC NULLS LAST
        """
        
        # Execute queries
        yoy_growth = await conn.fetch(yoy_growth_query, *params)
        qoq_growth = await conn.fetch(qoq_growth_query, *params)
        regional_growth = await conn.fetch(regional_growth_query, *params)
        
        return {
            "yoy_growth": [dict(r) for r in yoy_growth],
            "qoq_growth": [dict(r) for r in qoq_growth],
            "regional_growth": [dict(r) for r in regional_growth]
        }

async def get_supply_resilience_analytics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    product: Optional[str] = None
) -> Dict[str, Any]:
    """Get supply chain resilience and risk analytics"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"region = ANY(${param_count})")
            params.append(region_ids)
        
        if product:
            param_count += 1
            filters.append(f"product = ${param_count}")
            params.append(product)
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Supply chain resilience metrics
        resilience_query = f"""
            WITH product_metrics AS (
                SELECT 
                    product,
                    product_category,
                    COUNT(DISTINCT region) as region_coverage,
                    COUNT(*) as total_transactions,
                    SUM(volume_liters) as total_quantity,
                    AVG(quantity_original) as avg_transaction_size,
                    STDDEV(quantity_original) as quantity_stddev,
                    MIN(quantity_original) as min_quantity,
                    MAX(quantity_original) as max_quantity,
                    AVG(data_quality_score) as avg_quality_score,
                    COUNT(DISTINCT year || '-' || month) as market_presence_months
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY product, product_category
            ),
            volatility_metrics AS (
                SELECT 
                    product,
                    CASE 
                        WHEN AVG(quantity_original) > 0 
                        THEN (STDDEV(quantity_original) / AVG(quantity_original)) * 100
                        ELSE 0 
                    END as volatility_coefficient
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY product
            ),
            thresholds AS (
                SELECT 
                    PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY total_quantity) as volume_threshold,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY region_coverage) as region_q1,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY region_coverage) as region_median,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY region_coverage) as region_q3,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY v.volatility_coefficient) as volatility_q1,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v.volatility_coefficient) as volatility_median,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v.volatility_coefficient) as volatility_q3
                FROM product_metrics p
                JOIN volatility_metrics v ON p.product = v.product
            )
            SELECT 
                p.product as product_name,
                p.product_category,
                p.region_coverage,
                p.total_transactions,
                p.total_quantity,
                p.avg_transaction_size,
                v.volatility_coefficient,
                p.avg_quality_score,
                p.market_presence_months,
                CASE 
                    WHEN p.region_coverage >= t.region_q3 THEN 'Excellent Coverage'
                    WHEN p.region_coverage >= t.region_median THEN 'Good Coverage'
                    WHEN p.region_coverage >= t.region_q1 THEN 'Moderate Coverage'
                    ELSE 'Limited Coverage'
                END as supply_coverage_level,
                CASE 
                    WHEN v.volatility_coefficient <= t.volatility_q1 THEN 'Very Stable'
                    WHEN v.volatility_coefficient <= t.volatility_median THEN 'Stable'
                    WHEN v.volatility_coefficient <= t.volatility_q3 THEN 'Moderate'
                    ELSE 'Volatile'
                END as volatility_level,
                t.volume_threshold as volume_inclusion_threshold,
                t.region_q1 as region_threshold_q1,
                t.region_median as region_threshold_median,
                t.region_q3 as region_threshold_q3,
                t.volatility_q1 as volatility_threshold_q1,
                t.volatility_median as volatility_threshold_median,
                t.volatility_q3 as volatility_threshold_q3
            FROM product_metrics p
            JOIN volatility_metrics v ON p.product = v.product
            CROSS JOIN thresholds t
            WHERE p.total_quantity >= t.volume_threshold
            ORDER BY p.total_quantity DESC
        """
        
        # Regional balance analysis
        regional_balance_query = f"""
            WITH regional_supply AS (
                SELECT 
                    region,
                    product_category,
                    SUM(volume_liters) as category_quantity
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY region, product_category
            ),
            regional_totals AS (
                SELECT 
                    region,
                    SUM(volume_liters) as total_quantity
                FROM petroverse.supply_data
                {where_clause}
                GROUP BY region
            )
            SELECT 
                rs.region,
                rs.product_category,
                rs.category_quantity,
                rt.total_quantity,
                ROUND(100.0 * rs.category_quantity / rt.total_quantity, 2) as category_percentage
            FROM regional_supply rs
            JOIN regional_totals rt ON rs.region = rt.region
            ORDER BY rs.region, rs.category_quantity DESC
        """
        
        # Year comparison for 2025 (16 regions) vs previous years (10 regions)
        regional_expansion_query = """
            WITH region_counts AS (
                SELECT 
                    year,
                    COUNT(DISTINCT region) as unique_regions,
                    ARRAY_AGG(DISTINCT region ORDER BY region) as regions_list
                FROM petroverse.supply_data
                GROUP BY year
            ),
            new_regions_2025 AS (
                SELECT 
                    region,
                    SUM(volume_liters) as total_quantity,
                    COUNT(DISTINCT product) as product_count,
                    COUNT(*) as transaction_count
                FROM petroverse.supply_data
                WHERE year = 2025
                AND region NOT IN (
                    SELECT DISTINCT region 
                    FROM petroverse.supply_data 
                    WHERE year < 2025
                )
                GROUP BY region
            )
            SELECT 
                rc.year,
                rc.unique_regions,
                rc.regions_list,
                CASE 
                    WHEN rc.year = 2025 THEN 
                        (SELECT COUNT(*) FROM new_regions_2025)
                    ELSE 0 
                END as new_regions_count,
                CASE 
                    WHEN rc.year = 2025 THEN 
                        (SELECT ARRAY_AGG(region ORDER BY region) FROM new_regions_2025)
                    ELSE NULL 
                END as new_regions_list
            FROM region_counts rc
            ORDER BY rc.year
        """
        
        # Execute queries
        resilience = await conn.fetch(resilience_query, *params)
        regional_balance = await conn.fetch(regional_balance_query, *params)
        regional_expansion = await conn.fetch(regional_expansion_query)
        
        return {
            "supply_resilience": [dict(r) for r in resilience],
            "regional_balance": [dict(r) for r in regional_balance],
            "regional_expansion": [dict(r) for r in regional_expansion]
        }

async def get_supply_quality_metrics(
    pool: asyncpg.Pool,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region_ids: Optional[List[str]] = None,
    product_ids: Optional[List[int]] = None,
    product: Optional[str] = None
) -> Dict[str, Any]:
    """Get data quality metrics for supply data"""
    
    async with pool.acquire() as conn:
        # Build filter conditions
        filters = []
        params = []
        param_count = 0
        
        if start_date:
            param_count += 1
            filters.append(f"period_date >= ${param_count}")
            params.append(datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            param_count += 1
            filters.append(f"period_date <= ${param_count}")
            params.append(datetime.strptime(end_date, '%Y-%m-%d').date())
        
        if region_ids:
            param_count += 1
            filters.append(f"region = ANY(${param_count})")
            params.append(region_ids)
        
        if product:
            param_count += 1
            filters.append(f"product = ${param_count}")
            params.append(product)
        
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # Overall quality metrics
        quality_overview_query = f"""
            SELECT 
                COUNT(*) as total_records,
                AVG(data_quality_score) as avg_quality_score,
                MIN(data_quality_score) as min_quality_score,
                MAX(data_quality_score) as max_quality_score,
                STDDEV(data_quality_score) as quality_stddev,
                SUM(CASE WHEN data_quality_score >= 0.95 THEN 1 ELSE 0 END) as high_quality_count,
                SUM(CASE WHEN data_quality_score >= 0.8 AND data_quality_score < 0.95 THEN 1 ELSE 0 END) as medium_quality_count,
                SUM(CASE WHEN data_quality_score < 0.8 THEN 1 ELSE 0 END) as low_quality_count,
                SUM(CASE WHEN is_outlier = true THEN 1 ELSE 0 END) as outlier_count,
                SUM(CASE WHEN is_outlier = false THEN 1 ELSE 0 END) as normal_count
            FROM petroverse.supply_data
            {where_clause}
        """
        
        # Quality by region
        quality_by_region_query = f"""
            SELECT 
                region,
                COUNT(*) as record_count,
                AVG(data_quality_score) as avg_quality_score,
                SUM(CASE WHEN is_outlier = true THEN 1 ELSE 0 END) as outlier_count,
                MIN(data_quality_score) as min_score,
                MAX(data_quality_score) as max_score
            FROM petroverse.supply_data
            {where_clause}
            GROUP BY region
            ORDER BY avg_quality_score DESC
        """
        
        # Execute queries
        quality_overview = await conn.fetchrow(quality_overview_query, *params)
        quality_by_region = await conn.fetch(quality_by_region_query, *params)
        
        return {
            "quality_overview": dict(quality_overview) if quality_overview else {},
            "quality_by_region": [dict(r) for r in quality_by_region]
        }