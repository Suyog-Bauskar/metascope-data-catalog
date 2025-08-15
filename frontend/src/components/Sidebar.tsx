import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, GitBranch, Search, BarChart3, Settings, Upload } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Upload Data', href: '/upload', icon: Upload },
    { name: 'Tables', href: '/tables', icon: Database },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Lineage', href: '/lineage', icon: GitBranch },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center">
          <Database className="w-8 h-8 text-primary-400" />
          <span className="ml-2 text-lg font-semibold">Catalog</span>
        </div>
      </div>

      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
        <div className="text-xs text-gray-400">
          <div>Version 1.0.0</div>
          <div className="mt-1"> 2024 Data Catalog</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
