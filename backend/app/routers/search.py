from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
import asyncpg
import os
from pydantic import BaseModel

router = APIRouter(prefix="/search", tags=["search"])

class SearchResult(BaseModel):
    type: str
    schema: str
    table: str
    column: Optional[str] = None
    description: Optional[str] = None
    dataType: Optional[str] = None
    relevanceScore: float

async def get_database_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/taxi_catalog")
    if "+asyncpg" in database_url:
        database_url = database_url.replace("+asyncpg", "")
    return await asyncpg.connect(database_url)

@router.get("/")
async def search_catalog(
    q: str = Query(..., description="Search query"),
    type: str = Query("all", description="Search type: all, tables, columns"),
    schema: Optional[str] = Query(None, description="Filter by schema")
) -> List[SearchResult]:
    """Search across tables and columns in the data catalog"""
    
    if not q.strip():
        return []
    
    conn = None
    try:
        conn = await get_database_connection()
        results = []
        
        # Search tables
        if type in ["all", "tables"]:
            table_query = """
                SELECT 
                    'table' as type,
                    schema_name,
                    table_name,
                    description,
                    CASE 
                        WHEN LOWER(table_name) = LOWER($1) THEN 1.0
                        WHEN LOWER(table_name) LIKE LOWER($2) THEN 0.9
                        WHEN LOWER(description) LIKE LOWER($2) THEN 0.7
                        ELSE 0.5
                    END as relevance_score
                FROM catalog.table_metadata
                WHERE 
                    (LOWER(table_name) LIKE LOWER($2) OR LOWER(description) LIKE LOWER($2))
                    AND ($3::text IS NULL OR schema_name = $3)
                ORDER BY relevance_score DESC, table_name
                LIMIT 20
            """
            
            search_pattern = f"%{q}%"
            table_results = await conn.fetch(table_query, q, search_pattern, schema)
            
            for row in table_results:
                results.append(SearchResult(
                    type="table",
                    schema=row['schema_name'],
                    table=row['table_name'],
                    description=row['description'],
                    relevanceScore=float(row['relevance_score'])
                ))
        
        # Search columns - skip if column_metadata table doesn't exist
        if type in ["all", "columns"]:
            try:
                column_query = """
                    SELECT 
                        'column' as type,
                        schema_name,
                        table_name,
                        column_name,
                        description,
                        data_type,
                        CASE 
                            WHEN LOWER(column_name) = LOWER($1) THEN 1.0
                            WHEN LOWER(column_name) LIKE LOWER($2) THEN 0.9
                            WHEN LOWER(description) LIKE LOWER($2) THEN 0.7
                            ELSE 0.5
                        END as relevance_score
                    FROM catalog.column_metadata
                    WHERE 
                        (LOWER(column_name) LIKE LOWER($2) OR LOWER(description) LIKE LOWER($2))
                        AND ($3::text IS NULL OR schema_name = $3)
                    ORDER BY relevance_score DESC, column_name
                    LIMIT 20
                """
                
                search_pattern = f"%{q}%"
                column_results = await conn.fetch(column_query, q, search_pattern, schema)
                
                for row in column_results:
                    results.append(SearchResult(
                        type="column",
                        schema=row['schema_name'],
                        table=row['table_name'],
                        column=row['column_name'],
                        description=row['description'],
                        dataType=row['data_type'],
                        relevanceScore=float(row['relevance_score'])
                    ))
            except Exception:
                # Skip column search if table doesn't exist
                pass
        
        # Sort by relevance score
        results.sort(key=lambda x: x.relevanceScore, reverse=True)
        
        return results[:50]  # Limit to top 50 results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    finally:
        if conn:
            await conn.close()

@router.get("/schemas")
async def get_schemas() -> List[str]:
    """Get list of available schemas"""
    conn = None
    try:
        conn = await get_database_connection()
        
        query = """
            SELECT DISTINCT schema_name 
            FROM catalog.table_metadata 
            ORDER BY schema_name
        """
        
        results = await conn.fetch(query)
        return [row['schema_name'] for row in results]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schemas: {str(e)}")
    finally:
        if conn:
            await conn.close()
