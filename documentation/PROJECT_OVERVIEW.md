# PetroVerse Analytics Platform - Project Documentation

## Overview
PetroVerse Analytics is a comprehensive data analytics platform for Ghana's petroleum industry, processing and analyzing data from Bulk Distribution Companies (BDC) and Oil Marketing Companies (OMC). The platform provides real-time dashboards, executive summaries, and detailed performance analytics.

## Project Structure
```
petroverse_analytics/
├── apps/web/                     # Next.js Frontend Dashboard
├── services/analytics/           # FastAPI Backend Services
├── data/                        # Data Processing & Storage
│   ├── raw/Raw_Organised/       # Clean source Excel files
│   ├── scripts/                 # Data processing scripts
│   ├── final/                   # Final processed datasets
│   ├── processed/               # Intermediate processing files
│   └── archive/                 # Historical/backup data files
├── documentation/               # Project Documentation
│   ├── database/               # Database schema & setup docs
│   ├── api/                    # API endpoint documentation
│   ├── frontend/               # Dashboard user guides
│   ├── data_processing/        # Data workflow documentation
│   └── mappings/               # Product & company mappings
├── logs/                       # Application logs
├── backups/                    # Database backups
└── config/                     # Configuration files
```

## Key Components

### 1. Data Processing Pipeline
- **Source Data**: Excel files from BDC and OMC companies (2019-2025)
- **Extraction**: Automated scripts to extract data from varying Excel formats
- **Standardization**: Product and company name standardization with user-reviewed mappings
- **Conversion**: Volume conversions from Liters/KG to Metric Tons (MT)
- **Validation**: Data quality checks and outlier detection

### 2. Database Architecture
- **PostgreSQL Database**: `petroverse_analytics` on port 5432
- **Schema**: `petroverse` with fact/dimension tables
- **Companies**: 319 total (62 BDC + 257 OMC)
- **Products**: 9 standardized categories from 60+ original products
- **Transactions**: 32,789 total records (8,475 BDC + 24,314 OMC)
- **Volume**: ~57 million MT total processed

### 3. API Services
- **FastAPI Backend**: Port 8003
- **Endpoints**: Executive summary, BDC/OMC analytics, filters
- **Real-time Data**: Live database connections
- **Authentication**: Ready for future implementation

### 4. Frontend Dashboard
- **Next.js Application**: Port 3001
- **Responsive Design**: Mobile and desktop optimized
- **Real-time Charts**: Interactive data visualizations
- **Multi-dashboard**: Executive, BDC Comprehensive, OMC Comprehensive

## Data Categories

### Product Categories (9 Standardized)
1. **Gasoline** - Premium and regular gasoline products
2. **Gasoil** - Diesel, automotive gas oil, marine gasoil variants
3. **LPG** - Liquefied petroleum gas products
4. **Heavy Fuel Oil** - HFO, RFO, industrial fuel oils
5. **Aviation & Kerosene** - ATK, kerosene products
6. **Naphtha** - Chemical feedstock
7. **Lubricants** - Engine and industrial lubricants
8. **Premix** - Fishing industry fuel
9. **Other Petroleum Products** - Miscellaneous products

### Company Types
- **BDC (Bulk Distribution Companies)**: 62 companies handling bulk petroleum imports and distribution
- **OMC (Oil Marketing Companies)**: 257 companies handling retail and commercial petroleum sales

## Key Features

### Executive Dashboard
- Total industry overview with KPIs
- Company performance rankings
- Product category analysis
- Seasonal trends and patterns
- Market concentration metrics (HHI)

### BDC Comprehensive Analytics
- Import volume tracking by company
- Product mix analysis
- Time series performance
- Top performer identification
- Seasonal patterns analysis

### OMC Comprehensive Analytics
- Retail sales performance
- Geographic distribution analysis
- Product category preferences
- Company ranking and market share
- Growth trend analysis

## Technical Specifications

### Backend (FastAPI)
- **Language**: Python 3.9+
- **Framework**: FastAPI with SQLAlchemy ORM
- **Database**: PostgreSQL with connection pooling
- **API Version**: v2 with comprehensive endpoints
- **Data Processing**: Pandas for analytics, NumPy for calculations

### Frontend (Next.js)
- **Language**: TypeScript
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Charts**: Chart.js/React-Chartjs-2
- **State Management**: React hooks
- **Icons**: Lucide React

### Database (PostgreSQL)
- **Version**: PostgreSQL 17
- **Port**: 5432
- **Schema**: Normalized fact/dimension model
- **Performance**: Indexed for analytics queries
- **Backup**: Automated backup procedures

## Deployment Information

### Development Environment
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8003
- **Database**: localhost:5432/petroverse_analytics
- **Hot Reload**: Both frontend and backend support live reload

### Production Considerations
- Environment-specific configuration
- SSL/TLS encryption
- Authentication and authorization
- Rate limiting and monitoring
- Automated backup procedures
- Scalability planning

## Data Quality & Integrity

### Validation Measures
- **Source Data Verification**: Excel file structure validation
- **Volume Conversion Accuracy**: Proper application of conversion factors
- **Company Standardization**: User-reviewed mappings for consistency
- **Product Categorization**: Standardized product classifications
- **Outlier Detection**: Statistical analysis for data quality
- **Cross-validation**: BDC vs OMC data consistency checks

### Key Metrics Tracked
- **Data Coverage**: 7 years of historical data (2019-2025)
- **Completeness**: >99% data extraction success rate
- **Accuracy**: User-verified standardization mappings
- **Timeliness**: Real-time dashboard updates
- **Consistency**: Standardized units and categories

## Future Enhancements

### Short-term
- User authentication and role-based access
- Export functionality for reports
- Email alerts for significant changes
- Mobile app development

### Long-term
- Machine learning for demand forecasting
- Advanced analytics and predictive modeling
- Integration with external data sources
- Multi-language support
- API rate limiting and monitoring

## Support & Maintenance

### Data Updates
- New monthly data can be added via Excel file processing
- Automated validation and integration workflows
- Historical data preservation and versioning

### System Monitoring
- Application logs in `/logs` directory
- Database performance monitoring
- API endpoint health checks
- Dashboard usage analytics

### Backup & Recovery
- Daily database backups in `/backups` directory
- Configuration file versioning
- Data processing script versioning
- Complete system restore procedures

## Contact & Documentation
- **Project Location**: `C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics`
- **Documentation**: Comprehensive guides in `/documentation` folder
- **Data Mappings**: Excel files in `/documentation/mappings`
- **Processing Scripts**: Well-documented Python scripts in `/data/scripts`

---
*Last Updated: August 27, 2025*
*Version: 1.0*