from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import tempfile
import os
from pathlib import Path
import logging

from app.services.data_processor import data_processor
from app.services.job_processor import job_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data", tags=["data-processing"])


class DatasetUploadResponse(BaseModel):
    job_id: str
    message: str
    status: str


class JobStatusResponse(BaseModel):
    id: str
    type: str
    status: str
    progress: float
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DatasetProfileResponse(BaseModel):
    table: Dict[str, Any]
    columns: List[Dict[str, Any]]


@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(..., description="Dataset file (max 1GB)"),
    schema_name: str = Form("nyc_taxi"),
    table_name: str = Form(None)
):
    """Upload and process a dataset file"""
    
    # Validate file type
    allowed_extensions = {'.csv', '.parquet', '.pq'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate table name if not provided
    if not table_name:
        table_name = Path(file.filename).stem
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Submit background job for processing
        job_data = {
            "file_path": temp_file_path,
            "schema_name": schema_name,
            "table_name": table_name,
            "original_filename": file.filename
        }
        
        job_id = await job_processor.submit_job("process_dataset", job_data, priority=1)
        
        return DatasetUploadResponse(
            job_id=job_id,
            message=f"Dataset upload initiated. Processing file: {file.filename}",
            status="submitted"
        )
        
    except Exception as e:
        logger.error(f"Error uploading dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/process-url")
async def process_dataset_from_url(
    url: str,
    schema_name: str = "nyc_taxi",
    table_name: str = None
):
    """Process a dataset from a URL"""
    
    if not table_name:
        table_name = Path(url).stem or "dataset"
    
    try:
        job_data = {
            "url": url,
            "schema_name": schema_name,
            "table_name": table_name
        }
        
        job_id = await job_processor.submit_job("process_dataset_url", job_data, priority=1)
        
        return DatasetUploadResponse(
            job_id=job_id,
            message=f"Dataset processing initiated from URL: {url}",
            status="submitted"
        )
        
    except Exception as e:
        logger.error(f"Error processing dataset from URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status of a data processing job"""
    
    job = await job_processor.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatusResponse(**job)


@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running or pending job"""
    
    success = await job_processor.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
    
    return {"message": "Job cancelled successfully"}


@router.get("/profile/{schema_name}/{table_name}", response_model=DatasetProfileResponse)
async def get_dataset_profile(schema_name: str, table_name: str):
    """Get comprehensive profile of a dataset"""
    
    profile = await data_processor.get_dataset_profile(schema_name, table_name)
    if not profile:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return DatasetProfileResponse(**profile)


@router.get("/tables")
async def list_tables(schema_name: Optional[str] = None):
    """List all available tables"""
    
    from app.database import AsyncSessionLocal
    from app.models import TableMetadata
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        stmt = select(TableMetadata)
        if schema_name:
            stmt = stmt.where(TableMetadata.schema_name == schema_name)
        
        result = await session.execute(stmt)
        tables = result.scalars().all()
        
        return {
            "tables": [
                {
                    "id": str(table.id),
                    "schema_name": table.schema_name,
                    "table_name": table.table_name,
                    "table_type": table.table_type.value,
                    "row_count": table.row_count,
                    "size_bytes": table.size_bytes,
                    "last_analyzed": table.last_analyzed.isoformat() if table.last_analyzed else None
                }
                for table in tables
            ]
        }


@router.get("/queue/stats")
async def get_queue_stats():
    """Get job queue statistics"""
    
    stats = await job_processor.get_job_queue_stats()
    return stats


@router.post("/reprocess/{schema_name}/{table_name}")
async def reprocess_dataset(schema_name: str, table_name: str):
    """Reprocess an existing dataset"""
    
    # This would require storing the original file path or URL
    # For now, return an error message
    raise HTTPException(
        status_code=501,
        detail="Reprocessing requires the original dataset file. Please upload the file again."
    )


# Job handlers for background processing
async def process_dataset_handler(job_id: str, job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for processing uploaded dataset files"""
    
    try:
        file_path = job_data["file_path"]
        
        # Update progress
        await job_processor.update_job_progress(job_id, 10, "Starting dataset analysis")
        
        # Process the dataset
        schema_name = job_data.get("schema_name", "nyc_taxi")
        table_name = job_data.get("table_name", "yellow_taxi_trips")
        result = await data_processor.process_dataset(file_path, schema_name, table_name)
        
        await job_processor.update_job_progress(job_id, 90, "Storing metadata")
        
        # Clean up temporary file
        try:
            os.unlink(file_path)
        except Exception:
            pass
        
        await job_processor.update_job_progress(job_id, 100, "Processing complete")
        
        return result
        
    except Exception as e:
        # Clean up temporary file on error
        try:
            os.unlink(job_data.get("file_path", ""))
        except Exception:
            pass
        raise e


async def process_dataset_url_handler(job_id: str, job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for processing datasets from URLs"""
    
    import aiohttp
    import tempfile
    
    try:
        url = job_data["url"]
        
        await job_processor.update_job_progress(job_id, 10, "Downloading dataset")
        
        # Download file
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download file: HTTP {response.status}")
                
                # Determine file extension from URL or content type
                file_extension = Path(url).suffix.lower()
                if not file_extension:
                    content_type = response.headers.get('content-type', '')
                    if 'csv' in content_type:
                        file_extension = '.csv'
                    elif 'parquet' in content_type:
                        file_extension = '.parquet'
                    else:
                        file_extension = '.csv'  # Default
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                    async for chunk in response.content.iter_chunked(8192):
                        temp_file.write(chunk)
                    temp_file_path = temp_file.name
        
        await job_processor.update_job_progress(job_id, 30, "Download complete, analyzing dataset")
        
        # Process the dataset
        result = await data_processor.load_nyc_taxi_data(temp_file_path)
        
        # Clean up temporary file
        try:
            os.unlink(temp_file_path)
        except Exception:
            pass
        
        return result
        
    except Exception as e:
        raise e


# Register job handlers
job_processor.register_handler("process_dataset", process_dataset_handler)
job_processor.register_handler("process_dataset_url", process_dataset_url_handler)
