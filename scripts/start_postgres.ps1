# PowerShell script to start PostgreSQL on port 5432
# Run this script with: .\start_postgres.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting PostgreSQL on Port 5432" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$pgData = "C:\Program Files\PostgreSQL\17\data"
$port = 5432

# Function to check if port is in use
function Test-Port {
    param($port)
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# Function to test PostgreSQL connection
function Test-PostgreSQL {
    $result = & "$pgBin\psql" -U postgres -p $port -c "SELECT version();" -d postgres 2>&1
    return $LASTEXITCODE -eq 0
}

# Check if PostgreSQL is already running
if (Test-Port -port $port) {
    Write-Host "Port $port is already in use" -ForegroundColor Yellow
    Write-Host "Checking if it's PostgreSQL..." -ForegroundColor Yellow
    
    if (Test-PostgreSQL) {
        Write-Host "✓ PostgreSQL is running correctly on port $port" -ForegroundColor Green
        Write-Host ""
        
        # Check database exists
        Write-Host "Checking petroverse_analytics database..." -ForegroundColor Cyan
        & "$pgBin\psql" -U postgres -p $port -c "\l petroverse_analytics" -d postgres
        
        # Show some statistics
        Write-Host ""
        Write-Host "Database Statistics:" -ForegroundColor Cyan
        & "$pgBin\psql" -U postgres -p $port -d petroverse_analytics -c "
            SELECT 
                'Total Tables' as metric,
                COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_schema = 'petroverse'
            UNION ALL
            SELECT 
                'BDC Records',
                COUNT(*)
            FROM petroverse.fact_bdc_transactions
            UNION ALL
            SELECT 
                'OMC Records',
                COUNT(*)
            FROM petroverse.fact_omc_transactions;"
    }
    else {
        Write-Host "✗ Port $port is in use but PostgreSQL is not responding" -ForegroundColor Red
        Write-Host "Please check what's using port $port and stop it" -ForegroundColor Red
        
        # Show what's using the port
        Write-Host ""
        Write-Host "Process using port $port:" -ForegroundColor Yellow
        Get-NetTCPConnection -LocalPort $port | Select-Object -Property State, OwningProcess | Format-Table
    }
}
else {
    Write-Host "PostgreSQL is not running on port $port" -ForegroundColor Yellow
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Green
    Write-Host ""
    
    # Start PostgreSQL
    $process = Start-Process -FilePath "$pgBin\pg_ctl" -ArgumentList "start", "-D", $pgData, "-l", "$pgData\logfile" -PassThru -NoNewWindow -Wait
    
    # Wait for PostgreSQL to fully start
    Write-Host "Waiting for PostgreSQL to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Verify it started correctly
    if (Test-PostgreSQL) {
        Write-Host "✓ PostgreSQL started successfully on port $port" -ForegroundColor Green
        Write-Host ""
        
        # Check database exists
        Write-Host "Checking petroverse_analytics database..." -ForegroundColor Cyan
        & "$pgBin\psql" -U postgres -p $port -c "\l petroverse_analytics" -d postgres
        
        # Create database if it doesn't exist
        $dbExists = & "$pgBin\psql" -U postgres -p $port -c "SELECT 1 FROM pg_database WHERE datname='petroverse_analytics';" -t -A -d postgres
        if (-not $dbExists) {
            Write-Host ""
            Write-Host "Database 'petroverse_analytics' not found. Creating it..." -ForegroundColor Yellow
            & "$pgBin\psql" -U postgres -p $port -c "CREATE DATABASE petroverse_analytics;" -d postgres
            Write-Host "✓ Database created successfully" -ForegroundColor Green
        }
    }
    else {
        Write-Host "✗ Failed to start PostgreSQL" -ForegroundColor Red
        Write-Host "Please check the log file at:" -ForegroundColor Red
        Write-Host "$pgData\logfile" -ForegroundColor Yellow
        
        # Try to show last few lines of log
        if (Test-Path "$pgData\logfile") {
            Write-Host ""
            Write-Host "Last 10 lines of log file:" -ForegroundColor Yellow
            Get-Content "$pgData\logfile" -Tail 10
        }
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Status Check Complete" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database URL: " -NoNewline
Write-Host "postgresql://postgres:postgres123@localhost:5432/petroverse_analytics" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")