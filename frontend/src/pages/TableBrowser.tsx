import React from 'react';
import { Database, Calendar, Users } from 'lucide-react';

const TableBrowser: React.FC = () => {
  // Mock data for now
  const mockTables = [
    {
      id: '1',
      name: 'taxi_trips',
      schema: 'public',
      type: 'table',
      rowCount: 1250000,
      size: '2.3 GB',
      lastModified: '2024-01-15',
      description: 'NYC Yellow Taxi trip records with pickup and dropoff details'
    },
    {
      id: '2',
      name: 'taxi_zones',
      schema: 'public',
      type: 'table',
      rowCount: 265,
      size: '12 KB',
      lastModified: '2024-01-10',
      description: 'NYC taxi zone lookup table with location information'
    },
    {
      id: '3',
      name: 'daily_summaries',
      schema: 'analytics',
      type: 'view',
      rowCount: 365,
      size: '45 KB',
      lastModified: '2024-01-14',
      description: 'Daily aggregated statistics for taxi trips'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
        <p className="text-gray-600 mt-1">Browse and explore your data catalog</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockTables.map((table) => (
          <div
            key={table.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Database className="w-5 h-5 text-primary-500 mr-2" />
                <div>
                  <h3 className="font-semibold text-gray-900">{table.name}</h3>
                  <p className="text-sm text-gray-500">{table.schema}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                table.type === 'table' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {table.type}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {table.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-2" />
                {table.rowCount.toLocaleString()} rows
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Database className="w-4 h-4 mr-2" />
                {table.size}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Updated {table.lastModified}
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockTables.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
          <p className="text-gray-500">Start by connecting your data sources to populate the catalog.</p>
        </div>
      )}
    </div>
  );
};

export default TableBrowser;
