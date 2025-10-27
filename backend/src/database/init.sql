-- Digital Sponsor Database Initialization
-- AA Traditions Compliant Schema Design

-- Create database if it doesn't exist (run manually if needed)
-- CREATE DATABASE digital_sponsor_dev;

-- Connect to the database
\c digital_sponsor_dev;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Anonymous Sessions Table (Tradition 12: Anonymity)
CREATE TABLE IF NOT EXISTS anonymous_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    preferences JSONB DEFAULT '{}',
    anonymous BOOLEAN DEFAULT TRUE,
    -- No personal data fields per AA Tradition 12
    INDEX (session_id),
    INDEX (expires_at)
);

-- Literature Sources (AA-approved only per Tradition 6)
CREATE TABLE IF NOT EXISTS literature_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'big_book', 'twelve_and_twelve', etc.
    author VARCHAR(200) DEFAULT 'AA World Services',
    published_date DATE,
    copyright_notice TEXT,
    aa_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX (category),
    INDEX (aa_approved)
);

-- Literature Content (chunked for RAG)
CREATE TABLE IF NOT EXISTS literature_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES literature_sources(id) ON DELETE CASCADE,
    section_title VARCHAR(500),
    content_text TEXT NOT NULL,
    page_number INTEGER,
    chapter_number INTEGER,
    chunk_index INTEGER DEFAULT 0,
    word_count INTEGER,
    embedding_id VARCHAR(255), -- Reference to Chroma vector ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX (source_id),
    INDEX (embedding_id),
    INDEX (page_number),
    INDEX (chapter_number)
);

-- Anonymous Usage Analytics (no personal data)
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id_hash VARCHAR(64), -- Hashed for privacy
    event_type VARCHAR(100) NOT NULL, -- 'chat', 'search', 'literature_access'
    resource_category VARCHAR(100),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- No IP addresses or personal identifiers per AA Tradition 12
    INDEX (event_type),
    INDEX (created_at),
    INDEX (resource_category)
);

-- Crisis Support Access Log (for monitoring service availability)
CREATE TABLE IF NOT EXISTS crisis_support_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id_hash VARCHAR(64), -- Hashed for privacy
    resource_accessed VARCHAR(100), -- '988_lifeline', 'crisis_text', etc.
    access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    anonymous BOOLEAN DEFAULT TRUE,
    INDEX (access_timestamp),
    INDEX (resource_accessed)
);

-- Chat Conversations (anonymous, no storage of personal content)
CREATE TABLE IF NOT EXISTS chat_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id_hash VARCHAR(64), -- Hashed for privacy
    query_category VARCHAR(100), -- General category only
    response_sources TEXT[], -- Literature sources referenced
    response_confidence DECIMAL(3,2),
    processing_time_ms INTEGER,
    aa_compliant BOOLEAN DEFAULT TRUE,
    anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- No actual conversation content stored per privacy
    INDEX (session_id_hash),
    INDEX (created_at),
    INDEX (query_category)
);

-- System Health Monitoring
CREATE TABLE IF NOT EXISTS system_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(100) NOT NULL, -- 'api', 'database', 'redis', 'chroma'
    status VARCHAR(50) NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX (component),
    INDEX (status),
    INDEX (timestamp)
);

-- Insert initial AA literature sources
INSERT INTO literature_sources (title, category, author, published_date, copyright_notice) VALUES
('Alcoholics Anonymous (Big Book)', 'big_book', 'Bill W. and AA Members', '1939-04-10', 'Copyright © AA World Services, Inc.'),
('Twelve Steps and Twelve Traditions', 'twelve_and_twelve', 'Bill W.', '1953-04-01', 'Copyright © AA World Services, Inc.'),
('Daily Reflections', 'daily_reflections', 'AA World Services', '1990-01-01', 'Copyright © AA World Services, Inc.'),
('As Bill Sees It', 'as_bill_sees_it', 'Bill W.', '1967-01-01', 'Copyright © AA World Services, Inc.'),
('AA Comes of Age', 'historical', 'Bill W.', '1957-01-01', 'Copyright © AA World Services, Inc.')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_literature_content_search ON literature_content USING gin(to_tsvector('english', content_text));
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON anonymous_sessions (expires_at) WHERE expires_at < CURRENT_TIMESTAMP;

-- Create a view for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    session_id,
    created_at,
    last_accessed_at,
    preferences,
    anonymous
FROM anonymous_sessions
WHERE expires_at > CURRENT_TIMESTAMP;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM anonymous_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup for monitoring
    INSERT INTO system_health_logs (component, status, metadata)
    VALUES ('session_cleanup', 'completed', jsonb_build_object('deleted_sessions', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- AA Traditions compliance notes:
-- 1. No personal identifiable information stored anywhere
-- 2. Session IDs are temporary and automatically expire
-- 3. Only AA-approved literature is stored
-- 4. All access is anonymous and privacy-preserving
-- 5. Crisis support access is logged for service monitoring only
-- 6. No cross-session correlation or user tracking

COMMENT ON TABLE anonymous_sessions IS 'AA Tradition 12: Anonymous sessions only, no personal data';
COMMENT ON TABLE literature_sources IS 'AA Tradition 6: Only AA-approved literature sources';
COMMENT ON TABLE usage_analytics IS 'Anonymous usage patterns for service improvement only';
COMMENT ON TABLE crisis_support_access IS 'Crisis support monitoring for service availability';
COMMENT ON TABLE chat_interactions IS 'Anonymous chat metrics, no personal content stored';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO digital_sponsor;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO digital_sponsor;