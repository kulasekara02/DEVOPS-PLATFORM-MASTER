/**
 * Dashboard Page
 *
 * Main dashboard with system overview
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Stats {
  items: {
    total: number;
    active: number;
    createdLast24h: number;
  };
  server: {
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
    };
    nodeVersion: string;
  };
}

function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((res) => res.data),
    refetchInterval: 30000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health/ready', { baseURL: '' }).then((res) => res.data),
    refetchInterval: 10000,
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={stats?.items.total || 0}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="Active Items"
          value={stats?.items.active || 0}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Created (24h)"
          value={stats?.items.createdLast24h || 0}
          icon="🆕"
          color="purple"
        />
        <StatCard
          title="Uptime"
          value={formatUptime(stats?.server.uptime || 0)}
          icon="⏱️"
          color="orange"
          isString
        />
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthIndicator
            name="API"
            status={health?.status === 'healthy' ? 'healthy' : 'unhealthy'}
          />
          <HealthIndicator
            name="Database"
            status={health?.checks?.database?.status || 'unknown'}
          />
          <HealthIndicator
            name="Redis"
            status={health?.checks?.redis?.status || 'unknown'}
          />
        </div>
      </div>

      {/* Server Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Node Version</span>
            <p className="font-medium">{stats?.server.nodeVersion}</p>
          </div>
          <div>
            <span className="text-gray-500">Heap Used</span>
            <p className="font-medium">{formatBytes(stats?.server.memory.heapUsed || 0)}</p>
          </div>
          <div>
            <span className="text-gray-500">Heap Total</span>
            <p className="font-medium">{formatBytes(stats?.server.memory.heapTotal || 0)}</p>
          </div>
          <div>
            <span className="text-gray-500">Environment</span>
            <p className="font-medium">{import.meta.env.MODE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  isString?: boolean;
}

function StatCard({ title, value, icon, color, isString }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {isString ? value : value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

interface HealthIndicatorProps {
  name: string;
  status: string;
}

function HealthIndicator({ name, status }: HealthIndicatorProps) {
  const isHealthy = status === 'healthy';

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={`w-3 h-3 rounded-full ${
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="font-medium text-gray-700">{name}</span>
      <span className={`text-sm ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
        {status}
      </span>
    </div>
  );
}

export default Dashboard;
