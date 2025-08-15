const API_BASE_URL = '/api/v1';

export interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export interface TableMetadata {
  id: string;
  schema_name: string;
  table_name: string;
  table_type: string;
  description?: string;
  row_count: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  last_analyzed?: string;
}

export interface ColumnMetadata {
  id: string;
  column_name: string;
  column_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  description?: string;
  null_count: number;
  unique_count: number;
  min_value?: string;
  max_value?: string;
  avg_value?: number;
}

export interface TableProfile {
  table: TableMetadata;
  columns: ColumnMetadata[];
}

export interface QueueStats {
  pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_jobs: number;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // Data processing endpoints
  async uploadDataset(file: File, schemaName: string, tableName: string): Promise<{ job_id: string; message: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('schema_name', schemaName);
    formData.append('table_name', tableName);

    const response = await fetch(`${API_BASE_URL}/data/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async processDatasetFromUrl(url: string, schemaName: string, tableName: string): Promise<{ job_id: string; message: string; status: string }> {
    return this.request('/data/process-url', {
      method: 'POST',
      body: JSON.stringify({
        url,
        schema_name: schemaName,
        table_name: tableName,
      }),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.request(`/data/jobs/${jobId}`);
  }

  async cancelJob(jobId: string): Promise<{ message: string }> {
    return this.request(`/data/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Metadata endpoints
  async getTables(): Promise<TableMetadata[]> {
    const response = await this.request<{tables: TableMetadata[]}>('/data/tables');
    return response.tables;
  }

  async getTableProfile(schema: string, table: string): Promise<TableProfile> {
    return this.request(`/data/profile/${schema}/${table}`);
  }

  async getQueueStats(): Promise<QueueStats> {
    return this.request('/data/queue/stats');
  }
}

export const apiService = new ApiService();

export const getTableDetail = async (schema: string, tableName: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/data/tables/${schema}/${tableName}`);
  if (!response.ok) {
    throw new Error('Failed to fetch table details');
  }
  const data = await response.json();
  return data;
};

export const getTableLineage = async (schema: string, tableName: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/data/lineage/${schema}/${tableName}`);
  if (!response.ok) {
    throw new Error('Failed to fetch table lineage');
  }
  const data = await response.json();
  return data;
};
