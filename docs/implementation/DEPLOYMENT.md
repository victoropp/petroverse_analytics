# Petroverse Analytics Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (for containerized deployment)
- Node.js 18+ and Python 3.10+ (for local development)
- PostgreSQL 15+ (for database)
- Git

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/victoropp/petroverse_analytics.git
cd petroverse_analytics
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Using Docker
docker-compose up postgres -d

# Or manually with PostgreSQL
psql -U postgres -c "CREATE DATABASE petroverse_analytics;"
psql -U postgres -d petroverse_analytics -f database/schema.sql
```

4. **Import initial data**
```bash
python database/setup_database.py
python data/rebuild_fact_tables.py
```

5. **Start the API service**
```bash
cd services/analytics
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

6. **Start the web application**
```bash
cd apps/web
npm install
npm run dev
```

Access the application at http://localhost:3000

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Build and start all services**
```bash
docker-compose up --build
```

2. **Run in production mode**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ☁️ Cloud Deployment Options

### AWS Deployment

1. **EC2 Instance Setup**
   - Launch Ubuntu 22.04 LTS instance (t3.large minimum)
   - Configure security groups:
     - Port 80 (HTTP)
     - Port 443 (HTTPS)
     - Port 5432 (PostgreSQL)
     - Port 8000 (API)

2. **RDS PostgreSQL Setup**
   - Create PostgreSQL 15 instance
   - Import schema: `database/schema.sql`
   - Load data using `data/rebuild_fact_tables.py`

3. **Deploy with Docker**
```bash
# SSH into EC2
ssh ubuntu@your-ec2-ip

# Clone repository
git clone https://github.com/victoropp/petroverse_analytics.git
cd petroverse_analytics

# Setup environment
cp .env.example .env
nano .env  # Update with RDS credentials

# Deploy
docker-compose up -d
```

### Google Cloud Platform

1. **Cloud SQL PostgreSQL**
   - Create PostgreSQL instance
   - Import database schema

2. **Cloud Run Deployment**
```bash
# Build and push images
gcloud builds submit --tag gcr.io/PROJECT-ID/petroverse-api ./services/analytics
gcloud builds submit --tag gcr.io/PROJECT-ID/petroverse-web ./apps/web

# Deploy services
gcloud run deploy petroverse-api --image gcr.io/PROJECT-ID/petroverse-api
gcloud run deploy petroverse-web --image gcr.io/PROJECT-ID/petroverse-web
```

### Azure Deployment

1. **Azure Database for PostgreSQL**
   - Create PostgreSQL server
   - Import schema and data

2. **Azure Container Instances**
```bash
# Create resource group
az group create --name petroverse-rg --location eastus

# Deploy containers
az container create --resource-group petroverse-rg \
  --name petroverse-platform \
  --image victoropp/petroverse:latest \
  --dns-name-label petroverse \
  --ports 80
```

### Vercel Deployment (Frontend only)

1. **Deploy Next.js app**
```bash
cd apps/web
vercel --prod
```

2. **Set environment variables in Vercel dashboard**
   - NEXT_PUBLIC_API_URL
   - Other required variables

## 📊 Database Management

### Initial Data Import

```bash
# Import cleaned data
python data/scripts/import_final_bdc_omc_data.py

# Rebuild fact tables
python data/rebuild_fact_tables.py

# Verify data integrity
psql -U postgres -d petroverse_analytics -c "SELECT COUNT(*) FROM petroverse.fact_bdc_transactions;"
```

### Backup & Restore

```bash
# Backup
pg_dump -U postgres -d petroverse_analytics > backup.sql

# Restore
psql -U postgres -d petroverse_analytics < backup.sql
```

## 🔧 Configuration

### Environment Variables

Required environment variables (see `.env.example`):

- **Database**: DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD
- **API**: API_PORT, API_HOST, CORS_ORIGINS
- **Frontend**: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_NAME
- **Auth**: JWT_SECRET, JWT_EXPIRATION

### NGINX Configuration (Production)

Create `/infrastructure/nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
    }
}
```

## 📈 Monitoring & Logging

### Health Checks

- API Health: `http://your-domain/api/health`
- Database Status: `http://your-domain/api/status`

### Logs

- API logs: `logs/api.log`
- Web logs: Check container logs or `/logs` directory

### Performance Monitoring

Configure Sentry by setting `SENTRY_DSN` in environment variables.

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check network connectivity

2. **CORS Issues**
   - Update CORS_ORIGINS in .env
   - Restart API service

3. **Data Not Loading**
   - Verify fact tables are populated
   - Check API endpoints in browser console
   - Ensure database migrations are run

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export API_ENV=development
```

## 📦 Production Checklist

- [ ] Environment variables configured
- [ ] Database schema created and data imported
- [ ] SSL certificates configured
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security groups/firewall rules set
- [ ] Domain name configured
- [ ] CDN setup (optional)
- [ ] Auto-scaling configured (optional)

## 🔒 Security Considerations

1. **Use strong passwords** for database and JWT secret
2. **Enable SSL/TLS** for production
3. **Restrict database access** to application servers only
4. **Regular security updates** for dependencies
5. **Implement rate limiting** on API endpoints
6. **Use environment-specific configurations**

## 📞 Support

For deployment issues, check:
- Documentation: `/documentation` folder
- GitHub Issues: https://github.com/victoropp/petroverse_analytics/issues

## 🎯 Next Steps After Deployment

1. Verify all dashboards load correctly
2. Test API endpoints
3. Check data accuracy in reports
4. Set up automated backups
5. Configure monitoring alerts
6. Document any custom configurations