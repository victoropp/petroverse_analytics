-- PetroVerse 2.0 Multi-Tenant Database Schema
-- PostgreSQL with Row-Level Security (RLS)

-- Create core schema for multi-tenancy
CREATE SCHEMA IF NOT EXISTS petroverse_core;

-- UUID extension for secure IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise', 'custom');
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'analyst', 'viewer', 'api_user');

-- Tenants table (companies using the platform)
CREATE TABLE petroverse_core.tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
    api_key UUID DEFAULT uuid_generate_v4() UNIQUE,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    
    -- Subscription details
    subscription_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP,
    
    -- Usage limits based on tier
    max_users INTEGER DEFAULT 1,
    max_api_calls_per_day INTEGER DEFAULT 1000,
    storage_limit_gb INTEGER DEFAULT 10,
    
    -- Features (JSONB for flexibility)
    features JSONB DEFAULT '{}',
    custom_branding JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Users table (users within each tenant)
CREATE TABLE petroverse_core.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    
    -- Authentication
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    dashboard_layout JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(tenant_id, email)
);

-- API Keys table (for programmatic access)
CREATE TABLE petroverse_core.api_keys (
    key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes TEXT[] DEFAULT '{}',
    rate_limit INTEGER DEFAULT 1000,
    
    -- Usage tracking
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    
    -- Metadata
    created_by UUID REFERENCES petroverse_core.users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES petroverse_core.users(user_id)
);

-- Audit Log table
CREATE TABLE petroverse_core.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES petroverse_core.users(user_id),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE petroverse_core.usage_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    
    -- Usage details
    metric_date DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    data_points_processed BIGINT DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    
    -- Billing
    billable_amount DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, metric_date)
);

-- Saved dashboards table
CREATE TABLE petroverse_core.dashboards (
    dashboard_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    
    -- Dashboard details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'executive', 'operations', 'analytics', 'custom'
    
    -- Configuration
    layout JSONB NOT NULL,
    widgets JSONB NOT NULL,
    filters JSONB DEFAULT '{}',
    refresh_interval INTEGER DEFAULT 30000,
    
    -- Sharing
    is_public BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    shared_with UUID[] DEFAULT '{}', -- Array of user_ids
    
    -- Metadata
    created_by UUID REFERENCES petroverse_core.users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Reports table
CREATE TABLE petroverse_core.reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    
    -- Report details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'scheduled', 'ad-hoc', 'template'
    
    -- Configuration
    query JSONB NOT NULL,
    parameters JSONB DEFAULT '{}',
    format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'json'
    
    -- Schedule (if applicable)
    schedule_cron VARCHAR(100),
    next_run_at TIMESTAMP,
    last_run_at TIMESTAMP,
    
    -- Distribution
    recipients TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES petroverse_core.users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Notifications table
CREATE TABLE petroverse_core.notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES petroverse_core.tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES petroverse_core.users(user_id),
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- 'alert', 'info', 'warning', 'error'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Action
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Add tenant_id to existing performance_metrics table
ALTER TABLE petroverse.performance_metrics 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES petroverse_core.tenants(tenant_id);

-- Enable Row Level Security
ALTER TABLE petroverse.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE petroverse_core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE petroverse_core.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE petroverse_core.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE petroverse_core.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Performance metrics: Users can only see their tenant's data
CREATE POLICY tenant_isolation_performance ON petroverse.performance_metrics
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Users: Can only see users in their tenant
CREATE POLICY tenant_isolation_users ON petroverse_core.users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Dashboards: Can only see their tenant's dashboards
CREATE POLICY tenant_isolation_dashboards ON petroverse_core.dashboards
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Create indexes for performance
CREATE INDEX idx_tenants_api_key ON petroverse_core.tenants(api_key);
CREATE INDEX idx_tenants_active ON petroverse_core.tenants(is_active);
CREATE INDEX idx_users_tenant_email ON petroverse_core.users(tenant_id, email);
CREATE INDEX idx_users_tenant_active ON petroverse_core.users(tenant_id, is_active);
CREATE INDEX idx_audit_logs_tenant_date ON petroverse_core.audit_logs(tenant_id, created_at);
CREATE INDEX idx_usage_metrics_tenant_date ON petroverse_core.usage_metrics(tenant_id, metric_date);
CREATE INDEX idx_performance_metrics_tenant ON petroverse.performance_metrics(tenant_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON petroverse_core.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON petroverse_core.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON petroverse_core.dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample tenants for testing
INSERT INTO petroverse_core.tenants (company_name, company_code, subscription_tier, features) VALUES
('Demo Company', 'DEMO', 'enterprise', '{"all_features": true}'),
('Test BDC Ltd', 'TEST_BDC', 'professional', '{"advanced_analytics": true}'),
('Sample OMC Corp', 'SAMPLE_OMC', 'starter', '{"basic_analytics": true}');

-- Grant permissions
GRANT USAGE ON SCHEMA petroverse_core TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA petroverse_core TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA petroverse_core TO postgres;