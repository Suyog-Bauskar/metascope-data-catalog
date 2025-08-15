import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import SimpleLineageVisualization from '../components/SimpleLineageVisualization';
import { getTableLineage } from '../services/api';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface LineagePageProps {}

const Lineage: React.FC<LineagePageProps> = () => {
  const { schema, tableName } = useParams<{ schema: string; tableName: string }>();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Construct table identifier
  const tableId = schema && tableName ? `${schema}.${tableName}` : '';

  // Fetch lineage data
  const {
    data: lineageData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['lineage', tableId],
    () => getTableLineage(schema!, tableName!),
    {
      enabled: !!schema && !!tableName,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  useEffect(() => {
    if (tableId) {
      setSelectedTable(tableId);
    }
  }, [tableId]);

  const handleNodeClick = (nodeId: string) => {
    const [nodeSchema, nodeTable] = nodeId.split('.');
    if (nodeSchema && nodeTable) {
      navigate(`/lineage/${nodeSchema}/${nodeTable}`);
    }
  };

  const handleBackToTables = () => {
    navigate('/tables');
  };

  if (!schema || !tableName) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No table selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a table to view its lineage.
          </p>
          <div className="mt-6">
            <button
              onClick={handleBackToTables}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Tables
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToTables}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Data Lineage: {schema}.{tableName}
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading lineage data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToTables}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Data Lineage: {schema}.{tableName}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading lineage</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Failed to load lineage data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={handleBackToTables}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            title="Back to tables"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Data Lineage
            </h1>
            <p className="text-sm text-gray-500">
              {schema}.{tableName}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {lineageData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Tables
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {lineageData.nodes?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Relationships
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {lineageData.edges?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">D</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Max Depth
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Math.max(...(lineageData.nodes?.map((n: any) => n.level || 0) || [0]))}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lineage Visualization */}
      {lineageData && (
        <div className="bg-gray-50 rounded-lg p-4">
          <SimpleLineageVisualization
            data={lineageData}
            centerTable={tableId}
            onNodeClick={handleNodeClick}
            height="700px"
          />
        </div>
      )}

      {/* Empty State */}
      {lineageData && (!lineageData.nodes || lineageData.nodes.length === 0) && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No lineage data</h3>
          <p className="mt-1 text-sm text-gray-500">
            This table doesn't have any relationships or dependencies.
          </p>
        </div>
      )}
    </div>
  );
};

export default Lineage;
