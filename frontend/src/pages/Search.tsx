import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Database, Table, Filter, X } from 'lucide-react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';

interface SearchResult {
  type: 'table' | 'column';
  schema: string;
  table: string;
  column?: string;
  description?: string;
  dataType?: string;
  relevanceScore: number;
}

interface SearchFilters {
  type: 'all' | 'tables' | 'columns';
  schema: string;
}

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    schema: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const { data: searchResults, isLoading, error } = useQuery(
    ['search', debouncedQuery, filters],
    async () => {
      if (!debouncedQuery.trim()) return [];
      
      const params = new URLSearchParams({
        q: debouncedQuery,
        type: filters.type,
        ...(filters.schema && { schema: filters.schema })
      });

      const response = await fetch(`/api/v1/search/?${params}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    {
      enabled: debouncedQuery.trim().length > 0
    }
  );

  // Fetch available schemas for filter
  const { data: schemas } = useQuery(
    'schemas',
    async () => {
      const response = await fetch('/api/v1/search/schemas');
      if (!response.ok) throw new Error('Failed to fetch schemas');
      return response.json();
    }
  );

  const clearFilters = () => {
    setFilters({ type: 'all', schema: '' });
  };

  const hasActiveFilters = filters.type !== 'all' || filters.schema !== '';

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Data Catalog</h1>
          <p className="text-gray-600">Find tables, columns, and metadata across your data catalog</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tables, columns, descriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <X className="w-3 h-3 mr-1" />
                Clear filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All</option>
                    <option value="tables">Tables only</option>
                    <option value="columns">Columns only</option>
                  </select>
                </div>

                {/* Schema Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schema
                  </label>
                  <select
                    value={filters.schema}
                    onChange={(e) => setFilters(prev => ({ ...prev, schema: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">All schemas</option>
                    {schemas?.map((schema: string) => (
                      <option key={schema} value={schema}>{schema}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div>
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Search failed. Please try again.</p>
            </div>
          )}

          {searchResults && searchResults.length === 0 && debouncedQuery && (
            <div className="text-center py-8">
              <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found for "{debouncedQuery}"</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your search terms or filters</p>
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{debouncedQuery}"
                </p>
              </div>

              <div className="space-y-4">
                {searchResults.map((result: SearchResult, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {result.type === 'table' ? (
                            <Database className="w-4 h-4 text-blue-600 mr-2" />
                          ) : (
                            <Table className="w-4 h-4 text-green-600 mr-2" />
                          )}
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {result.type}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {result.type === 'table' ? (
                            <Link
                              to={`/tables/${result.schema}/${result.table}`}
                              className="hover:text-blue-600"
                            >
                              {result.schema}.{result.table}
                            </Link>
                          ) : (
                            <span>
                              {result.schema}.{result.table}.{result.column}
                            </span>
                          )}
                        </h3>

                        {result.description && (
                          <p className="text-gray-600 mb-2">{result.description}</p>
                        )}

                        {result.dataType && (
                          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                            {result.dataType}
                          </span>
                        )}
                      </div>

                      <div className="ml-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Relevance</div>
                          <div className="text-sm font-medium text-gray-900">
                            {Math.round(result.relevanceScore * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!debouncedQuery && (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
              <p className="text-gray-600">Enter a search term to find tables, columns, and metadata</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
