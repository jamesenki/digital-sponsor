-- Digital Sponsor Database Setup
-- AA Literature RAG System Schema

-- Create database (run this as postgres superuser first)
-- CREATE DATABASE digital_sponsor_dev;
-- CREATE USER digital_sponsor WITH PASSWORD 'password';
-- GRANT ALL PRIVILEGES ON DATABASE digital_sponsor_dev TO digital_sponsor;

-- Connect to digital_sponsor_dev database and run the rest:

-- Enable full text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Literature sources table (Big Book, 12x12, etc.)
CREATE TABLE IF NOT EXISTS literature_sources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publication_date DATE,
    isbn VARCHAR(20),
    aa_approved BOOLEAN DEFAULT true,
    copyright_notice TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'big_book', 'twelve_twelve', 'pamphlet', etc.
    edition VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Literature content chunks (for vector search)
CREATE TABLE IF NOT EXISTS literature_content (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES literature_sources(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    page_number INTEGER,
    section_title VARCHAR(500),
    content_text TEXT NOT NULL,
    content_type VARCHAR(50), -- 'chapter', 'step', 'tradition', 'story', 'prayer'
    keywords TEXT[], -- Array of keywords for search
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create full text search index
CREATE INDEX IF NOT EXISTS literature_content_fts_idx 
ON literature_content USING gin(to_tsvector('english', content_text));

-- Create trigram index for fuzzy search
CREATE INDEX IF NOT EXISTS literature_content_trigram_idx 
ON literature_content USING gin(content_text gin_trgm_ops);

-- Keywords index
CREATE INDEX IF NOT EXISTS literature_content_keywords_idx 
ON literature_content USING gin(keywords);

-- Source type index
CREATE INDEX IF NOT EXISTS literature_sources_type_idx 
ON literature_sources(source_type, aa_approved);

-- User sessions table (anonymous tracking)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    anonymous_id VARCHAR(100), -- Browser fingerprint, no personal data
    compliance_acknowledged BOOLEAN DEFAULT false
);

-- Chat interactions log (anonymous)
CREATE TABLE IF NOT EXISTS chat_interactions (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    query_text TEXT NOT NULL,
    response_type VARCHAR(50), -- 'literature_based', 'general_guidance', 'crisis_referral'
    sources_count INTEGER DEFAULT 0,
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions to digital_sponsor user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO digital_sponsor;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO digital_sponsor;

-- Insert some initial sample data
INSERT INTO literature_sources (title, author, publication_date, copyright_notice, source_type, edition) VALUES
('Alcoholics Anonymous (The Big Book)', 'Bill W. and Dr. Bob', '1939-04-10', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'big_book', '4th Edition'),
('Twelve Steps and Twelve Traditions', 'Bill W.', '1953-04-01', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'twelve_twelve', '1st Edition'),
('Living Sober', 'A.A. World Services', '1975-01-01', '© A.A. World Services, Inc. Used for educational purposes under fair use.', 'pamphlet', '1st Edition')
ON CONFLICT DO NOTHING;

-- Insert sample Big Book content (Step 1 excerpt)
INSERT INTO literature_content (source_id, chapter_number, page_number, section_title, content_text, content_type, keywords) VALUES
(1, 1, 30, 'We admitted we were powerless over alcohol', 
'We admitted we were powerless over alcohol—that our lives had become unmanageable. This is the first step in recovery. It requires complete honesty about our condition and our inability to control our drinking through willpower alone. Many of us fought this idea, but eventually came to understand that admitting powerlessness was actually the beginning of strength.',
'step', 
ARRAY['powerless', 'unmanageable', 'first step', 'honesty', 'willpower', 'strength']),

(1, 5, 83, 'How It Works', 
'Here are the steps we took, which are suggested as a program of recovery: 1. We admitted we were powerless over alcohol—that our lives had become unmanageable. 2. Came to believe that a Power greater than ourselves could restore us to sanity. 3. Made a decision to turn our will and our lives over to the care of God as we understood Him.',
'steps', 
ARRAY['twelve steps', 'recovery', 'program', 'higher power', 'God', 'will']),

(2, 1, 15, 'Step One Discussion', 
'Step One: We admitted we were powerless over alcohol—that our lives had become unmanageable. This step deals with the admission of personal powerlessness over alcohol. For the alcoholic, this admission is the beginning of liberation from the bondage of an obsession that has made life progressively unmanageable.',
'step', 
ARRAY['step one', 'powerlessness', 'liberation', 'obsession', 'unmanageable']),

(1, 11, 164, 'A Vision for You', 
'We realize we know only a little. God will constantly disclose more to you and to us. Ask Him in your morning meditation what you can do each day for the man who is still sick. The answers will come, if your own house is in order. But obviously you cannot transmit something you haven't got.',
'spiritual', 
ARRAY['God', 'meditation', 'service', 'spiritual', 'helping others'])

ON CONFLICT DO NOTHING;

-- Update statistics
ANALYZE literature_sources;
ANALYZE literature_content;

-- Show summary
SELECT 
    'Database setup complete!' as message,
    (SELECT COUNT(*) FROM literature_sources) as total_sources,
    (SELECT COUNT(*) FROM literature_content) as total_content_chunks;