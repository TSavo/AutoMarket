# File: task_manager.py
# Async task management system for TTS generation with progress tracking

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Literal, Callable, Any
from threading import Lock
import weakref

from models import CustomTTSRequest

logger = logging.getLogger(__name__)

# Type aliases
TaskStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]
ProgressCallback = Callable[[str, float, str], None]


@dataclass
class TTSTask:
    """Represents an async TTS generation task with progress tracking."""
    
    task_id: str
    status: TaskStatus
    progress: float  # 0.0 to 100.0
    current_stage: str
    created_at: datetime
    updated_at: datetime
    request_data: CustomTTSRequest
    result_path: Optional[str] = None
    error_message: Optional[str] = None
    total_chunks: int = 0
    completed_chunks: int = 0
    output_format: str = "wav"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary for API responses."""
        return {
            "task_id": self.task_id,
            "status": self.status,
            "progress": round(self.progress, 2),
            "current_stage": self.current_stage,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "total_chunks": self.total_chunks,
            "completed_chunks": self.completed_chunks,
            "error_message": self.error_message,
            "result_available": self.result_path is not None and Path(self.result_path).exists() if self.result_path else False
        }


class TaskManager:
    """Manages async TTS tasks with progress tracking and cleanup."""
    
    def __init__(self, max_concurrent_tasks: int = 3, task_timeout_hours: int = 24):
        self.tasks: Dict[str, TTSTask] = {}
        self.max_concurrent_tasks = max_concurrent_tasks
        self.task_timeout_hours = task_timeout_hours
        self._lock = Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running_tasks: Dict[str, asyncio.Task] = {}
        
        # Start cleanup task
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start the background cleanup task."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                self._cleanup_task = loop.create_task(self._cleanup_loop())
        except RuntimeError:
            # No event loop running yet, will be started later
            pass

    def ensure_cleanup_task_started(self):
        """Ensure cleanup task is started (call this after event loop is available)."""
        if self._cleanup_task is None or self._cleanup_task.done():
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    self._cleanup_task = loop.create_task(self._cleanup_loop())
                    logger.info("Background cleanup task started")
            except RuntimeError:
                logger.warning("Could not start cleanup task: no event loop available")
    
    async def _cleanup_loop(self):
        """Background task to clean up old completed/failed tasks."""
        while True:
            try:
                await asyncio.sleep(3600)  # Run cleanup every hour
                await self.cleanup_old_tasks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}", exc_info=True)
    
    async def cleanup_old_tasks(self):
        """Remove old completed/failed tasks and their files."""
        cutoff_time = datetime.now() - timedelta(hours=self.task_timeout_hours)
        tasks_to_remove = []
        
        with self._lock:
            for task_id, task in self.tasks.items():
                if (task.status in ["completed", "failed", "cancelled"] and 
                    task.updated_at < cutoff_time):
                    tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            await self.remove_task(task_id)
        
        if tasks_to_remove:
            logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")
    
    def create_task(self, request: CustomTTSRequest) -> str:
        """Create a new TTS task and return its ID."""
        task_id = str(uuid.uuid4())
        
        with self._lock:
            task = TTSTask(
                task_id=task_id,
                status="queued",
                progress=0.0,
                current_stage="Task created",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                request_data=request,
                output_format=request.output_format or "wav"
            )
            self.tasks[task_id] = task
        
        logger.info(f"Created new TTS task: {task_id}")
        return task_id
    
    def get_task(self, task_id: str) -> Optional[TTSTask]:
        """Get a task by ID."""
        with self._lock:
            return self.tasks.get(task_id)
    
    def update_task_progress(self, task_id: str, progress: float, stage: str, 
                           status: Optional[TaskStatus] = None):
        """Update task progress and stage."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.progress = min(100.0, max(0.0, progress))
                task.current_stage = stage
                task.updated_at = datetime.now()
                if status:
                    task.status = status
                
                logger.debug(f"Task {task_id}: {progress:.1f}% - {stage}")
    
    def set_task_completed(self, task_id: str, result_path: str):
        """Mark task as completed with result file path."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.status = "completed"
                task.progress = 100.0
                task.current_stage = "Completed"
                task.result_path = result_path
                task.updated_at = datetime.now()
                
                logger.info(f"Task {task_id} completed: {result_path}")
    
    def set_task_failed(self, task_id: str, error_message: str):
        """Mark task as failed with error message."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.status = "failed"
                task.current_stage = "Failed"
                task.error_message = error_message
                task.updated_at = datetime.now()
                
                logger.error(f"Task {task_id} failed: {error_message}")
    
    def set_task_chunks(self, task_id: str, total_chunks: int):
        """Set the total number of chunks for progress calculation."""
        with self._lock:
            if task_id in self.tasks:
                self.tasks[task_id].total_chunks = total_chunks
    
    def increment_completed_chunks(self, task_id: str):
        """Increment the completed chunks counter."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.completed_chunks += 1
    
    async def remove_task(self, task_id: str) -> bool:
        """Remove a task and clean up its files."""
        task = None
        with self._lock:
            task = self.tasks.pop(task_id, None)
        
        if not task:
            return False
        
        # Cancel running task if exists
        if task_id in self._running_tasks:
            running_task = self._running_tasks.pop(task_id)
            if not running_task.done():
                running_task.cancel()
                try:
                    await running_task
                except asyncio.CancelledError:
                    pass
        
        # Clean up result file
        if task.result_path and Path(task.result_path).exists():
            try:
                Path(task.result_path).unlink()
                logger.debug(f"Removed result file: {task.result_path}")
            except Exception as e:
                logger.warning(f"Failed to remove result file {task.result_path}: {e}")
        
        logger.info(f"Removed task: {task_id}")
        return True
    
    def get_running_task_count(self) -> int:
        """Get the number of currently running tasks."""
        with self._lock:
            return sum(1 for task in self.tasks.values() if task.status == "processing")
    
    def can_start_new_task(self) -> bool:
        """Check if a new task can be started based on concurrency limits."""
        return self.get_running_task_count() < self.max_concurrent_tasks
    
    def get_all_tasks(self) -> Dict[str, TTSTask]:
        """Get all tasks (for debugging/admin purposes)."""
        with self._lock:
            return self.tasks.copy()
    
    def register_running_task(self, task_id: str, asyncio_task: asyncio.Task):
        """Register an asyncio task for cancellation tracking."""
        self._running_tasks[task_id] = asyncio_task
    
    def unregister_running_task(self, task_id: str):
        """Unregister an asyncio task."""
        self._running_tasks.pop(task_id, None)
    
    async def shutdown(self):
        """Shutdown the task manager and cancel all running tasks."""
        # Cancel cleanup task
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Cancel all running tasks
        running_tasks = list(self._running_tasks.values())
        for task in running_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for all tasks to complete
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)
        
        logger.info("Task manager shutdown complete")


# Global task manager instance
task_manager: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    """Get the global task manager instance."""
    global task_manager
    if task_manager is None:
        task_manager = TaskManager()
    return task_manager


def create_progress_callback(task_id: str) -> ProgressCallback:
    """Create a progress callback function for a specific task."""
    def callback(progress: float, stage: str, status: Optional[TaskStatus] = None):
        get_task_manager().update_task_progress(task_id, progress, stage, status)
    
    return callback
