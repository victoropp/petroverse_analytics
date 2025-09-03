@echo off
echo ====================================
echo Starting PostgreSQL on Port 5432
echo ====================================
echo.

REM Check if PostgreSQL is already running on port 5432
netstat -an | findstr :5432 >nul
if %errorlevel% == 0 (
    echo PostgreSQL appears to be already running on port 5432
    echo.
    echo Verifying connection...
    "C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "SELECT version();" -d postgres
    if %errorlevel% == 0 (
        echo.
        echo ✓ PostgreSQL is running correctly on port 5432
        echo.
        echo Checking petroverse_analytics database...
        "C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "\l petroverse_analytics" -d postgres
        echo.
    ) else (
        echo.
        echo ✗ Port 5432 is in use but PostgreSQL is not responding
        echo Please check what's using port 5432 and stop it
        echo.
    )
) else (
    echo PostgreSQL is not running on port 5432
    echo Starting PostgreSQL service...
    echo.
    
    REM Start PostgreSQL
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\17\data" -l "C:\Program Files\PostgreSQL\17\data\logfile"
    
    REM Wait for PostgreSQL to start
    timeout /t 3 >nul
    
    REM Verify it started correctly
    "C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "SELECT version();" -d postgres
    if %errorlevel% == 0 (
        echo.
        echo ✓ PostgreSQL started successfully on port 5432
        echo.
        echo Checking petroverse_analytics database...
        "C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -p 5432 -c "\l petroverse_analytics" -d postgres
        echo.
    ) else (
        echo.
        echo ✗ Failed to start PostgreSQL
        echo Please check the log file at:
        echo C:\Program Files\PostgreSQL\17\data\logfile
        echo.
    )
)

echo ====================================
echo PostgreSQL Status Check Complete
echo ====================================
echo.
echo Database URL: postgresql://postgres:postgres123@localhost:5432/petroverse_analytics
echo.
pause