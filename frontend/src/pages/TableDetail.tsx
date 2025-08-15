import React from 'react';
import { useParams } from 'react-router-dom';

const TableDetail: React.FC = () => {
  const { tableName } = useParams<{ tableName: string }>();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Table Details: {tableName}</h1>
      <p className="text-gray-600 mt-1">Detailed information about the selected table</p>
      
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Table detail view will be implemented in Phase 3</p>
      </div>
    </div>
  );
};

export default TableDetail;
