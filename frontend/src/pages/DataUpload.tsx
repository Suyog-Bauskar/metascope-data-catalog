import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { apiService, JobStatus } from '../services/api';

interface UploadJob {
  id: string;
  fileName: string;
  schemaName: string;
  tableName: string;
  status: JobStatus;
}

const DataUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [schemaName, setSchemaName] = useState('');
  const [tableName, setTableName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    
    const file = files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'parquet'].includes(fileExtension || '')) {
      alert('Please upload a CSV or Parquet file');
      return;
    }

    if (!tableName.trim()) {
      alert('Please enter a table name');
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await apiService.uploadDataset(file, schemaName, tableName);
      
      const newJob: UploadJob = {
        id: response.job_id,
        fileName: file.name,
        schemaName,
        tableName,
        status: {
          id: response.job_id,
          type: 'process_dataset',
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
        }
      };
      
      setUploadJobs(prev => [newJob, ...prev]);
      
      // Start polling for job status
      pollJobStatus(response.job_id);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiService.getJobStatus(jobId);
        
        setUploadJobs(prev => 
          prev.map(job => 
            job.id === jobId ? { ...job, status } : job
          )
        );
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const removeJob = (jobId: string) => {
    setUploadJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Dataset</h1>
        <p className="text-gray-600 mt-1">Upload CSV or Parquet files to process and catalog</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="schema" className="block text-sm font-medium text-gray-700 mb-2">
              Schema Name
            </label>
            <input
              type="text"
              id="schema"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., nyc_taxi"
            />
          </div>
          <div>
            <label htmlFor="table" className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <input
              type="text"
              id="table"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., yellow_taxi_trips"
              required
            />
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,.parquet"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isUploading ? 'Uploading...' : 'Drop files here or click to browse'}
          </h3>
          <p className="text-gray-500">
            Supports CSV and Parquet files up to 1GB
          </p>
        </div>
      </div>

      {/* Upload Jobs */}
      {uploadJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Processing Jobs</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {uploadJobs.map((job) => (
              <div key={job.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">{job.fileName}</h3>
                      <p className="text-sm text-gray-500">
                        {job.schemaName}.{job.tableName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status.status)}`}>
                      {job.status.status}
                    </span>
                    {getStatusIcon(job.status.status)}
                    <button
                      onClick={() => removeJob(job.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(job.status.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        job.status.status === 'completed'
                          ? 'bg-green-500'
                          : job.status.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${job.status.progress}%` }}
                    />
                  </div>
                </div>

                {/* Job Details */}
                <div className="text-sm text-gray-500">
                  <div>Started: {job.status.started_at ? new Date(job.status.started_at).toLocaleString() : 'Not started'}</div>
                  {job.status.completed_at && (
                    <div>Completed: {new Date(job.status.completed_at).toLocaleString()}</div>
                  )}
                  {job.status.error && job.status.error !== 'None' && (
                    <div className="text-red-600 mt-2">Error: {job.status.error}</div>
                  )}
                  {job.status.result && job.status.status === 'completed' && (
                    <div className="text-green-600 mt-2">
                      Successfully processed {job.status.result.rows_processed || 'N/A'} rows
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;
