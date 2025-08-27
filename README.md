# 🛢️ Petroverse Analytics Platform

A comprehensive petroleum industry analytics platform providing real-time insights, data visualization, and business intelligence for BDCs (Bulk Distribution Companies) and OMCs (Oil Marketing Companies) in Ghana.

## 🌟 Features

### 📊 Analytics Dashboards
- **Executive Dashboard** - High-level KPIs and strategic metrics
- **BDC Analytics** - Bulk distribution company performance tracking
- **OMC Analytics** - Oil marketing company operations monitoring
- **Product Analytics** - Product-wise performance and trends
- **Supply Chain** - Supply chain optimization and tracking
- **Investor Relations** - Financial metrics and investor insights

### 🔧 Core Capabilities
- **Real-time Data Processing** - Stream processing of petroleum trade data
- **Advanced Analytics** - ML-powered forecasting and anomaly detection
- **Multi-tenant Architecture** - Secure, isolated environments for different organizations
- **Interactive Visualizations** - Dynamic charts, maps, and reports
- **Data Standardization** - Automated data cleaning and normalization
- **API-First Design** - RESTful APIs for integration

## 🏗️ Architecture

```
petroverse_analytics/
├── apps/
│   └── web/                 # Next.js frontend application
├── services/
│   └── analytics/           # FastAPI backend services
├── database/               # PostgreSQL schema and migrations
├── data/                   # Data processing scripts
├── infrastructure/         # Deployment configurations
└── documentation/          # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 15+
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/victoropp/petroverse_analytics.git
cd petroverse_analytics
```

2. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Using Docker (Recommended)**
```bash
docker-compose up -d
```

4. **Manual Setup**
```bash
# Database
psql -U postgres -c "CREATE DATABASE petroverse_analytics;"
psql -U postgres -d petroverse_analytics -f database/schema.sql

# Backend API
cd services/analytics
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd apps/web
npm install
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](documentation/api/API_ENDPOINTS.md)
- [Database Schema](documentation/database/DATABASE_SCHEMA.md)
- [Frontend Guide](documentation/frontend/DASHBOARD_GUIDE.md)

## 🎯 Use Cases

- **Market Analysis** - Track market share, competitor analysis
- **Performance Monitoring** - Real-time KPIs and metrics
- **Regulatory Compliance** - Automated reporting for NPA
- **Supply Chain Optimization** - Inventory and distribution tracking
- **Financial Planning** - Revenue forecasting and budgeting

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python, SQLAlchemy
- **Database**: PostgreSQL, TimescaleDB
- **Caching**: Redis
- **Deployment**: Docker, Kubernetes
- **Monitoring**: Prometheus, Grafana

## 📊 Data Sources

- National Petroleum Authority (NPA) Ghana
- BDC/BIDEC Performance Statistics (2019-2025)
- OMC Performance Statistics (2019-2025)
- Supply chain and distribution data

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- API rate limiting
- SSL/TLS encryption

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and inquiries:
- Email: support@petroverse.com
- Issues: [GitHub Issues](https://github.com/victoropp/petroverse_analytics/issues)

## 🏆 Acknowledgments

- National Petroleum Authority (NPA) Ghana for data access
- All BDCs and OMCs for their cooperation
- Open source community for the amazing tools

---

**Petroverse Analytics** - Empowering the petroleum industry with data-driven insights 🚀