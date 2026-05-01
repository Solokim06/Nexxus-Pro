import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import FileManager from '../components/dashboard/FileManager';
import StorageStats from '../components/dashboard/StorageStats';
import StorageChart from '../components/dashboard/StorageChart';
import ActivityLog from '../components/dashboard/ActivityLog';
import QuickActions from '../components/dashboard/QuickActions';
import RecentFiles from '../components/dashboard/RecentFiles';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/stats/${user?.id}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'upload':
        navigate('/upload');
        break;
      case 'merge':
        navigate('/merge');
        break;
      case 'share':
        // Open share modal
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's what's happening with your files today.
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <StorageStats
              stats={stats?.storage}
              onUpgradeClick={() => navigate('/pricing')}
            />
          </div>
          <div>
            <QuickActions
              onUpload={() => handleQuickAction('upload')}
              onMerge={() => handleQuickAction('merge')}
              onShare={() => handleQuickAction('share')}
              onSettings={() => handleQuickAction('settings')}
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StorageChart data={stats?.storageBreakdown} chartType="pie" />
          <ActivityLog userId={user?.id} limit={5} />
        </div>

        {/* Recent Files */}
        <div className="mb-8">
          <RecentFiles
            userId={user?.id}
            limit={5}
            onFileClick={(file) => console.log('File clicked:', file)}
          />
        </div>

        {/* File Manager */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <FileManager
            userId={user?.id}
            onFileSelect={(file) => console.log('File selected:', file)}
            onFileDelete={(files) => console.log('Files deleted:', files)}
            onFileShare={(file) => console.log('Share file:', file)}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;