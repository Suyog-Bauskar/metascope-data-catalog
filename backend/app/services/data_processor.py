import pandas as pd
from typing import Dict, List, Optional, Any
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import datetime
import logging
from app.models import TableMetadata, ColumnMetadata, TableType, ColumnType
from app.database import AsyncSessionLocal
from app.config import settings

logger = logging.getLogger(__name__)


class DataProcessor:
    """Service for processing and analyzing datasets"""
    
    def __init__(self):
        self.batch_size = settings.batch_size
        self.sample_size = settings.sample_size
        
    async def process_dataset(self, file_path: str, schema_name: str, table_name: str) -> Dict[str, Any]:
        """Process any dataset and extract metadata"""
        try:
            # Read the dataset
            df = await self._read_dataset(file_path)
            
            # Analyze the dataset
            metadata = await self._analyze_dataset(df, schema_name, table_name)
            
            # Store metadata in database
            async with AsyncSessionLocal() as session:
                table_metadata = await self._store_table_metadata(session, metadata)
                await self._store_column_metadata(session, table_metadata.id, metadata["columns"])
                await session.commit()
            
            return {
                "status": "success",
                "table_id": str(table_metadata.id),
                "rows_processed": len(df),
                "columns_analyzed": len(metadata["columns"]),
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Error processing dataset: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def load_nyc_taxi_data(self, file_path: str) -> Dict[str, Any]:
        """Load NYC Taxi dataset and extract metadata (legacy method)"""
        return await self.process_dataset(file_path, "nyc_taxi", "yellow_taxi_trips")
    
    async def _read_dataset(self, file_path: str) -> pd.DataFrame:
        """Read dataset from file (CSV, Parquet, etc.)"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {file_path}")
        
        # Determine file type and read accordingly
        if file_path.suffix.lower() == '.csv':
            df = pd.read_csv(file_path)
        elif file_path.suffix.lower() in ['.parquet', '.pq']:
            df = pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")
        
        logger.info(f"Loaded dataset with {len(df)} rows and {len(df.columns)} columns")
        return df
    
    async def _analyze_dataset(self, df: pd.DataFrame, schema_name: str, table_name: str) -> Dict[str, Any]:
        """Analyze dataset and extract comprehensive metadata"""
        
        # Basic table information
        table_info = {
            "schema_name": schema_name,
            "table_name": table_name,
            "table_type": TableType.TABLE,  # Use enum directly
            "row_count": len(df),
            "size_bytes": df.memory_usage(deep=True).sum(),
            "last_analyzed": datetime.utcnow()
        }
        
        # Analyze each column
        columns = []
        for col_name in df.columns:
            column_metadata = await self._analyze_column(df, col_name)
            columns.append(column_metadata)
        
        return {
            **table_info,
            "columns": columns
        }
    
    async def _analyze_column(self, df: pd.DataFrame, column_name: str) -> Dict[str, Any]:
        """Analyze individual column and extract metadata"""
        series = df[column_name]
        
        # Determine column type
        column_type = self._infer_column_type(series)
        
        # Basic statistics
        null_count = series.isnull().sum()
        unique_count = series.nunique()
        # total_count = len(series)  # Currently unused
        
        # Value statistics (for numeric columns)
        min_value = None
        max_value = None
        avg_value = None
        
        if column_type in [ColumnType.INTEGER, ColumnType.FLOAT]:
            numeric_series = pd.to_numeric(series, errors='coerce')
            if not numeric_series.isnull().all():
                min_value = str(numeric_series.min())
                max_value = str(numeric_series.max())
                avg_value = float(numeric_series.mean())
        elif column_type == ColumnType.STRING:
            # For string columns, get min/max by length
            string_lengths = series.astype(str).str.len()
            min_value = str(string_lengths.min())
            max_value = str(string_lengths.max())
        elif column_type == ColumnType.DATETIME:
            # For datetime columns
            try:
                datetime_series = pd.to_datetime(series, errors='coerce')
                if not datetime_series.isnull().all():
                    min_value = str(datetime_series.min())
                    max_value = str(datetime_series.max())
            except Exception:
                pass
        
        return {
            "column_name": column_name,
            "column_type": column_type.value,  # Use string value
            "is_nullable": null_count > 0,
            "is_primary_key": False,  # Would need domain knowledge to determine
            "is_foreign_key": False,  # Would need domain knowledge to determine
            "null_count": int(null_count),
            "unique_count": int(unique_count),
            "min_value": min_value,
            "max_value": max_value,
            "avg_value": avg_value
        }
    
    def _infer_column_type(self, series: pd.Series) -> ColumnType:
        """Infer the appropriate column type from pandas series"""
        
        # Check for datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return ColumnType.DATETIME
        
        # Check for numeric types
        if pd.api.types.is_integer_dtype(series):
            return ColumnType.INTEGER
        elif pd.api.types.is_float_dtype(series):
            return ColumnType.FLOAT
        elif pd.api.types.is_bool_dtype(series):
            return ColumnType.BOOLEAN
        
        # Try to infer from string content
        if pd.api.types.is_object_dtype(series):
            # Sample a few values to check patterns
            sample = series.dropna().head(100)
            
            # Check if it looks like datetime
            try:
                pd.to_datetime(sample, errors='raise')
                return ColumnType.DATETIME
            except Exception:
                pass
            
            # Check if it looks like numeric
            try:
                pd.to_numeric(sample, errors='raise')
                # Check if all are integers
                numeric_sample = pd.to_numeric(sample)
                if all(numeric_sample == numeric_sample.astype(int)):
                    return ColumnType.INTEGER
                else:
                    return ColumnType.FLOAT
            except Exception:
                pass
            
            # Check if it looks like boolean
            unique_values = set(str(v).lower() for v in sample.unique())
            if unique_values.issubset({'true', 'false', '1', '0', 'yes', 'no', 't', 'f'}):
                return ColumnType.BOOLEAN
        
        # Default to string
        return ColumnType.STRING
    
    async def _store_table_metadata(self, session: AsyncSession, metadata: Dict[str, Any]) -> TableMetadata:
        """Store table metadata in database"""
        
        # Check if table already exists
        stmt = select(TableMetadata).where(
            TableMetadata.schema_name == metadata["schema_name"],
            TableMetadata.table_name == metadata["table_name"]
        )
        result = await session.execute(stmt)
        existing_table = result.scalar_one_or_none()
        
        if existing_table:
            # Update existing table
            existing_table.row_count = metadata["row_count"]
            existing_table.size_bytes = metadata["size_bytes"]
            existing_table.last_analyzed = metadata["last_analyzed"]
            return existing_table
        else:
            # Create new table
            table_metadata = TableMetadata(
                schema_name=metadata["schema_name"],
                table_name=metadata["table_name"],
                table_type=TableType.TABLE,  # Use enum directly
                row_count=metadata["row_count"],
                size_bytes=metadata["size_bytes"],
                last_analyzed=metadata["last_analyzed"]
            )
            session.add(table_metadata)
            await session.flush()  # To get the ID
            return table_metadata
    
    async def _store_column_metadata(self, session: AsyncSession, table_id: Any, columns: List[Dict[str, Any]]):
        """Store column metadata in database"""
        
        # Delete existing column metadata for this table
        await session.execute(
            text("DELETE FROM catalog.column_metadata WHERE table_id = :table_id"),
            {"table_id": table_id}
        )
        
        # Insert new column metadata
        for col_data in columns:
            column_metadata = ColumnMetadata(
                table_id=table_id,
                **col_data
            )
            session.add(column_metadata)
    
    async def get_dataset_profile(self, schema_name: str, table_name: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive profile of a dataset"""
        async with AsyncSessionLocal() as session:
            # Get table metadata
            stmt = select(TableMetadata).where(
                TableMetadata.schema_name == schema_name,
                TableMetadata.table_name == table_name
            )
            result = await session.execute(stmt)
            table = result.scalar_one_or_none()
            
            if not table:
                return None
            
            # Get column metadata
            stmt = select(ColumnMetadata).where(ColumnMetadata.table_id == table.id)
            result = await session.execute(stmt)
            columns = result.scalars().all()
            
            return {
                "table": {
                    "id": str(table.id),
                    "schema_name": table.schema_name,
                    "table_name": table.table_name,
                    "table_type": table.table_type.value,
                    "row_count": table.row_count,
                    "size_bytes": table.size_bytes,
                    "last_analyzed": table.last_analyzed.isoformat() if table.last_analyzed else None
                },
                "columns": [
                    {
                        "id": str(col.id),
                        "column_name": col.column_name,
                        "column_type": col.column_type.value,
                        "is_nullable": col.is_nullable,
                        "is_primary_key": col.is_primary_key,
                        "is_foreign_key": col.is_foreign_key,
                        "null_count": col.null_count,
                        "unique_count": col.unique_count,
                        "min_value": col.min_value,
                        "max_value": col.max_value,
                        "avg_value": float(col.avg_value) if col.avg_value else None
                    }
                    for col in columns
                ]
            }


# Global instance
data_processor = DataProcessor()
