#!/bin/bash

# Simple script to set up Northwind database with complex relationships
# This creates a complete database with foreign keys for testing lineage

echo "🚀 Setting up Northwind database with complex relationships..."

# Create data directory
mkdir -p /Users/suyog/Documents/Atlan/data/northwind
cd /Users/suyog/Documents/Atlan/data/northwind

# Download Northwind PostgreSQL script
echo "📥 Downloading Northwind database script..."
curl -o northwind.sql "https://raw.githubusercontent.com/harryho/db-samples/master/postgres/northwind.sql"

# Connect to PostgreSQL and set up database
echo "🗄️ Setting up database..."
docker exec taxi_catalog_db psql -U postgres -c "DROP DATABASE IF EXISTS northwind;"
docker exec taxi_catalog_db psql -U postgres -c "CREATE DATABASE northwind;"

# Load the database
echo "📊 Loading Northwind data..."
docker exec -i taxi_catalog_db psql -U postgres -d northwind < northwind.sql

# Show tables and relationships
echo "📋 Database setup complete! Tables created:"
docker exec taxi_catalog_db psql -U postgres -d northwind -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;"

echo ""
echo "🔗 Foreign key relationships found:"
docker exec taxi_catalog_db psql -U postgres -d northwind -c "
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps to see complex lineage:"
echo "1. Go to http://localhost:3000/upload"
echo "2. Upload any CSV file (can be your sample_taxi_data.csv)"
echo "3. Set schema to 'public' and table name to any Northwind table like:"
echo "   - customers"
echo "   - orders" 
echo "   - order_details"
echo "   - products"
echo "   - categories"
echo "4. After upload, go to Tables and click 'View Lineage'"
echo "5. You'll see complex relationships between tables!"
