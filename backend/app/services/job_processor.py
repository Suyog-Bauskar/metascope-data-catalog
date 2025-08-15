import json
import asyncio
import logging
import uuid
from typing import Dict, Any, Callable, Optional
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
import traceback
from app.database import get_redis
# from app.config import settings  # Will be used for configuration

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobProcessor:
    """Background job processor using Redis"""
    
    def __init__(self):
        self.handlers: Dict[str, Callable] = {}
        self.redis_client = None
        
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis_client = await get_redis()
    
    def register_handler(self, job_type: str, handler: Callable[[str, Dict[str, Any]], Any]):
        """Register a job handler for a specific job type"""
        self.handlers[job_type] = handler
    
    def _json_serializer(self, obj):
        """Custom JSON serializer for numpy/pandas/datetime types"""
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif hasattr(obj, 'item'):  # pandas scalars
            return obj.item()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    async def submit_job(self, job_type: str, job_data: Dict[str, Any], priority: int = 0) -> str:
        """Submit a job for background processing"""
        if not self.redis_client:
            await self.initialize()
        
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "type": job_type,
            "data": job_data,
            "status": JobStatus.PENDING.value,
            "priority": priority,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None,
            "progress": 0
        }
        
        # Store job details
        await self.redis_client.hset(f"job:{job_id}", mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in job.items()
        })
        
        # Add to job queue with priority
        await self.redis_client.zadd("job_queue", {job_id: priority})
        
        logger.info(f"Submitted job {job_id} of type {job_type}")
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a job"""
        if not self.redis_client:
            await self.initialize()
        
        job_data = await self.redis_client.hgetall(f"job:{job_id}")
        if not job_data:
            return None
        
        # Parse JSON fields
        for key in ["data", "result"]:
            if key in job_data and job_data[key] and job_data[key] != 'None':
                try:
                    job_data[key] = json.loads(job_data[key])
                except json.JSONDecodeError:
                    pass
            elif key in job_data and (job_data[key] == 'None' or not job_data[key]):
                job_data[key] = None
        
        # Convert numeric fields
        if "progress" in job_data:
            job_data["progress"] = float(job_data["progress"])
        if "priority" in job_data:
            job_data["priority"] = int(job_data["priority"])
        
        return job_data
    
    async def update_job_progress(self, job_id: str, progress: float, message: str = None):
        """Update job progress"""
        if not self.redis_client:
            await self.initialize()
        
        updates = {"progress": str(progress)}
        if message:
            updates["message"] = message
        
        await self.redis_client.hmset(f"job:{job_id}", updates)
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or running job"""
        if not self.redis_client:
            await self.initialize()
        
        job = await self.get_job_status(job_id)
        if not job:
            return False
        
        if job["status"] in [JobStatus.PENDING.value, JobStatus.RUNNING.value]:
            await self.redis_client.hmset(f"job:{job_id}", {
                "status": JobStatus.CANCELLED.value,
                "completed_at": datetime.utcnow().isoformat()
            })
            
            # Remove from queue if pending
            if job["status"] == JobStatus.PENDING.value:
                await self.redis_client.zrem("job_queue", job_id)
            
            return True
        
        return False
    
    async def process_jobs(self):
        """Main job processing loop"""
        if not self.redis_client:
            await self.initialize()
        
        logger.info("Starting job processor")
        
        while True:
            try:
                # Get highest priority job
                jobs = await self.redis_client.zrevrange("job_queue", 0, 0, withscores=True)
                
                if not jobs:
                    await asyncio.sleep(1)
                    continue
                
                job_id = jobs[0][0]
                
                # Remove from queue
                await self.redis_client.zrem("job_queue", job_id)
                
                # Process the job
                await self._process_single_job(job_id)
                
            except Exception as e:
                logger.error(f"Error in job processing loop: {str(e)}")
                await asyncio.sleep(5)
    
    async def _process_single_job(self, job_id: str):
        """Process a single job"""
        try:
            job = await self.get_job_status(job_id)
            if not job:
                logger.warning(f"Job {job_id} not found")
                return
            
            if job["status"] != JobStatus.PENDING.value:
                logger.warning(f"Job {job_id} is not pending (status: {job['status']})")
                return
            
            # Mark as running
            await self.redis_client.hmset(f"job:{job_id}", {
                "status": JobStatus.RUNNING.value,
                "started_at": datetime.utcnow().isoformat()
            })
            
            # Get handler
            handler = self.handlers.get(job["type"])
            if not handler:
                raise ValueError(f"No handler registered for job type: {job['type']}")
            
            logger.info(f"Processing job {job_id} of type {job['type']}")
            
            # Execute handler
            result = await handler(job_id, job["data"])
            
            # Mark as completed
            await self.redis_client.hmset(f"job:{job_id}", {
                "status": JobStatus.COMPLETED.value,
                "completed_at": datetime.utcnow().isoformat(),
                "result": json.dumps(result, default=self._json_serializer),
                "progress": "100"
            })
            
            logger.info(f"Completed job {job_id}")
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}")
            
            # Mark as failed
            await self.redis_client.hmset(f"job:{job_id}", {
                "status": JobStatus.FAILED.value,
                "completed_at": datetime.utcnow().isoformat(),
                "error": str(e),
                "traceback": traceback.format_exc()
            })
    
    async def cleanup_old_jobs(self, max_age_hours: int = 24):
        """Clean up old completed/failed jobs"""
        if not self.redis_client:
            await self.initialize()
        
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        # Get all job keys
        job_keys = await self.redis_client.keys("job:*")
        
        for job_key in job_keys:
            job_data = await self.redis_client.hgetall(job_key)
            
            if job_data.get("status") in [JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
                completed_at = job_data.get("completed_at")
                if completed_at:
                    try:
                        completed_time = datetime.fromisoformat(completed_at)
                        if completed_time < cutoff_time:
                            await self.redis_client.delete(job_key)
                            logger.info(f"Cleaned up old job: {job_key}")
                    except ValueError:
                        pass
    
    async def get_job_queue_stats(self) -> Dict[str, Any]:
        """Get statistics about the job queue"""
        if not self.redis_client:
            await self.initialize()
        
        # Count jobs by status
        job_keys = await self.redis_client.keys("job:*")
        status_counts = {status.value: 0 for status in JobStatus}
        
        for job_key in job_keys:
            status = await self.redis_client.hget(job_key, "status")
            if status in status_counts:
                status_counts[status] += 1
        
        # Queue length
        queue_length = await self.redis_client.zcard("job_queue")
        
        return {
            "queue_length": queue_length,
            "status_counts": status_counts,
            "total_jobs": len(job_keys)
        }


# Global instance
job_processor = JobProcessor()
