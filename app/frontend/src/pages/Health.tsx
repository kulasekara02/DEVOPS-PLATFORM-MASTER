/**
 * Health Page
 *
 * System health and status monitoring
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  checks?: {
    database?: { status: string; message?: string };
    redis?: { status: string; message?: string };
  };
}

function Health() {
  const { data, isLoading, error, refetch } = useQuery<HealthResponse>({
    queryKey: ['health-full'],
    queryFn: () => api.get('/health/ready', { baseURL: '' }).then((res) => res.data),
    refetchInterval: 10000,
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
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
        Failed to load health status
      </div>
    );
  }

  const isHealthy = data?.status === 'healthy';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div
        className={`rounded-lg p-6 ${
          isHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <span className="text-3xl text-white">
              {isHealthy ? '✓' : '✗'}
            </span>
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
              {isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
            </h3>
            <p className="text-gray-600">
              Last checked: {data?.timestamp && new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Version</h3>
          <p className="text-2xl font-bold text-gray-900">{data?.version}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Uptime</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatUptime(data?.uptime || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
          <p className={`text-2xl font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
            {data?.status?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Service Checks */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Service Health Checks</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <HealthCheck
            name="API Server"
            status={data?.status || 'unknown'}
            description="Express REST API service"
          />
          <HealthCheck
            name="PostgreSQL Database"
            status={data?.checks?.database?.status || 'unknown'}
            description="Primary data store"
            message={data?.checks?.database?.message}
          />
          <HealthCheck
            name="Redis Cache"
            status={data?.checks?.redis?.status || 'unknown'}
            description="Caching and job queue"
            message={data?.checks?.redis?.message}
          />
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Health Endpoints</h3>
        </div>
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Endpoint</th>
                <th className="pb-2">Purpose</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="py-2 text-blue-600">/health</td>
                <td className="py-2 text-gray-600">Basic liveness check</td>
              </tr>
              <tr>
                <td className="py-2 text-blue-600">/health/live</td>
                <td className="py-2 text-gray-600">Kubernetes liveness probe</td>
              </tr>
              <tr>
                <td className="py-2 text-blue-600">/health/ready</td>
                <td className="py-2 text-gray-600">Kubernetes readiness probe (checks dependencies)</td>
              </tr>
              <tr>
                <td className="py-2 text-blue-600">/health/startup</td>
                <td className="py-2 text-gray-600">Kubernetes startup probe</td>
              </tr>
              <tr>
                <td className="py-2 text-blue-600">/metrics</td>
                <td className="py-2 text-gray-600">Prometheus metrics endpoint</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface HealthCheckProps {
  name: string;
  status: string;
  description: string;
  message?: string;
}

function HealthCheck({ name, status, description, message }: HealthCheckProps) {
  const isHealthy = status === 'healthy';

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isHealthy ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        </div>
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{description}</div>
          {message && (
            <div className="text-sm text-red-600 mt-1">{message}</div>
          )}
        </div>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          isHealthy
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {status}
      </span>
    </div>
  );
}

export default Health;
