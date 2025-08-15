import React from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Database, Table, TrendingUp, Users, Clock, Activity } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalTables: number;
    totalColumns: number;
    totalSchemas: number;
    dataSize: string;
  };
  tableStats: {
    name: string;
    schema: string;
    rowCount: number;
    sizeBytes: number;
    lastUpdated: string;
  }[];
  schemaStats: {
    schema: string;
    tableCount: number;
    totalSize: number;
  }[];
  recentActivity: {
    action: string;
    table: string;
    schema: string;
    timestamp: string;
    user?: string;
  }[];
  dataTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

const Analytics: React.FC = () => {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>(
    'analytics',
    async () => {
      const response = await fetch('/api/v1/analytics/');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Overview of your data catalog metrics and usage</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tables</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.overview.totalTables || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Table className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Columns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics?.overview.totalColumns || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Schemas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.overview.totalSchemas || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Data Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.overview.dataSize || '0 MB'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Tables by Size */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Largest Tables</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics?.tableStats?.slice(0, 5).map((table, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {table.schema}.{table.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatNumber(table.rowCount)} rows
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatBytes(table.sizeBytes)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(table.lastUpdated)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No table data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Schema Distribution */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schema Distribution</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics?.schemaStats?.map((schema, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{schema.schema}</p>
                      <p className="text-sm text-gray-500">
                        {schema.tableCount} table{schema.tableCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatBytes(schema.totalSize)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No schema data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics?.recentActivity?.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.action}</span> on{' '}
                        <span className="font-medium">
                          {activity.schema}.{activity.table}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(activity.timestamp)}
                        {activity.user && ` by ${activity.user}`}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Data Types Distribution */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Data Types</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {analytics?.dataTypes?.slice(0, 8).map((dataType, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {dataType.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{dataType.count}</span>
                      <span className="text-xs text-gray-500">
                        ({dataType.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No data type information available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
