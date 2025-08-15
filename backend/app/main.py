# Main FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.routers import data_processing, lineage, search, analytics, settings
from app.services.job_processor import job_processor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Data Catalog API")
    
    # Initialize job processor
    await job_processor.initialize()
    
    # Start background job processing
    job_task = asyncio.create_task(job_processor.process_jobs())
    
    # Start cleanup task
    async def cleanup_task():
        while True:
            await asyncio.sleep(3600)  # Run every hour
            await job_processor.cleanup_old_jobs()
    
    cleanup_task_handle = asyncio.create_task(cleanup_task())
    
    yield
    
    # Shutdown
    logger.info("Shutting down Data Catalog API")
    job_task.cancel()
    cleanup_task_handle.cancel()


app = FastAPI(
    title="Data Catalog API",
    description="A scalable data catalog with lineage visualization and data processing",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(data_processing.router, prefix="/api/v1")
app.include_router(lineage.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Data Catalog API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
