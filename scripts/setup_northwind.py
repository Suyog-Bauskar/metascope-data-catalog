#!/usr/bin/env python3
"""
Simple script to download and set up Northwind database with complex relationships
for testing lineage visualization in the Data Catalog system.
"""

import os
import subprocess
import sys
import requests
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def download_file(url, filename):
    """Download a file from URL"""
    print(f"Downloading {filename}...")
    response = requests.get(url)
    response.raise_for_status()
    
    with open(filename, 'wb') as f:
        f.write(response.content)
    print(f"Downloaded {filename}")

def setup_northwind_database():
    """Download and set up Northwind database"""
    
    # Create data directory if it doesn't exist
    os.makedirs('/Users/suyog/Documents/Atlan/data/northwind', exist_ok=True)
    os.chdir('/Users/suyog/Documents/Atlan/data/northwind')
    
    # Download Northwind PostgreSQL script
    northwind_url = "https://raw.githubusercontent.com/harryho/db-samples/master/postgres/northwind.sql"
    download_file(northwind_url, "northwind.sql")
    
    # Database connection parameters
    db_params = {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'postgres',
        'database': 'postgres'  # Connect to default database first
    }
    
    try:
        # Connect to PostgreSQL
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Drop and create northwind database
        print("Creating northwind database...")
        cursor.execute("DROP DATABASE IF EXISTS northwind;")
        cursor.execute("CREATE DATABASE northwind;")
        
        cursor.close()
        conn.close()
        
        # Connect to the new northwind database
        db_params['database'] = 'northwind'
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Read and execute the SQL script
        print("Loading Northwind schema and data...")
        with open('northwind.sql', 'r') as f:
            sql_script = f.read()
        
        # Execute the script
        cursor.execute(sql_script)
        conn.commit()
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\nCreated {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Show foreign key relationships
        cursor.execute("""
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
            ORDER BY tc.table_name;
        """)
        
        relationships = cursor.fetchall()
        print(f"\nFound {len(relationships)} foreign key relationships:")
        for rel in relationships:
            print(f"  - {rel[0]}.{rel[1]} → {rel[2]}.{rel[3]}")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Northwind database setup complete!")
        print("\nNext steps:")
        print("1. Go to http://localhost:3000/upload")
        print("2. Upload any table from the northwind database")
        print("3. View complex lineage relationships")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == "__main__":
    setup_northwind_database()
