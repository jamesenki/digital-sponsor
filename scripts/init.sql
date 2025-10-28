-- Digital Sponsor Database Initialization Script

-- Create development database if it doesn't exist
CREATE DATABASE digital_sponsor_dev;

-- Create test database if it doesn't exist  
CREATE DATABASE digital_sponsor_test;

-- Create user and grant permissions
CREATE USER digital_sponsor WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE digital_sponsor_dev TO digital_sponsor;
GRANT ALL PRIVILEGES ON DATABASE digital_sponsor_test TO digital_sponsor;

-- Connect to development database
\c digital_sponsor_dev;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Grant schema permissions
GRANT ALL ON SCHEMA app TO digital_sponsor;
GRANT ALL ON SCHEMA auth TO digital_sponsor;
GRANT ALL ON SCHEMA analytics TO digital_sponsor;

-- Basic tables for session management
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON auth.sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth.sessions(expires_at);

-- Anonymous analytics table (no PII)
CREATE TABLE IF NOT EXISTS analytics.usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    user_agent_hash VARCHAR(64), -- hashed for privacy
    ip_hash VARCHAR(64), -- hashed for privacy  
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_usage_stats_event_type ON analytics.usage_stats(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON analytics.usage_stats(created_at);

-- Literature metadata table
CREATE TABLE IF NOT EXISTS app.literature_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL, -- 'big_book', 'twelve_and_twelve', etc.
    version VARCHAR(50),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Insert default literature sources
INSERT INTO app.literature_sources (source_name, source_type, version, metadata) VALUES
('Alcoholics Anonymous (Big Book)', 'big_book', '4th_edition', '{"pages": 575, "chapters": 11}'),
('Twelve Steps and Twelve Traditions', 'twelve_and_twelve', 'current', '{"pages": 192, "sections": 24}'),
('Daily Reflections', 'daily_reflections', 'current', '{"pages": 384, "entries": 366}')
ON CONFLICT DO NOTHING;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION auth.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth.sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining privacy approach
COMMENT ON TABLE auth.sessions IS 'Anonymous sessions with automatic expiration for privacy compliance';
COMMENT ON TABLE analytics.usage_stats IS 'Anonymous usage analytics - no PII collected, IPs hashed';
COMMENT ON FUNCTION auth.cleanup_expired_sessions IS 'Automatically removes expired sessions for privacy compliance';