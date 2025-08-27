# PetroVerse Analytics Platform - Complete Documentation

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Quick Start Guide](#quick-start-guide)
- [System Architecture](#system-architecture)
- [Documentation Structure](#documentation-structure)
- [Development Environment](#development-environment)
- [Production Deployment](#production-deployment)
- [Maintenance and Updates](#maintenance-and-updates)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🚀 Project Overview

PetroVerse Analytics is a comprehensive data analytics platform for Ghana's petroleum industry, providing real-time dashboards and insights for Bulk Distribution Companies (BDC) and Oil Marketing Companies (OMC). The platform processes and analyzes over 32,000 transactions from 319 companies, handling approximately 57 million metric tons of petroleum products.

### Key Features
- **Real-time Dashboards**: Executive, BDC, and OMC analytics dashboards
- **Comprehensive Data Processing**: Automated extraction from Excel files with standardization
- **Advanced Analytics**: Market concentration, seasonal analysis, and predictive modeling
- **RESTful API**: FastAPI backend with comprehensive endpoints
- **Modern Frontend**: Next.js 14 with TypeScript and responsive design
- **Data Integrity**: Quality scoring, outlier detection, and validation workflows

### Industry Impact
- **Companies Analyzed**: 319 (62 BDC + 257 OMC)
- **Products Tracked**: 9 standardized categories from 60+ original products
- **Volume Processed**: ~57 million metric tons
- **Time Coverage**: 7 years of historical data (2019-2025)
- **Geographic Scope**: Nationwide Ghana petroleum industry

## 🏁 Quick Start Guide

### Prerequisites
- **PostgreSQL 17** (running on port 5432)
- **Node.js 18+** with npm
- **Python 3.9+** with pip
- **Git** for version control

### 1-Minute Setup
```bash
# 1. Clone and navigate to project
cd C:\Users\victo\Documents\Data_Science_Projects\petroverse_analytics

# 2. Start database (if not running)
# PostgreSQL should be running on port 5432

# 3. Start API server (Terminal 1)
cd services/analytics
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload

# 4. Start frontend (Terminal 2)
cd apps/web
npm install
npm run dev

# 5. Access dashboards
# Frontend: http://localhost:3001
# API: http://localhost:8003
# Health Check: http://localhost:8003/health
```

### Verify Installation
1. **Database**: Check http://localhost:8003/api/v2/test/data
2. **Frontend**: Visit http://localhost:3001/dashboard/executive
3. **API Health**: Check http://localhost:8003/health

Expected data summary:
- BDC Records: 8,475
- OMC Records: 24,314
- Companies: 319
- Products: 9

## 🏗️ System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Excel Files       │    │   Data Processing   │    │   PostgreSQL        │
│   (Raw Data)        │───▶│   Python Scripts    │───▶│   Database          │
│   2019-2025         │    │   Standardization   │    │   Fact/Dimension    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                                                    │
                                                                    ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Next.js Frontend  │    │   FastAPI Backend   │    │   Analytics Engine  │
│   Dashboard UI      │◀───│   RESTful API       │◀───│   Real-time Queries │
│   localhost:3001    │    │   localhost:8003    │    │   Caching Layer     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Core Components
1. **Data Layer**: PostgreSQL with fact/dimension tables
2. **Processing Layer**: Python scripts for ETL operations
3. **API Layer**: FastAPI with async PostgreSQL connections
4. **Presentation Layer**: Next.js with TypeScript and Tailwind CSS
5. **Analytics Layer**: Real-time calculations and visualizations

## 📚 Documentation Structure

### Complete Documentation Suite
```
documentation/
├── README.md                       # This file - complete project guide
├── PROJECT_OVERVIEW.md             # High-level project description
├── database/
│   ├── DATABASE_SCHEMA.md          # Complete database schema documentation
│   └── SETUP_PROCEDURES.md         # Database setup and configuration
├── data_processing/
│   ├── PROCESSING_WORKFLOWS.md     # Data processing pipeline documentation
│   └── SCRIPT_REFERENCE.md         # Detailed script usage reference
├── api/
│   └── API_ENDPOINTS.md            # Complete API endpoint documentation
├── frontend/
│   └── DASHBOARD_GUIDE.md          # Dashboard user guide and features
└── mappings/
    ├── BDC_STANDARDIZATION_MAPPINGS_FOR_REVIEW.xlsx
    └── OMC_STANDARDIZATION_MAPPINGS_DETAILED_20250827_104624.xlsx
```

### Key Documentation Files

#### 1. [DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md)
Complete database documentation including:
- Table schemas and relationships
- Data types and constraints  
- Volume conversion logic
- Index strategy and performance optimization
- Backup and recovery procedures

#### 2. [PROCESSING_WORKFLOWS.md](data_processing/PROCESSING_WORKFLOWS.md)
Comprehensive data processing documentation:
- BDC and OMC extraction workflows
- Standardization and mapping procedures
- Quality control and validation
- Error handling and recovery
- Volume conversion specifications

#### 3. [SCRIPT_REFERENCE.md](data_processing/SCRIPT_REFERENCE.md)
Detailed script documentation:
- Purpose and parameters for each script
- Usage examples and error handling
- Input/output specifications
- Performance considerations
- Troubleshooting guides

#### 4. [API_ENDPOINTS.md](api/API_ENDPOINTS.md)
Complete API reference:
- All 15+ endpoints with examples
- Authentication and authorization
- Request/response schemas
- Error handling and status codes
- Performance and caching details

#### 5. [DASHBOARD_GUIDE.md](frontend/DASHBOARD_GUIDE.md)
User-friendly dashboard documentation:
- Dashboard navigation and features
- Chart types and visualizations
- Filtering and customization
- Mobile responsiveness
- Accessibility features

## 💻 Development Environment

### Directory Structure
```
petroverse_analytics/
├── apps/web/                       # Next.js frontend application
│   ├── src/app/dashboard/          # Dashboard pages
│   ├── components/                 # Reusable React components
│   └── public/                     # Static assets
├── services/analytics/             # FastAPI backend service
│   ├── main.py                     # Main API application
│   ├── bdc_analytics.py           # BDC-specific analytics
│   ├── omc_analytics.py           # OMC-specific analytics
│   └── requirements.txt           # Python dependencies
├── data/                          # Data processing and storage
│   ├── raw/Raw_Organised/         # Clean source Excel files
│   ├── scripts/                   # Data processing scripts
│   ├── final/                     # Final processed datasets
│   ├── processed/                 # Intermediate files
│   └── archive/                   # Historical/backup files
├── documentation/                 # Complete project documentation
├── logs/                         # Application logs
├── backups/                      # Database backups
└── config/                       # Configuration files
```

### Technology Stack Details

#### Backend (Python/FastAPI)
```python
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
asyncpg==0.29.0
pandas==2.1.3
sqlalchemy==2.0.23
pydantic==2.5.0
numpy==1.25.2
python-dotenv==1.0.0
openpyxl==3.1.2
```

#### Frontend (Node.js/Next.js)
```json
// package.json dependencies
"next": "14.0.3",
"react": "18.2.0",
"typescript": "5.3.2",
"tailwindcss": "3.3.6",
"chart.js": "4.4.0",
"react-chartjs-2": "5.2.0",
"lucide-react": "0.294.0"
```

#### Database (PostgreSQL)
- **Version**: PostgreSQL 17
- **Schema**: petroverse 
- **Tables**: 8 main tables (4 dimension, 4 fact/raw)
- **Indexes**: 12+ optimized indexes for analytics
- **Size**: ~500MB with full dataset

### Development Workflow

#### 1. Data Processing Cycle
```bash
# Extract new data
cd data/scripts
python extract_cleaned_bdc.py    # Process BDC Excel files
python extract_cleaned_omc.py    # Process OMC Excel files

# Apply standardization
python final_bdc_extraction.py   # Apply BDC mappings
python apply_omc_updates_robust.py  # Apply OMC mappings

# Update database
python replace_database_with_final_bdc.py  # Load BDC data
python update_omc_data_only.py             # Load OMC data
```

#### 2. API Development
```bash
# Start development server
cd services/analytics
uvicorn main:app --host 0.0.0.0 --port 8003 --reload

# Test endpoints
curl http://localhost:8003/health
curl http://localhost:8003/api/v2/executive/summary
```

#### 3. Frontend Development
```bash
# Start development server
cd apps/web
npm run dev

# Build for production
npm run build
npm run start
```

### Code Quality Standards

#### Python Code Style
- **PEP 8** compliance
- **Type hints** for all functions
- **Docstrings** for classes and methods
- **Error handling** with try/catch blocks
- **Logging** for debugging and monitoring

#### TypeScript Code Style  
- **Strict TypeScript** configuration
- **Interface definitions** for all data structures
- **React hooks** pattern for state management
- **Tailwind CSS** for consistent styling
- **ESLint** and **Prettier** for code formatting

## 🚀 Production Deployment

### Environment Configuration

#### Production Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/petroverse_analytics
DB_HOST=production-host
DB_PORT=5432

# API Configuration
API_PORT=8003
WEB_PORT=3001
ENVIRONMENT=production

# Security
JWT_SECRET_KEY=your-production-secret-key
CORS_ORIGINS=["https://your-domain.com"]

# Performance
REDIS_URL=redis://redis-host:6379
CACHE_TTL=300
```

#### Docker Deployment
```dockerfile
# Dockerfile for API service
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]

# Dockerfile for frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  database:
    image: postgres:17
    environment:
      POSTGRES_DB: petroverse_analytics
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./services/analytics
    ports:
      - "8003:8003"
    depends_on:
      - database
    environment:
      DATABASE_URL: postgresql://postgres:your_password@database:5432/petroverse_analytics

  frontend:
    build: ./apps/web
    ports:
      - "3001:3001"
    depends_on:
      - api

volumes:
  postgres_data:
```

### Performance Optimization

#### Database Optimization
- **Connection Pooling**: 5-20 connections
- **Query Caching**: Redis caching layer
- **Index Strategy**: Optimized for analytics queries
- **Partitioning**: Time-based table partitioning for large datasets

#### API Performance
- **Response Caching**: 5-minute cache for expensive queries
- **Async Processing**: Non-blocking database operations
- **Query Optimization**: Prepared statements and efficient joins
- **Rate Limiting**: 100 requests/minute in production

#### Frontend Performance
- **Component Memoization**: React.memo for expensive components
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js built-in image optimization
- **CDN Integration**: Static asset delivery via CDN

## 🔧 Maintenance and Updates

### Regular Maintenance Tasks

#### Weekly Tasks
- **Database Backup**: Automated full database backup
- **Log Rotation**: Clear old application logs
- **Performance Monitoring**: Check query performance metrics
- **Data Validation**: Verify data integrity and quality scores

#### Monthly Tasks
- **Data Updates**: Process new monthly Excel files
- **System Updates**: Update dependencies and security patches
- **Performance Review**: Analyze dashboard usage and optimize
- **Backup Verification**: Test database restore procedures

#### Quarterly Tasks
- **Comprehensive Review**: Full system performance analysis
- **Documentation Updates**: Update documentation for changes
- **User Training**: Train new users on dashboard features
- **Capacity Planning**: Plan for growth and scaling needs

### Update Procedures

#### Data Updates
```bash
# 1. Backup current database
pg_dump -U postgres -d petroverse_analytics -f backup_$(date +%Y%m%d).sql

# 2. Process new Excel files
cd data/scripts
python extract_cleaned_bdc.py    # New BDC files
python extract_cleaned_omc.py    # New OMC files

# 3. Apply standardization (user review required)
python final_bdc_extraction.py
python apply_omc_updates_robust.py

# 4. Update database
python update_database_incremental.py

# 5. Verify data integrity
python verify_database_integrity.py
```

#### System Updates
```bash
# Update Python dependencies
cd services/analytics
pip install -r requirements.txt --upgrade

# Update Node.js dependencies
cd apps/web
npm update

# Test all functionality
npm run test
python -m pytest tests/
```

### Monitoring and Alerts

#### Key Metrics to Monitor
- **API Response Times**: < 500ms for executive summary
- **Database Performance**: Query execution times
- **Memory Usage**: Backend service memory consumption
- **Error Rates**: 4xx/5xx error frequency
- **Data Freshness**: Last successful data update

#### Alert Configuration
- **Database Downtime**: Immediate alert
- **API Errors**: > 5% error rate
- **Performance Degradation**: > 2s response times
- **Data Issues**: Quality scores < 0.8
- **Disk Space**: > 80% usage

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues
**Symptoms**: API health check fails, connection errors
**Solutions**:
- Verify PostgreSQL service status
- Check connection string format
- Validate credentials and permissions
- Test network connectivity

#### 2. Data Processing Failures
**Symptoms**: Script errors, incomplete data extraction
**Solutions**:
- Check Excel file formats and locations
- Verify conversion factor files exist
- Review data quality logs
- Check for permissions issues

#### 3. Dashboard Display Issues
**Symptoms**: Charts not rendering, blank pages
**Solutions**:
- Verify API endpoints are responding
- Check browser console for errors
- Validate data format compatibility
- Clear browser cache and cookies

#### 4. Performance Problems
**Symptoms**: Slow loading times, timeouts
**Solutions**:
- Check database query performance
- Review API caching configuration
- Monitor memory usage and CPU
- Optimize database indexes

### Debug Mode
```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=DEBUG

# Start services with debug info
uvicorn main:app --reload --log-level debug
npm run dev  # Next.js already includes detailed error info
```

### Log Analysis
```bash
# Check API logs
tail -f logs/api_YYYYMMDD.log

# Check data processing logs  
tail -f logs/data_processing_YYYYMMDD.log

# Database query logs (PostgreSQL)
tail -f /var/log/postgresql/postgresql-17-main.log
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Set up local development environment
3. Create feature branch
4. Implement changes with tests
5. Submit pull request with documentation

### Code Standards
- Follow existing code style
- Add comprehensive documentation
- Include error handling
- Write unit tests for new features
- Update API documentation

### Testing Requirements
- **Unit Tests**: For data processing functions
- **Integration Tests**: For API endpoints
- **E2E Tests**: For critical dashboard workflows
- **Performance Tests**: For high-volume operations

---

## 📞 Support and Contact

### Technical Support
- **Documentation**: Complete guides in `/documentation` folder
- **API Reference**: http://localhost:8003/docs (when running)
- **Database Schema**: Detailed in DATABASE_SCHEMA.md
- **Processing Workflows**: Comprehensive guide in PROCESSING_WORKFLOWS.md

### Project Information
- **Created**: August 2025
- **Version**: 1.0
- **Platform**: Ghana Petroleum Industry Analytics
- **Technologies**: Python, TypeScript, PostgreSQL, Next.js, FastAPI
- **Scale**: 319 companies, 32K+ transactions, 57M+ MT volume

---

*This documentation represents a complete reference for the PetroVerse Analytics Platform. For specific implementation details, refer to the individual documentation files in each subdirectory.*

**Last Updated**: August 27, 2025  
**Documentation Version**: 1.0  
**Project Status**: Production Ready