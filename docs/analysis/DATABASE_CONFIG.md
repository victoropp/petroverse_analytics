# PostgreSQL Database Configuration

## Database Connection Details

The PetroVerse Analytics platform uses PostgreSQL as its primary database. The database **MUST** always run on port **5432**.

### Connection Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Host** | `localhost` | Database host (use `postgres` in Docker) |
| **Port** | `5432` | **FIXED PORT - DO NOT CHANGE** |
| **Database** | `petroverse_analytics` | Main database name |
| **Username** | `postgres` | Default PostgreSQL user |
| **Password** | `postgres123` | Default password (change in production) |

### Connection String

```
postgresql://postgres:postgres123@localhost:5432/petroverse_analytics
```

## Port 5432 Configuration

### Why Port 5432?

- **5432** is the standard PostgreSQL port
- All project configurations are hardcoded to use this port
- Changing this port will break the application

### Configuration Files Using Port 5432

1. **config.env** (line 14):
   ```env
   DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/petroverse_analytics
   ```

2. **docker-compose.yml** (line 12):
   ```yaml
   ports:
     - "${DATABASE_PORT}:5432"
   ```
   Note: The `DATABASE_PORT` environment variable should always be set to 5432.

3. **services/analytics/config.py** (line 33):
   ```python
   DATABASE_URL: str = os.getenv(
       "DATABASE_URL", 
       "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics"
   )
   ```

## Starting PostgreSQL

### Local Development (Windows)

Using the installed PostgreSQL 17:

```bash
# Start PostgreSQL service
"C:\Program Files\PostgreSQL\17\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\17\data"

# Verify it's running on port 5432
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "SELECT version();"

# Connect to the database
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -d petroverse_analytics
```

### Using Docker

```bash
# Start with docker-compose
docker-compose up -d postgres

# Or run standalone
docker run -d \
  --name petroverse_db \
  -e POSTGRES_DB=petroverse_analytics \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  postgres:15-alpine
```

## Database Schema

The database contains the following main schemas:

- **petroverse**: Main schema containing all analytics tables
  - `companies`: Company dimension table
  - `products`: Product dimension table  
  - `time_dimension`: Time dimension table
  - `fact_bdc_transactions`: BDC fact table
  - `fact_omc_transactions`: OMC fact table
  - `bdc_data`: Raw BDC data
  - `omc_data`: Raw OMC data
  - `supply_data`: Supply data

## Environment Variables

Always ensure these environment variables are set:

```env
# In .env or config.env file
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/petroverse_analytics
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=petroverse_analytics
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123
```

## Troubleshooting

### Port Already in Use

If port 5432 is already in use:

1. Check what's using it:
   ```bash
   netstat -an | findstr :5432
   ```

2. Stop any existing PostgreSQL service:
   ```bash
   "C:\Program Files\PostgreSQL\17\bin\pg_ctl" stop -D "C:\Program Files\PostgreSQL\17\data"
   ```

3. In Windows Services, ensure PostgreSQL service is stopped

### Connection Refused

If you get connection refused errors:

1. Ensure PostgreSQL is running on port 5432
2. Check firewall settings
3. Verify the postgresql.conf file has:
   ```
   listen_addresses = '*'
   port = 5432
   ```

### Application Connection Issues

If the application can't connect:

1. Verify DATABASE_URL in config.env
2. Ensure port 5432 is specified in all connection strings
3. Check that PostgreSQL is accepting connections on port 5432

## Important Notes

⚠️ **NEVER CHANGE THE PORT FROM 5432** - The entire application stack is configured to use this port.

✅ **Always verify** PostgreSQL is running on port 5432 before starting the application.

📝 **Document any changes** to database configuration in this file.

## Quick Commands

```bash
# Check if PostgreSQL is running on port 5432
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "\l"

# View current connections
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -d petroverse_analytics -c "SELECT * FROM pg_stat_activity;"

# Check database size
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -d petroverse_analytics -c "SELECT pg_database_size('petroverse_analytics')/1024/1024 as size_mb;"
```