import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Settings as SettingsIcon, Save, RefreshCw, Database, Bell, Shield, Palette, Monitor } from 'lucide-react';

interface SettingsData {
  general: {
    catalogName: string;
    description: string;
    refreshInterval: number;
    timezone: string;
  };
  database: {
    connectionString: string;
    maxConnections: number;
    queryTimeout: number;
  };
  notifications: {
    emailNotifications: boolean;
    slackWebhook: string;
    alertThreshold: number;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showLineageLabels: boolean;
  };
  security: {
    requireAuth: boolean;
    sessionTimeout: number;
    allowedDomains: string[];
  };
}

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery<SettingsData>(
    'settings',
    async () => {
      const response = await fetch('/api/v1/settings/');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json();
    }
  );

  const [formData, setFormData] = useState<SettingsData | null>(null);

  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const saveSettingsMutation = useMutation(
    async (data: SettingsData) => {
      const response = await fetch('/api/v1/settings/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        setHasChanges(false);
      },
    }
  );

  const handleInputChange = (section: keyof SettingsData, field: string, value: any) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (formData) {
      saveSettingsMutation.mutate(formData);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  if (isLoading || !formData) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure your data catalog preferences and system settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Catalog Name
                      </label>
                      <input
                        type="text"
                        value={formData.general.catalogName}
                        onChange={(e) => handleInputChange('general', 'catalogName', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.general.description}
                        onChange={(e) => handleInputChange('general', 'description', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auto-refresh Interval (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.general.refreshInterval}
                        onChange={(e) => handleInputChange('general', 'refreshInterval', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        value={formData.general.timezone}
                        onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Asia/Kolkata">India Standard Time</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Settings */}
              {activeTab === 'database' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Connection String
                      </label>
                      <input
                        type="password"
                        value={formData.database.connectionString}
                        onChange={(e) => handleInputChange('database', 'connectionString', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="postgresql://user:password@host:port/database"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Connections
                      </label>
                      <input
                        type="number"
                        value={formData.database.maxConnections}
                        onChange={(e) => handleInputChange('database', 'maxConnections', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Query Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.database.queryTimeout}
                        onChange={(e) => handleInputChange('database', 'queryTimeout', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        checked={formData.notifications.emailNotifications}
                        onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="emailNotifications" className="ml-2 text-sm text-gray-700">
                        Enable email notifications
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slack Webhook URL
                      </label>
                      <input
                        type="url"
                        value={formData.notifications.slackWebhook}
                        onChange={(e) => handleInputChange('notifications', 'slackWebhook', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alert Threshold (% change)
                      </label>
                      <input
                        type="number"
                        value={formData.notifications.alertThreshold}
                        onChange={(e) => handleInputChange('notifications', 'alertThreshold', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeTab === 'appearance' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Theme
                      </label>
                      <select
                        value={formData.appearance.theme}
                        onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="compactMode"
                        checked={formData.appearance.compactMode}
                        onChange={(e) => handleInputChange('appearance', 'compactMode', e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="compactMode" className="ml-2 text-sm text-gray-700">
                        Compact mode
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showLineageLabels"
                        checked={formData.appearance.showLineageLabels}
                        onChange={(e) => handleInputChange('appearance', 'showLineageLabels', e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="showLineageLabels" className="ml-2 text-sm text-gray-700">
                        Show lineage relationship labels
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireAuth"
                        checked={formData.security.requireAuth}
                        onChange={(e) => handleInputChange('security', 'requireAuth', e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="requireAuth" className="ml-2 text-sm text-gray-700">
                        Require authentication
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.security.sessionTimeout}
                        onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allowed Domains (one per line)
                      </label>
                      <textarea
                        value={formData.security.allowedDomains.join('\n')}
                        onChange={(e) => handleInputChange('security', 'allowedDomains', e.target.value.split('\n').filter(d => d.trim()))}
                        rows={4}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="example.com&#10;*.company.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div>
                    {hasChanges && (
                      <p className="text-sm text-amber-600">You have unsaved changes</p>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saveSettingsMutation.isLoading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveSettingsMutation.isLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
