# Data Catalog

A comprehensive full-stack data catalog system that processes datasets, discovers metadata, provides data profiling capabilities, and visualizes data lineage. This project demonstrates modern data engineering practices with automated data processing pipelines, interactive frontend, and scalable architecture.

## 🏗️ Architecture Overview

This data catalog implements a scalable architecture for processing large datasets and managing metadata:

- **Data Ingestion**: Automated processing of CSV/Parquet files with background job queuing
- **Metadata Discovery**: Intelligent column type inference and statistical profiling
- **Data Lineage**: Interactive graph visualization of table relationships and dependencies
- **Storage Layer**: PostgreSQL with optimized schemas for metadata and lineage
- **Caching Layer**: Redis for job queuing and performance optimization
- **API Layer**: RESTful APIs with comprehensive data processing endpoints
- **Frontend**: Modern React TypeScript interface with interactive visualizations

## 🚀 Technology Stack

### Backend
- **Python 3.11+** - Core runtime
- **FastAPI** - Modern async web framework with OpenAPI documentation
- **SQLAlchemy 2.0** - ORM with async support
- **PostgreSQL 15** - Primary database with enum types and partitioning
- **Redis 7** - Job queuing, caching, and session management
- **Pandas** - Data processing and analysis
- **PyArrow** - Parquet file support
- **Alembic** - Database migrations

### Frontend
- **React 18** with TypeScript - Modern UI framework
- **Tailwind CSS** - Utility-first styling framework
- **Vis-Network** - Interactive graph visualization for lineage
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Lucide React** - Modern icon library

### Infrastructure
- **Docker & Docker Compose** - Containerization and orchestration
- **Nginx** - Optional: Setup domain with reverse proxy
- **Uvicorn** - ASGI server for FastAPI

## ⚡ Quick Start

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM recommended for data processing

### 1. Clone and Setup

```bash
git clone https://github.com/Suyog-Bauskar/metascope-data-catalog.git
cd metascope-data-catalog
```

### 2. Start All Services

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d

# View logs
docker compose logs -f backend
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (postgres/postgres)
- **Redis**: localhost:6379

### 4. Test Data Processing

```bash
# Upload sample NYC Taxi dataset
curl -X POST "http://localhost:8000/api/v1/data/upload" \
  -F "file=@data/nyc_taxi_sample.csv" \
  -F "schema_name=nyc_taxi" \
  -F "table_name=yellow_taxi_trips"

# Check processing status
curl "http://localhost:8000/api/v1/data/jobs/{job_id}"

# Get dataset profile
curl "http://localhost:8000/api/v1/data/profile/nyc_taxi/yellow_taxi_trips"
```

## 📁 Project Structure

```
nyc-taxi-data-catalog/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application entry point
│   │   ├── config.py          # Configuration settings
│   │   ├── database.py        # Database and Redis setup
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routers/           # API endpoint routers
│   │   │   └── data_processing.py
│   │   └── services/          # Business logic services
│   │       ├── data_processor.py
│   │       └── job_processor.py
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile            # Backend container config
├── frontend/                  # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/            # Page components
│   │   └── App.tsx           # Main application
│   ├── package.json          # Node.js dependencies
│   └── Dockerfile           # Frontend container config
├── scripts/
│   ├── init.sql             # Database initialization
│   └── create_sample_data.py # Sample data generation
├── data/                    # Data files directory
│   └── nyc_taxi_sample.csv  # Sample NYC Taxi dataset
└── docker-compose.yml       # Multi-service orchestration
```

## 🗄️ Database Schema

The system uses PostgreSQL with optimized schemas:

### Catalog Schema
```sql
-- Table metadata with statistics
catalog.table_metadata (
    id UUID PRIMARY KEY,
    schema_name VARCHAR(255),
    table_name VARCHAR(255),
    table_type catalog.table_type,
    row_count BIGINT,
    size_bytes BIGINT,
    last_analyzed TIMESTAMP
)

-- Column metadata with profiling
catalog.column_metadata (
    id UUID PRIMARY KEY,
    table_id UUID REFERENCES table_metadata,
    column_name VARCHAR(255),
    column_type catalog.column_type,
    null_count BIGINT,
    unique_count BIGINT,
    min_value TEXT,
    max_value TEXT,
    avg_value NUMERIC
)
```

### Lineage Schema
```sql
-- Table relationships for lineage
lineage.table_relationships (
    id UUID PRIMARY KEY,
    source_table_id UUID,
    target_table_id UUID,
    relationship_type catalog.relationship_type
)
```

## 🔌 API Endpoints

### Data Processing APIs
- `POST /api/v1/data/upload` - Upload dataset files (CSV/Parquet)
- `POST /api/v1/data/process-url` - Process dataset from URL
- `GET /api/v1/data/jobs/{job_id}` - Get job status and progress
- `DELETE /api/v1/data/jobs/{job_id}` - Cancel running job

### Metadata APIs
- `GET /api/v1/data/tables` - List all processed tables
- `GET /api/v1/data/profile/{schema}/{table}` - Get detailed table profile
- `GET /api/v1/data/queue/stats` - Job queue statistics

### System APIs
- `GET /health` - Application health check
- `GET /` - API status

## 🧪 Sample Data

The project includes a realistic NYC Taxi sample dataset with:

- **13 columns** covering temporal, geospatial, and financial data
- **100 rows** for testing and demonstration
- **Realistic patterns** including fare calculations, tip distributions, and geographic coordinates
- **Data quality variations** to test profiling capabilities

### Key Columns
- `tpep_pickup_datetime`, `tpep_dropoff_datetime` - Temporal data
- `pickup_longitude`, `pickup_latitude` - Geospatial coordinates
- `fare_amount`, `tip_amount`, `total_amount` - Financial metrics
- `passenger_count`, `trip_distance` - Trip characteristics
- `payment_type`, `VendorID` - Categorical data

## 🚀 Development Setup

### Local Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Local Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Generate Sample Data

```bash
# Create sample NYC Taxi dataset
python data/create_simple_sample.py
```

## 🔧 Configuration

### Environment Variables

The backend supports the following configuration options:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/taxi_catalog
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# Application Configuration
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# Data Processing
BATCH_SIZE=10000
MAX_WORKERS=4
SAMPLE_SIZE=1000
```

## 📊 Performance Characteristics

- **File Processing**: Handles CSV files up to 1GB with background processing
- **Metadata Storage**: Optimized PostgreSQL schema with proper indexing
- **Job Processing**: Redis-based queue with configurable concurrency
- **Memory Usage**: Efficient pandas operations with configurable batch sizes
- **Response Times**: Sub-second API responses for metadata queries

## 🎯 Use Cases

This data catalog demonstrates:

1. **Automated Data Discovery**: Upload datasets and automatically extract metadata
2. **Data Profiling**: Get comprehensive statistics and data quality metrics
3. **Async Processing**: Handle large files without blocking the API
4. **Metadata Management**: Store and query dataset information efficiently
5. **Modern Architecture**: Showcase of current data engineering best practices

