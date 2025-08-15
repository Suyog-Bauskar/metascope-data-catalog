# Data Catalog with Lineage Visualization

A scalable data catalog that discovers metadata from NYC Taxi Dataset, visualizes data lineage, and provides search functionality. Built with Python FastAPI backend and React TypeScript frontend.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React with TypeScript, Vis-Network, React-Window
- **Caching**: Redis
- **Database**: PostgreSQL with partitioning
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd data-catalog
```

### 2. Environment Configuration

```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit the .env file with your configurations if needed
```

### 3. Start with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432 (postgres/postgres)
- **Redis**: localhost:6379

## Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Project Structure

```
data-catalog/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── config.py       # Configuration settings
│   │   ├── database.py     # Database and Redis setup
│   │   ├── models/         # SQLAlchemy models
│   │   ├── api/            # API endpoints
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── scripts/            # Data processing scripts
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container config
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── package.json       # Node.js dependencies
│   └── Dockerfile         # Frontend container config
├── scripts/
│   └── init.sql           # Database initialization
├── data/                  # Data files directory
└── docker-compose.yml     # Multi-service orchestration
```

## Key Features

### Phase 1: Core Infrastructure ✅
- [x] Docker containerization with PostgreSQL and Redis
- [x] FastAPI backend with async SQLAlchemy
- [x] React TypeScript frontend with Tailwind CSS
- [x] Database schema with metadata and lineage tables
- [x] Environment configuration and health checks

### Phase 2: Data Processing (Next)
- [ ] NYC Taxi dataset loading pipeline
- [ ] Metadata discovery service
- [ ] Data profiling and statistics
- [ ] Lineage relationship building

### Phase 3: API Development (Next)
- [ ] Tables API with pagination
- [ ] Search API with full-text search
- [ ] Lineage API with graph traversal
- [ ] Caching with Redis

### Phase 4: Frontend Features (Next)
- [ ] Table browser with virtual scrolling
- [ ] Interactive lineage visualization
- [ ] Search interface with filters
- [ ] Data profiling dashboard

## Database Schema

The application uses PostgreSQL with the following key tables:

- `catalog.table_metadata`: Stores table information and statistics
- `catalog.column_metadata`: Stores column details and data profiles
- `lineage.table_relationships`: Stores table dependencies and lineage

## API Endpoints

Once fully implemented, the API will provide:

- `GET /api/v1/tables/` - List all tables
- `GET /api/v1/tables/{table_name}` - Get table details
- `GET /api/v1/search/` - Search tables and columns
- `GET /api/v1/lineage/{table_name}` - Get table lineage
- `GET /health` - Health check

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
