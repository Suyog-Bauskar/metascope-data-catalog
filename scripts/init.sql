-- Database initialization script
-- This script sets up the initial database schema and extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS lineage;

-- Set default search path
ALTER DATABASE taxi_catalog SET search_path TO catalog, lineage, public;

-- Create enum types
DROP TYPE IF EXISTS catalog.table_type CASCADE;
DROP TYPE IF EXISTS catalog.column_type CASCADE;
DROP TYPE IF EXISTS catalog.relationship_type CASCADE;

CREATE TYPE catalog.table_type AS ENUM ('table', 'view', 'materialized_view', 'external_table');
CREATE TYPE catalog.column_type AS ENUM ('string', 'integer', 'float', 'boolean', 'datetime', 'json', 'array');
CREATE TYPE catalog.relationship_type AS ENUM ('foreign_key', 'derived', 'aggregated', 'joined');

-- Create metadata tables
CREATE TABLE IF NOT EXISTS catalog.table_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    table_type catalog.table_type NOT NULL DEFAULT 'table',
    description TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_analyzed TIMESTAMP WITH TIME ZONE,
    UNIQUE(schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS catalog.column_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES catalog.table_metadata(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    column_type catalog.column_type NOT NULL,
    is_nullable BOOLEAN DEFAULT TRUE,
    is_primary_key BOOLEAN DEFAULT FALSE,
    is_foreign_key BOOLEAN DEFAULT FALSE,
    description TEXT,
    null_count BIGINT,
    unique_count BIGINT,
    min_value TEXT,
    max_value TEXT,
    avg_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_id, column_name)
);

CREATE TABLE IF NOT EXISTS lineage.table_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_table_id UUID REFERENCES catalog.table_metadata(id) ON DELETE CASCADE,
    target_table_id UUID REFERENCES catalog.table_metadata(id) ON DELETE CASCADE,
    relationship_type catalog.relationship_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_table_id, target_table_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_metadata_schema_table ON catalog.table_metadata(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_table_metadata_type ON catalog.table_metadata(table_type);
CREATE INDEX IF NOT EXISTS idx_table_metadata_updated ON catalog.table_metadata(updated_at);

CREATE INDEX IF NOT EXISTS idx_column_metadata_table_id ON catalog.column_metadata(table_id);
CREATE INDEX IF NOT EXISTS idx_column_metadata_name ON catalog.column_metadata(column_name);
CREATE INDEX IF NOT EXISTS idx_column_metadata_type ON catalog.column_metadata(column_type);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON lineage.table_relationships(source_table_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON lineage.table_relationships(target_table_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON lineage.table_relationships(relationship_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_table_metadata_updated_at 
    BEFORE UPDATE ON catalog.table_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_column_metadata_updated_at 
    BEFORE UPDATE ON catalog.column_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
