#!/usr/bin/env python3
"""Simple script to create a basic NYC Taxi CSV sample without pandas dependency"""

import csv
import random
from datetime import datetime, timedelta

def create_simple_sample():
    """Create a simple CSV sample for testing"""
    
    # Sample data
    rows = []
    base_date = datetime(2023, 6, 1, 8, 0, 0)
    
    for i in range(100):
        pickup_time = base_date + timedelta(hours=random.randint(0, 168))  # Week of data
        trip_duration = random.randint(5, 60)  # 5-60 minutes
        dropoff_time = pickup_time + timedelta(minutes=trip_duration)
        
        row = {
            'VendorID': random.choice([1, 2]),
            'tpep_pickup_datetime': pickup_time.strftime('%Y-%m-%d %H:%M:%S'),
            'tpep_dropoff_datetime': dropoff_time.strftime('%Y-%m-%d %H:%M:%S'),
            'passenger_count': random.randint(1, 4),
            'trip_distance': round(random.uniform(0.5, 15.0), 2),
            'fare_amount': round(random.uniform(5.0, 50.0), 2),
            'tip_amount': round(random.uniform(0.0, 10.0), 2),
            'total_amount': 0,  # Will calculate
            'payment_type': random.choice(['Credit card', 'Cash']),
            'pickup_longitude': round(random.uniform(-74.0, -73.7), 6),
            'pickup_latitude': round(random.uniform(40.6, 40.85), 6),
            'dropoff_longitude': round(random.uniform(-74.0, -73.7), 6),
            'dropoff_latitude': round(random.uniform(40.6, 40.85), 6)
        }
        
        # Calculate total
        row['total_amount'] = round(row['fare_amount'] + row['tip_amount'], 2)
        rows.append(row)
    
    # Write CSV
    with open('nyc_taxi_sample.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Created nyc_taxi_sample.csv with {len(rows)} rows")

if __name__ == "__main__":
    create_simple_sample()
