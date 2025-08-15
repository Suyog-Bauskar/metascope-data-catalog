from sqlalchemy import Column, String, BigInteger, Boolean, Text, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
from app.database import Base


class TableType(str, enum.Enum):
    TABLE = "table"
    VIEW = "view"
    MATERIALIZED_VIEW = "materialized_view"
    EXTERNAL_TABLE = "external_table"


class ColumnType(str, enum.Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATETIME = "datetime"
    JSON = "json"
    ARRAY = "array"


class RelationshipType(str, enum.Enum):
    FOREIGN_KEY = "foreign_key"
    DERIVED = "derived"
    AGGREGATED = "aggregated"
    JOINED = "joined"


# Create PostgreSQL ENUM types
table_type_enum = ENUM(TableType, name='table_type', schema='catalog')
column_type_enum = ENUM(ColumnType, name='column_type', schema='catalog')
relationship_type_enum = ENUM(RelationshipType, name='relationship_type', schema='catalog')


class TableMetadata(Base):
    __tablename__ = "table_metadata"
    __table_args__ = {"schema": "catalog"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_name = Column(String(255), nullable=False)
    table_name = Column(String(255), nullable=False)
    table_type = Column(table_type_enum, nullable=False, default=TableType.TABLE)
    description = Column(Text)
    row_count = Column(BigInteger)
    size_bytes = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_analyzed = Column(DateTime(timezone=True))

    # Relationships
    columns = relationship("ColumnMetadata", back_populates="table", cascade="all, delete-orphan")
    source_relationships = relationship(
        "TableRelationship", 
        foreign_keys="TableRelationship.source_table_id",
        back_populates="source_table",
        cascade="all, delete-orphan"
    )
    target_relationships = relationship(
        "TableRelationship", 
        foreign_keys="TableRelationship.target_table_id",
        back_populates="target_table"
    )


class ColumnMetadata(Base):
    __tablename__ = "column_metadata"
    __table_args__ = {"schema": "catalog"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_id = Column(UUID(as_uuid=True), ForeignKey("catalog.table_metadata.id", ondelete="CASCADE"), nullable=False)
    column_name = Column(String(255), nullable=False)
    column_type = Column(column_type_enum, nullable=False)
    is_nullable = Column(Boolean, default=True)
    is_primary_key = Column(Boolean, default=False)
    is_foreign_key = Column(Boolean, default=False)
    description = Column(Text)
    null_count = Column(BigInteger)
    unique_count = Column(BigInteger)
    min_value = Column(Text)
    max_value = Column(Text)
    avg_value = Column(Numeric)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    table = relationship("TableMetadata", back_populates="columns")


class TableRelationship(Base):
    __tablename__ = "table_relationships"
    __table_args__ = {"schema": "lineage"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_table_id = Column(UUID(as_uuid=True), ForeignKey("catalog.table_metadata.id", ondelete="CASCADE"), nullable=False)
    target_table_id = Column(UUID(as_uuid=True), ForeignKey("catalog.table_metadata.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(relationship_type_enum, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    source_table = relationship("TableMetadata", foreign_keys=[source_table_id], back_populates="source_relationships")
    target_table = relationship("TableMetadata", foreign_keys=[target_table_id], back_populates="target_relationships")
