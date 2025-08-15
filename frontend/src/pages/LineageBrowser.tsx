import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Database, GitBranch, Search, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService, TableMetadata } from '../services/api';

const LineageBrowser: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: tables, isLoading, error, refetch } = useQuery(
    'tables-for-lineage',
    () => apiService.getTables(),
    {
      refetchInterval: 30000,
      retry: 2
    }
  );

  const filteredTables = tables?.filter(table => 
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.schema_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Lineage</h1>
          <p className="text-gray-600 mt-1">Explore table relationships and dependencies</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Data Lineage</h1>
          <p className="text-gray-600 mt-1">Explore table relationships and dependencies</p>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading tables</h3>
          <p className="text-gray-500 mb-4">
            {error instanceof Error ? error.message : 'Failed to load tables'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg mr-3">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Lineage</h1>
            <p className="text-gray-600">Explore table relationships and dependencies</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Tables</p>
              <p className="text-2xl font-bold text-gray-900">{tables?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <GitBranch className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Available for Lineage</p>
              <p className="text-2xl font-bold text-gray-900">{filteredTables.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Search className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Schemas</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(tables?.map(t => t.schema_name)).size || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Select a Table to Explore Lineage</h2>
          <p className="text-sm text-gray-600 mt-1">Click on any table to view its data lineage and relationships</p>
        </div>

        {filteredTables.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching tables' : 'No tables available'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Upload some data to start exploring lineage relationships'
              }
            </p>
            {!searchTerm && (
              <Link
                to="/upload"
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Data
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTables.map((table) => (
              <Link
                key={table.id}
                to={`/lineage/${table.schema_name}/${table.table_name}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-blue-500 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {table.table_name}
                      </h3>
                      <p className="text-sm text-gray-500">{table.schema_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">{table.row_count.toLocaleString()} rows</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </div>
                {table.description && (
                  <p className="mt-2 text-sm text-gray-600 ml-8 line-clamp-2">
                    {table.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LineageBrowser;
