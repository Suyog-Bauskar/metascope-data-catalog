from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import asyncio
import asyncpg
import os

router = APIRouter(prefix="/data/lineage", tags=["lineage"])

async def get_database_connection(database_name="taxi_catalog"):
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", f"postgresql://postgres:postgres@postgres:5432/{database_name}")
    # Remove asyncpg driver from URL for asyncpg
    if "+asyncpg" in database_url:
        database_url = database_url.replace("+asyncpg", "")
    # Replace database name if specified
    if database_name != "taxi_catalog":
        database_url = database_url.replace("/taxi_catalog", f"/{database_name}")
    return await asyncpg.connect(database_url)

@router.get("/{schema}/{table_name}")
async def get_table_lineage(schema: str, table_name: str) -> Dict[str, Any]:
    """Get lineage data for a specific table"""
    
    conn = None
    pagila_conn = None
    try:
        # Try to connect to pagila database for lineage
        try:
            pagila_conn = await get_database_connection("pagila")
            # Check if table exists in pagila database
            pagila_table_query = """
                SELECT table_name, table_schema as schema_name, table_type
                FROM information_schema.tables
                WHERE table_schema = $1 AND table_name = $2
            """
            table_result = await pagila_conn.fetchrow(pagila_table_query, schema, table_name)
            if table_result:
                conn = pagila_conn
            else:
                await pagila_conn.close()
                pagila_conn = None
        except Exception:
            if pagila_conn:
                await pagila_conn.close()
            pagila_conn = None
            table_result = None
        
        # If not found in pagila, try taxi_catalog
        if not table_result:
            conn = await get_database_connection()
            table_query = """
                SELECT table_name, schema_name, table_type
                FROM catalog.table_metadata 
                WHERE schema_name = $1 AND table_name = $2
            """
            table_result = await conn.fetchrow(table_query, schema, table_name)
        
        if not table_result:
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Get foreign key relationships from the actual database
        center_id = f"{schema}.{table_name}"
        nodes = [{
            "id": center_id,
            "label": f"{schema}.{table_name}",
            "type": "table",
            "schema": schema,
            "table": table_name,
            "is_center": True
        }]
        
        edges = []
        
        # Get outgoing foreign key relationships
        fk_outgoing_query = """
            SELECT 
                tc.constraint_name,
                tc.table_schema as source_schema,
                tc.table_name as source_table,
                ccu.table_schema as target_schema,
                ccu.table_name as target_table,
                kcu.column_name as source_column,
                ccu.column_name as target_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = $1 
                AND tc.table_name = $2
        """
        fk_outgoing_results = await conn.fetch(fk_outgoing_query, schema, table_name)
        
        # Get incoming foreign key relationships
        fk_incoming_query = """
            SELECT 
                tc.constraint_name,
                tc.table_schema as source_schema,
                tc.table_name as source_table,
                ccu.table_schema as target_schema,
                ccu.table_name as target_table,
                kcu.column_name as source_column,
                ccu.column_name as target_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_schema = $1 
                AND ccu.table_name = $2
        """
        fk_incoming_results = await conn.fetch(fk_incoming_query, schema, table_name)
        
        # Add outgoing foreign key relationships
        for fk in fk_outgoing_results:
            target_id = f"{fk['target_schema']}.{fk['target_table']}"
            
            # Add target node if not exists
            if not any(n["id"] == target_id for n in nodes):
                nodes.append({
                    "id": target_id,
                    "label": f"{fk['target_schema']}.{fk['target_table']}",
                    "type": "table",
                    "schema": fk['target_schema'],
                    "table": fk['target_table'],
                    "is_center": False
                })
            
            # Add edge
            edges.append({
                "id": f"fk_{fk['constraint_name']}",
                "from": center_id,
                "to": target_id,
                "type": "foreign_key",
                "label": f"{fk['source_column']} → {fk['target_column']}",
                "constraint_name": fk['constraint_name']
            })
        
        # Add incoming foreign key relationships
        for fk in fk_incoming_results:
            source_id = f"{fk['source_schema']}.{fk['source_table']}"
            
            # Add source node if not exists
            if not any(n["id"] == source_id for n in nodes):
                nodes.append({
                    "id": source_id,
                    "label": f"{fk['source_schema']}.{fk['source_table']}",
                    "type": "table",
                    "schema": fk['source_schema'],
                    "table": fk['source_table'],
                    "is_center": False
                })
            
            # Add edge
            edges.append({
                "id": f"fk_{fk['constraint_name']}_incoming",
                "from": source_id,
                "to": center_id,
                "type": "foreign_key",
                "label": f"{fk['source_column']} → {fk['target_column']}",
                "constraint_name": fk['constraint_name']
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "center_table": center_id,
            "stats": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "dependencies": len([e for e in edges if e["type"] == "foreign_key" and e["from"] == center_id]),
                "dependents": len([e for e in edges if e["type"] == "foreign_key" and e["to"] == center_id]),
                "views": 0
            }
        }
        
    except Exception as e:
        import traceback
        error_detail = f"Failed to get lineage: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Log to console for debugging
        raise HTTPException(status_code=500, detail=f"Failed to get lineage: {str(e)}")
    finally:
        if conn and not conn.is_closed():
            await conn.close()

@router.get("/{schema}/{table_name}/upstream")
async def get_upstream_lineage(schema: str, table_name: str, depth: int = 3) -> Dict[str, Any]:
    """Get upstream dependencies for a table"""
    return await get_table_lineage(schema, table_name)

@router.get("/{schema}/{table_name}/downstream") 
async def get_downstream_lineage(schema: str, table_name: str, depth: int = 3) -> Dict[str, Any]:
    """Get downstream dependencies for a table"""
    return await get_table_lineage(schema, table_name)
