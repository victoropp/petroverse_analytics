"""
Database setup script for PetroVerse 2.0
Creates multi-tenant schema and migrates existing data
"""
import asyncio
import asyncpg
import sys
from pathlib import Path

async def setup_database():
    """Setup the multi-tenant database"""
    
    # Database connection
    conn = await asyncpg.connect(
        'postgresql://postgres:postgres123@localhost:5432/petroverse_analytics'
    )
    
    try:
        print(">>> Setting up PetroVerse 2.0 Multi-Tenant Database...")
        
        # Read and execute schema
        schema_file = Path(__file__).parent / 'schema.sql'
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        # Execute schema creation
        await conn.execute(schema_sql)
        print("[OK] Multi-tenant schema created successfully")
        
        # Assign existing data to demo tenant
        print(">>> Migrating existing data to demo tenant...")
        
        # Get demo tenant ID
        demo_tenant = await conn.fetchrow(
            "SELECT tenant_id FROM petroverse_core.tenants WHERE company_code = 'DEMO'"
        )
        
        if demo_tenant:
            # Update existing performance_metrics with demo tenant
            await conn.execute("""
                UPDATE petroverse.performance_metrics 
                SET tenant_id = $1 
                WHERE tenant_id IS NULL
            """, demo_tenant['tenant_id'])
            
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM petroverse.performance_metrics WHERE tenant_id = $1",
                demo_tenant['tenant_id']
            )
            
            print(f"[OK] Migrated {count} records to demo tenant")
        
        # Create demo users
        print(">>> Creating demo users...")
        
        demo_users = [
            ('admin@demo.com', 'Admin User', 'tenant_admin'),
            ('analyst@demo.com', 'Data Analyst', 'analyst'),
            ('viewer@demo.com', 'Report Viewer', 'viewer')
        ]
        
        for email, name, role in demo_users:
            first_name, last_name = name.split(' ')
            
            await conn.execute("""
                INSERT INTO petroverse_core.users 
                (tenant_id, email, username, password_hash, role, first_name, last_name, email_verified)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                ON CONFLICT (tenant_id, email) DO NOTHING
            """, demo_tenant['tenant_id'], email, email.split('@')[0], 
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY.hsluBsBiFzGy',  # password: demo123
                role, first_name, last_name)
        
        print("[OK] Demo users created")
        
        # Create sample dashboards
        print(">>> Creating sample dashboards...")
        
        await conn.execute("""
            INSERT INTO petroverse_core.dashboards 
            (tenant_id, name, description, type, layout, widgets, is_default)
            VALUES 
            ($1, 'Executive Overview', 'High-level KPIs and metrics', 'executive', 
             '{"cols": 12, "rows": 10}', 
             '[{"id": "kpi", "type": "kpi", "position": {"x": 0, "y": 0, "w": 12, "h": 2}}]',
             true),
            ($1, 'Operations Monitor', 'Real-time operations tracking', 'operations',
             '{"cols": 12, "rows": 10}',
             '[{"id": "map", "type": "map", "position": {"x": 0, "y": 0, "w": 8, "h": 6}}]',
             false),
            ($1, 'Analytics Deep Dive', 'Advanced analytical views', 'analytics',
             '{"cols": 12, "rows": 10}',
             '[{"id": "chart", "type": "line", "position": {"x": 0, "y": 0, "w": 6, "h": 4}}]',
             false)
        """, demo_tenant['tenant_id'])
        
        print("[OK] Sample dashboards created")
        
        # Display summary
        print("\n" + "="*50)
        print(">>> Database setup completed successfully!")
        print("="*50)
        
        # Display access credentials
        print("\n>>> Demo Access Credentials:")
        print("-"*30)
        print("Admin Login:")
        print("  Email: admin@demo.com")
        print("  Password: demo123")
        print("\nAPI Key for Demo Tenant:")
        
        api_key = await conn.fetchval(
            "SELECT api_key FROM petroverse_core.tenants WHERE company_code = 'DEMO'"
        )
        print(f"  {api_key}")
        
        print("\n>>> Access the platform at:")
        print("  Frontend: http://localhost:3000")
        print("  API: http://localhost:8000")
        print("  API Docs: http://localhost:8000/docs")
        
    except Exception as e:
        print(f"[ERROR] Error setting up database: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_database())