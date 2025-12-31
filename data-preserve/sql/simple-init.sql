-- Simple Digital Sponsor Database Initialization
-- AA Traditions Compliant Schema Design

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
    anonymous BOOLEAN DEFAULT TRUE
);

-- Literature Sources (AA-approved only per Tradition 6)
CREATE TABLE IF NOT EXISTS literature_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    author VARCHAR(200) DEFAULT 'AA World Services',
    published_date DATE,
    copyright_notice TEXT,
    aa_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    embedding_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON anonymous_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON anonymous_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_literature_category ON literature_sources (category);
CREATE INDEX IF NOT EXISTS idx_content_source ON literature_content (source_id);

-- Insert initial AA literature sources
INSERT INTO literature_sources (title, category, author, published_date, copyright_notice) VALUES
('Alcoholics Anonymous (Big Book)', 'big_book', 'Bill W. and AA Members', '1939-04-10', 'Copyright © AA World Services, Inc.'),
('Twelve Steps and Twelve Traditions', 'twelve_and_twelve', 'Bill W.', '1953-04-01', 'Copyright © AA World Services, Inc.'),
('Daily Reflections', 'daily_reflections', 'AA World Services', '1990-01-01', 'Copyright © AA World Services, Inc.')
ON CONFLICT DO NOTHING;