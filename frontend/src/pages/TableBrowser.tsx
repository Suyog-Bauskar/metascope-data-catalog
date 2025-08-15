import React, { useState, useEffect } from 'react';
import { Database, Calendar, Users, RefreshCw, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService, TableMetadata } from '../services/api';

const TableBrowser: React.FC = () => {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTable, setDeletingTable] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getTables();
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  const handleDeleteTable = async (schema: string, tableName: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    const tableKey = `${schema}.${tableName}`;
    
    if (!window.confirm(`Are you sure you want to delete table "${tableKey}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingTable(tableKey);
      const response = await fetch(`/api/v1/data/tables/${schema}/${tableName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete table');
      }

      // Remove table from local state
      setTables(prev => prev.filter(t => !(t.schema_name === schema && t.table_name === tableName)));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    } finally {
      setDeletingTable(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-600 mt-1">Browse and explore your data catalog</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-lg text-gray-600">Loading tables...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-600 mt-1">Browse and explore your data catalog</p>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading tables</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchTables}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-600 mt-1">Browse and explore your data catalog</p>
        </div>
        <button
          onClick={fetchTables}
          className="flex items-center px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => {
          const tableKey = `${table.schema_name}.${table.table_name}`;
          const isDeleting = deletingTable === tableKey;
          
          return (
            <div
              key={table.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group"
            >
              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteTable(table.schema_name, table.table_name, e)}
                disabled={isDeleting}
                className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                title="Delete table"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>

              <Link
                to={`/tables/${table.schema_name}/${table.table_name}`}
                className="block p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4 pr-8">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-blue-500 mr-2" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{table.table_name}</h3>
                      <p className="text-sm text-gray-500">{table.schema_name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    table.table_type === 'table' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {table.table_type}
                  </span>
                </div>

                {table.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {table.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-2" />
                    {table.row_count.toLocaleString()} rows
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Database className="w-4 h-4 mr-2" />
                    {formatBytes(table.size_bytes)}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    Updated {formatDate(table.last_analyzed || table.updated_at)}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
          <p className="text-gray-500 mb-4">Start by uploading datasets to populate the catalog.</p>
          <Link
            to="/upload"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Upload Dataset
          </Link>
        </div>
      )}
    </div>
  );
};

export default TableBrowser;
