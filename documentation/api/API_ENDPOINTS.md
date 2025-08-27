# API Endpoints Documentation

## Overview
The PetroVerse Analytics API is built with FastAPI and provides comprehensive endpoints for accessing petroleum industry data. The API serves real-time analytics, executive summaries, and detailed performance metrics for both BDC and OMC companies.

## Base Configuration
- **API Version**: v2.0.0
- **Base URL**: `http://localhost:8003`
- **API Prefix**: `/api/v2`
- **Framework**: FastAPI with AsyncPG
- **Database**: PostgreSQL (petroverse_analytics)
- **Cache**: Redis (optional)
- **Authentication**: JWT Bearer Tokens

## Authentication

### JWT Token Authentication
Most endpoints require JWT authentication. The API uses bearer token authentication.

```http
Authorization: Bearer <jwt_token>
```

### Demo Authentication
For development purposes, a demo account is available:
- **Email**: admin@demo.com
- **Password**: demo123

### Login Endpoint
```http
POST /api/v2/auth/login
```

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "demo123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": "uuid-string",
    "email": "admin@demo.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "administrator",
    "tenant_id": "uuid-string",
    "company_name": "Demo Company"
  }
}
```

## Core System Endpoints

### Health and Status

#### GET `/`
**Purpose**: Basic health check and service information
**Authentication**: None
**Response:**
```json
{
  "status": "operational",
  "service": "PetroVerse Analytics API",
  "version": "2.0.0",
  "timestamp": "2025-08-27T10:30:00.000Z",
  "database": "connected",
  "cache": "connected"
}
```

#### GET `/health`
**Purpose**: Service health verification
**Authentication**: None
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-27T10:30:00.000Z",
  "environment": "development"
}
```

#### GET `/api/v2/test/data`
**Purpose**: Test database connectivity and data availability
**Authentication**: None
**Response:**
```json
{
  "status": "success",
  "data_summary": {
    "bdc_records": 8475,
    "omc_records": 24314,
    "companies": 319,
    "products": 9,
    "time_periods": 84
  },
  "samples": {
    "bdc_sample": {
      "company_name": "BLUE OCEAN GROUP",
      "product": "Gasoline",
      "volume_liters": 125000.0
    },
    "omc_sample": {
      "company_name": "SHELL GHANA",
      "product": "Gasoil",
      "volume_liters": 89000.0
    }
  }
}
```

## Executive Dashboard Endpoints

### GET `/api/v2/executive/summary`
**Purpose**: High-level executive KPIs and metrics
**Authentication**: None (development only)
**Parameters**: None

**Response Structure:**
```json
{
  "kpis": {
    "total_companies": 319,
    "total_products": 9,
    "total_volume_liters": 750000000.0,
    "total_volume_mt": 57000000.0,
    "total_volume_kg": 57000000000.0,
    "total_transactions": 32789,
    "bdc_volume_liters": 250000000.0,
    "omc_volume_liters": 500000000.0,
    "bdc_volume_mt": 18500000.0,
    "omc_volume_mt": 38500000.0,
    "bdc_companies": 62,
    "omc_companies": 257
  },
  "trend_data": [
    {
      "period": "2024-01",
      "bdc_volume_liters": 21000000.0,
      "omc_volume_liters": 42000000.0,
      "bdc_volume_mt": 1550000.0,
      "omc_volume_mt": 3200000.0,
      "total_volume_liters": 63000000.0,
      "total_volume_mt": 4750000.0
    }
  ]
}
```

### GET `/api/v2/executive/summary/filtered`
**Purpose**: Filtered executive summary with industry analytics
**Authentication**: None (development only)

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD format
- `end_date` (optional): YYYY-MM-DD format
- `company_ids` (optional): Comma-separated company IDs
- `product_ids` (optional): Comma-separated product IDs
- `business_types` (optional): Comma-separated (BDC,OMC)
- `top_n` (optional): Number of top results (default: 10)

**Example Request:**
```http
GET /api/v2/executive/summary/filtered?start_date=2024-01-01&end_date=2024-12-31&business_types=BDC,OMC&top_n=5
```

**Response Structure:**
```json
{
  "kpis": {
    "total_companies": 150,
    "total_volume_mt": 25000000.0,
    "bdc_volume_mt": 8000000.0,
    "omc_volume_mt": 17000000.0,
    "bdc_market_share": 32.0,
    "bdc_to_omc_ratio": 0.47,
    "avg_bdc_company_volume": 129032.26,
    "avg_omc_company_volume": 66275.23
  },
  "industry_trends": [
    {
      "period": "2024-01",
      "bdc_volume_liters": 18500000.0,
      "omc_volume_liters": 38200000.0,
      "bdc_share_percentage": 32.6,
      "total_volume": 56700000.0
    }
  ],
  "filters_applied": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "business_types": ["BDC", "OMC"],
    "industry_view": true
  }
}
```

## BDC Analytics Endpoints

### GET `/api/v2/bdc/performance`
**Purpose**: BDC performance analytics and metrics
**Authentication**: None (development only)

**Response Structure:**
```json
{
  "top_companies": [
    {
      "company_name": "BLUE OCEAN GROUP",
      "total_volume_liters": 15000000.0,
      "total_volume_mt": 1135000.0,
      "total_volume_kg": 1135000000.0,
      "transaction_count": 124,
      "market_share_percent": 12.5
    }
  ],
  "product_mix": [
    {
      "product_name": "Gasoline",
      "product_category": "Gasoline",
      "total_volume_liters": 85000000.0,
      "total_volume_mt": 6420000.0,
      "transaction_count": 856
    }
  ],
  "monthly_trend": [
    {
      "period": "2024-01",
      "volume_liters": 21000000.0,
      "volume_mt": 1587000.0,
      "transactions": 284
    }
  ]
}
```

### GET `/api/v2/bdc/comprehensive`
**Purpose**: Comprehensive BDC analytics with financial insights
**Authentication**: None (development only)

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD  
- `company_ids` (optional): Comma-separated company IDs
- `product_ids` (optional): Comma-separated product IDs
- `top_n` (optional): Number of top results (default: 10)

**Response Structure:**
```json
{
  "kpis": {
    "total_companies": 62,
    "total_volume_mt": 18500000.0,
    "total_transactions": 8475,
    "avg_volume_per_company": 298387.10,
    "market_concentration_hhi": 1250.5,
    "seasonal_volatility": 15.2
  },
  "top_companies": [
    {
      "company_name": "BLUE OCEAN GROUP",
      "volume_mt": 2150000.0,
      "market_share": 11.62,
      "transaction_count": 156,
      "avg_volume_per_transaction": 13782.05,
      "growth_rate": 8.5,
      "consistency_score": 0.89
    }
  ],
  "product_performance": [
    {
      "product_name": "Gasoline",
      "volume_mt": 6420000.0,
      "percentage": 34.7,
      "companies_count": 45,
      "avg_price_per_mt": 850.0
    }
  ],
  "seasonal_analysis": {
    "peak_month": 7,
    "trough_month": 2,
    "seasonal_amplitude": 22.5,
    "avg_monthly_volatility": 12.8
  },
  "market_insights": {
    "herfindahl_index": 1250.5,
    "market_concentration": "Moderate",
    "top_5_market_share": 58.3,
    "market_leader": "BLUE OCEAN GROUP",
    "emerging_companies": ["NEW ENERGY LTD", "PETRO DYNAMICS"]
  }
}
```

## OMC Analytics Endpoints

### GET `/api/v2/omc/performance`
**Purpose**: OMC performance analytics and metrics
**Authentication**: None (development only)

**Response Structure:**
```json
{
  "top_companies": [
    {
      "company_name": "SHELL GHANA",
      "total_volume_liters": 25000000.0,
      "total_volume_mt": 1890000.0,
      "transaction_count": 245,
      "market_share_percent": 8.2
    }
  ],
  "product_mix": [
    {
      "product_name": "Gasoil",
      "product_category": "Gasoil",
      "total_volume_liters": 145000000.0,
      "total_volume_mt": 12185000.0,
      "transaction_count": 2156
    }
  ],
  "monthly_trend": [
    {
      "period": "2024-01",
      "volume_liters": 42000000.0,
      "volume_mt": 3200000.0,
      "transactions": 2089
    }
  ]
}
```

### GET `/api/v2/omc/comprehensive`
**Purpose**: Comprehensive OMC analytics with detailed insights
**Authentication**: None (development only)

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `company_ids` (optional): Comma-separated company IDs
- `product_ids` (optional): Comma-separated product IDs
- `top_n` (optional): Number of top results (default: 10)

**Response Structure:**
```json
{
  "kpis": {
    "total_companies": 257,
    "total_volume_mt": 38500000.0,
    "total_transactions": 24314,
    "avg_volume_per_company": 149805.45,
    "market_concentration_hhi": 850.2,
    "regional_diversity": 12
  },
  "top_companies": [
    {
      "company_name": "SHELL GHANA",
      "volume_mt": 2890000.0,
      "market_share": 7.51,
      "stations_count": 85,
      "regional_presence": 8,
      "growth_rate": 5.2
    }
  ],
  "regional_analysis": [
    {
      "region": "Greater Accra",
      "volume_mt": 12500000.0,
      "companies_count": 89,
      "market_share": 32.5
    }
  ],
  "station_metrics": {
    "total_stations": 3580,
    "avg_volume_per_station": 10754.19,
    "high_performing_stations": 356,
    "stations_growth_rate": 3.2
  }
}
```

## Product Analytics Endpoints

### GET `/api/v2/products/analysis`
**Purpose**: Comprehensive product performance analysis
**Authentication**: None (development only)

**Response Structure:**
```json
{
  "product_performance": [
    {
      "product_name": "Gasoline",
      "product_category": "Gasoline",
      "total_volume_liters": 195000000.0,
      "total_volume_mt": 14725000.0,
      "total_transactions": 5680,
      "bdc_volume_mt": 6420000.0,
      "omc_volume_mt": 8305000.0,
      "market_share_percent": 25.8
    }
  ],
  "product_trends": [
    {
      "product_name": "Gasoline",
      "period": "2024-01",
      "volume_liters": 16500000.0,
      "volume_mt": 1246000.0
    }
  ]
}
```

## Filter and Configuration Endpoints

### GET `/api/v2/filters`
**Purpose**: Get available filter options for dashboards
**Authentication**: None (development only)

**Response Structure:**
```json
{
  "companies": [
    {
      "id": 1001,
      "name": "BLUE OCEAN GROUP",
      "type": "BDC"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Gasoline",
      "category": "Gasoline"
    }
  ],
  "date_range": {
    "min_date": "2019-01-01",
    "max_date": "2025-12-01"
  }
}
```

### GET `/api/v2/dashboard/config/{dashboard_type}`
**Purpose**: Get dashboard-specific configuration
**Authentication**: Required

**Path Parameters:**
- `dashboard_type`: main | bdc | omc | executive

**Response Structure:**
```json
{
  "title": "BDC Dashboard",
  "charts": [
    "performance_trend",
    "product_distribution", 
    "company_rankings",
    "efficiency_metrics"
  ],
  "kpis": [
    "total_bdcs",
    "total_volume",
    "avg_performance",
    "top_performer"
  ],
  "refresh_rate": 30000
}
```

## Analytics Query Endpoints

### POST `/api/v2/analytics/query`
**Purpose**: Execute custom analytics queries
**Authentication**: Required

**Request Body:**
```json
{
  "metrics": [
    "volume_liters",
    "company_performance",
    "product_distribution",
    "time_series"
  ],
  "filters": {
    "company_type": "BDC",
    "product_category": "Gasoline"
  },
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "aggregation": "monthly"
}
```

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "company_count": 45,
    "product_count": 6,
    "total_volume": 125000000.0,
    "avg_volume": 2777777.78,
    "transaction_count": 3450,
    "time_series": [
      {
        "month": "Jan",
        "volume_liters": 10500000.0
      }
    ],
    "company_rankings": [
      {
        "rank": 1,
        "name": "BLUE OCEAN GROUP",
        "volume": 8500000.0,
        "market_share": 12.5
      }
    ]
  }
}
```

### POST `/api/v2/analytics/predict`
**Purpose**: Generate demand predictions based on historical data
**Authentication**: Required

**Request Body:**
```json
{
  "product": "Gasoline",
  "horizon_days": 30,
  "confidence_level": 0.95
}
```

**Response Structure:**
```json
{
  "product": "Gasoline",
  "predictions": [
    {
      "date": "2025-08-28",
      "predicted_volume": 1250000.0,
      "confidence_lower": 1100000.0,
      "confidence_upper": 1400000.0
    }
  ],
  "model_confidence": 0.85,
  "factors_considered": [
    "historical_trend",
    "seasonality", 
    "polynomial_regression"
  ],
  "historical_data_points": 84
}
```

## WebSocket Endpoints

### WS `/ws/analytics/{tenant_id}`
**Purpose**: Real-time analytics updates via WebSocket
**Authentication**: Required (via query parameter or header)

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8003/ws/analytics/tenant-uuid');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

**Message Format:**
```json
{
  "type": "update",
  "data": {
    "recent_transactions": 156,
    "recent_volume": 2500000.0,
    "timestamp": "2025-08-27T10:30:00.000Z"
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error description",
  "status_code": 400,
  "timestamp": "2025-08-27T10:30:00.000Z"
}
```

### Common HTTP Status Codes
- **200**: Success
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **422**: Validation Error (invalid request body)
- **500**: Internal Server Error

### Authentication Errors
```json
{
  "detail": "Token has expired",
  "status_code": 401
}
```

```json
{
  "detail": "Invalid credentials",
  "status_code": 401
}
```

## Rate Limiting

### Development Environment
- No rate limiting in development
- Authentication bypassed for most endpoints

### Production Environment
- **Rate Limit**: 100 requests per minute per IP
- **Burst Limit**: 20 requests per 10 seconds
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## CORS Configuration

### Development
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: *
Access-Control-Allow-Credentials: true
```

### Production
```http
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

## Performance and Caching

### Redis Caching
- **Executive Summary**: Cached for 5 minutes
- **Filter Options**: Cached for 1 hour  
- **Analytics Queries**: Cached for 5 minutes
- **Dashboard Config**: Cached for 1 hour

### Database Optimization
- Connection pooling (5-20 connections)
- Query timeout: 60 seconds
- Prepared statements for frequent queries
- Indexed columns for analytics queries

### Response Times
- **Health Checks**: < 100ms
- **Executive Summary**: < 500ms
- **Comprehensive Analytics**: < 2 seconds
- **Complex Filtered Queries**: < 5 seconds

---
*Last Updated: August 27, 2025*
*API Documentation Version: 2.0*