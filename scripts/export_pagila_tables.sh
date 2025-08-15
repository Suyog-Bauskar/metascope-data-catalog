#!/bin/bash

# Export Pagila tables as CSV files for upload to the catalog system
# This will create multiple related CSV files that can be uploaded individually

echo "🚀 Exporting Pagila tables as CSV files..."

# Create export directory
mkdir -p /Users/suyog/Documents/Atlan/data/pagila_export
cd /Users/suyog/Documents/Atlan/data/pagila_export

# Core tables with relationships - export in dependency order
echo "📊 Exporting core tables..."

# 1. Language (no dependencies)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM language LIMIT 100) TO STDOUT WITH CSV HEADER
" > language.csv

# 2. Country (no dependencies)  
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM country LIMIT 100) TO STDOUT WITH CSV HEADER
" > country.csv

# 3. City (depends on country)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM city LIMIT 100) TO STDOUT WITH CSV HEADER
" > city.csv

# 4. Address (depends on city)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM address LIMIT 100) TO STDOUT WITH CSV HEADER
" > address.csv

# 5. Category (no dependencies)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM category) TO STDOUT WITH CSV HEADER
" > category.csv

# 6. Actor (no dependencies)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM actor LIMIT 100) TO STDOUT WITH CSV HEADER
" > actor.csv

# 7. Film (depends on language)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM film LIMIT 100) TO STDOUT WITH CSV HEADER
" > film.csv

# 8. Film_Actor (depends on film and actor)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM film_actor LIMIT 100) TO STDOUT WITH CSV HEADER
" > film_actor.csv

# 9. Film_Category (depends on film and category)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM film_category LIMIT 100) TO STDOUT WITH CSV HEADER
" > film_category.csv

# 10. Store (depends on address)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM store) TO STDOUT WITH CSV HEADER
" > store.csv

# 11. Customer (depends on address and store)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM customer LIMIT 100) TO STDOUT WITH CSV HEADER
" > customer.csv

# 12. Staff (depends on address and store)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM staff) TO STDOUT WITH CSV HEADER
" > staff.csv

# 13. Inventory (depends on film and store)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM inventory LIMIT 100) TO STDOUT WITH CSV HEADER
" > inventory.csv

# 14. Rental (depends on inventory, customer, staff)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM rental LIMIT 100) TO STDOUT WITH CSV HEADER
" > rental.csv

# 15. Payment (depends on customer, rental, staff)
docker exec taxi_catalog_db psql -U postgres -d pagila -c "
COPY (SELECT * FROM payment LIMIT 100) TO STDOUT WITH CSV HEADER
" > payment.csv

echo "✅ Export complete! Files created:"
ls -la *.csv

echo ""
echo "📋 Upload order (to maintain relationships):"
echo "1. language.csv (schema: public, table: language)"
echo "2. country.csv (schema: public, table: country)"
echo "3. city.csv (schema: public, table: city)"
echo "4. address.csv (schema: public, table: address)"
echo "5. category.csv (schema: public, table: category)"
echo "6. actor.csv (schema: public, table: actor)"
echo "7. film.csv (schema: public, table: film)"
echo "8. film_actor.csv (schema: public, table: film_actor)"
echo "9. film_category.csv (schema: public, table: film_category)"
echo "10. store.csv (schema: public, table: store)"
echo "11. customer.csv (schema: public, table: customer)"
echo "12. staff.csv (schema: public, table: staff)"
echo "13. inventory.csv (schema: public, table: inventory)"
echo "14. rental.csv (schema: public, table: rental)"
echo "15. payment.csv (schema: public, table: payment)"

echo ""
echo "🎯 After uploading all files:"
echo "- Go to http://localhost:3000/tables to see all uploaded tables"
echo "- Click 'View Lineage' on any table to see complex relationships"
echo "- Best tables for lineage: film, rental, customer, inventory"
