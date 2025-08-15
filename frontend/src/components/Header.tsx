import React, { useState, useEffect } from 'react';
import { Bell, User, Database, Activity, TrendingUp } from 'lucide-react';
import { useQuery } from 'react-query';

const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch quick stats for header
  const { data: quickStats } = useQuery(
    'header-stats',
    async () => {
      const response = await fetch('/api/v1/analytics/');
      if (response.ok) {
        const data = await response.json();
        return {
          tables: data.overview.totalTables,
          schemas: data.overview.totalSchemas,
          dataSize: data.overview.dataSize
        };
      }
      return null;
    },
    {
      refetchInterval: 1000, // Refresh every 1 second
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 0 // Always consider data stale to force refresh
    }
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Data Catalog Brand & Quick Stats */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Data Catalog
              </h1>
              <p className="text-xs text-gray-500">Unified Data Discovery</p>
            </div>
          </div>

          {/* Quick Stats */}
          {quickStats && (
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{quickStats.tables}</span>
                <span className="text-gray-400">tables</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="font-medium">{quickStats.schemas}</span>
                <span className="text-gray-400">schemas</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{quickStats.dataSize}</span>
                <span className="text-gray-400">data</span>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Time & User Actions */}
        <div className="flex items-center space-x-6">
          {/* Current Time */}
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-900">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
