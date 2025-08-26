"""
PetroVerse Data Quality Analysis Script
Comprehensive analysis of data quality in the PetroVerse database
"""

import asyncio
import asyncpg
from datetime import datetime, date
from collections import defaultdict
import json

DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics"

async def analyze_data_quality():
    """Perform comprehensive data quality analysis"""
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("=" * 80)
    print("PETROVERSE DATA QUALITY ANALYSIS REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # 1. OVERALL DATABASE STATISTICS
    print("\n1. DATABASE OVERVIEW")
    print("-" * 40)
    
    overall_stats = await conn.fetchrow("""
        SELECT 
            (SELECT COUNT(*) FROM petroverse.performance_metrics) as total_records,
            (SELECT COUNT(DISTINCT company_id) FROM petroverse.companies) as total_companies,
            (SELECT COUNT(DISTINCT product_id) FROM petroverse.products) as total_products,
            (SELECT MIN(full_date) FROM petroverse.time_dimension t 
             JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id) as earliest_date,
            (SELECT MAX(full_date) FROM petroverse.time_dimension t 
             JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id) as latest_date,
            (SELECT COUNT(DISTINCT date_id) FROM petroverse.performance_metrics) as unique_dates
    """)
    
    print(f"Total Records: {overall_stats['total_records']:,}")
    print(f"Total Companies: {overall_stats['total_companies']}")
    print(f"Total Products: {overall_stats['total_products']}")
    print(f"Date Range: {overall_stats['earliest_date']} to {overall_stats['latest_date']}")
    print(f"Unique Dates: {overall_stats['unique_dates']}")
    
    # 2. DATA COMPLETENESS ANALYSIS
    print("\n2. DATA COMPLETENESS ANALYSIS")
    print("-" * 40)
    
    null_analysis = await conn.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE volume_liters IS NULL) as null_volume_liters,
            COUNT(*) FILTER (WHERE volume_mt IS NULL) as null_volume_mt,
            COUNT(*) FILTER (WHERE data_quality_score IS NULL) as null_quality_score,
            COUNT(*) as total
        FROM petroverse.performance_metrics
    """)
    
    total = null_analysis['total']
    print(f"Null volume_liters: {null_analysis['null_volume_liters']} ({null_analysis['null_volume_liters']/total*100:.2f}%)")
    print(f"Null volume_mt: {null_analysis['null_volume_mt']} ({null_analysis['null_volume_mt']/total*100:.2f}%)")
    print(f"Null quality_score: {null_analysis['null_quality_score']} ({null_analysis['null_quality_score']/total*100:.2f}%)")
    
    # 3. VOLUME DATA QUALITY
    print("\n3. VOLUME DATA QUALITY CHECKS")
    print("-" * 40)
    
    volume_stats = await conn.fetchrow("""
        SELECT 
            MIN(volume_liters) as min_volume,
            MAX(volume_liters) as max_volume,
            AVG(volume_liters) as avg_volume,
            STDDEV(volume_liters) as stddev_volume,
            COUNT(*) FILTER (WHERE volume_liters <= 0) as zero_or_negative,
            COUNT(*) FILTER (WHERE volume_liters > 1000000) as extremely_high,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY volume_liters) as q1,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY volume_liters) as median,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY volume_liters) as q3
        FROM petroverse.performance_metrics
        WHERE volume_liters IS NOT NULL
    """)
    
    print(f"Min Volume: {volume_stats['min_volume']:,.2f} L")
    print(f"Max Volume: {volume_stats['max_volume']:,.2f} L")
    print(f"Average Volume: {volume_stats['avg_volume']:,.2f} L")
    print(f"Std Dev: {volume_stats['stddev_volume']:,.2f} L")
    print(f"Q1: {volume_stats['q1']:,.2f} L")
    print(f"Median: {volume_stats['median']:,.2f} L")
    print(f"Q3: {volume_stats['q3']:,.2f} L")
    print(f"Zero/Negative Values: {volume_stats['zero_or_negative']}")
    print(f"Extremely High Values (>1M L): {volume_stats['extremely_high']}")
    
    # 4. COMPANY DATA DISTRIBUTION
    print("\n4. COMPANY DATA DISTRIBUTION")
    print("-" * 40)
    
    company_dist = await conn.fetch("""
        SELECT 
            c.company_type,
            COUNT(DISTINCT c.company_id) as company_count,
            COUNT(pm.metric_id) as record_count,
            SUM(pm.volume_liters) as total_volume,
            AVG(pm.volume_liters) as avg_volume
        FROM petroverse.companies c
        LEFT JOIN petroverse.performance_metrics pm ON c.company_id = pm.company_id
        GROUP BY c.company_type
        ORDER BY company_count DESC
    """)
    
    for row in company_dist:
        print(f"\n{row['company_type']}:")
        print(f"  Companies: {row['company_count']}")
        print(f"  Records: {row['record_count']:,}")
        print(f"  Total Volume: {row['total_volume']:,.0f} L" if row['total_volume'] else "  Total Volume: No data")
        print(f"  Avg Volume: {row['avg_volume']:,.2f} L" if row['avg_volume'] else "  Avg Volume: No data")
    
    # 5. PRODUCT COVERAGE
    print("\n5. PRODUCT COVERAGE ANALYSIS")
    print("-" * 40)
    
    product_coverage = await conn.fetch("""
        SELECT 
            p.product_category,
            COUNT(DISTINCT p.product_id) as product_count,
            COUNT(DISTINCT pm.company_id) as companies_trading,
            COUNT(pm.metric_id) as transaction_count,
            SUM(pm.volume_liters) as total_volume
        FROM petroverse.products p
        LEFT JOIN petroverse.performance_metrics pm ON p.product_id = pm.product_id
        GROUP BY p.product_category
        ORDER BY product_count DESC
    """)
    
    for row in product_coverage:
        print(f"\n{row['product_category'] or 'Uncategorized'}:")
        print(f"  Products: {row['product_count']}")
        print(f"  Companies Trading: {row['companies_trading'] or 0}")
        print(f"  Transactions: {row['transaction_count'] or 0}")
        print(f"  Total Volume: {row['total_volume']:,.0f} L" if row['total_volume'] else "  Total Volume: No data")
    
    # 6. TEMPORAL DISTRIBUTION
    print("\n6. TEMPORAL DATA DISTRIBUTION")
    print("-" * 40)
    
    temporal_dist = await conn.fetch("""
        SELECT 
            t.year,
            t.month,
            COUNT(pm.metric_id) as record_count,
            COUNT(DISTINCT pm.company_id) as active_companies,
            COUNT(DISTINCT pm.product_id) as products_traded,
            SUM(pm.volume_liters) as total_volume
        FROM petroverse.time_dimension t
        JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id
        GROUP BY t.year, t.month
        ORDER BY t.year, t.month
        LIMIT 12
    """)
    
    print("\nRecent 12 Months Activity:")
    for row in temporal_dist:
        print(f"{row['year']}-{row['month']:02d}: "
              f"{row['record_count']:>5} records | "
              f"{row['active_companies']:>3} companies | "
              f"{row['products_traded']:>3} products | "
              f"{row['total_volume']:>15,.0f} L")
    
    # 7. DATA GAPS ANALYSIS
    print("\n7. DATA GAPS AND MISSING PERIODS")
    print("-" * 40)
    
    gaps = await conn.fetch("""
        WITH date_series AS (
            SELECT generate_series(
                (SELECT MIN(full_date) FROM petroverse.time_dimension t 
                 JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id),
                (SELECT MAX(full_date) FROM petroverse.time_dimension t 
                 JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id),
                '1 day'::interval
            )::date as expected_date
        ),
        actual_dates AS (
            SELECT DISTINCT t.full_date
            FROM petroverse.time_dimension t
            JOIN petroverse.performance_metrics pm ON t.date_id = pm.date_id
        )
        SELECT COUNT(*) as missing_days
        FROM date_series ds
        LEFT JOIN actual_dates ad ON ds.expected_date = ad.full_date
        WHERE ad.full_date IS NULL
    """)
    
    print(f"Missing Days in Date Range: {gaps[0]['missing_days']}")
    
    # 8. DATA QUALITY SCORES
    print("\n8. DATA QUALITY SCORE DISTRIBUTION")
    print("-" * 40)
    
    quality_scores = await conn.fetchrow("""
        SELECT 
            AVG(data_quality_score) as avg_score,
            MIN(data_quality_score) as min_score,
            MAX(data_quality_score) as max_score,
            COUNT(*) FILTER (WHERE data_quality_score < 0.5) as low_quality,
            COUNT(*) FILTER (WHERE data_quality_score >= 0.5 AND data_quality_score < 0.8) as medium_quality,
            COUNT(*) FILTER (WHERE data_quality_score >= 0.8) as high_quality
        FROM petroverse.performance_metrics
        WHERE data_quality_score IS NOT NULL
    """)
    
    if quality_scores['avg_score']:
        print(f"Average Quality Score: {quality_scores['avg_score']:.2f}")
        print(f"Min Score: {quality_scores['min_score']:.2f}")
        print(f"Max Score: {quality_scores['max_score']:.2f}")
        print(f"Low Quality (<0.5): {quality_scores['low_quality']:,} records")
        print(f"Medium Quality (0.5-0.8): {quality_scores['medium_quality']:,} records")
        print(f"High Quality (>=0.8): {quality_scores['high_quality']:,} records")
    else:
        print("No quality scores available")
    
    # 9. DUPLICATE DETECTION
    print("\n9. DUPLICATE DETECTION")
    print("-" * 40)
    
    duplicates = await conn.fetchrow("""
        WITH duplicate_check AS (
            SELECT 
                company_id,
                product_id,
                date_id,
                COUNT(*) as duplicate_count
            FROM petroverse.performance_metrics
            GROUP BY company_id, product_id, date_id
            HAVING COUNT(*) > 1
        )
        SELECT 
            COUNT(*) as duplicate_groups,
            SUM(duplicate_count - 1) as extra_records
        FROM duplicate_check
    """)
    
    print(f"Duplicate Groups Found: {duplicates['duplicate_groups'] or 0}")
    print(f"Extra Records (duplicates): {duplicates['extra_records'] or 0}")
    
    # 10. REFERENTIAL INTEGRITY
    print("\n10. REFERENTIAL INTEGRITY CHECK")
    print("-" * 40)
    
    orphans = await conn.fetchrow("""
        SELECT 
            (SELECT COUNT(*) FROM petroverse.performance_metrics pm
             WHERE NOT EXISTS (SELECT 1 FROM petroverse.companies c WHERE c.company_id = pm.company_id)) as orphan_companies,
            (SELECT COUNT(*) FROM petroverse.performance_metrics pm
             WHERE NOT EXISTS (SELECT 1 FROM petroverse.products p WHERE p.product_id = pm.product_id)) as orphan_products,
            (SELECT COUNT(*) FROM petroverse.performance_metrics pm
             WHERE NOT EXISTS (SELECT 1 FROM petroverse.time_dimension t WHERE t.date_id = pm.date_id)) as orphan_dates
    """)
    
    print(f"Records with invalid company_id: {orphans['orphan_companies']}")
    print(f"Records with invalid product_id: {orphans['orphan_products']}")
    print(f"Records with invalid date_id: {orphans['orphan_dates']}")
    
    # 11. TOP DATA ISSUES
    print("\n11. TOP DATA QUALITY ISSUES SUMMARY")
    print("-" * 40)
    
    issues = []
    
    if null_analysis['null_volume_liters'] > 0:
        issues.append(f"❌ {null_analysis['null_volume_liters']:,} records with NULL volume_liters")
    
    if volume_stats['zero_or_negative'] > 0:
        issues.append(f"⚠️  {volume_stats['zero_or_negative']:,} records with zero or negative volumes")
    
    if duplicates['duplicate_groups'] and duplicates['duplicate_groups'] > 0:
        issues.append(f"⚠️  {duplicates['duplicate_groups']:,} duplicate record groups detected")
    
    if orphans['orphan_companies'] > 0:
        issues.append(f"❌ {orphans['orphan_companies']:,} records with invalid company references")
    
    if gaps[0]['missing_days'] > 30:
        issues.append(f"⚠️  {gaps[0]['missing_days']} days missing in the date range")
    
    if not issues:
        issues.append("✅ No major data quality issues detected")
    
    for issue in issues:
        print(f"  {issue}")
    
    # 12. RECOMMENDATIONS
    print("\n12. RECOMMENDATIONS")
    print("-" * 40)
    
    recommendations = []
    
    if null_analysis['null_volume_liters'] > 0:
        recommendations.append("• Investigate and fill missing volume_liters values")
    
    if volume_stats['zero_or_negative'] > 0:
        recommendations.append("• Review and correct zero/negative volume entries")
    
    if duplicates['duplicate_groups'] and duplicates['duplicate_groups'] > 0:
        recommendations.append("• Remove duplicate records for the same company/product/date")
    
    if not quality_scores['avg_score']:
        recommendations.append("• Implement data quality scoring for all records")
    
    if gaps[0]['missing_days'] > 30:
        recommendations.append("• Investigate missing data for gap periods")
    
    if not recommendations:
        recommendations.append("• Continue regular data quality monitoring")
    
    for rec in recommendations:
        print(rec)
    
    print("\n" + "=" * 80)
    print("END OF DATA QUALITY REPORT")
    print("=" * 80)
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(analyze_data_quality())