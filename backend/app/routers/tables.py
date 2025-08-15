from fastapi import APIRouter, HTTPException
from typing import Dict
import asyncpg
import os

router = APIRouter(prefix="/data/tables", tags=["tables"])

async def get_database_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/taxi_catalog")
    if "+asyncpg" in database_url:
        database_url = database_url.replace("+asyncpg", "")
    return await asyncpg.connect(database_url)

@router.delete("/{schema}/{table_name}")
async def delete_table(schema: str, table_name: str) -> Dict[str, str]:
    """Delete a table from the catalog"""
    
    conn = None
    try:
        conn = await get_database_connection()
        
        # Check if table exists
        check_query = """
            SELECT COUNT(*) as count
            FROM catalog.table_metadata 
            WHERE schema_name = $1 AND table_name = $2
        """
        result = await conn.fetchrow(check_query, schema, table_name)
        
        if result['count'] == 0:
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Delete from column_metadata first (if exists)
        try:
            delete_columns_query = """
                DELETE FROM catalog.column_metadata 
                WHERE schema_name = $1 AND table_name = $2
            """
            await conn.execute(delete_columns_query, schema, table_name)
        except Exception:
            # Column metadata table might not exist, continue
            pass
        
        # Delete from table_metadata
        delete_table_query = """
            DELETE FROM catalog.table_metadata 
            WHERE schema_name = $1 AND table_name = $2
        """
        await conn.execute(delete_table_query, schema, table_name)
        
        return {"message": f"Table {schema}.{table_name} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete table: {str(e)}")
    finally:
        if conn:
            await conn.close()
