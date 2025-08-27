import asyncpg
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime

async def get_product_dependency_risk(
    conn: asyncpg.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fixed product dependency and risk analysis
    """
    
    # Build date filter
    date_filter = ""
    params = []
    param_count = 0
    
    if start_date:
        param_count += 1
        date_filter += f" AND t.full_date >= ${param_count}"
        params.append(datetime.strptime(start_date, '%Y-%m-%d').date() if isinstance(start_date, str) else start_date)
    
    if end_date:
        param_count += 1
        date_filter += f" AND t.full_date <= ${param_count}"
        params.append(datetime.strptime(end_date, '%Y-%m-%d').date() if isinstance(end_date, str) else end_date)
    
    # Simplified query to avoid window function issues
    query = f"""
    SELECT 
        p.product_name,
        p.product_category,
        COUNT(DISTINCT c.company_id) as supplier_count,
        SUM(COALESCE(fb.volume_mt, 0) + COALESCE(fo.volume_mt, 0)) as total_volume,
        COUNT(*) as supplier_relationships
    FROM petroverse.products p
    LEFT JOIN petroverse.fact_bdc_transactions fb ON p.product_id = fb.product_id
    LEFT JOIN petroverse.fact_omc_transactions fo ON p.product_id = fo.product_id
    LEFT JOIN petroverse.companies c ON COALESCE(fb.company_id, fo.company_id) = c.company_id
    LEFT JOIN petroverse.time_dimension t ON COALESCE(fb.date_id, fo.date_id) = t.date_id
    WHERE c.company_id IS NOT NULL {date_filter}
    GROUP BY p.product_id, p.product_name, p.product_category
    HAVING SUM(COALESCE(fb.volume_mt, 0) + COALESCE(fo.volume_mt, 0)) > 0
    ORDER BY total_volume DESC
    """
    
    results = await conn.fetch(query, *params)
    
    # Calculate statistical quartiles for risk assessment in Python
    supplier_counts = [row['supplier_count'] for row in results if row['supplier_count']]
    
    if supplier_counts:
        q1_suppliers = np.percentile(supplier_counts, 25)
        q2_suppliers = np.percentile(supplier_counts, 50)  
        q3_suppliers = np.percentile(supplier_counts, 75)
    else:
        q1_suppliers = q2_suppliers = q3_suppliers = 1
    
    # Process results with statistical risk assessment
    risk_analysis = []
    for row in results:
        supplier_count = row['supplier_count']
        total_volume = float(row['total_volume'] or 0)
        
        # Risk assessment based on statistical quartiles
        if supplier_count <= q1_suppliers:
            dependency_risk = 'Critical'
        elif supplier_count <= q2_suppliers:
            dependency_risk = 'High'
        elif supplier_count <= q3_suppliers:
            dependency_risk = 'Medium'
        else:
            dependency_risk = 'Low'
        
        # Simplified diversification index based on supplier count
        # Higher supplier count = higher diversification
        max_suppliers = max(supplier_counts) if supplier_counts else 1
        diversification_index = (supplier_count / max_suppliers) * 100
        
        risk_analysis.append({
            'product_name': row['product_name'],
            'product_category': row['product_category'],
            'supplier_count': supplier_count,
            'total_volume': total_volume,
            'dependency_risk': dependency_risk,
            'diversification_index': round(diversification_index, 2),
            'risk_score': round(100 - diversification_index, 2)
        })
    
    # Calculate KPIs
    kpis = {
        'product_diversification_index': {
            'overall': float(np.mean([d['diversification_index'] for d in risk_analysis])) if risk_analysis else 0,
            'best_product': max(risk_analysis, key=lambda x: x['diversification_index'])['product_name'] if risk_analysis else None,
            'worst_product': min(risk_analysis, key=lambda x: x['diversification_index'])['product_name'] if risk_analysis else None
        },
        'risk_concentration_score': {
            'critical_products': len([d for d in risk_analysis if d['dependency_risk'] == 'Critical']),
            'high_risk_products': len([d for d in risk_analysis if d['dependency_risk'] == 'High']),
            'overall_risk': float(np.mean([d['risk_score'] for d in risk_analysis])) if risk_analysis else 0
        }
    }
    
    return {
        'risk_analysis': risk_analysis,
        'kpis': kpis,
        'summary': {
            'total_products': len(risk_analysis),
            'avg_suppliers_per_product': float(np.mean([d['supplier_count'] for d in risk_analysis])) if risk_analysis else 0,
            'products_at_risk': len([d for d in risk_analysis if d['dependency_risk'] in ['Critical', 'High']])
        }
    }