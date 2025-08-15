#!/usr/bin/env python3
"""
Script to create sample NYC Taxi dataset for testing the data catalog
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from pathlib import Path

def create_sample_nyc_taxi_data(num_rows: int = 10000) -> pd.DataFrame:
    """Create a sample NYC Taxi dataset with realistic data patterns"""
    
    # Set random seed for reproducibility
    np.random.seed(42)
    random.seed(42)
    
    # Generate datetime range
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2023, 12, 31)
    date_range = pd.date_range(start=start_date, end=end_date, freq='H')
    
    # Sample pickup times
    pickup_datetimes = np.random.choice(date_range, size=num_rows)
    
    # Generate trip durations (5 minutes to 2 hours)
    trip_durations = np.random.exponential(scale=20, size=num_rows) + 5
    trip_durations = np.clip(trip_durations, 5, 120)  # 5 min to 2 hours
    
    # Calculate dropoff times
    dropoff_datetimes = pickup_datetimes + pd.to_timedelta(trip_durations, unit='minutes')
    
    # NYC coordinates (approximate bounding box)
    # Manhattan: 40.7489, -73.9441 to 40.7831, -73.9712
    # Brooklyn: 40.6782, -73.9442 to 40.7394, -73.8648
    # Queens: 40.7282, -73.7949 to 40.8007, -73.7004
    
    pickup_longitude = np.random.uniform(-74.0, -73.7, num_rows)
    pickup_latitude = np.random.uniform(40.6, 40.85, num_rows)
    dropoff_longitude = pickup_longitude + np.random.normal(0, 0.01, num_rows)
    dropoff_latitude = pickup_latitude + np.random.normal(0, 0.01, num_rows)
    
    # Passenger count (1-6, with 1-2 being most common)
    passenger_counts = np.random.choice([1, 2, 3, 4, 5, 6], 
                                       size=num_rows, 
                                       p=[0.5, 0.3, 0.1, 0.05, 0.03, 0.02])
    
    # Trip distance (miles) - correlated with trip duration
    base_distance = trip_durations * np.random.uniform(0.2, 0.8, num_rows) / 60  # rough speed
    trip_distances = np.maximum(0.1, base_distance + np.random.normal(0, 0.5, num_rows))
    
    # Fare calculation (simplified NYC taxi fare structure)
    base_fare = 2.50
    per_mile_rate = 2.50
    per_minute_rate = 0.50
    
    fare_amounts = (base_fare + 
                   trip_distances * per_mile_rate + 
                   trip_durations * per_minute_rate +
                   np.random.normal(0, 1, num_rows))  # Add some noise
    fare_amounts = np.maximum(2.50, fare_amounts)  # Minimum fare
    
    # Tips (0-30% of fare, with most being 15-20%)
    tip_percentages = np.random.beta(2, 5, num_rows) * 0.3  # Beta distribution for realistic tips
    tip_amounts = fare_amounts * tip_percentages
    
    # Tolls (only for some trips)
    toll_amounts = np.where(np.random.random(num_rows) < 0.1,  # 10% of trips have tolls
                           np.random.choice([5.54, 6.12, 8.36], num_rows),  # Common NYC tolls
                           0)
    
    # Total amount
    total_amounts = fare_amounts + tip_amounts + toll_amounts
    
    # Payment types
    payment_types = np.random.choice(['Credit card', 'Cash', 'No charge', 'Dispute'], 
                                    size=num_rows,
                                    p=[0.7, 0.25, 0.03, 0.02])
    
    # Vendor IDs (taxi companies)
    vendor_ids = np.random.choice([1, 2], size=num_rows, p=[0.6, 0.4])
    
    # Rate codes
    rate_codes = np.random.choice([1, 2, 3, 4, 5], 
                                 size=num_rows,
                                 p=[0.85, 0.05, 0.05, 0.03, 0.02])
    
    # Store and forward flag (mostly N)
    store_fwd_flags = np.random.choice(['N', 'Y'], size=num_rows, p=[0.95, 0.05])
    
    # Create DataFrame
    df = pd.DataFrame({
        'VendorID': vendor_ids,
        'tpep_pickup_datetime': pickup_datetimes,
        'tpep_dropoff_datetime': dropoff_datetimes,
        'passenger_count': passenger_counts,
        'trip_distance': np.round(trip_distances, 2),
        'RatecodeID': rate_codes,
        'store_and_fwd_flag': store_fwd_flags,
        'PULocationID': np.random.randint(1, 265, num_rows),  # NYC taxi zones
        'DOLocationID': np.random.randint(1, 265, num_rows),
        'payment_type': payment_types,
        'fare_amount': np.round(fare_amounts, 2),
        'extra': np.where(np.random.random(num_rows) < 0.3, 0.5, 0.0),  # Rush hour surcharge
        'mta_tax': 0.5,  # Standard MTA tax
        'tip_amount': np.round(tip_amounts, 2),
        'tolls_amount': toll_amounts,
        'improvement_surcharge': 0.3,  # Standard improvement surcharge
        'total_amount': np.round(total_amounts, 2),
        'pickup_longitude': np.round(pickup_longitude, 6),
        'pickup_latitude': np.round(pickup_latitude, 6),
        'dropoff_longitude': np.round(dropoff_longitude, 6),
        'dropoff_latitude': np.round(dropoff_latitude, 6)
    })
    
    # Sort by pickup time
    df = df.sort_values('tpep_pickup_datetime').reset_index(drop=True)
    
    return df

def main():
    """Create and save sample datasets"""
    
    # Create data directory
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    print("Creating sample NYC Taxi datasets...")
    
    # Create small dataset for quick testing
    small_df = create_sample_nyc_taxi_data(1000)
    small_file = data_dir / "nyc_taxi_sample_small.csv"
    small_df.to_csv(small_file, index=False)
    print(f"Created small dataset: {small_file} ({len(small_df)} rows)")
    
    # Create medium dataset
    medium_df = create_sample_nyc_taxi_data(10000)
    medium_file = data_dir / "nyc_taxi_sample_medium.csv"
    medium_df.to_csv(medium_file, index=False)
    print(f"Created medium dataset: {medium_file} ({len(medium_df)} rows)")
    
    # Create parquet version for testing different formats
    parquet_file = data_dir / "nyc_taxi_sample_medium.parquet"
    medium_df.to_parquet(parquet_file, index=False)
    print(f"Created parquet dataset: {parquet_file} ({len(medium_df)} rows)")
    
    # Print sample data info
    print("\nSample data preview:")
    print(medium_df.head())
    print(f"\nDataset shape: {medium_df.shape}")
    print(f"Memory usage: {medium_df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
    
    print("\nColumn info:")
    print(medium_df.dtypes)
    
    print("\nBasic statistics:")
    print(medium_df.describe())

if __name__ == "__main__":
    main()
