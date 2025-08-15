from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import asyncpg
import os
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])

class GeneralSettings(BaseModel):
    catalogName: str
    description: str
    refreshInterval: int
    timezone: str

class DatabaseSettings(BaseModel):
    connectionString: str
    maxConnections: int
    queryTimeout: int

class NotificationSettings(BaseModel):
    emailNotifications: bool
    slackWebhook: str
    alertThreshold: int

class AppearanceSettings(BaseModel):
    theme: str
    compactMode: bool
    showLineageLabels: bool

class SecuritySettings(BaseModel):
    requireAuth: bool
    sessionTimeout: int
    allowedDomains: List[str]

class SettingsData(BaseModel):
    general: GeneralSettings
    database: DatabaseSettings
    notifications: NotificationSettings
    appearance: AppearanceSettings
    security: SecuritySettings

async def get_database_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/taxi_catalog")
    if "+asyncpg" in database_url:
        database_url = database_url.replace("+asyncpg", "")
    return await asyncpg.connect(database_url)

@router.get("/")
async def get_settings() -> SettingsData:
    """Get current settings"""
    
    conn = None
    try:
        conn = await get_database_connection()
        
        # Check if settings table exists, create if not
        create_table_query = """
            CREATE TABLE IF NOT EXISTS catalog.settings (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(category, key)
            )
        """
        await conn.execute(create_table_query)
        
        # Get all settings
        settings_query = """
            SELECT category, key, value 
            FROM catalog.settings
        """
        settings_rows = await conn.fetch(settings_query)
        
        # Convert to dictionary
        settings_dict = {}
        for row in settings_rows:
            if row['category'] not in settings_dict:
                settings_dict[row['category']] = {}
            settings_dict[row['category']][row['key']] = row['value']
        
        # Return default settings if none exist
        return SettingsData(
            general=GeneralSettings(
                catalogName=settings_dict.get('general', {}).get('catalogName', 'NYC Taxi Data Catalog'),
                description=settings_dict.get('general', {}).get('description', 'A comprehensive data catalog for NYC taxi datasets'),
                refreshInterval=int(settings_dict.get('general', {}).get('refreshInterval', '30')),
                timezone=settings_dict.get('general', {}).get('timezone', 'UTC')
            ),
            database=DatabaseSettings(
                connectionString=settings_dict.get('database', {}).get('connectionString', 'postgresql://postgres:postgres@postgres:5432/taxi_catalog'),
                maxConnections=int(settings_dict.get('database', {}).get('maxConnections', '20')),
                queryTimeout=int(settings_dict.get('database', {}).get('queryTimeout', '30'))
            ),
            notifications=NotificationSettings(
                emailNotifications=settings_dict.get('notifications', {}).get('emailNotifications', 'false').lower() == 'true',
                slackWebhook=settings_dict.get('notifications', {}).get('slackWebhook', ''),
                alertThreshold=int(settings_dict.get('notifications', {}).get('alertThreshold', '10'))
            ),
            appearance=AppearanceSettings(
                theme=settings_dict.get('appearance', {}).get('theme', 'light'),
                compactMode=settings_dict.get('appearance', {}).get('compactMode', 'false').lower() == 'true',
                showLineageLabels=settings_dict.get('appearance', {}).get('showLineageLabels', 'true').lower() == 'true'
            ),
            security=SecuritySettings(
                requireAuth=settings_dict.get('security', {}).get('requireAuth', 'false').lower() == 'true',
                sessionTimeout=int(settings_dict.get('security', {}).get('sessionTimeout', '60')),
                allowedDomains=settings_dict.get('security', {}).get('allowedDomains', '').split('\n') if settings_dict.get('security', {}).get('allowedDomains') else []
            )
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")
    finally:
        if conn:
            await conn.close()

@router.put("/")
async def update_settings(settings: SettingsData) -> Dict[str, str]:
    """Update settings"""
    
    conn = None
    try:
        conn = await get_database_connection()
        
        # Ensure settings table exists
        create_table_query = """
            CREATE TABLE IF NOT EXISTS catalog.settings (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(category, key)
            )
        """
        await conn.execute(create_table_query)
        
        # Update general settings
        general_settings = [
            ('general', 'catalogName', settings.general.catalogName),
            ('general', 'description', settings.general.description),
            ('general', 'refreshInterval', str(settings.general.refreshInterval)),
            ('general', 'timezone', settings.general.timezone),
        ]
        
        # Update database settings
        database_settings = [
            ('database', 'connectionString', settings.database.connectionString),
            ('database', 'maxConnections', str(settings.database.maxConnections)),
            ('database', 'queryTimeout', str(settings.database.queryTimeout)),
        ]
        
        # Update notification settings
        notification_settings = [
            ('notifications', 'emailNotifications', str(settings.notifications.emailNotifications).lower()),
            ('notifications', 'slackWebhook', settings.notifications.slackWebhook),
            ('notifications', 'alertThreshold', str(settings.notifications.alertThreshold)),
        ]
        
        # Update appearance settings
        appearance_settings = [
            ('appearance', 'theme', settings.appearance.theme),
            ('appearance', 'compactMode', str(settings.appearance.compactMode).lower()),
            ('appearance', 'showLineageLabels', str(settings.appearance.showLineageLabels).lower()),
        ]
        
        # Update security settings
        security_settings = [
            ('security', 'requireAuth', str(settings.security.requireAuth).lower()),
            ('security', 'sessionTimeout', str(settings.security.sessionTimeout)),
            ('security', 'allowedDomains', '\n'.join(settings.security.allowedDomains)),
        ]
        
        all_settings = general_settings + database_settings + notification_settings + appearance_settings + security_settings
        
        # Upsert all settings
        upsert_query = """
            INSERT INTO catalog.settings (category, key, value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (category, key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """
        
        for category, key, value in all_settings:
            await conn.execute(upsert_query, category, key, value)
        
        return {"message": "Settings updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
    finally:
        if conn:
            await conn.close()
