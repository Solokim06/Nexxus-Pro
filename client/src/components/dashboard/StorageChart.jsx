import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const StorageChart = ({
  data,
  chartType = 'pie', // 'pie', 'bar'
  className = '',
}) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  const defaultData = data || [
    { name: 'Documents', value: 40, color: '#3B82F6' },
    { name: 'Images', value: 30, color: '#10B981' },
    { name: 'Videos', value: 15, color: '#F59E0B' },
    { name: 'Audio', value: 10, color: '#EF4444' },
    { name: 'Other', value: 5, color: '#8B5CF6' },
  ];
  
  const formatFileSize = (value) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    let size = value * 1024 * 1024; // Assuming value is in MB
    let i = 0;
    while (size >= 1024 && i < sizes.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(2)} ${sizes[i]}`;
  };
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {payload[0].name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {payload[0].value} MB ({((payload[0].value / defaultData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };
  
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={defaultData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {defaultData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
  
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={defaultData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
          {defaultData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Storage Breakdown
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {defaultData.reduce((sum, d) => sum + d.value, 0)} MB
        </div>
      </div>
      
      {chartType === 'pie' ? renderPieChart() : renderBarChart()}
    </div>
  );
};

// Line chart for storage usage over time
export const StorageTrendChart = ({ data, className = '' }) => {
  const defaultData = data || [
    { date: 'Week 1', used: 200 },
    { date: 'Week 2', used: 350 },
    { date: 'Week 3', used: 450 },
    { date: 'Week 4', used: 600 },
    { date: 'Week 5', used: 750 },
    { date: 'Week 6', used: 900 },
  ];
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Storage Usage Trend
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={defaultData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip />
          <Legend />
          <Bar dataKey="used" fill="#3B82F6" name="Storage Used (MB)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StorageChart;